"""Test token decoding."""
import os
from dotenv import load_dotenv
from jose import jwt
from datetime import datetime

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Get a login token
import requests
response = requests.post(
    "http://localhost:8000/auth/login/json",
    json={"email": "admin@gmail.com", "password": "admin"}
)
token_data = response.json()
print(f"Login response: {token_data}")

token = token_data.get("access_token")
if token:
    print(f"\nToken: {token[:50]}...")
    
    # Decode the token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"\nDecoded payload: {payload}")
        print(f"User ID (sub): {payload.get('sub')}")
        print(f"Email: {payload.get('email')}")
        print(f"Role: {payload.get('role')}")
        print(f"Exp: {payload.get('exp')} ({datetime.fromtimestamp(payload.get('exp'))})")
        print(f"Current time: {datetime.utcnow()}")
    except Exception as e:
        print(f"Error decoding token: {e}")
