from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.document_service import (
    create_document,
    delete_document,
    get_document,
    list_documents,
    update_document,
)

router = APIRouter(prefix="/documents", tags=["documents"])

MODULE = "documents"


@router.post("", response_model=DocumentRead)
def create_document_endpoint(
    payload: DocumentCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    payload.tenant_id = user.tenant_id
    if not payload.uploaded_by:
        payload.uploaded_by = user.full_name
    return create_document(db, payload)


@router.get("", response_model=list[DocumentRead])
def list_documents_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    doc_type: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[DocumentRead]:
    return list_documents(db, tenant_id, doc_type)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document_endpoint(
    document_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    doc = get_document(db, document_id, tenant_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.put("/{document_id}", response_model=DocumentRead)
def update_document_endpoint(
    document_id: int,
    payload: DocumentUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    doc = update_document(db, document_id, user.tenant_id, payload)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/{document_id}")
def delete_document_endpoint(
    document_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    if not delete_document(db, document_id, user.tenant_id):
        raise HTTPException(404, "Document not found")
    return {"deleted": True, "id": document_id}
