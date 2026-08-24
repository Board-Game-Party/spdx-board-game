from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.shared.models import User
from backend.app.features.auth.schemas import GoogleAuthRequest, AuthTokenResponse, UserProfileResponse
from backend.app.features.auth.services import authenticate_google_user, build_user_profile

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])

@router.post("/google", response_model=AuthTokenResponse)
def login_google(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate via Google OAuth 2.0 / OIDC or mock dev login"""
    return authenticate_google_user(db, req)

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get profile of current authenticated user"""
    return build_user_profile(db, current_user)
