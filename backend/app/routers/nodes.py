"""
Project node hierarchy routes (Jira-style).

Organization -> Workspace -> Parent Node -> Child Node -> Task -> Subtask.
Parent nodes are top-level projects (Epics); child nodes are features/modules
(Stories). Tasks reference the child node they live under via Task.node_id.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_user, get_current_admin_user, ensure_same_organization
from app.database import get_session
from app.models import (
    NodeStatus,
    NodeType,
    ProjectNode,
    ProjectNodeCreate,
    ProjectNodeRead,
    ProjectNodeUpdate,
    NodeTreeNode,
    Task,
    TaskStatus,
    User,
)
from app.routers.tasks import generate_public_id
from app.services import entity_service as es

router = APIRouter(prefix="/nodes", tags=["Project Nodes"])

ENTITY = "node"
# Task statuses that count as "done" for progress calculation.
_DONE_STATUSES = {TaskStatus.approved}


class MemberSetRequest(BaseModel):
    user_ids: List[int] = []


class CommentRequest(BaseModel):
    body: str
    parent_comment_id: Optional[int] = None


# ---------- helpers ----------

def _get_node_or_404(session: Session, node_id: int, current_user: User) -> ProjectNode:
    node = session.exec(select(ProjectNode).where(ProjectNode.id == node_id)).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    ensure_same_organization(current_user, node.organization_id, "node")
    return node


def _child_node_ids(session: Session, parent: ProjectNode) -> List[int]:
    if parent.node_type != NodeType.parent:
        return []
    children = session.exec(
        select(ProjectNode.id).where(ProjectNode.parent_node_id == parent.id)
    ).all()
    return list(children)


def _task_count_for_node(session: Session, node: ProjectNode) -> int:
    if node.node_type == NodeType.child:
        rows = session.exec(select(Task.id).where(Task.node_id == node.id)).all()
        return len(rows)
    # parent: sum tasks across its child nodes
    child_ids = _child_node_ids(session, node)
    if not child_ids:
        return 0
    rows = session.exec(select(Task.id).where(Task.node_id.in_(child_ids))).all()
    return len(rows)


def _progress_for_node(session: Session, node: ProjectNode) -> int:
    if node.node_type == NodeType.child:
        node_ids = [node.id]
    else:
        node_ids = _child_node_ids(session, node)
    if not node_ids:
        return 0
    tasks = session.exec(select(Task.status).where(Task.node_id.in_(node_ids))).all()
    if not tasks:
        return 0
    done = sum(1 for s in tasks if s in _DONE_STATUSES)
    return round(done * 100 / len(tasks))


def _to_read(session: Session, node: ProjectNode, with_members: bool = False) -> ProjectNodeRead:
    owner = None
    if node.owner_id:
        owner = session.exec(select(User).where(User.id == node.owner_id)).first()
    workspace_name = None
    from app.models import Workspace
    ws = session.exec(select(Workspace).where(Workspace.id == node.workspace_id)).first()
    if ws:
        workspace_name = ws.name

    child_count = len(_child_node_ids(session, node)) if node.node_type == NodeType.parent else 0

    return ProjectNodeRead(
        id=node.id,
        organization_id=node.organization_id,
        public_id=node.public_id,
        workspace_id=node.workspace_id,
        workspace_name=workspace_name,
        parent_node_id=node.parent_node_id,
        node_type=node.node_type,
        name=node.name,
        description=node.description,
        owner_id=node.owner_id,
        owner_name=owner.name if owner else None,
        status=node.status,
        priority=node.priority,
        due_date=node.due_date,
        estimated_hours=node.estimated_hours,
        actual_hours=node.actual_hours,
        created_by=node.created_by,
        created_at=node.created_at,
        updated_at=node.updated_at,
        archived_at=node.archived_at,
        child_count=child_count,
        task_count=_task_count_for_node(session, node),
        progress=_progress_for_node(session, node),
        members=es.list_members(session, ENTITY, node.id) if with_members else None,
    )


# ---------- read ----------

@router.get("", response_model=List[ProjectNodeRead])
@router.get("/", response_model=List[ProjectNodeRead], include_in_schema=False)
async def list_nodes(
    workspace_id: int,
    parent_node_id: Optional[int] = None,
    node_type: Optional[NodeType] = None,
    include_archived: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List nodes in a workspace, optionally filtered by parent or type."""
    stmt = select(ProjectNode).where(
        ProjectNode.workspace_id == workspace_id,
        ProjectNode.organization_id == current_user.organization_id,
    )
    if parent_node_id is not None:
        stmt = stmt.where(ProjectNode.parent_node_id == parent_node_id)
    if node_type is not None:
        stmt = stmt.where(ProjectNode.node_type == node_type)
    if not include_archived:
        stmt = stmt.where(ProjectNode.status != NodeStatus.archived)

    nodes = session.exec(stmt.order_by(ProjectNode.created_at.asc())).all()
    return [_to_read(session, n) for n in nodes]


@router.get("/tree", response_model=List[NodeTreeNode])
async def get_workspace_tree(
    workspace_id: int,
    include_archived: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Return the parent -> child node tree for a workspace (for the sidebar)."""
    stmt = select(ProjectNode).where(
        ProjectNode.workspace_id == workspace_id,
        ProjectNode.organization_id == current_user.organization_id,
    )
    if not include_archived:
        stmt = stmt.where(ProjectNode.status != NodeStatus.archived)
    nodes = session.exec(stmt.order_by(ProjectNode.created_at.asc())).all()

    # Per-child direct task counts in one pass.
    child_ids = [n.id for n in nodes if n.node_type == NodeType.child]
    task_counts: dict = {cid: 0 for cid in child_ids}
    if child_ids:
        for nid in session.exec(select(Task.node_id).where(Task.node_id.in_(child_ids))).all():
            if nid in task_counts:
                task_counts[nid] += 1

    def make(n: ProjectNode, children: List[NodeTreeNode], tcount: int) -> NodeTreeNode:
        return NodeTreeNode(
            id=n.id,
            public_id=n.public_id,
            name=n.name,
            node_type=n.node_type,
            parent_node_id=n.parent_node_id,
            status=n.status,
            priority=n.priority,
            task_count=tcount,
            children=children,
        )

    children_by_parent: dict = {}
    for n in nodes:
        if n.node_type == NodeType.child and n.parent_node_id:
            children_by_parent.setdefault(n.parent_node_id, []).append(n)

    tree: List[NodeTreeNode] = []
    for n in nodes:
        if n.node_type != NodeType.parent:
            continue
        kids = [
            make(c, [], task_counts.get(c.id, 0))
            for c in children_by_parent.get(n.id, [])
        ]
        parent_tcount = sum(k.task_count for k in kids)
        tree.append(make(n, kids, parent_tcount))
    return tree


@router.get("/{node_id}", response_model=ProjectNodeRead)
async def get_node(
    node_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    node = _get_node_or_404(session, node_id, current_user)
    return _to_read(session, node, with_members=True)


# ---------- write (admin) ----------

@router.post("", response_model=ProjectNodeRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectNodeRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_node(
    data: ProjectNodeCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Create a parent node (no parent_node_id) or a child node (parent_node_id set)."""
    from app.models import Workspace
    workspace = session.exec(select(Workspace).where(Workspace.id == data.workspace_id)).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    ensure_same_organization(admin, workspace.organization_id, "workspace")

    node_type = NodeType.parent
    if data.parent_node_id is not None:
        parent = _get_node_or_404(session, data.parent_node_id, admin)
        if parent.node_type != NodeType.parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Child nodes can only be created under a parent node",
            )
        if parent.workspace_id != data.workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent node belongs to a different workspace",
            )
        node_type = NodeType.child

    node = ProjectNode(
        organization_id=admin.organization_id,
        public_id=generate_public_id(session, ProjectNode),
        workspace_id=data.workspace_id,
        parent_node_id=data.parent_node_id,
        node_type=node_type,
        name=data.name.strip(),
        description=data.description,
        owner_id=data.owner_id,
        status=data.status or NodeStatus.todo,
        priority=data.priority,
        due_date=data.due_date,
        estimated_hours=data.estimated_hours,
        created_by=admin.id,
    )
    session.add(node)
    session.commit()
    session.refresh(node)

    es.sync_members(session, entity_type=ENTITY, entity_id=node.id, user_ids=data.member_ids)
    es.log_activity(
        session,
        organization_id=admin.organization_id,
        entity_type=ENTITY,
        entity_id=node.id,
        actor_id=admin.id,
        action="created",
        detail=f"Created {node_type.value} node '{node.name}'",
        commit=True,
    )
    return _to_read(session, node, with_members=True)


@router.put("/{node_id}", response_model=ProjectNodeRead)
async def update_node(
    node_id: int,
    data: ProjectNodeUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    node = _get_node_or_404(session, node_id, admin)
    update_data = data.model_dump(exclude_unset=True)
    member_ids = update_data.pop("member_ids", None)

    # Validate a move to a new parent.
    if "parent_node_id" in update_data and update_data["parent_node_id"] is not None:
        new_parent = _get_node_or_404(session, update_data["parent_node_id"], admin)
        if new_parent.node_type != NodeType.parent or node.node_type != NodeType.child:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid node move")

    changed = []
    for key, value in update_data.items():
        if getattr(node, key) != value:
            changed.append(key)
        setattr(node, key, value)
    node.updated_at = datetime.now(timezone.utc)
    session.add(node)
    session.commit()
    session.refresh(node)

    if member_ids is not None:
        es.sync_members(session, entity_type=ENTITY, entity_id=node.id, user_ids=member_ids)
    if changed:
        es.log_activity(
            session,
            organization_id=admin.organization_id,
            entity_type=ENTITY,
            entity_id=node.id,
            actor_id=admin.id,
            action="updated",
            detail="Updated: " + ", ".join(changed),
            commit=True,
        )
    return _to_read(session, node, with_members=True)


@router.post("/{node_id}/archive", response_model=ProjectNodeRead)
async def archive_node(
    node_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    node = _get_node_or_404(session, node_id, admin)
    node.status = NodeStatus.archived
    node.archived_at = datetime.now(timezone.utc)
    node.updated_at = datetime.now(timezone.utc)
    session.add(node)
    session.commit()
    session.refresh(node)
    es.log_activity(
        session,
        organization_id=admin.organization_id,
        entity_type=ENTITY,
        entity_id=node.id,
        actor_id=admin.id,
        action="archived",
        detail=f"Archived node '{node.name}'",
        commit=True,
    )
    return _to_read(session, node)


@router.delete("/{node_id}")
async def delete_node(
    node_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Delete an empty node. Move/delete its child nodes and tasks first."""
    node = _get_node_or_404(session, node_id, admin)

    child_ids = _child_node_ids(session, node)
    if child_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delete or move child nodes before deleting this node",
        )
    task_rows = session.exec(select(Task.id).where(Task.node_id == node.id)).all()
    if task_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Move or delete tasks in this node before deleting it",
        )

    es.delete_entity_aux(session, ENTITY, node.id)
    session.delete(node)
    session.commit()
    return {"message": "Node deleted successfully"}


# ---------- comments / activity / members ----------

@router.get("/{node_id}/comments")
async def get_node_comments(
    node_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _get_node_or_404(session, node_id, current_user)
    return es.list_comments(session, ENTITY, node_id)


@router.post("/{node_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_node_comment(
    node_id: int,
    data: CommentRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    node = _get_node_or_404(session, node_id, current_user)
    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment body required")
    es.add_comment(
        session,
        organization_id=node.organization_id,
        entity_type=ENTITY,
        entity_id=node_id,
        user_id=current_user.id,
        body=body,
        parent_comment_id=data.parent_comment_id,
    )
    es.log_activity(
        session,
        organization_id=node.organization_id,
        entity_type=ENTITY,
        entity_id=node_id,
        actor_id=current_user.id,
        action="commented",
        detail=None,
        commit=True,
    )
    return es.list_comments(session, ENTITY, node_id)


@router.get("/{node_id}/activity")
async def get_node_activity(
    node_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _get_node_or_404(session, node_id, current_user)
    return es.list_activity(session, ENTITY, node_id)


@router.get("/{node_id}/members")
async def get_node_members(
    node_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _get_node_or_404(session, node_id, current_user)
    return es.list_members(session, ENTITY, node_id)


@router.put("/{node_id}/members")
async def set_node_members(
    node_id: int,
    data: MemberSetRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    node = _get_node_or_404(session, node_id, admin)
    es.sync_members(session, entity_type=ENTITY, entity_id=node.id, user_ids=data.user_ids)
    es.log_activity(
        session,
        organization_id=node.organization_id,
        entity_type=ENTITY,
        entity_id=node.id,
        actor_id=admin.id,
        action="members_updated",
        detail=None,
        commit=True,
    )
    return es.list_members(session, ENTITY, node_id)
