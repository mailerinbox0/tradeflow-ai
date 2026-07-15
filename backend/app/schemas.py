from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class MeResponse(BaseModel):
    email: EmailStr
    display_name: str
    role: str = "trader"


class MarketTicker(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    volume_24h: float


class HealthResponse(BaseModel):
    ok: bool = True
    service: str
    version: str
