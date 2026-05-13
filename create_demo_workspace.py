"""Quick script to create a test workspace for demo."""
import sys
sys.path.insert(0, r'e:\wfp\WorkForcePro-Demo-App\WorkForcePro-Demo-App-main\backend')

from app.database import get_session, engine
from app.models import Workspace, SQLModel
from datetime import datetime, timezone

# Create tables if not exists
SQLModel.metadata.create_all(engine)

# Get a session
with get_session().__next__() as session:
    # Create test workspace
    workspace = Workspace(
        name="Demo Project",
        description="Demo project for ticket management",
        icon="📱",
        color="#7c3aed",
        created_by=1,  # admin user ID
        organization_id=1,  # Default organization
        created_at=datetime.now(timezone.utc)
    )
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    print(f"✅ Created workspace: {workspace.name} (ID: {workspace.id})")
