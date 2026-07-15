from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token, get_current_email
from app.config import Settings, get_settings
from app.schemas import LoginRequest, MeResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, settings: Settings = Depends(get_settings)) -> TokenResponse:
    if body.email.lower() != settings.demo_email.lower() or body.password != settings.demo_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(body.email.lower(), settings)
    return TokenResponse(access_token=token, email=body.email.lower())


@router.get("/me", response_model=MeResponse)
def me(email: str = Depends(get_current_email)) -> MeResponse:
    name = email.split("@")[0].replace(".", " ").title()
    return MeResponse(email=email, display_name=name, role="trader")
