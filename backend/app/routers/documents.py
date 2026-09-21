import io
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, status

router = APIRouter(prefix="/documents", tags=["documents"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SUPPORTED_TYPES = {".txt", ".pdf", ".docx"}


@router.post("/extract")
async def extract_document(file: UploadFile) -> dict[str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_TYPES:
        raise HTTPException(status_code=415, detail="Only TXT, PDF, and DOCX files are supported.")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="The uploaded file must be 10 MB or smaller.")
    try:
        if suffix == ".txt":
            text = contents.decode("utf-8")
        elif suffix == ".pdf":
            from pypdf import PdfReader

            text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(contents)).pages)
        else:
            from docx import Document

            text = "\n".join(paragraph.text for paragraph in Document(io.BytesIO(contents)).paragraphs)
    except (UnicodeDecodeError, OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail="The document could not be read.") from error
    cleaned_text = text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=422, detail="The document does not contain readable text.")
    return {"filename": file.filename or "document", "text": cleaned_text}