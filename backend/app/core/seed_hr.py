"""Seed sample HR shifts, employees, and attendance data."""

from datetime import date, datetime, time, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hr import AttendanceRecord, Employee, Shift
from app.models.tenant import Tenant


def seed_hr_data(db: Session, tenant_id: int = 1) -> None:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        return

    # 1. Seed Shifts
    shifts_def = [
        {"name": "Day Shift", "start_time": time(8, 0), "end_time": time(16, 30), "break_minutes": 30, "capacity_hours": 8.0},
        {"name": "Night Shift", "start_time": time(20, 0), "end_time": time(4, 30), "break_minutes": 30, "capacity_hours": 8.0},
        {"name": "General Shift", "start_time": time(9, 0), "end_time": time(17, 30), "break_minutes": 30, "capacity_hours": 8.0},
    ]
    shift_objs = {}
    for s_info in shifts_def:
        s = db.scalars(
            select(Shift).where(Shift.tenant_id == tenant_id, Shift.name == s_info["name"])
        ).first()
        if not s:
            s = Shift(
                tenant_id=tenant_id,
                name=s_info["name"],
                start_time=s_info["start_time"],
                end_time=s_info["end_time"],
                break_minutes=s_info["break_minutes"],
                capacity_hours=s_info["capacity_hours"],
            )
            db.add(s)
            db.flush()
        shift_objs[s_info["name"]] = s

    # 2. Seed Employees
    employees_def = [
        {
            "employee_code": "EMP-001",
            "full_name": "Maya Operator",
            "email": "operator@gnsinsights.com",
            "department": "Production",
            "designation": "CNC Operator",
            "shift_name": "Day Shift",
            "employment_type": "full_time",
            "hourly_rate": 250.0,
            "salary": 45000.0,
        },
        {
            "employee_code": "EMP-002",
            "full_name": "Rajesh Kumar",
            "email": "rajesh.kumar@gnsinsights.com",
            "department": "Production",
            "designation": "Senior Machinist",
            "shift_name": "Day Shift",
            "employment_type": "full_time",
            "hourly_rate": 300.0,
            "salary": 55000.0,
        },
        {
            "employee_code": "EMP-003",
            "full_name": "Sunita Sharma",
            "email": "sunita.sharma@gnsinsights.com",
            "department": "Quality Control",
            "designation": "Quality Inspector",
            "shift_name": "General Shift",
            "employment_type": "full_time",
            "hourly_rate": 280.0,
            "salary": 50000.0,
        },
        {
            "employee_code": "EMP-004",
            "full_name": "Amit Patel",
            "email": "amit.patel@gnsinsights.com",
            "department": "Operations",
            "designation": "Shopfloor Supervisor",
            "shift_name": "Night Shift",
            "employment_type": "full_time",
            "hourly_rate": 350.0,
            "salary": 65000.0,
        },
        {
            "employee_code": "EMP-005",
            "full_name": "Priya Singh",
            "email": "priya.singh@gnsinsights.com",
            "department": "Production",
            "designation": "Assembly Line Specialist",
            "shift_name": "Day Shift",
            "employment_type": "full_time",
            "hourly_rate": 220.0,
            "salary": 40000.0,
        },
    ]

    emp_objs = []
    today = date.today()

    for e_info in employees_def:
        emp = db.scalars(
            select(Employee).where(Employee.tenant_id == tenant_id, Employee.employee_code == e_info["employee_code"])
        ).first()
        if not emp:
            emp = Employee(
                tenant_id=tenant_id,
                employee_code=e_info["employee_code"],
                full_name=e_info["full_name"],
                email=e_info["email"],
                department=e_info["department"],
                designation=e_info["designation"],
                shift_name=e_info["shift_name"],
                employment_type=e_info["employment_type"],
                hourly_rate=e_info["hourly_rate"],
                salary=e_info["salary"],
                hire_date=today,
                is_active=True,
            )
            db.add(emp)
            db.flush()
        emp_objs.append(emp)

    # 3. Seed Today's Attendance Records if empty
    att_count = db.scalar(
        select(AttendanceRecord).where(AttendanceRecord.tenant_id == tenant_id, AttendanceRecord.record_date == today)
    )
    if not att_count and emp_objs:
        now_utc = datetime.now(timezone.utc)
        for i, emp in enumerate(emp_objs):
            shift_obj = shift_objs.get(emp.shift_name)
            status_val = "present" if i < 4 else "absent"
            att = AttendanceRecord(
                tenant_id=tenant_id,
                employee_id=emp.id,
                shift_id=shift_obj.id if shift_obj else None,
                record_date=today,
                clock_in=now_utc if status_val == "present" else None,
                clock_out=None,
                break_minutes=0,
                work_hours=4.0 if status_val == "present" else 0.0,
                overtime_hours=0.0,
                capacity_hours=8.0,
                status=status_val,
                source="Biometric",
            )
            db.add(att)

    db.commit()
