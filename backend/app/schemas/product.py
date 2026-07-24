from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    tenant_id: int
    sku: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    unit_cost: float | None = None
    unit_price: float | None = None
    min_stock: int | None = Field(None, ge=1)
    max_stock: int | None = Field(None, ge=1)
    current_stock: int | None = Field(None, ge=1)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = Field(None, min_length=1, max_length=64)
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    unit_cost: float | None = None
    unit_price: float | None = None
    min_stock: int | None = Field(None, ge=1)
    max_stock: int | None = Field(None, ge=1)
    current_stock: int | None = Field(None, ge=1)


class ProductDetailRead(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class BomItemBase(BaseModel):
    tenant_id: int
    product_id: int
    component_product_id: int
    quantity: float
    unit: str = Field(..., min_length=1, max_length=32)


class BomItemCreate(BomItemBase):
    pass


class BomItemRead(BomItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
