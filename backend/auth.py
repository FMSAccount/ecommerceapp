import jwt
import os
import hashlib
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from twilio.rest import Client
from typing import Optional, Dict, Any

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "30"))

# Twilio client
twilio_client = None
try:
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID")
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
except Exception as e:
    print(f"Twilio client initialization failed: {e}")

# Security scheme
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password using SHA256 (for testing purposes)"""
    salt = "auth_salt_2024"  # Simple salt for testing
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(plain_password) == hashed_password

def create_access_token(data: Dict[Any, Any]) -> str:
    """Create a JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[Any, Any]:
    """Decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[Any, Any]:
    """Get current user from JWT token"""
    return decode_access_token(credentials.credentials)

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[Any, Any]:
    """Get current admin user from JWT token"""
    payload = decode_access_token(credentials.credentials)
    if payload.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

async def send_otp(phone_number: str) -> bool:
    """Send OTP via Twilio"""
    if not twilio_client:
        raise HTTPException(status_code=500, detail="SMS service not configured")
    
    try:
        verification = twilio_client.verify.services(TWILIO_VERIFY_SERVICE_SID).verifications.create(
            to=phone_number, 
            channel="sms"
        )
        return verification.status == "pending"
    except Exception as e:
        print(f"SMS send error: {e}")
        raise HTTPException(status_code=400, detail="Failed to send OTP")

async def verify_otp(phone_number: str, code: str) -> bool:
    """Verify OTP via Twilio"""
    if not twilio_client:
        raise HTTPException(status_code=500, detail="SMS service not configured")
    
    try:
        verification_check = twilio_client.verify.services(TWILIO_VERIFY_SERVICE_SID).verification_checks.create(
            to=phone_number, 
            code=code
        )
        return verification_check.status == "approved"
    except Exception as e:
        print(f"SMS verify error: {e}")
        return False