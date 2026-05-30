"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getWorkspaces,
  getWorkspaceProjects,
  getAssignableUsers,
  createTask,
  type Workspace,
  type Task,
  type User,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function avatarInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-indigo-600",
  "from-lime-500 to-green-600",
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  todo: { label: "To Do", color: "text-slate-400", bg: "bg-slate-400/10" },
  in_progress: {
    label: "In Progress",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  submitted: {
    label: "Submitted",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  reviewing: {
    label: "Reviewing",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-400/10" },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; dot: string; bg: string }
> = {
  low: { label: "Low", color: "text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-400/10" },
  medium: { label: "Medium", color: "text-amber-400", dot: "bg-amber-400", bg: "bg-amber-400/10" },
  high: { label: "High", color: "text-red-400", dot: "bg-red-400", bg: "bg-red-400/10" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface WorkspaceWithProjects {
  workspace: Workspace;
  projects: Task[];
  loading: boolean;
  error: string | null;
}

interface AssignTaskPanel {
  open: boolean;
  member: User | null;
  project: Task | null;
  workspaceId: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TeamClient() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [workspaceData, setWorkspaceData] = useState<WorkspaceWithProjects[]>(
    []
  );
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Expanded workspace accordion
  const [expandedWs, setExpandedWs] = useState<Set<number>>(new Set());

  // Selected project for member view
  const [selectedProject, setSelectedProject] = useState<Task | null>(null);

  // Assign task panel state
  const [panel, setPanel] = useState<AssignTaskPanel>({
    open: false,
    member: null,
    project: null,
    workspaceId: null,
  });

  // Search/filter
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] =
    useState<string>("all");

  // ── Load initial data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError(null);

    const [wsRes, usersRes] = await Promise.all([
      getWorkspaces(),
      getAssignableUsers(),
    ]);

    if (wsRes.error) {
      setGlobalError(wsRes.error);
      setGlobalLoading(false);
      return;
    }

    const workspaces = wsRes.data ?? [];
    setAllUsers(usersRes.data ?? []);

    // Init with empty projects list
    const initial: WorkspaceWithProjects[] = workspaces.map((ws) => ({
      workspace: ws,
      projects: [],
      loading: false,
      error: null,
    }));
    setWorkspaceData(initial);
    setGlobalLoading(false);

    // Auto-expand first workspace and fetch its projects
    if (workspaces.length > 0) {
      setExpandedWs(new Set([workspaces[0].id]));
      fetchWorkspaceProjects(workspaces[0].id, initial);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Fetch projects for a specific workspace ────────────────────────────────
  const fetchWorkspaceProjects = async (
    wsId: number,
    currentData?: WorkspaceWithProjects[]
  ) => {
    const base = currentData ?? workspaceData;
    setWorkspaceData((prev) =>
      prev.map((d) =>
        d.workspace.id === wsId ? { ...d, loading: true, error: null } : d
      )
    );

    const res = await getWorkspaceProjects(wsId);
    setWorkspaceData((prev) =>
      prev.map((d) =>
        d.workspace.id === wsId
          ? {
              ...d,
              loading: false,
              projects: res.data?.projects ?? [],
              error: res.error ?? null,
            }
          : d
      )
    );
  };

  // ── Toggle workspace accordion ─────────────────────────────────────────────
  const toggleWorkspace = (wsId: number) => {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) {
        next.delete(wsId);
        if (selectedProject?.workspace_id === wsId) setSelectedProject(null);
      } else {
        next.add(wsId);
        fetchWorkspaceProjects(wsId);
      }
      return next;
    });
  };

  // ── Members for a project ──────────────────────────────────────────────────
  function getProjectMembers(project: Task): User[] {
    const ids = new Set<number>();
    if (project.assigned_to) ids.add(project.assigned_to);
    if (project.assigned_by) ids.add(project.assigned_by);
    return allUsers.filter((u) => ids.has(u.id));
  }

  // Workspace members (union of all project assignees)
  function getWorkspaceMembers(projects: Task[]): User[] {
    const ids = new Set<number>();
    projects.forEach((p) => {
      if (p.assigned_to) ids.add(p.assigned_to);
      if (p.assigned_by) ids.add(p.assigned_by);
    });
    return allUsers.filter((u) => ids.has(u.id));
  }

  // Filtered members for the selected project panel
  const panelMembers = (() => {
    const base = selectedProject
      ? getProjectMembers(selectedProject)
      : allUsers;
    if (!memberSearch.trim()) return base;
    const q = memberSearch.toLowerCase();
    return base.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  })();

  // Workspace filter options
  const allWorkspaces = workspaceData.map((d) => d.workspace);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  if (globalLoading) {
    return <TeamSkeleton />;
  }

  if (globalError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <p className="text-red-400 font-medium">{globalError}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (workspaceData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-purple-500/10 flex items-center justify-center text-4xl">
          🗂️
        </div>
        <h3 className="text-lg font-bold text-foreground">No workspaces yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create a workspace first, then your team structure will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-5 min-h-[600px]">
      {/* ── LEFT: Workspace + Project list ──────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Your Team</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allUsers.length} member{allUsers.length !== 1 ? "s" : ""} across{" "}
              {workspaceData.length} workspace
              {workspaceData.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Workspace filter */}
          <select
            value={selectedWorkspaceFilter}
            onChange={(e) => setSelectedWorkspaceFilter(e.target.value)}
            className="text-sm rounded-xl border border-border bg-card/60 px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
          >
            <option value="all">All Workspaces</option>
            {allWorkspaces.map((ws) => (
              <option key={ws.id} value={String(ws.id)}>
                {ws.icon} {ws.name}
              </option>
            ))}
          </select>
        </div>

        {/* Workspace Accordion */}
        {workspaceData
          .filter(
            (d) =>
              selectedWorkspaceFilter === "all" ||
              String(d.workspace.id) === selectedWorkspaceFilter
          )
          .map(({ workspace, projects, loading, error }) => {
            const isExpanded = expandedWs.has(workspace.id);
            const wsMembers = getWorkspaceMembers(projects);

            return (
              <div
                key={workspace.id}
                className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all"
              >
                {/* Workspace header */}
                <button
                  onClick={() => toggleWorkspace(workspace.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition text-left"
                >
                  <span className="text-2xl flex-shrink-0">
                    {workspace.icon || "📁"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm">
                        {workspace.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {projects.length} project
                        {projects.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {workspace.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {workspace.description}
                      </p>
                    )}
                  </div>

                  {/* Member avatars preview */}
                  {wsMembers.length > 0 && (
                    <div className="flex -space-x-2 mr-2">
                      {wsMembers.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          title={m.name}
                          className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(
                            m.id
                          )} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-card`}
                        >
                          {m.profile_picture ? (
                            <img
                              src={m.profile_picture}
                              alt={m.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            avatarInitials(m.name)
                          )}
                        </div>
                      ))}
                      {wsMembers.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400 ring-2 ring-card">
                          +{wsMembers.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  <svg
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Projects list */}
                {isExpanded && (
                  <div className="border-t border-border/50">
                    {loading ? (
                      <div className="px-5 py-6 space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-14 rounded-xl bg-white/5 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : error ? (
                      <div className="px-5 py-4 text-sm text-red-400">
                        {error}
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                        No projects in this workspace yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {projects.map((project) => {
                          const members = getProjectMembers(project);
                          const st =
                            STATUS_CONFIG[project.status] ??
                            STATUS_CONFIG.todo;
                          const pr =
                            PRIORITY_CONFIG[project.priority] ??
                            PRIORITY_CONFIG.medium;
                          const isSelected =
                            selectedProject?.id === project.id;

                          return (
                            <button
                              key={project.id}
                              onClick={() =>
                                setSelectedProject(
                                  isSelected ? null : project
                                )
                              }
                              className={`w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-white/5 transition ${
                                isSelected
                                  ? "bg-purple-500/10 border-l-2 border-purple-500"
                                  : ""
                              }`}
                            >
                              {/* Priority dot */}
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${pr.dot}`}
                              />

                              {/* Project info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {project.title}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    #{project.public_id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  <span
                                    className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${st.color} ${st.bg}`}
                                  >
                                    {st.label}
                                  </span>
                                  {project.due_date && (
                                    <span className="text-xs text-muted-foreground">
                                      Due{" "}
                                      {new Date(
                                        project.due_date
                                      ).toLocaleDateString("en-GB", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Member avatars */}
                              <div className="flex -space-x-1.5">
                                {members.slice(0, 4).map((m) => (
                                  <div
                                    key={m.id}
                                    title={m.name}
                                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(
                                      m.id
                                    )} flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-card`}
                                  >
                                    {m.profile_picture ? (
                                      <img
                                        src={m.profile_picture}
                                        alt={m.name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      avatarInitials(m.name)
                                    )}
                                  </div>
                                ))}
                                {members.length > 4 && (
                                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[9px] font-bold text-purple-400 ring-1 ring-card">
                                    +{members.length - 4}
                                  </div>
                                )}
                              </div>

                              {/* Arrow */}
                              <svg
                                className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                                  isSelected ? "rotate-90 text-purple-400" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ── RIGHT: Member panel for selected project ─────────────────────── */}
      <div
        className={`transition-all duration-300 flex-shrink-0 ${
          selectedProject ? "w-80 xl:w-96 opacity-100" : "w-0 opacity-0 overflow-hidden"
        }`}
      >
        {selectedProject && (
          <MemberPanel
            project={selectedProject}
            members={panelMembers}
            allUsers={allUsers}
            memberSearch={memberSearch}
            onMemberSearch={setMemberSearch}
            onClose={() => setSelectedProject(null)}
            onAssignTask={(member) => {
              const wsId = selectedProject.workspace_id ?? null;
              setPanel({
                open: true,
                member,
                project: selectedProject,
                workspaceId: wsId,
              });
            }}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* ── Assign / Update Task slide-over ─────────────────────────────── */}
      {panel.open && panel.member && panel.project && (
        <AssignTaskSlideOver
          member={panel.member}
          project={panel.project}
          workspaceId={panel.workspaceId}
          currentUserId={user?.id ?? 0}
          onClose={() =>
            setPanel({ open: false, member: null, project: null, workspaceId: null })
          }
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MemberPanel
// ─────────────────────────────────────────────────────────────────────────────
interface MemberPanelProps {
  project: Task;
  members: User[];
  allUsers: User[];
  memberSearch: string;
  onMemberSearch: (v: string) => void;
  onClose: () => void;
  onAssignTask: (member: User) => void;
  isAdmin: boolean;
}

function MemberPanel({
  project,
  members,
  allUsers,
  memberSearch,
  onMemberSearch,
  onClose,
  onAssignTask,
  isAdmin,
}: MemberPanelProps) {
  const st = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.todo;
  const pr = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.medium;

  return (
    <div className="h-full rounded-2xl border border-border bg-card/70 backdrop-blur-sm overflow-hidden flex flex-col sticky top-4">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-purple-400 mb-1">
              Project Members
            </p>
            <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${st.color} ${st.bg}`}
              >
                {st.label}
              </span>
              <span className={`text-xs font-medium ${pr.color}`}>
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${pr.dot} mr-1`}
                />
                {pr.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition flex-shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search members…"
            value={memberSearch}
            onChange={(e) => onMemberSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white/5 border border-border/50 text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30">
        {members.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground px-4">
            {memberSearch
              ? "No members match your search."
              : "No members assigned to this project yet."}
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition group"
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(
                  member.id
                )} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
              >
                {member.profile_picture ? (
                  <img
                    src={member.profile_picture}
                    alt={member.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  avatarInitials(member.name)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
                <span
                  className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 font-medium ${
                    member.role === "admin"
                      ? "bg-purple-500/15 text-purple-400"
                      : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  {member.role}
                </span>
              </div>

              {/* Assign button */}
              {isAdmin && (
                <button
                  onClick={() => onAssignTask(member)}
                  title="Assign daily task / update"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer: total count */}
      <div className="px-4 py-3 border-t border-border/50 text-xs text-muted-foreground">
        {members.length} member{members.length !== 1 ? "s" : ""} shown
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AssignTaskSlideOver
// ─────────────────────────────────────────────────────────────────────────────
interface AssignTaskSlideOverProps {
  member: User;
  project: Task;
  workspaceId: number | null;
  currentUserId: number;
  onClose: () => void;
}

type FormType = "task" | "update";

function AssignTaskSlideOver({
  member,
  project,
  workspaceId,
  currentUserId,
  onClose,
}: AssignTaskSlideOverProps) {
  const [formType, setFormType] = useState<FormType>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    const taskTitle =
      formType === "update"
        ? `[Daily Update] ${title.trim()}`
        : title.trim();

    const res = await createTask({
      title: taskTitle,
      workspace_id: workspaceId ?? project.workspace_id ?? 0,
      parent_task_id: project.id,
      description: description || undefined,
      priority,
      start_date: today,
      due_date: dueDate || undefined,
      estimated_hours: estimatedHours ? Number(estimatedHours) : undefined,
      assigned_to: member.id,
      assigned_by: currentUserId,
    });

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(onClose, 1600);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-gradient-to-r from-purple-600/10 to-pink-600/10">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {formType === "update" ? "Log Daily Update" : "Assign Task"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              For{" "}
              <span className="text-purple-400 font-semibold">
                {member.name}
              </span>{" "}
              · {project.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-6 pt-5">
          <div className="flex rounded-xl overflow-hidden border border-border bg-muted/30 p-1 gap-1">
            {(["task", "update"] as FormType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  formType === t
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "task" ? "🎯 Assign Task" : "📋 Daily Update"}
              </button>
            ))}
          </div>
        </div>

        {/* Member chip */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border/50">
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(
                member.id
              )} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
            >
              {member.profile_picture ? (
                <img
                  src={member.profile_picture}
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                avatarInitials(member.name)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {member.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.email}
              </p>
            </div>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-400 font-medium">
              Assignee
            </span>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {formType === "update" ? "Update Title" : "Task Title"}{" "}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                formType === "update"
                  ? "e.g. End-of-day standup notes"
                  : "e.g. Fix login bug"
              }
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white/5 text-foreground placeholder-muted-foreground text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={
                formType === "update"
                  ? "What did the team member work on today?"
                  : "Describe the task in detail…"
              }
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white/5 text-foreground placeholder-muted-foreground text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      priority === p
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`}
                    />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due date + Est. hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                min={today}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white/5 text-foreground text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Est. Hours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white/5 text-foreground text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition"
              />
            </div>
          </div>

          {/* Project context chip */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-border/50">
            <span className="text-lg">📌</span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Under project</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {project.title}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center gap-2">
              <span>✅</span>
              {formType === "update" ? "Update logged!" : "Task assigned!"}{" "}
              Closing…
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={submitting || !title.trim() || success}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                {formType === "update" ? "📋 Log Update" : "🎯 Assign Task"}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-white/10 rounded-lg w-40" />
              <div className="h-3 bg-white/5 rounded w-24" />
            </div>
            <div className="flex -space-x-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="w-7 h-7 rounded-full bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
