from fastapi import HTTPException, status
from . import service
from .schema import LoginRequest, TokenResponse

def login(body: LoginRequest) -> TokenResponse:
    token = service.login(body.username, body.password)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return TokenResponse(access_token=token)

def logout() -> dict:
    # JWT is stateless — client drops the token
    return {"message": "Logged out"}