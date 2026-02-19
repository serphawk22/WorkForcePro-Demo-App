/**
 * API client for connecting to FastAPI backend.
 * Uses both localStorage (access token) and HTTP-only cookies for authentication.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ==================== TYPES ====================

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  name: string;
  role: string;
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

export interface AdminDashboardStats {
  total_employees: number;
  active_sessions: number;
  pending_tasks: number;
  avg_daily_hours: number;
  recent_activities: any[];
  leave_requests_pending: number;
}

export interface EmployeeDashboardStats {
  current_session: {
    clocked_in: boolean;
    punch_in: string | null;
    hours_worked: number;
  } | null;
  tasks_due_today: number;
  tasks_completed: number;
  productivity_score: number;
  active_projects: number;
  leave_balance: number;
  pending_leave_requests: number;
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

// ==================== AUTH HELPERS ====================

/**
 * Store authentication token and user data
 */
export function setAuth(token: string, user: Omit<LoginResponse, 'access_token' | 'token_type'>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * Get stored access token
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}

/**
 * Get stored user data
 */
export function getStoredUser(): Omit<LoginResponse, 'access_token' | 'token_type'> | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

/**
 * Clear authentication data
 */
export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// ==================== BASE FETCH ====================

/**
 * Base fetch function with auth headers.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include", // Send cookies
      headers,
    });

    // Handle empty responses (like 204 No Content)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      if (response.status === 401) {
        // Clear auth and redirect to login
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return { error: "Session expired. Please login again." };
      }
      if (response.status === 403) {
        return { error: "Access forbidden. Insufficient permissions." };
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
 * Login user and store auth data.
 */
export async function login(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  const response = await apiFetch<LoginResponse>("/auth/login/json", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  // Store auth data on successful login
  if (response.data) {
    setAuth(response.data.access_token, {
      user_id: response.data.user_id,
      email: response.data.email,
      name: response.data.name,
      role: response.data.role,
    });
  }
  
  return response;
}

/**
 * Logout user and clear auth data.
 */
export async function logout(): Promise<ApiResponse<{ message: string }>> {
  const response = await apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
  });
  clearAuth();
  return response;
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

// ==================== DASHBOARD ====================

/**
 * Get admin dashboard statistics.
 */
export async function fetchAdminDashboard(): Promise<ApiResponse<AdminDashboardStats>> {
  return apiFetch<AdminDashboardStats>("/dashboard/admin");
}

/**
 * Get employee dashboard statistics.
 */
export async function fetchEmployeeDashboard(): Promise<ApiResponse<EmployeeDashboardStats>> {
  return apiFetch<EmployeeDashboardStats>("/dashboard/employee");
}

/**
 * Get all users (admin only).
 */
export async function fetchAllUsers(): Promise<ApiResponse<User[]>> {
  return apiFetch<User[]>("/dashboard/users");
}

// ==================== ADMIN ====================

/**
 * Get dashboard statistics (admin only) - DEPRECATED, use fetchAdminDashboard.
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
