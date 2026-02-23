#!/usr/bin/env python3
"""
Create test users for the WorkForcePro application.
"""
from sqlmodel import Session, create_engine, select
from app.models import User, UserRole
from app.core.security import get_password_hash
from app.database import engine, create_db_and_tables

def create_users():
    """Create admin and employee test users."""
    create_db_and_tables()
    
    with Session(engine) as session:
        # Check if admin exists
        admin = session.exec(select(User).where(User.email == "admin@workforcepro.com")).first()
        
        if not admin:
            # Create admin user
            admin = User(
                email="admin@workforcepro.com",
                name="Admin User",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.admin,
                is_active=True
            )
            session.add(admin)
            print("✅ Created admin user: admin@workforcepro.com / admin123")
        else:
            print("ℹ️  Admin user already exists")
        
        # Check if employee 1 exists
        emp1 = session.exec(select(User).where(User.email == "employee1@workforcepro.com")).first()
        
        if not emp1:
            emp1 = User(
                email="employee1@workforcepro.com",
                name="Sai Varsha",
                hashed_password=get_password_hash("employee123"),
                role=UserRole.employee,
                is_active=True
            )
            session.add(emp1)
            print("✅ Created employee 1: employee1@workforcepro.com / employee123")
        else:
            print("ℹ️  Employee 1 already exists")
        
        # Check if employee 2 exists
        emp2 = session.exec(select(User).where(User.email == "employee2@workforcepro.com")).first()
        
        if not emp2:
            emp2 = User(
                email="employee2@workforcepro.com",
                name="Raj Kumar",
                hashed_password=get_password_hash("employee123"),
                role=UserRole.employee,
                is_active=True
            )
            session.add(emp2)
            print("✅ Created employee 2: employee2@workforcepro.com / employee123")
        else:
            print("ℹ️  Employee 2 already exists")
        
        # Check if employee 3 exists
        emp3 = session.exec(select(User).where(User.email == "employee3@workforcepro.com")).first()
        
        if not emp3:
            emp3 = User(
                email="employee3@workforcepro.com",
                name="Priya Sharma",
                hashed_password=get_password_hash("employee123"),
                role=UserRole.employee,
                is_active=True
            )
            session.add(emp3)
            print("✅ Created employee 3: employee3@workforcepro.com / employee123")
        else:
            print("ℹ️  Employee 3 already exists")
        
        session.commit()
        print("\n🎉 Database initialized successfully!")
        print("\n📋 Test Credentials:")
        print("   Admin:      admin@workforcepro.com / admin123")
        print("   Employee 1: employee1@workforcepro.com / employee123")
        print("   Employee 2: employee2@workforcepro.com / employee123")
        print("   Employee 3: employee3@workforcepro.com / employee123")

if __name__ == "__main__":
    create_users()
