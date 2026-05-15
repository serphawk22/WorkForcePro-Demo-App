import os
import sys
from dotenv import load_dotenv

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

load_dotenv()

from app.database import engine, create_db_and_tables
from sqlalchemy import text

def test_connection():
    url = os.getenv('DATABASE_URL')
    print(f"Testing connection to: {url}")
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            version = result.fetchone()
            print(f"Connection successful! PostgreSQL version: {version[0]}")
            
            print("Ensuring tables are created...")
            create_db_and_tables()
            print("Tables verified/created.")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connection()
