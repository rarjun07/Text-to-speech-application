import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.config import settings


def _database_path() -> Path:
    path = Path(settings.database_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[1] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def get_connection():
    connection = sqlite3.connect(_database_path())
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS speeches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                language TEXT NOT NULL,
                voice TEXT NOT NULL,
                audio_url TEXT NOT NULL,
                title TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                speech_id INTEGER NOT NULL REFERENCES speeches(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, speech_id)
            );
            """
        )
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(speeches)")}
        if "title" not in columns:
            connection.execute("ALTER TABLE speeches ADD COLUMN title TEXT")
        user_columns = {row["name"] for row in connection.execute("PRAGMA table_info(users)")}
        if "full_name" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN full_name TEXT NOT NULL DEFAULT ''")
        if "mobile_number" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN mobile_number TEXT NOT NULL DEFAULT ''")
        if "profile_image_url" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN profile_image_url TEXT NOT NULL DEFAULT ''")


init_db()