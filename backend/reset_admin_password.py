from datetime import date

from sqlmodel import Session, select

from app.auth import get_password_hash
from app.database import engine
from app.models import Organization, User, UserRole


def main() -> None:
    email = "admin@gmail.com"
    password = "admin"

    with Session(engine) as session:
        org = session.exec(
            select(Organization).where(Organization.name == "Default Organization")
        ).first()
        if not org:
            org = Organization(name="Default Organization", theme="default", timezone="UTC")
            session.add(org)
            session.commit()
            session.refresh(org)

        admin = session.exec(select(User).where(User.email == email)).first()
        if not admin:
            admin = User(
                name="admin",
                email=email,
                hashed_password=get_password_hash(password),
                role=UserRole.admin,
                organization_id=org.id,
                is_active=True,
                status="APPROVED",
                age=30,
                date_joined=date.today(),
                github_url="https://github.com/admin",
                linkedin_url="https://linkedin.com/in/admin",
            )
            session.add(admin)
        else:
            admin.hashed_password = get_password_hash(password)
            admin.status = "APPROVED"
            admin.is_active = True
            if admin.organization_id is None:
                admin.organization_id = org.id
            session.add(admin)

        session.commit()

    print("Admin ready: admin@gmail.com / admin")


if __name__ == "__main__":
    main()
