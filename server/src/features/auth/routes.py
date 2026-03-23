from fastapi import APIRouter
from .schema import LoginRequest, TokenResponse
from . import controller

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    return controller.login(body)

@router.post("/logout")
def logout():
    return controller.logout()