"""
Migration: legacy task tree -> explicit Project Node hierarchy.

Old model overloaded the `tasks` table as both project containers (root tasks)
and work units. The new model is:

    Organization -> Workspace -> Parent Node -> Child Node -> Task -> Subtask

This script is LOSSLESS and IDEMPOTENT:
  * creates the new tables (project_nodes, members, comments, activity_logs)
  * adds tasks.node_id if missing
  * for every workspace, each legacy ROOT task becomes a Parent Node with a
    single "General" Child Node; the root task and all of its descendants are
    re-parented under that Child Node via Task.node_id.

Run:  cd backend && python migrate_node_hierarchy.py
"""
from sqlalchemy import text
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models import (
    NodeStatus,
    NodeType,
    ProjectNode,
    Task,
    TaskStatus,
    Workspace,
)
from app.routers.tasks import generate_public_id


def _status_to_node_status(status: TaskStatus) -> NodeStatus:
    if status == TaskStatus.approved:
        return NodeStatus.done
    if status in (TaskStatus.in_progress, TaskStatus.submitted, TaskStatus.reviewing):
        return NodeStatus.in_progress
    return NodeStatus.todo


def _ensure_schema() -> None:
    # Creates any missing tables (project_nodes, members, comments, activity_logs, ...).
    create_db_and_tables()
    # tasks.node_id is a new column on an existing table -> needs an explicit ALTER.
    with engine.connect() as conn:
        for stmt in (
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS node_id INTEGER",
            "CREATE INDEX IF NOT EXISTS ix_tasks_node_id ON tasks(node_id)",
        ):
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as exc:  # noqa: BLE001 - best effort per-statement
                print(f"[skip] {stmt} -> {exc}")


def _root_of(task: Task, by_id: dict) -> Task:
    """Walk parent_task_id within the same workspace to the topmost ancestor."""
    cur = task
    seen = set()
    while cur.parent_task_id and cur.parent_task_id in by_id and cur.id not in seen:
        seen.add(cur.id)
        cur = by_id[cur.parent_task_id]
    return cur


def migrate() -> None:
    _ensure_schema()

    created_parents = created_children = assigned = 0

    with Session(engine) as session:
        workspaces = session.exec(select(Workspace)).all()
        for ws in workspaces:
            tasks = session.exec(select(Task).where(Task.workspace_id == ws.id)).all()
            pending = [t for t in tasks if t.node_id is None]
            if not pending:
                continue

            by_id = {t.id: t for t in tasks}

            # Group pending tasks under their legacy root task.
            groups: dict = {}
            for t in pending:
                root = _root_of(t, by_id)
                groups.setdefault(root.id, []).append(t)

            for root_id, group in groups.items():
                root = by_id[root_id]

                if root.node_id:
                    # Root already migrated in a previous run -> reuse its child node.
                    child_node_id = root.node_id
                else:
                    parent_node = ProjectNode(
                        organization_id=ws.organization_id,
                        public_id=generate_public_id(session, ProjectNode),
                        workspace_id=ws.id,
                        parent_node_id=None,
                        node_type=NodeType.parent,
                        name=(root.title or "Imported Project")[:200],
                        description=root.description,
                        owner_id=root.assigned_to,
                        status=_status_to_node_status(root.status),
                        priority=root.priority,
                        due_date=root.due_date,
                        created_by=root.assigned_by,
                    )
                    session.add(parent_node)
                    session.commit()
                    session.refresh(parent_node)
                    created_parents += 1

                    child_node = ProjectNode(
                        organization_id=ws.organization_id,
                        public_id=generate_public_id(session, ProjectNode),
                        workspace_id=ws.id,
                        parent_node_id=parent_node.id,
                        node_type=NodeType.child,
                        name="General",
                        description="Imported tasks",
                        owner_id=root.assigned_to,
                        status=NodeStatus.todo,
                        priority=root.priority,
                        created_by=root.assigned_by,
                    )
                    session.add(child_node)
                    session.commit()
                    session.refresh(child_node)
                    created_children += 1
                    child_node_id = child_node.id

                for t in group:
                    if t.node_id is None:
                        t.node_id = child_node_id
                        session.add(t)
                        assigned += 1
                session.commit()

    print(
        f"[migrate_node_hierarchy] done: parent_nodes={created_parents} "
        f"child_nodes={created_children} tasks_assigned={assigned}"
    )


if __name__ == "__main__":
    migrate()
