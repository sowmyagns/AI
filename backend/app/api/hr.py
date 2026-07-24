from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.permissions import (
    require_any_permission,
    require_permission,
    tenant_scope,
    tenant_scope_any,
)
from app.models.user import User
from app.schemas.hr import (
    AttendanceRecordCreate,
    AttendanceRecordRead,
    EmployeeCreate,
    EmployeeRead,
    LeaveRequestCreate,
    LeaveRequestCreateIn,
    LeaveRequestRead,
    LeaveRequestUpdate,
    PayrollRecordCreate,
    PayrollRecordRead,
    PerformanceReviewCreate,
    PerformanceReviewRead,
    ShiftCreate,
    ShiftRead,
)
from app.schemas.department import (
    DepartmentCreate,
    DepartmentDetailRead,
    DepartmentListRead,
    DepartmentSummaryRead,
    DepartmentUpdate,
)
from app.services.department_service import (
    _to_list_read,
    create_department,
    deactivate_department,
    get_department_detail,
    get_department_summary,
    list_departments_enriched,
    update_department,
)
from app.services.hr_service import (
    create_attendance_record,
    create_employee,
    create_leave_request,
    create_payroll_record,
    create_performance_review,
    create_shift,
    get_hr_dashboard,
    list_attendance,
    list_employees,
    list_leave_requests,
    list_payroll,
    list_performance_reviews,
    list_shifts,
    record_clock_in,
    record_clock_out,
    update_leave_request,
    update_payroll_status,
)
from app.schemas.hr_extended import (
    AttendanceListRead,
    AttendanceSummaryRead,
    EmployeeListRead,
    EmployeeSummaryRead,
    HRHubRead,
    LeaveListRead,
    LeaveSummaryRead,
    PayrollListRead,
    PayrollSummaryRead,
)
from app.services.hr_extended_service import (
    get_attendance_summary,
    get_employee_summary,
    get_hr_hub,
    get_leave_summary,
    get_payroll_summary,
    list_attendance_enriched,
    list_employees_enriched,
    list_leave_enriched,
    list_payroll_enriched,
)

router = APIRouter(prefix="/hr", tags=["hr"])

MODULE = "hr"
ATT_SCOPE = tenant_scope_any("hr", "attendance")
ATT_PERM = require_any_permission("hr", "attendance")


@router.get("/dashboard")
def hr_dashboard(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return get_hr_dashboard(db, tenant_id)


@router.post("/employees", response_model=EmployeeRead)
def create_employee_endpoint(
    payload: EmployeeCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_employee(db, payload)


@router.get("/employees", response_model=list[EmployeeRead])
def list_employees_endpoint(
    tenant_id: int = Depends(ATT_SCOPE), db: Session = Depends(get_db)
):
    return list_employees(db, tenant_id)


@router.post("/shifts", response_model=ShiftRead)
def create_shift_endpoint(
    payload: ShiftCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_shift(db, payload)


@router.get("/shifts", response_model=list[ShiftRead])
def list_shifts_endpoint(
    tenant_id: int = Depends(ATT_SCOPE), db: Session = Depends(get_db)
):
    return list_shifts(db, tenant_id)


@router.post("/attendance", response_model=AttendanceRecordRead)
def create_attendance_endpoint(
    payload: AttendanceRecordCreate,
    user: User = Depends(ATT_PERM),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_attendance_record(db, payload)


@router.post("/attendance/clock-in", response_model=AttendanceRecordRead)
def clock_in_endpoint(
    employee_id: int = Query(...),
    record_date: date = Query(...),
    tenant_id: int = Depends(ATT_SCOPE),
    db: Session = Depends(get_db),
):
    return record_clock_in(db, tenant_id, employee_id, record_date)


@router.post("/attendance/clock-out")
def clock_out_endpoint(
    employee_id: int = Query(...),
    record_date: date = Query(...),
    tenant_id: int = Depends(ATT_SCOPE),
    db: Session = Depends(get_db),
):
    rec = record_clock_out(db, tenant_id, employee_id, record_date)
    if not rec:
        raise HTTPException(404, "No open attendance record to clock out")
    return {"success": True, "record": AttendanceRecordRead.model_validate(rec)}


@router.get("/attendance", response_model=list[AttendanceRecordRead])
def list_attendance_endpoint(
    tenant_id: int = Depends(ATT_SCOPE),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    employee_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return list_attendance(db, tenant_id, date_from, date_to, employee_id)


@router.post("/payroll", response_model=PayrollRecordRead)
def create_payroll_endpoint(
    payload: PayrollRecordCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_payroll_record(db, payload)


@router.get("/payroll", response_model=list[PayrollRecordRead])
def list_payroll_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    employee_id: int | None = Query(None),
    period_start: date | None = Query(None),
    period_end: date | None = Query(None),
    db: Session = Depends(get_db),
):
    return list_payroll(db, tenant_id, employee_id, period_start, period_end)


@router.patch("/payroll/{payroll_id}/status", response_model=PayrollRecordRead)
def update_payroll_status_endpoint(
    payroll_id: int,
    status: str = Query(...),
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
):
    pr = update_payroll_status(db, tenant_id, payroll_id, status)
    if not pr:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return pr


@router.post("/performance", response_model=PerformanceReviewRead)
def create_performance_endpoint(
    payload: PerformanceReviewCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    payload.tenant_id = user.tenant_id
    return create_performance_review(db, payload)


@router.get("/performance", response_model=list[PerformanceReviewRead])
def list_performance_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    employee_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return list_performance_reviews(db, tenant_id, employee_id)


@router.post("/leave", response_model=LeaveRequestRead)
def create_leave_endpoint(
    payload: LeaveRequestCreateIn,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    try:
        return create_leave_request(
            db,
            LeaveRequestCreate(tenant_id=user.tenant_id, **payload.model_dump()),
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.get("/leave", response_model=list[LeaveRequestRead])
def list_leave_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    employee_id: int | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return list_leave_requests(db, tenant_id, employee_id, status)


@router.patch("/leave/{leave_id}", response_model=LeaveRequestRead)
def update_leave_endpoint(
    leave_id: int,
    payload: LeaveRequestUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    leave = update_leave_request(db, user.tenant_id, leave_id, payload)
    if not leave:
        raise HTTPException(404, "Leave request not found")
    return leave


@router.get("/departments/summary", response_model=DepartmentSummaryRead)
def department_summary_endpoint(
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentSummaryRead:
    return get_department_summary(db, user.tenant_id)


@router.get("/departments", response_model=list[DepartmentListRead])
def list_departments_endpoint(
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> list[DepartmentListRead]:
    return list_departments_enriched(db, user.tenant_id)


@router.post("/departments", response_model=DepartmentListRead)
def create_department_endpoint(
    payload: DepartmentCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentListRead:
    payload.tenant_id = user.tenant_id
    dept = create_department(db, payload)
    enriched = list_departments_enriched(db, user.tenant_id)
    match = next((d for d in enriched if d.id == dept.id), None)
    return match or _to_list_read(db, user.tenant_id, dept)


@router.get("/departments/{department_id}", response_model=DepartmentDetailRead)
def get_department_endpoint(
    department_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentDetailRead:
    detail = get_department_detail(db, user.tenant_id, department_id)
    if not detail:
        raise HTTPException(404, "Department not found")
    return detail


@router.put("/departments/{department_id}", response_model=DepartmentListRead)
def update_department_endpoint(
    department_id: int,
    payload: DepartmentUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentListRead:
    dept = update_department(db, user.tenant_id, department_id, payload)
    if not dept:
        raise HTTPException(404, "Department not found")
    enriched = list_departments_enriched(db, user.tenant_id)
    match = next((d for d in enriched if d.id == department_id), None)
    if not match:
        raise HTTPException(404, "Department not found")
    return match


@router.patch("/departments/{department_id}/deactivate", response_model=DepartmentListRead)
def deactivate_department_endpoint(
    department_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DepartmentListRead:
    dept = deactivate_department(db, user.tenant_id, department_id)
    if not dept:
        raise HTTPException(404, "Department not found")
    enriched = list_departments_enriched(db, user.tenant_id)
    match = next((d for d in enriched if d.id == department_id), None)
    if not match:
        raise HTTPException(404, "Department not found")
    return match


@router.get("/employees/summary", response_model=EmployeeSummaryRead)
def employees_summary(tenant_id: int = Depends(ATT_SCOPE), db: Session = Depends(get_db)):
    return get_employee_summary(db, tenant_id)


@router.get("/employees/enriched", response_model=list[EmployeeListRead])
def employees_enriched(tenant_id: int = Depends(ATT_SCOPE), db: Session = Depends(get_db)):
    return list_employees_enriched(db, tenant_id)


@router.get("/attendance/summary", response_model=AttendanceSummaryRead)
def attendance_summary(
    record_date: date | None = Query(None),
    tenant_id: int = Depends(ATT_SCOPE),
    db: Session = Depends(get_db),
):
    return get_attendance_summary(db, tenant_id, record_date)


@router.get("/attendance/enriched", response_model=list[AttendanceListRead])
def attendance_enriched(
    record_date: date | None = Query(None),
    tenant_id: int = Depends(ATT_SCOPE),
    db: Session = Depends(get_db),
):
    return list_attendance_enriched(db, tenant_id, record_date)


@router.get("/leave/summary", response_model=LeaveSummaryRead)
def leave_summary(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return get_leave_summary(db, tenant_id)


@router.get("/leave/enriched", response_model=list[LeaveListRead])
def leave_enriched(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return list_leave_enriched(db, tenant_id)


@router.get("/payroll/summary", response_model=PayrollSummaryRead)
def payroll_summary(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return get_payroll_summary(db, tenant_id)


@router.get("/payroll/enriched", response_model=list[PayrollListRead])
def payroll_enriched(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return list_payroll_enriched(db, tenant_id)


@router.get("/hub", response_model=HRHubRead)
def hr_hub(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    return get_hr_hub(db, tenant_id)
