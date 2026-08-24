from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.core.security import normalize_email, create_access_token
from backend.app.shared.models import User, Classroom, ClassroomMember
from backend.app.features.auth.schemas import GoogleAuthRequest, UserProfileResponse, MembershipOut, AuthTokenResponse

def authenticate_google_user(db: Session, req: GoogleAuthRequest) -> AuthTokenResponse:
    raw_email = req.email.strip()
    norm_email = normalize_email(raw_email)
    
    # Check domain restriction if classroom_id is given (US-AUTH-02 / FR-AUTH-02)
    if req.classroom_id:
        classroom = db.query(Classroom).filter(Classroom.id == req.classroom_id).first()
        if classroom and classroom.allowed_email_domains:
            domain = norm_email.split("@")[-1] if "@" in norm_email else ""
            if domain not in classroom.allowed_email_domains:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Email domain '@{domain}' is not authorized for this classroom. Allowed: {', '.join(classroom.allowed_email_domains)}"
                )

    # Lookup existing user by normalized email (US-AUTH-03 / FR-AUTH-03)
    user = db.query(User).filter(User.email_normalized == norm_email).first()
    if not user:
        # Create new user
        user = User(
            email_normalized=norm_email,
            email_raw=raw_email,
            display_name=req.display_name or raw_email.split("@")[0],
            google_sub=req.google_sub,
            status="ACTIVE",
            last_login_at=datetime.now(timezone.utc)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if user.status == "DISABLED":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
        # Automatically activate PENDING user on first login (US-AUTH-03)
        if user.status == "PENDING":
            user.status = "ACTIVE"
        if req.google_sub and not user.google_sub:
            user.google_sub = req.google_sub
        if req.display_name and not user.display_name:
            user.display_name = req.display_name
        user.last_login_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email_normalized})
    profile = build_user_profile(db, user)
    return AuthTokenResponse(access_token=token, user=profile)

def build_user_profile(db: Session, user: User) -> UserProfileResponse:
    memberships = []
    for m in user.memberships:
        group_name = m.group.name if m.group else None
        memberships.append(
            MembershipOut(
                id=m.id,
                classroom_id=m.classroom_id,
                classroom_name=m.classroom.name,
                classroom_slug=m.classroom.slug,
                role=m.role,
                group_id=m.group_id,
                group_name=group_name,
                student_id=m.student_id
            )
        )
    return UserProfileResponse(
        id=user.id,
        email_normalized=user.email_normalized,
        email_raw=user.email_raw,
        display_name=user.display_name,
        status=user.status,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        memberships=memberships
    )
