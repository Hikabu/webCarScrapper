from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.db import get_session
from src.core.auth import decode_access_token, ADMIN_USERNAME

bearer_scheme = HTTPBearer()

async def get_db() -> AsyncSession:
    async for session in get_session():
        yield session

def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    payload = decode_access_token(credentials.credentials)
    if payload.get("sub") != ADMIN_USERNAME:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return payload