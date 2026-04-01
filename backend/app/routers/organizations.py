"""Organization settings routes for multi-tenant management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_admin_user, get_current_user, ensure_same_organization
from app.database import get_session
from app.models import Organization, OrganizationRead, OrganizationUpdate, User

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/me", response_model=OrganizationRead)
async def get_my_organization(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get current user's organization settings."""
    org = session.exec(select(Organization).where(Organization.id == current_user.organization_id)).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    ensure_same_organization(current_user, org.id, "organization")
    return org


@router.put("/me", response_model=OrganizationRead)
async def update_my_organization(
    payload: OrganizationUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Update current organization settings (admin only)."""
    org = session.exec(select(Organization).where(Organization.id == admin.organization_id)).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"]:
        updated_name = update_data["name"].strip()
        existing = session.exec(select(Organization).where(Organization.name == updated_name, Organization.id != org.id)).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization name already exists")
        update_data["name"] = updated_name

    for key, value in update_data.items():
        setattr(org, key, value)

    session.add(org)
    session.commit()
    session.refresh(org)
    return org
