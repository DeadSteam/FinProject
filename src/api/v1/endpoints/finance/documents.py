from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import quote

from src.repository.db import finances_db
from src.scheme.finance.document import DocumentResponse
from src.service.finance.document import DocumentService


router = APIRouter()


@router.post("/", response_model=DocumentResponse)
async def upload_document(
    actual_value_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Загрузить документ для фактического значения.
    
    - **actual_value_id**: ID фактического значения
    - **file**: Файл документа (изображение или PDF)
    """
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith(('image/', 'application/pdf')):
        raise HTTPException(status_code=400, detail="Поддерживаются только изображения и PDF")
    
    try:
        content_length = int(file.headers.get('content-length', 0))
    except (ValueError, TypeError):
        content_length = 0
    
    # Проверка размера файла (10MB максимум)
    if content_length > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 10MB)")
    
    service = DocumentService(session)
    return await service.create_from_upload(actual_value_id, file)


@router.get("/", response_model=List[DocumentResponse])
async def get_documents(
    actual_value_id: Optional[UUID] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получить список документов с фильтрацией по фактическому значению.
    
    - **actual_value_id**: ID фактического значения (опционально)
    """
    service = DocumentService(session)
    if actual_value_id:
        return await service.get_by_actual_value(actual_value_id)
    # Если не указан actual_value_id, возвращаем пустой список
    # В будущем можно добавить получение всех документов с пагинацией
    return []


@router.get("/actual-value/{actual_value_id}", response_model=List[DocumentResponse])
async def get_documents_by_actual_value(
    actual_value_id: UUID,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получить список документов для фактического значения.
    
    - **actual_value_id**: ID фактического значения
    """
    service = DocumentService(session)
    return await service.get_by_actual_value(actual_value_id)


@router.get("/{document_id}")
async def get_document(
    document_id: UUID,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получить информацию о документе.
    
    - **document_id**: ID документа
    """
    service = DocumentService(session)
    document = await service.get(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    return document


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    inline: Optional[bool] = Query(default=False, description="Показывать файл в браузере (inline), а не скачивать"),
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Скачать или отобразить документ (inline/attachment).
    
    - **document_id**: ID документа
    - **inline**: true/false — если true, Content-Disposition: inline (для превью)
    """
    service = DocumentService(session)
    document = await service.get(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    if not document.status:
        raise HTTPException(status_code=410, detail="Документ был удален")
    
    # Получаем документ из БД для доступа к file_data
    from src.model.finance.document import Document
    from sqlalchemy import select
    
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    db_document = result.scalar_one_or_none()
    
    if not db_document:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    filename = db_document.filename
    ascii_filename = filename.encode('ascii', 'ignore').decode('ascii') or 'file'
    disp_type = 'inline' if inline else 'attachment'
    content_disposition = (
        f"{disp_type}; filename=\"{ascii_filename}\"; filename*=UTF-8''{quote(filename)}"
    )
    
    return Response(
        content=db_document.file_data,
        media_type=db_document.content_type,
        headers={"Content-Disposition": content_disposition}
    )


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Удалить документ (мягкое удаление).
    
    - **document_id**: ID документа
    """
    service = DocumentService(session)
    result = await service.delete_document(document_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Документ не найден")
    
    return Response(status_code=204) 