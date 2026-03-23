from src.core.auth import verify_credentials, create_access_token

def login(username: str, password: str) -> str:
    if not verify_credentials(username, password):
        return None
    return create_access_token(sub=username)