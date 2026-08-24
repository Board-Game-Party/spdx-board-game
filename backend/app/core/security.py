import hmac
import hashlib
import json
import base64
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.shared.models import User, Classroom, ClassroomMember

security_bearer = HTTPBearer(auto_error=False)

def normalize_email(email: str) -> str:
    """
    US-AUTH-03 / FR-AUTH-03:
    Normalize email: lowercase, strip leading/trailing spaces,
    remove +tags, and remove dots in gmail/googlemail.
    """
    if not email:
        return ""
    email = email.strip().lower()
    if "@" not in email:
        return email
    local, domain = email.split("@", 1)
    # Strip plus tag
    if "+" in local:
        local = local.split("+", 1)[0]
    # Strip dots if gmail
    if domain in ["gmail.com", "googlemail.com"]:
        local = local.replace(".", "")
    return f"{local}@{domain}"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    if expires_delta:
        expire = time.time() + expires_delta.total_seconds()
    else:
        expire = time.time() + (settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600)
    payload.update({"exp": expire})
    
    payload_bytes = json.dumps(payload).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    
    sig = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode("utf-8").rstrip("=")
    
    return f"{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        # verify signature
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256
        ).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
        
        # pad base64
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        payload = json.loads(payload_bytes.decode("utf-8"))
        
        # check exp
        if "exp" in payload and payload["exp"] < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled"
        )
    return user

def get_classroom_or_404(
    classroom_id: str,
    current_user: User,
    db: Session
) -> tuple[Classroom, ClassroomMember]:
    """
    FR-AUTHZ-02 / US-AUTH-04:
    Resource isolation: if user is not in the classroom, return 404 Not Found
    to prevent leaking existence of foreign classrooms.
    """
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    member = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == classroom_id,
        ClassroomMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    return classroom, member

def check_classroom_role(
    member: ClassroomMember,
    allowed_roles: List[str]
):
    """
    FR-AUTHZ-01 / US-AUTH-04:
    Verify user role inside classroom, returning 403 Forbidden if not authorized.
    """
    if member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
        )
