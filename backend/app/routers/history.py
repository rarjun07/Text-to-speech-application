from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import current_user
from app.db import get_connection
from app.schemas.history import SpeechHistoryItem, SpeechRenameRequest

router = APIRouter(tags=["history"])


def _item(row) -> SpeechHistoryItem:
    return SpeechHistoryItem(
        id=row["id"],
        title=row["title"] or row["text"][:60],
        text=row["text"],
        language=row["language"],
        voice=row["voice"],
        audio_url=row["audio_url"],
        created_at=row["created_at"],
        is_favorite=bool(row["is_favorite"]),
    )


@router.get("/history", response_model=list[SpeechHistoryItem])
def list_history(user: dict = Depends(current_user)) -> list[SpeechHistoryItem]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.*, EXISTS(
                SELECT 1 FROM favorites f WHERE f.speech_id = s.id AND f.user_id = ?
            ) AS is_favorite
            FROM speeches s WHERE s.user_id = ? ORDER BY s.created_at DESC
            """,
            (user["id"], user["id"]),
        ).fetchall()
    return [_item(row) for row in rows]


@router.patch("/history/{speech_id}", response_model=SpeechHistoryItem)
def rename_history(speech_id: int, request: SpeechRenameRequest, user: dict = Depends(current_user)) -> SpeechHistoryItem:
    title = request.title.strip()
    if not title or len(title) > 100:
        raise HTTPException(status_code=422, detail="Title must contain 1 to 100 characters.")
    with get_connection() as connection:
        connection.execute("UPDATE speeches SET title = ? WHERE id = ? AND user_id = ?", (title, speech_id, user["id"]))
        row = connection.execute(
            """
            SELECT s.*, EXISTS(SELECT 1 FROM favorites f WHERE f.speech_id = s.id AND f.user_id = ?) AS is_favorite
            FROM speeches s WHERE s.id = ? AND s.user_id = ?
            """, (user["id"], speech_id, user["id"])
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Speech history item not found.")
    return _item(row)


@router.delete("/history/{speech_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(speech_id: int, user: dict = Depends(current_user)) -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM speeches WHERE id = ? AND user_id = ?", (speech_id, user["id"]))


@router.get("/favorites", response_model=list[SpeechHistoryItem])
def list_favorites(user: dict = Depends(current_user)) -> list[SpeechHistoryItem]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.*, 1 AS is_favorite FROM speeches s
            JOIN favorites f ON f.speech_id = s.id
            WHERE f.user_id = ? ORDER BY f.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return [_item(row) for row in rows]


@router.post("/history/{speech_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(speech_id: int, user: dict = Depends(current_user)) -> None:
    with get_connection() as connection:
        speech = connection.execute(
            "SELECT id FROM speeches WHERE id = ? AND user_id = ?", (speech_id, user["id"])
        ).fetchone()
        if not speech:
            raise HTTPException(status_code=404, detail="Speech history item not found.")
        connection.execute(
            "INSERT OR IGNORE INTO favorites (user_id, speech_id) VALUES (?, ?)",
            (user["id"], speech_id),
        )


@router.delete("/history/{speech_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(speech_id: int, user: dict = Depends(current_user)) -> None:
    with get_connection() as connection:
        connection.execute(
            "DELETE FROM favorites WHERE user_id = ? AND speech_id = ?", (user["id"], speech_id)
        )