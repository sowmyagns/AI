from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ProductRead(BaseModel):
    id: int
    sku: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class ProductionOrderBase(BaseModel):
    tenant_id: int
    product_id: int
    order_number: str
    planned_quantity: float
    start_date: datetime | None = None
    due_date: datetime | None = None
    status: str = "planned"
    sales_order_id: int | None = None
    sales_order_number: str | None = None
    customer_name: str | None = None
    priority: str = "medium"


class ProductionOrderCreate(ProductionOrderBase):
    @field_validator("planned_quantity")
    @classmethod
    def planned_quantity_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Planned quantity must be greater than 0")
        return v


class ProductionOrderRead(ProductionOrderBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WorkOrderBase(BaseModel):
    tenant_id: int
    production_order_id: int
    machine_id: int | None = None
    assigned_user_id: int | None = None
    plant_code: str | None = None
    work_order_number: str
    planned_quantity: float
    actual_quantity: float | None = None
    planned_start: datetime | None = None
    planned_end: datetime | None = None
    status: str = "planned"


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderRead(WorkOrderBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class WorkOrderUpdate(BaseModel):
    actual_quantity: float | None = None
    status: str | None = None
    machine_id: int | None = None


class WorkOrderQuickCreate(BaseModel):
    tenant_id: int | None = None
    product_id: int
    planned_quantity: float
    machine_id: int | None = None


class BatchBase(BaseModel):
    tenant_id: int
    work_order_id: int
    batch_code: str
    quantity: float
    produced_at: datetime | None = None
    status: str = "in_process"


class BatchCreate(BatchBase):
    pass


class BatchRead(BatchBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MachineBase(BaseModel):
    tenant_id: int
    code: str
    name: str
    status: str = "idle"
    location: str | None = None
    is_active: bool = True


class MachineCreate(MachineBase):
    pass


class MachineRead(MachineBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MachineUpdate(BaseModel):
    status: str | None = None


class MachineStatusEventBase(BaseModel):
    tenant_id: int
    machine_id: int
    status: str
    started_at: datetime
    ended_at: datetime | None = None
    reason: str | None = None


class MachineStatusEventCreate(MachineStatusEventBase):
    pass


class MachineStatusEventRead(MachineStatusEventBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DailyProductionReportBase(BaseModel):
    tenant_id: int
    report_date: date
    product_id: int
    work_order_id: int | None = None
    machine_id: int | None = None
    planned_quantity: float | None = None
    produced_quantity: float
    scrap_quantity: float | None = None
    downtime_minutes: int | None = None
    notes: str | None = None


class DailyProductionReportCreate(DailyProductionReportBase):
    pass


class DailyProductionReportRead(DailyProductionReportBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
