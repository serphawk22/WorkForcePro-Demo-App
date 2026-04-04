"""
One-shot data recovery for hidden projects after org/workspace scoping rollout.

What it fixes:
1) tasks.organization_id is NULL or mismatched
2) tasks.workspace_id is NULL, missing, or points to another org
3) subtasks.organization_id is NULL or mismatched with parent task

Run in production with the same DATABASE_URL used by the API.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Optional

from sqlmodel import Session, select

from app.database import engine
from app.models import Subtask, Task, User, Workspace


@dataclass
class Stats:
    tasks_scanned: int = 0
    tasks_org_fixed: int = 0
    tasks_workspace_fixed: int = 0
    workspaces_created: int = 0
    subtasks_scanned: int = 0
    subtasks_org_fixed: int = 0


def _pick_task_org(task: Task, users: Dict[int, User]) -> Optional[int]:
    """Infer organization from assignee/assigner when task org is missing."""
    if task.assigned_by and task.assigned_by in users:
        return users[task.assigned_by].organization_id
    if task.assigned_to and task.assigned_to in users:
        return users[task.assigned_to].organization_id
    return None


def _get_or_create_default_workspace(
    session: Session,
    organization_id: int,
    created_by: Optional[int],
    stats: Stats,
    workspace_cache: Dict[int, Workspace],
) -> Workspace:
    """Ensure each organization has at least one workspace and return it."""
    cached = workspace_cache.get(organization_id)
    if cached:
        return cached

    existing = session.exec(
        select(Workspace)
        .where(Workspace.organization_id == organization_id)
        .order_by(Workspace.id.asc())
    ).first()
    if existing:
        workspace_cache[organization_id] = existing
        return existing

    fallback_creator = created_by or 1
    new_ws = Workspace(
        name=f"General-{organization_id}",
        description="Auto-created during project visibility recovery",
        icon="GF",
        color="#7C8EA3",
        organization_id=organization_id,
        created_by=fallback_creator,
        created_at=datetime.now(timezone.utc),
    )
    session.add(new_ws)
    session.commit()
    session.refresh(new_ws)

    workspace_cache[organization_id] = new_ws
    stats.workspaces_created += 1
    return new_ws


def run_recovery() -> None:
    stats = Stats()

    with Session(engine) as session:
        users = {u.id: u for u in session.exec(select(User)).all() if u.id is not None}
        workspaces = {w.id: w for w in session.exec(select(Workspace)).all() if w.id is not None}
        org_default_workspace: Dict[int, Workspace] = {}

        tasks = session.exec(select(Task)).all()
        for task in tasks:
            stats.tasks_scanned += 1

            inferred_org = task.organization_id or _pick_task_org(task, users)
            if inferred_org and task.organization_id != inferred_org:
                task.organization_id = inferred_org
                stats.tasks_org_fixed += 1

            # Skip workspace recovery if org is still unknown.
            if not task.organization_id:
                continue

            ws = workspaces.get(task.workspace_id) if task.workspace_id else None
            workspace_invalid = (
                ws is None or ws.organization_id != task.organization_id
            )
            if workspace_invalid:
                creator = task.assigned_by if task.assigned_by in users else None
                default_ws = _get_or_create_default_workspace(
                    session,
                    task.organization_id,
                    creator,
                    stats,
                    org_default_workspace,
                )
                task.workspace_id = default_ws.id
                workspaces[default_ws.id] = default_ws
                stats.tasks_workspace_fixed += 1

            session.add(task)

        session.commit()

        subtasks = session.exec(select(Subtask)).all()
        parent_tasks = {t.id: t for t in session.exec(select(Task)).all() if t.id is not None}
        for subtask in subtasks:
            stats.subtasks_scanned += 1
            parent = parent_tasks.get(subtask.parent_task_id)
            if not parent:
                continue

            if subtask.organization_id != parent.organization_id:
                subtask.organization_id = parent.organization_id
                session.add(subtask)
                stats.subtasks_org_fixed += 1

        session.commit()

    print("Project visibility recovery completed")
    print(f"tasks_scanned={stats.tasks_scanned}")
    print(f"tasks_org_fixed={stats.tasks_org_fixed}")
    print(f"tasks_workspace_fixed={stats.tasks_workspace_fixed}")
    print(f"workspaces_created={stats.workspaces_created}")
    print(f"subtasks_scanned={stats.subtasks_scanned}")
    print(f"subtasks_org_fixed={stats.subtasks_org_fixed}")


if __name__ == "__main__":
    run_recovery()
