from pydantic import BaseModel, ConfigDict, Field


class DocumentBase(BaseModel):
    tenant_id: int
    doc_type: str
    title: str
    file_path: str | None = None
    file_name: str | None = None
    reference_type: str | None = None
    reference_id: int | None = None
    description: str | None = None
    uploaded_by: str | None = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    doc_type: str | None = None
    title: str | None = None
    file_path: str | None = None
    file_name: str | None = None
    reference_type: str | None = None
    reference_id: int | None = None
    description: str | None = None
    uploaded_by: str | None = None


class DocumentRead(DocumentBase):
    id: int
    created_at: object | None = Field(default=None)
    updated_at: object | None = Field(default=None)
    model_config = ConfigDict(from_attributes=True)
