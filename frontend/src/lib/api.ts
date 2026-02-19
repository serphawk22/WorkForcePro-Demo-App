/**
 * API client for connecting to FastAPI backend.
 * Uses HTTP-only cookies for authentication.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000");

// ==================== TYPES ====================

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: number;
  name: string;
}

interface RegisterResponse {
  message: string;
  user_id: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  total_hours: number | null;
  user_name?: string;
  user_email?: string;
}

export interface AttendanceStatus {
  status: "not_started" | "working" | "completed";
  punch_in: string | null;
  punch_out: string | null;
  elapsed_seconds: number;
  total_hours: number | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assigned_to: number | null;
  created_by: number;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
  assigned_to?: number;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  reason: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: "pending" | "approved" | "rejected";
  admin_comment: string | null;
  reviewed_by: number | null;
  created_at: string;
  reviewed_at: string | null;
  user_name?: string;
  user_email?: string;
}

export interface LeaveRequestCreate {
  reason: string;
  start_date: string;
  end_date: string;
  leave_type?: string;
}

export interface DashboardStats {
  total_employees: number;
  active_sessions: number;
  pending_tasks: number;
  pending_leaves: number;
  avg_daily_hours: number;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
}

// ==================== BASE FETCH ====================

/**
 * Base fetch function with credentials for cookies.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include", // Important: Send cookies with requests
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle empty responses (like 204 No Content)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      if (response.status === 401) {
        // Session expired or not authenticated
        return { error: "Session expired. Please login again." };
      }
      return { error: data.detail || "Request failed" };
    }

    return { data };
  } catch (error) {
    console.error("API Error:", error);
    return { error: "Network error. Please try again." };
  }
}

// ==================== AUTH ====================

/**
 * Register a new user.
 */
export async function register(
  name: string,
  email: string,
  password: string,
  role: "admin" | "employee" = "employee"
): Promise<ApiResponse<RegisterResponse>> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

/**
 * Login user (sets HTTP-only cookie automatically).
 */
export async function login(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>("/auth/login/json", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Logout user (clears HTTP-only cookie).
 */
export async function logout(): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

/**
 * Verify current session.
 */
export async function verifySession(): Promise<ApiResponse<{
  authenticated: boolean;
  user: { id: number; email: string; name: string; role: string };
}>> {
  return apiFetch("/auth/verify");
}

/**
 * Get current user info.
 */
export async function fetchCurrentUser(): Promise<ApiResponse<User>> {
  return apiFetch<User>("/auth/me");
}

// ==================== ADMIN ====================

/**
 * Get dashboard statistics (admin only).
 */
export async function fetchDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return apiFetch<DashboardStats>("/admin/dashboard/stats");
}

/**
 * Get all employees (admin only).
 */
export async function fetchEmployees(): Promise<ApiResponse<User[]>> {
  return apiFetch<User[]>("/admin/employees");
}

/**
 * Get all users (admin only).
 */
export async function fetchAllUsers(): Promise<ApiResponse<User[]>> {
  return apiFetch<User[]>("/admin/users");
}

/**
 * Deactivate a user (admin only).
 */
export async function deactivateUser(
  userId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/deactivate`, {
    method: "PATCH",
  });
}

/**
 * Activate a user (admin only).
 */
export async function activateUser(
  userId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/activate`, {
    method: "PATCH",
  });
}

// ==================== ATTENDANCE ====================

/**
 * Punch in for current day.
 */
export async function punchIn(): Promise<ApiResponse<AttendanceRecord>> {
  return apiFetch<AttendanceRecord>("/attendance/punch-in", {
    method: "POST",
  });
}

/**
 * Punch out for current day.
 */
export async function punchOut(): Promise<ApiResponse<AttendanceRecord>> {
  return apiFetch<AttendanceRecord>("/attendance/punch-out", {
    method: "POST",
  });
}

/**
 * Get attendance status for today.
 */
export async function getAttendanceStatus(): Promise<ApiResponse<AttendanceStatus>> {
  return apiFetch<AttendanceStatus>("/attendance/status");
}

/**
 * Get user's attendance history.
 */
export async function getMyAttendance(
  limit: number = 30
): Promise<ApiResponse<AttendanceRecord[]>> {
  return apiFetch<AttendanceRecord[]>(`/attendance/me?limit=${limit}`);
}

/**
 * Get all attendance records (admin only).
 */
export async function getAllAttendance(
  dateFilter?: string
): Promise<ApiResponse<AttendanceRecord[]>> {
  const query = dateFilter ? `?date_filter=${dateFilter}` : "";
  return apiFetch<AttendanceRecord[]>(`/attendance/all${query}`);
}

/**
 * Get active sessions count (admin only).
 */
export async function getActiveSessions(): Promise<
  ApiResponse<{ active_sessions: number; users: { user_id: number; punch_in: string }[] }>
> {
  return apiFetch("/attendance/active-sessions");
}

// ==================== TASKS ====================

/**
 * Get tasks assigned to current user.
 */
export async function getMyTasks(
  statusFilter?: string
): Promise<ApiResponse<Task[]>> {
  const query = statusFilter ? `?status_filter=${statusFilter}` : "";
  return apiFetch<Task[]>(`/tasks/me${query}`);
}

/**
 * Update task status.
 */
export async function updateTaskStatus(
  taskId: number,
  status: "todo" | "in_progress" | "done"
): Promise<ApiResponse<Task>> {
  return apiFetch<Task>(`/tasks/${taskId}/status?new_status=${status}`, {
    method: "PATCH",
  });
}

/**
 * Get all tasks (admin only).
 */
export async function getAllTasks(
  statusFilter?: string,
  assignedTo?: number
): Promise<ApiResponse<Task[]>> {
  const params = new URLSearchParams();
  if (statusFilter) params.append("status_filter", statusFilter);
  if (assignedTo) params.append("assigned_to", String(assignedTo));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Task[]>(`/tasks${query}`);
}

/**
 * Create a new task (admin only).
 */
export async function createTask(
  taskData: TaskCreate
): Promise<ApiResponse<Task>> {
  return apiFetch<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });
}

/**
 * Update a task (admin only).
 */
export async function updateTask(
  taskId: number,
  taskData: Partial<TaskCreate> & { status?: string }
): Promise<ApiResponse<Task>> {
  return apiFetch<Task>(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(taskData),
  });
}

/**
 * Delete a task (admin only).
 */
export async function deleteTask(
  taskId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

/**
 * Get task statistics (admin only).
 */
export async function getTaskStats(): Promise<ApiResponse<TaskStats>> {
  return apiFetch<TaskStats>("/tasks/stats/summary");
}

// ==================== LEAVE REQUESTS ====================

/**
 * Create a leave request.
 */
export async function createLeaveRequest(
  data: LeaveRequestCreate
): Promise<ApiResponse<LeaveRequest>> {
  return apiFetch<LeaveRequest>("/leave", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Get current user's leave requests.
 */
export async function getMyLeaveRequests(
  statusFilter?: string
): Promise<ApiResponse<LeaveRequest[]>> {
  const query = statusFilter ? `?status_filter=${statusFilter}` : "";
  return apiFetch<LeaveRequest[]>(`/leave/me${query}`);
}

/**
 * Cancel a pending leave request.
 */
export async function cancelLeaveRequest(
  leaveId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/leave/${leaveId}`, {
    method: "DELETE",
  });
}

/**
 * Get all leave requests (admin only).
 */
export async function getAllLeaveRequests(
  statusFilter?: string
): Promise<ApiResponse<LeaveRequest[]>> {
  const query = statusFilter ? `?status_filter=${statusFilter}` : "";
  return apiFetch<LeaveRequest[]>(`/leave${query}`);
}

/**
 * Get pending leave requests (admin only).
 */
export async function getPendingLeaveRequests(): Promise<
  ApiResponse<LeaveRequest[]>
> {
  return apiFetch<LeaveRequest[]>("/leave/pending");
}

/**
 * Review a leave request (admin only).
 */
export async function reviewLeaveRequest(
  leaveId: number,
  status: "approved" | "rejected",
  adminComment?: string
): Promise<ApiResponse<LeaveRequest>> {
  return apiFetch<LeaveRequest>(`/leave/${leaveId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, admin_comment: adminComment }),
  });
}

/**
 * Get leave statistics (admin only).
 */
export async function getLeaveStats(): Promise<
  ApiResponse<{ total: number; pending: number; approved: number; rejected: number }>
> {
  return apiFetch("/leave/stats");
}

export type { ApiResponse, LoginResponse, RegisterResponse };
