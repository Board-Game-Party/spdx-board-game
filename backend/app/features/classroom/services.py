import csv
import io
import re
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.core.security import normalize_email
from backend.app.shared.models import User, Classroom, ClassroomMember, GroupEntity
from backend.app.features.classroom.schemas import (
    CreateClassroomRequest, UpdateClassroomRequest, ClassroomDetail, ClassroomSummary,
    ClassroomMemberOut, GroupSummary, AddMemberRequest, UpdateMemberRequest,
    RosterImportResult, RosterDiffItem
)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def sanitize_csv_cell(value: str) -> str:
    """FR-SEC-04: Escape potential formula injection triggers"""
    if not value:
        return ""
    val_str = str(value).strip()
    if val_str.startswith(("=", "+", "-", "@")):
        return "'" + val_str
    return val_str

def create_classroom(db: Session, req: CreateClassroomRequest, current_user: User) -> ClassroomDetail:
    existing = db.query(Classroom).filter(Classroom.slug == req.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Classroom slug '{req.slug}' is already taken")
    
    classroom = Classroom(
        name=req.name,
        slug=req.slug,
        timezone=req.timezone,
        created_by=current_user.id,
        status="ACTIVE"
    )
    classroom.allowed_email_domains = req.allowed_email_domains
    db.add(classroom)
    db.flush()

    # Add current user as OWNER
    owner_member = ClassroomMember(
        classroom_id=classroom.id,
        user_id=current_user.id,
        role="OWNER"
    )
    db.add(owner_member)
    db.commit()
    db.refresh(classroom)

    return get_classroom_detail(db, classroom)

def update_classroom(db: Session, classroom: Classroom, req: UpdateClassroomRequest) -> ClassroomDetail:
    if req.name is not None:
        classroom.name = req.name
    if req.timezone is not None:
        classroom.timezone = req.timezone
    if req.allowed_email_domains is not None:
        classroom.allowed_email_domains = req.allowed_email_domains
    if req.status is not None:
        classroom.status = req.status
    
    db.commit()
    db.refresh(classroom)
    return get_classroom_detail(db, classroom)

def list_user_classrooms(db: Session, current_user: User, status_filter: str = "ACTIVE") -> List[ClassroomSummary]:
    memberships = db.query(ClassroomMember).filter(ClassroomMember.user_id == current_user.id).all()
    results = []
    for m in memberships:
        c = m.classroom
        if status_filter != "ALL" and c.status != status_filter:
            continue
        mem_count = db.query(ClassroomMember).filter(ClassroomMember.classroom_id == c.id).count()
        grp_count = db.query(GroupEntity).filter(GroupEntity.classroom_id == c.id).count()
        results.append(
            ClassroomSummary(
                id=c.id,
                name=c.name,
                slug=c.slug,
                timezone=c.timezone,
                status=c.status,
                role=m.role,
                member_count=mem_count,
                group_count=grp_count,
                created_at=c.created_at
            )
        )
    return results

def get_classroom_detail(db: Session, classroom: Classroom) -> ClassroomDetail:
    members = db.query(ClassroomMember).filter(ClassroomMember.classroom_id == classroom.id).all()
    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == classroom.id).all()

    member_outs = []
    for m in members:
        g_name = m.group.name if m.group else None
        member_outs.append(
            ClassroomMemberOut(
                id=m.id,
                user_id=m.user_id,
                email_raw=m.user.email_raw,
                email_normalized=m.user.email_normalized,
                display_name=m.user.display_name,
                role=m.role,
                group_id=m.group_id,
                group_name=g_name,
                student_id=m.student_id,
                user_status=m.user.status,
                joined_at=m.joined_at
            )
        )

    group_outs = []
    for g in groups:
        cnt = db.query(ClassroomMember).filter(ClassroomMember.group_id == g.id).count()
        group_outs.append(
            GroupSummary(id=g.id, name=g.name, member_count=cnt)
        )

    return ClassroomDetail(
        id=classroom.id,
        name=classroom.name,
        slug=classroom.slug,
        timezone=classroom.timezone,
        allowed_email_domains=classroom.allowed_email_domains,
        status=classroom.status,
        created_by=classroom.created_by,
        created_at=classroom.created_at,
        members=member_outs,
        groups=group_outs
    )

def add_classroom_member(db: Session, classroom: Classroom, req: AddMemberRequest) -> ClassroomMemberOut:
    raw_email = req.email.strip()
    norm_email = normalize_email(raw_email)
    
    # Check domain if configured
    if classroom.allowed_email_domains:
        domain = norm_email.split("@")[-1] if "@" in norm_email else ""
        if domain not in classroom.allowed_email_domains:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Email domain '@{domain}' is not allowed in this classroom"
            )

    user = db.query(User).filter(User.email_normalized == norm_email).first()
    if not user:
        user = User(
            email_normalized=norm_email,
            email_raw=raw_email,
            display_name=req.display_name or raw_email.split("@")[0],
            status="PENDING"
        )
        db.add(user)
        db.flush()

    existing_member = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == classroom.id,
        ClassroomMember.user_id == user.id
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already enrolled in this classroom"
        )

    group_id = None
    if req.group_name:
        sanitized_grp = sanitize_csv_cell(req.group_name)
        grp = db.query(GroupEntity).filter(
            GroupEntity.classroom_id == classroom.id,
            GroupEntity.name == sanitized_grp
        ).first()
        if not grp:
            grp = GroupEntity(classroom_id=classroom.id, name=sanitized_grp)
            db.add(grp)
            db.flush()
        group_id = grp.id

    member = ClassroomMember(
        classroom_id=classroom.id,
        user_id=user.id,
        role=req.role,
        group_id=group_id,
        student_id=req.student_id
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    g_name = member.group.name if member.group else None
    return ClassroomMemberOut(
        id=member.id,
        user_id=user.id,
        email_raw=user.email_raw,
        email_normalized=user.email_normalized,
        display_name=user.display_name,
        role=member.role,
        group_id=member.group_id,
        group_name=g_name,
        student_id=member.student_id,
        user_status=user.status,
        joined_at=member.joined_at
    )

def update_classroom_member(
    db: Session,
    classroom: Classroom,
    member_id: str,
    payload: UpdateMemberRequest
) -> ClassroomMember:
    member = db.query(ClassroomMember).filter(
        ClassroomMember.id == member_id,
        ClassroomMember.classroom_id == classroom.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if payload.role is not None:
        if payload.role not in {"OWNER", "CO_TEACHER", "TA", "STUDENT"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        if member.role == "OWNER" and payload.role != "OWNER":
            owner_count = db.query(ClassroomMember).filter(
                ClassroomMember.classroom_id == classroom.id,
                ClassroomMember.role == "OWNER"
            ).count()
            if owner_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot demote the last remaining Owner from the classroom"
                )
        member.role = payload.role

    if payload.student_id is not None:
        member.student_id = sanitize_csv_cell(payload.student_id) if payload.student_id.strip() else None

    if payload.group_name is not None:
        raw_grp = payload.group_name.strip()
        if not raw_grp:
            member.group_id = None
        else:
            sanitized_grp = sanitize_csv_cell(raw_grp)
            grp = db.query(GroupEntity).filter(
                GroupEntity.classroom_id == classroom.id,
                GroupEntity.name == sanitized_grp
            ).first()
            if not grp:
                grp = GroupEntity(classroom_id=classroom.id, name=sanitized_grp)
                db.add(grp)
                db.flush()
            member.group_id = grp.id

    db.commit()
    db.refresh(member)
    return member

def remove_classroom_member(db: Session, classroom: Classroom, member_id: str):
    member = db.query(ClassroomMember).filter(
        ClassroomMember.id == member_id,
        ClassroomMember.classroom_id == classroom.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    # FR-CLASS-06: Prevent removing the last owner
    if member.role == "OWNER":
        owner_count = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == classroom.id,
            ClassroomMember.role == "OWNER"
        ).count()
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot remove the last remaining Owner from the classroom"
            )

    db.delete(member)
    db.commit()

def import_roster_csv(
    db: Session,
    classroom: Classroom,
    csv_content: str,
    mode: str = "UPSERT",
    dry_run: bool = False
) -> RosterImportResult:
    """
    US-CLASS-02 / US-CLASS-03 / FR-CLASS-01..05 / FR-SEC-04:
    Atomic CSV import with formula injection prevention and group size checks.
    """
    # Remove UTF-8 BOM if present
    if csv_content.startswith("\ufeff"):
        csv_content = csv_content[1:]
    
    reader = csv.reader(io.StringIO(csv_content))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty")

    header = [h.strip().lower() for h in rows[0]]
    if "email" not in header or "group_name" not in header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV header must contain at least 'email' and 'group_name'"
        )

    email_idx = header.index("email")
    group_idx = header.index("group_name")
    student_id_idx = header.index("student_id") if "student_id" in header else -1
    name_idx = header.index("display_name") if "display_name" in header else -1

    parsed_students = []
    seen_emails = set()
    group_counts = {}

    for row_idx, row in enumerate(rows[1:], start=2):
        if not row or not any(field.strip() for field in row):
            continue  # Skip empty line
        if len(row) <= max(email_idx, group_idx):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"row {row_idx}: incomplete columns"
            )
        
        raw_email = row[email_idx].strip()
        raw_group = row[group_idx].strip()
        raw_sid = row[student_id_idx].strip() if student_id_idx != -1 and len(row) > student_id_idx else ""
        raw_name = row[name_idx].strip() if name_idx != -1 and len(row) > name_idx else ""

        # Validate email
        if not raw_email or not EMAIL_REGEX.match(raw_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"row {row_idx}: invalid email format"
            )
        
        norm_email = normalize_email(raw_email)
        if norm_email in seen_emails:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"row {row_idx}: duplicate email '{raw_email}' in CSV"
            )
        seen_emails.add(norm_email)

        # Validate group name
        if not raw_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"row {row_idx}: group_name cannot be empty"
            )

        sanitized_group = sanitize_csv_cell(raw_group)
        sanitized_sid = sanitize_csv_cell(raw_sid)
        sanitized_name = sanitize_csv_cell(raw_name)

        group_counts[sanitized_group] = group_counts.get(sanitized_group, 0) + 1

        parsed_students.append({
            "email_raw": raw_email,
            "email_normalized": norm_email,
            "group_name": sanitized_group,
            "student_id": sanitized_sid,
            "display_name": sanitized_name
        })

    # Validate group size (must be at least 2 members for peer/group eval)
    for g_name, cnt in group_counts.items():
        if cnt < 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Group '{g_name}' has only {cnt} member(s). Each group must have at least 2 members."
            )

    # Compute diffs with current DB state
    current_members = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == classroom.id,
        ClassroomMember.role == "STUDENT"
    ).all()
    current_map = {m.user.email_normalized: m for m in current_members}

    diffs = []
    for s in parsed_students:
        norm = s["email_normalized"]
        if norm in current_map:
            m = current_map[norm]
            old_g = m.group.name if m.group else None
            new_g = s["group_name"]
            action = "UPDATED" if old_g != new_g else "UNCHANGED"
            diffs.append(RosterDiffItem(
                email=s["email_raw"],
                student_id=s["student_id"],
                display_name=s["display_name"],
                old_group=old_g,
                new_group=new_g,
                action=action
            ))
        else:
            diffs.append(RosterDiffItem(
                email=s["email_raw"],
                student_id=s["student_id"],
                display_name=s["display_name"],
                old_group=None,
                new_group=s["group_name"],
                action="ADDED"
            ))

    if mode == "REPLACE":
        parsed_norm_set = set(s["email_normalized"] for s in parsed_students)
        for norm, m in current_map.items():
            if norm not in parsed_norm_set:
                diffs.append(RosterDiffItem(
                    email=m.user.email_raw,
                    student_id=m.student_id,
                    display_name=m.user.display_name,
                    old_group=m.group.name if m.group else None,
                    new_group=None,
                    action="REMOVED"
                ))

    warnings = []
    for g_name, cnt in group_counts.items():
        if cnt < 4 or cnt > 7:
            warnings.append(f"Group '{g_name}' has {cnt} members (recommended size is 4–7).")

    if dry_run:
        return RosterImportResult(
            success=True,
            mode=mode,
            dry_run=True,
            total_rows=len(parsed_students),
            imported_students=len(parsed_students),
            groups_created=len(group_counts),
            warnings=warnings,
            diffs=diffs
        )

    # Execute DB modifications
    if mode == "REPLACE":
        for m in current_members:
            if m.user.email_normalized not in seen_emails:
                db.delete(m)

    # Upsert groups
    groups_dict = {}
    for g_name in group_counts.keys():
        grp = db.query(GroupEntity).filter(
            GroupEntity.classroom_id == classroom.id,
            GroupEntity.name == g_name
        ).first()
        if not grp:
            grp = GroupEntity(classroom_id=classroom.id, name=g_name)
            db.add(grp)
            db.flush()
        groups_dict[g_name] = grp

    # Upsert users and memberships
    for s in parsed_students:
        user = db.query(User).filter(User.email_normalized == s["email_normalized"]).first()
        if not user:
            user = User(
                email_normalized=s["email_normalized"],
                email_raw=s["email_raw"],
                display_name=s["display_name"] or s["email_raw"].split("@")[0],
                status="PENDING"
            )
            db.add(user)
            db.flush()
        else:
            if s["display_name"] and not user.display_name:
                user.display_name = s["display_name"]

        grp = groups_dict[s["group_name"]]
        mem = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == classroom.id,
            ClassroomMember.user_id == user.id
        ).first()
        if not mem:
            mem = ClassroomMember(
                classroom_id=classroom.id,
                user_id=user.id,
                role="STUDENT",
                group_id=grp.id,
                student_id=s["student_id"]
            )
            db.add(mem)
        else:
            mem.group_id = grp.id
            if s["student_id"]:
                mem.student_id = s["student_id"]

    db.commit()

    return RosterImportResult(
        success=True,
        mode=mode,
        dry_run=False,
        total_rows=len(parsed_students),
        imported_students=len(parsed_students),
        groups_created=len(groups_dict),
        warnings=warnings,
        diffs=diffs
    )
