from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
import time

security = HTTPBearer()

def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    print("===== AUTH DEBUG =====")
    print("Token starts with:", credentials.credentials[:10])
    print("Token length:", len(credentials.credentials))
    print("Server time:", int(time.time()))
    print("======================")

    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        print("✅ TOKEN VERIFIED")
        return decoded_token
    except Exception as e:
        print("❌ FIREBASE AUTH ERROR")
        print(type(e))
        print(e)
        print("======================")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
