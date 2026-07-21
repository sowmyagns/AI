from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate


def create_document(db: Session, payload: DocumentCreate) -> Document:
    doc = Document(**payload.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(
    db: Session,
    tenant_id: int,
    doc_type: str | None = None,
) -> list[Document]:
    stmt = select(Document).where(Document.tenant_id == tenant_id)
    if doc_type:
        stmt = stmt.where(Document.doc_type == doc_type)
    stmt = stmt.order_by(Document.created_at.desc())
    return list(db.scalars(stmt).all())


def get_document(db: Session, document_id: int, tenant_id: int) -> Document | None:
    doc = db.get(Document, document_id)
    if not doc or doc.tenant_id != tenant_id:
        return None
    return doc


def update_document(
    db: Session,
    document_id: int,
    tenant_id: int,
    payload: DocumentUpdate,
) -> Document | None:
    doc = get_document(db, document_id, tenant_id)
    if not doc:
        return None
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(doc, key, value)
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, document_id: int, tenant_id: int) -> bool:
    doc = get_document(db, document_id, tenant_id)
    if not doc:
        return False
    db.delete(doc)
    db.commit()
    return True
