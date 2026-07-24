from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 2))
    unit_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    min_stock: Mapped[int | None] = mapped_column(Integer, default=1)
    max_stock: Mapped[int | None] = mapped_column(Integer, default=100)
    current_stock: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    tenant = relationship("Tenant", back_populates="products")
    bom_items = relationship(
        "BillOfMaterial",
        foreign_keys="BillOfMaterial.product_id",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    component_of = relationship(
        "BillOfMaterial",
        foreign_keys="BillOfMaterial.component_product_id",
        back_populates="component",
    )
    production_orders = relationship(
        "ProductionOrder", back_populates="product", cascade="all, delete-orphan"
    )
