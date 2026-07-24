from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    tenant_id: int | None = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    assigned_to: int | None = None
    priority: str = Field(default="medium", max_length=16)
    status: str = Field(default="open", max_length=32)
    due_date: date | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    assigned_to: int | None = None
    priority: str | None = Field(None, max_length=16)
    status: str | None = Field(None, max_length=32)
    due_date: date | None = None


class TaskRead(TaskBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
