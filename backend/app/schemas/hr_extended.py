from pydantic import BaseModel


class EmployeeSummaryRead(BaseModel):
    total_employees: int = 0
    present_today: int = 0
    absent: int = 0
    on_leave: int = 0
    overtime: float = 0
    departments: int = 0
    contract_employees: int = 0
    new_joiners: int = 0


class EmployeeListRead(BaseModel):
    id: int
    employee_id: str
    employee_code: str | None = None
    full_name: str
    department: str | None = None
    designation: str | None = None
    shift: str | None = None
    reporting_manager: str | None = None
    employment_type: str | None = None
    status: str = "active"
    phone: str | None = None
    email: str | None = None
    joining_date: str | None = None
    salary: float | None = None
    initials: str | None = None


class AttendanceSummaryRead(BaseModel):
    present: int = 0
    absent: int = 0
    late: int = 0
    half_day: int = 0
    overtime: float = 0
    night_shift: int = 0
    total_working_hours: float = 0


class AttendanceListRead(BaseModel):
    id: int
    employee_name: str
    shift: str | None = None
    check_in: str | None = None
    check_out: str | None = None
    break_minutes: int = 0
    working_hours: float | None = None
    overtime: float | None = None
    status: str = "present"
    source: str | None = None
    record_date: str | None = None


class LeaveSummaryRead(BaseModel):
    pending_leave: int = 0
    approved: int = 0
    rejected: int = 0
    available_leave: float = 0
    sick_leave: float = 0
    casual_leave: float = 0
    earned_leave: float = 0


class LeaveListRead(BaseModel):
    id: int
    employee_name: str
    leave_type: str
    start_date: str
    end_date: str
    days: float
    reason: str | None = None
    status: str = "pending"


class PayrollSummaryRead(BaseModel):
    monthly_payroll: float = 0
    pending_salary: float = 0
    processed_salary: float = 0
    overtime_cost: float = 0
    pf: float = 0
    esi: float = 0
    professional_tax: float = 0


class PayrollListRead(BaseModel):
    id: int
    employee_name: str
    basic: float = 0
    allowance: float = 0
    overtime: float = 0
    bonus: float = 0
    pf: float = 0
    esi: float = 0
    tax: float = 0
    gross_pay: float = 0
    deductions: float = 0
    net_salary: float = 0
    status: str = "draft"
    period_start: str | None = None
    period_end: str | None = None


class HRHubRead(BaseModel):
    total_employees: int = 0
    present_today: int = 0
    pending_leave: int = 0
    monthly_payroll: float = 0
    overtime_hours: float = 0
    new_joiners: int = 0
    attrition_rate: float = 0
    department_strength: list[dict] = []
    shift_utilization: list[dict] = []
    alerts: list[dict] = []
