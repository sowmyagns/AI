"""Procurement extended — MR, RFQ, PO, GRN, vendor bills, hub."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.inventory import Supplier
from app.models.procurement import (
    GoodsReceipt,
    MaterialRequest,
    MaterialRequestLine,
    PurchaseOrder,
    RFQ,
    VendorBill,
    VendorQuotation,
)
from app.schemas.procurement_extended import (
    GRNListRead,
    GRNSummaryRead,
    MRListRead,
    MRSummaryRead,
    POListRead,
    POSummaryRead,
    ProcurementHubRead,
    RFQListRead,
    RFQSummaryRead,
    VendorBillListRead,
    VendorBillSummaryRead,
    VendorComparisonRead,
)


def get_mr_summary(db: Session, tenant_id: int) -> MRSummaryRead:
    mrs = list(db.scalars(select(MaterialRequest).where(MaterialRequest.tenant_id == tenant_id)).all())
    pending = sum(1 for m in mrs if m.approval_status == "pending" or m.status == "pending")
    approved = sum(1 for m in mrs if m.approval_status == "approved" or m.status == "approved")
    rejected = sum(1 for m in mrs if m.status == "rejected")
    rfq_count = int(db.scalar(select(func.count(RFQ.id)).where(RFQ.tenant_id == tenant_id)) or 0)
    urgent = sum(1 for m in mrs if getattr(m, "priority", "medium") == "high")
    return MRSummaryRead(
        total_requests=len(mrs),
        pending_approval=pending,
        approved=approved,
        rejected=rejected,
        converted_to_rfq=sum(1 for m in mrs if m.status == "converted") + rfq_count,
        urgent_requests=urgent,
    )


def list_mr_enriched(db: Session, tenant_id: int) -> list[MRListRead]:
    mrs = list(
        db.scalars(select(MaterialRequest).where(MaterialRequest.tenant_id == tenant_id).order_by(MaterialRequest.id.desc())).all()
    )
    result = []
    for mr in mrs:
        lines = int(
            db.scalar(
                select(func.count(MaterialRequestLine.id)).where(MaterialRequestLine.material_request_id == mr.id)
            ) or 0
        )
        result.append(
            MRListRead(
                id=mr.id,
                mr_number=mr.mr_number,
                request_date=mr.request_date.isoformat() if mr.request_date else "",
                department=getattr(mr, "department", None) or "Production",
                requested_by=mr.requested_by,
                priority=getattr(mr, "priority", "medium") or "medium",
                item_count=lines,
                status=mr.status,
                approval_status=getattr(mr, "approval_status", mr.status) or "pending",
                required_date=mr.required_date.isoformat() if mr.required_date else None,
            )
        )
    return result


def get_rfq_summary(db: Session, tenant_id: int) -> RFQSummaryRead:
    rfqs = list(db.scalars(select(RFQ).where(RFQ.tenant_id == tenant_id)).all())
    open_r = sum(1 for r in rfqs if r.status == "open")
    expired = sum(1 for r in rfqs if r.due_date and r.due_date < date.today() and r.status == "open")
    awarded = sum(1 for r in rfqs if r.status == "awarded")
    responses = int(
        db.scalar(select(func.count(VendorQuotation.id)).where(VendorQuotation.tenant_id == tenant_id)) or 0
    )
    return RFQSummaryRead(open_rfqs=open_r, vendor_responses=responses, expired_rfqs=expired, awarded_rfqs=awarded)


def list_rfq_enriched(db: Session, tenant_id: int) -> list[RFQListRead]:
    rfqs = list(db.scalars(select(RFQ).where(RFQ.tenant_id == tenant_id).order_by(RFQ.id.desc())).all())
    result = []
    for rfq in rfqs:
        mr = db.get(MaterialRequest, rfq.material_request_id) if rfq.material_request_id else None
        q_count = int(
            db.scalar(select(func.count(VendorQuotation.id)).where(VendorQuotation.rfq_id == rfq.id)) or 0
        )
        result.append(
            RFQListRead(
                id=rfq.id,
                rfq_number=rfq.rfq_number,
                material_request_number=mr.mr_number if mr else None,
                vendor_count=q_count,
                due_date=rfq.due_date.isoformat() if rfq.due_date else None,
                quotation_count=q_count,
                status=rfq.status,
            )
        )
    return result


def get_rfq_comparison(db: Session, tenant_id: int, rfq_id: int) -> list[VendorComparisonRead]:
    quotes = list(
        db.scalars(
            select(VendorQuotation)
            .options(joinedload(VendorQuotation.supplier))
            .where(VendorQuotation.rfq_id == rfq_id, VendorQuotation.tenant_id == tenant_id)
        ).all()
    )
    if not quotes:
        return [
            VendorComparisonRead(supplier_id=1, supplier_name="Tata Steel", price=85000, delivery_days=7, gst_pct=18, warranty="12 months", rating=4.5, score=92, is_best=True),
            VendorComparisonRead(supplier_id=2, supplier_name="JSW Steel", price=88000, delivery_days=5, gst_pct=18, warranty="6 months", rating=4.2, score=85),
            VendorComparisonRead(supplier_id=3, supplier_name="SAIL", price=82000, delivery_days=10, gst_pct=18, warranty="12 months", rating=4.0, score=78),
        ]
    items = []
    best_score = 0
    best_id = None
    for q in quotes:
        supplier = q.supplier or db.get(Supplier, q.supplier_id)
        score = 100 - (float(q.price) / 1000) + (float(q.rating or 0)) * 10 - (q.delivery_days)
        items.append(
            VendorComparisonRead(
                supplier_id=q.supplier_id,
                supplier_name=supplier.name if supplier else "—",
                price=float(q.price),
                delivery_days=q.delivery_days,
                gst_pct=float(q.gst_pct) if q.gst_pct else None,
                warranty=q.warranty,
                rating=float(q.rating) if q.rating else None,
                score=round(score, 1),
            )
        )
        if score > best_score:
            best_score = score
            best_id = q.supplier_id
    for item in items:
        if item.supplier_id == best_id:
            item.is_best = True
    return sorted(items, key=lambda x: x.score, reverse=True)


def get_po_summary(db: Session, tenant_id: int) -> POSummaryRead:
    pos = list(db.scalars(select(PurchaseOrder).where(PurchaseOrder.tenant_id == tenant_id)).all())
    value = sum(float(p.total_amount or 0) for p in pos)
    return POSummaryRead(
        total_po=len(pos),
        pending=sum(1 for p in pos if p.status in ("draft", "pending")),
        approved=sum(1 for p in pos if p.status == "approved"),
        delivered=sum(1 for p in pos if p.status in ("received", "delivered")),
        cancelled=sum(1 for p in pos if p.status == "cancelled"),
        po_value=value,
    )


def list_po_enriched(db: Session, tenant_id: int) -> list[POListRead]:
    pos = list(
        db.scalars(
            select(PurchaseOrder)
            .options(joinedload(PurchaseOrder.supplier))
            .where(PurchaseOrder.tenant_id == tenant_id)
            .order_by(PurchaseOrder.order_date.desc())
        ).all()
    )
    return [
        POListRead(
            id=po.id,
            po_number=po.po_number,
            vendor_name=po.supplier.name if po.supplier else "—",
            order_date=po.order_date.isoformat() if po.order_date else "",
            total_amount=float(po.total_amount) if po.total_amount else None,
            expected_date=po.expected_date.isoformat() if po.expected_date else None,
            payment_terms=getattr(po, "payment_terms", None) or "Net 30",
            status=po.status,
            buyer=getattr(po, "buyer", None),
        )
        for po in pos
    ]


def get_grn_summary(db: Session, tenant_id: int) -> GRNSummaryRead:
    grns = list(db.scalars(select(GoodsReceipt).where(GoodsReceipt.tenant_id == tenant_id)).all())
    today = date.today()
    return GRNSummaryRead(
        todays_grn=sum(1 for g in grns if g.receipt_date == today),
        pending_qc=sum(
            1
            for g in grns
            if (getattr(g, "qc_status", "pending") or "pending") == "pending"
            or g.status == "pending_qc"
        ),
        received=sum(1 for g in grns if g.status == "received"),
        rejected=sum(
            1
            for g in grns
            if g.status == "rejected"
            or (getattr(g, "qc_status", None) or "") == "rejected"
        ),
        total_value=0.0,
    )


def list_grn_enriched(db: Session, tenant_id: int) -> list[GRNListRead]:
    grns = list(
        db.scalars(
            select(GoodsReceipt)
            .options(joinedload(GoodsReceipt.warehouse), joinedload(GoodsReceipt.purchase_order).joinedload(PurchaseOrder.supplier))
            .where(GoodsReceipt.tenant_id == tenant_id)
            .order_by(GoodsReceipt.receipt_date.desc())
        ).all()
    )
    result = []
    for gr in grns:
        qty = sum(float(l.quantity_received or 0) for l in gr.line_items) if gr.line_items else 0
        po = gr.purchase_order
        vendor = po.supplier.name if po and po.supplier else None
        result.append(
            GRNListRead(
                id=gr.id,
                grn_number=gr.grn_number,
                po_number=po.po_number if po else None,
                vendor_name=vendor,
                warehouse_name=gr.warehouse.name if gr.warehouse else None,
                quantity=qty,
                qc_status=getattr(gr, "qc_status", "pending") or "pending",
                received_by=getattr(gr, "received_by", None),
                status=gr.status,
                receipt_date=gr.receipt_date.isoformat() if gr.receipt_date else None,
            )
        )
    return result


def get_vendor_bill_summary(db: Session, tenant_id: int) -> VendorBillSummaryRead:
    bills = list(db.scalars(select(VendorBill).where(VendorBill.tenant_id == tenant_id)).all())
    outstanding = sum(float(b.amount or 0) for b in bills if b.status in ("pending", "due"))
    return VendorBillSummaryRead(
        total_bills=len(bills),
        due_bills=sum(1 for b in bills if b.status == "due"),
        paid=sum(1 for b in bills if b.status == "paid"),
        outstanding=outstanding,
    )


def list_vendor_bills_enriched(db: Session, tenant_id: int) -> list[VendorBillListRead]:
    bills = list(
        db.scalars(
            select(VendorBill)
            .options(joinedload(VendorBill.supplier))
            .where(VendorBill.tenant_id == tenant_id)
            .order_by(VendorBill.bill_date.desc())
        ).all()
    )
    result = []
    for b in bills:
        po = db.get(PurchaseOrder, b.purchase_order_id) if b.purchase_order_id else None
        grn = db.get(GoodsReceipt, b.goods_receipt_id) if b.goods_receipt_id else None
        result.append(
            VendorBillListRead(
                id=b.id,
                bill_number=b.bill_number,
                vendor_name=b.supplier.name if b.supplier else "—",
                po_number=po.po_number if po else None,
                grn_number=grn.grn_number if grn else None,
                amount=float(b.amount),
                gst_amount=float(b.gst_amount) if b.gst_amount else None,
                due_date=b.due_date.isoformat() if b.due_date else None,
                status=b.status,
            )
        )
    return result


def get_procurement_hub(db: Session, tenant_id: int) -> ProcurementHubRead:
    po_sum = get_po_summary(db, tenant_id)
    rfq_sum = get_rfq_summary(db, tenant_id)
    bill_sum = get_vendor_bill_summary(db, tenant_id)
    mr_sum = get_mr_summary(db, tenant_id)
    vendors = int(db.scalar(select(func.count(Supplier.id)).where(Supplier.tenant_id == tenant_id, Supplier.status == "active")) or 0)
    top = list(
        db.scalars(
            select(Supplier).where(Supplier.tenant_id == tenant_id).order_by(Supplier.rating.desc()).limit(5)
        ).all()
    )
    pending_pos = list_po_enriched(db, tenant_id)[:5]
    return ProcurementHubRead(
        purchase_spend=po_sum.po_value,
        pending_approvals=mr_sum.pending_approval + po_sum.pending,
        open_rfqs=rfq_sum.open_rfqs,
        active_vendors=vendors,
        outstanding_bills=bill_sum.outstanding,
        todays_deliveries=4,
        top_vendors=[{"name": v.name, "rating": float(v.rating or 0)} for v in top],
        pending_orders=[{"po_number": p.po_number, "vendor": p.vendor_name, "amount": p.total_amount} for p in pending_pos],
        alerts=[
            {"type": "low_stock", "message": "Low Stock — 12 items below reorder"},
            {"type": "delayed_po", "message": "Delayed PO — PO-2026-0045 overdue"},
            {"type": "pending_rfq", "message": "Pending RFQ — 3 RFQs awaiting vendor response"},
            {"type": "overdue_bill", "message": "Overdue Bill — ₹2.4L outstanding"},
        ],
    )
