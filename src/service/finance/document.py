from typing import List, Optional
from uuid import UUID

from fastapi import UploadFile, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.model.finance.document import Document
from src.scheme.finance.document import DocumentCreate, DocumentResponse, DocumentUpdate
from src.service.base import BaseService


class DocumentService:
    """Сервис для работы с документами."""
    
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session
    
    async def create_from_upload(
        self,
        actual_value_id: UUID,
        file: UploadFile,
        session: Optional[AsyncSession] = None,
        uploaded_by: Optional[UUID] = None
    ) -> DocumentResponse:
        """Создать документ из загруженного файла."""
        session = session or self.session
        if not session:
            raise ValueError("Не указана сессия для работы с БД")
            
        try:
            file_data = await file.read()
            
            create_data = DocumentCreate(
                actual_value_id=actual_value_id,
                filename=file.filename or "unknown_file",
                content_type=file.content_type or "application/octet-stream",
                file_size=len(file_data),
                file_data=file_data
            )
            
            document = Document(
                actual_value_id=create_data.actual_value_id,
                filename=create_data.filename,
                content_type=create_data.content_type,
                file_size=create_data.file_size,
                file_data=create_data.file_data,
                status=True
            )
            
            if uploaded_by:
                document.uploaded_by = uploaded_by
                
            session.add(document)
            await session.commit()
            await session.refresh(document)
            
            # Формируем file_url
            file_url = self._build_file_url(document.id)
            return DocumentResponse.model_validate(document).model_copy(update={"file_url": file_url})
        except Exception as e:
            await session.rollback()
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка загрузки документа: {str(e)}"
            )
    
    async def get_by_actual_value(self, actual_value_id: UUID, session: Optional[AsyncSession] = None) -> List[DocumentResponse]:
        """Получить документы по ID фактического значения."""
        session = session or self.session
        if not session:
            raise ValueError("Не указана сессия для работы с БД")
            
        query = select(Document).where(
            Document.actual_value_id == actual_value_id,
            Document.status == True
        )
        result = await session.execute(query)
        documents = list(result.scalars().all())
        
        return [DocumentResponse.model_validate(doc).model_copy(update={"file_url": self._build_file_url(doc.id)}) for doc in documents]
    
    async def get(self, document_id: UUID, session: Optional[AsyncSession] = None) -> Optional[DocumentResponse]:
        """Получить документ по ID."""
        session = session or self.session
        if not session:
            raise ValueError("Не указана сессия для работы с БД")
            
        query = select(Document).where(Document.id == document_id)
        result = await session.execute(query)
        doc = result.scalar_one_or_none()
        if not doc:
            return None
        return DocumentResponse.model_validate(doc).model_copy(update={"file_url": self._build_file_url(doc.id)})
    
    async def delete_document(self, document_id: UUID, session: Optional[AsyncSession] = None) -> bool:
        """Мягкое удаление документа."""
        session = session or self.session
        if not session:
            raise ValueError("Не указана сессия для работы с БД")
            
        query = select(Document).where(Document.id == document_id)
        result = await session.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            return False
        
        document.status = False
        await session.commit()
        
        return True
    
    def _build_file_url(self, document_id: UUID) -> str:
        """Формирует URL для скачивания документа."""
        # Используем относительный путь, который будет работать с любым доменом
        return f"/api/v1/finance/documents/{document_id}/download" 