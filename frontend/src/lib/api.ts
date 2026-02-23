/**
 * API client for connecting to FastAPI backend.
 * Uses both localStorage (access token) and HTTP-only cookies for authentication.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

console.log("[API] Base URL:", API_BASE_URL);

// Simple cache to prevent redundant API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 2000; // 2 seconds - shorter to prevent stale data

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(keyPattern?: string): void {
  if (!keyPattern) {
    cache.clear();
    return;
  }
  
  const keysToDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.includes(keyPattern)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => cache.delete(key));
}

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
  role: "admin" | "employee";
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
  age?: number;
  date_joined?: string;
  github_url?: string;
  linkedin_url?: string;
  profile_picture?: string;
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
  assigned_by: number;
  status: "todo" | "in_progress" | "submitted" | "reviewing" | "approved" | "rejected";
  done_by_employee?: boolean;
  github_link?: string | null;
  deployed_link?: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  assigned_by_name?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
  assigned_to?: number;
  github_link?: string;
  deployed_link?: string;
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
  submitted: number;
  reviewing: number;
  approved: number;
  rejected: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  task_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: "admin" | "employee";
}

export interface TaskCommentCreate {
  task_id: number;
  comment: string;
}

export interface Subtask {
  id: number;
  parent_task_id: number;
  title: string;
  description: string | null;
  assigned_to: number | null;
  assigned_by: number;
  status: "todo" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  assigned_by_name?: string;
}

export interface SubtaskCreate {
  title: string;
  description?: string;
  assigned_to?: number;
}

// ==================== AUTH HELPERS ====================

/**
 * Store authentication token and user data
 */
export function setAuth(token: string, user: Omit<LoginResponse, 'access_token' | 'token_type'>) {
  if (typeof window !== 'undefined') {
    // Store with "token" key as requested
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token); // Keep for backward compatibility
    localStorage.setItem('role', user.role);
    localStorage.setItem('user_id', user.user_id.toString());
    localStorage.setItem('user_name', user.name);
    localStorage.setItem('user_email', user.email);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('[API] Auth data stored:', { role: user.role, user_id: user.user_id, name: user.name });
  }
}

/**
 * Get stored access token
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    // Check both "token" and "access_token" for compatibility
    return localStorage.getItem('token') || localStorage.getItem('access_token');
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
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user');
    console.log('[API] Auth data cleared');
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(`[API] ${options.method || 'GET'} ${endpoint} - Authorization header added`);
    } else {
      console.log(`[API] ${options.method || 'GET'} ${endpoint} - No token, skipping Authorization header`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include", // Send cookies
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle empty responses (like 204 No Content)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      if (response.status === 401) {
        console.error(`[API] 401 Unauthorized on ${endpoint}`);
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
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("Request timeout:", endpoint);
      return { error: "Request timeout. Please check your connection." };
    }
    
    // Check for CORS errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error("[API] CORS or Network Error:", {
        endpoint,
        apiBaseUrl: API_BASE_URL,
        error: error.message
      });
      return { 
        error: "Cannot connect to server. Please check:\n1. Backend is running\n2. CORS is configured\n3. API URL is correct: " + API_BASE_URL 
      };
    }
    
    console.error("API Error:", error);
    return { error: error.message || "Network error. Please try again." };
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
  console.log('[API] Login request for:', email);
  
  const response = await apiFetch<LoginResponse>("/auth/login/json", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  console.log('[API] Login response:', response);
  
  // Store auth data on successful login
  if (response.data) {
    console.log('[API] Storing auth data...');
    setAuth(response.data.access_token, {
      user_id: response.data.user_id,
      email: response.data.email,
      name: response.data.name,
      role: response.data.role,
    });
    console.log('[API] Auth data stored successfully');
  } else if (response.error) {
    console.error('[API] Login failed:', response.error);
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
  user: { id: number; email: string; name: string; role: "admin" | "employee" };
}>> {
  const token = getToken();
  console.log('[API] Verifying session - Token:', token ? '✓ Present' : '✗ Missing');
  
  if (!token) {
    console.log('[API] No token found, skipping verify');
    return { error: 'No token found' };
  }
  
  const response = await apiFetch<{
    authenticated: boolean;
    user: { id: number; email: string; name: string; role: "admin" | "employee" };
  }>("/auth/verify");
  
  console.log('[API] Verify response:', response.data ? '✓ Success' : `✗ Failed: ${response.error}`);
  return response;
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
  const cacheKey = 'admin-dashboard';
  const cached = getCached<AdminDashboardStats>(cacheKey);
  
  if (cached) {
    return { data: cached };
  }
  
  const result = await apiFetch<AdminDashboardStats>("/dashboard/admin");
  if (result.data) {
    setCached(cacheKey, result.data);
  }
  return result;
}

/**
 * Get employee dashboard statistics.
 */
export async function fetchEmployeeDashboard(): Promise<ApiResponse<EmployeeDashboardStats>> {
  const cacheKey = 'employee-dashboard';
  const cached = getCached<EmployeeDashboardStats>(cacheKey);
  
  if (cached) {
    return { data: cached };
  }
  
  const result = await apiFetch<EmployeeDashboardStats>("/dashboard/employee");
  if (result.data) {
    setCached(cacheKey, result.data);
  }
  return result;
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

/**
 * Permanently delete a user (admin only).
 */
export async function deleteUser(
  userId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

// ==================== ATTENDANCE ====================

/**
 * Punch in for current day.
 */
export async function punchIn(): Promise<ApiResponse<AttendanceRecord>> {
  const result = await apiFetch<AttendanceRecord>("/attendance/punch-in", {
    method: "POST",
  });
  if (result.data) {
    clearCache('dashboard'); // Clear dashboard cache to refresh stats
  }
  return result;
}

/**
 * Punch out for current day.
 */
export async function punchOut(): Promise<ApiResponse<AttendanceRecord>> {
  const result = await apiFetch<AttendanceRecord>("/attendance/punch-out", {
    method: "POST",
  });
  if (result.data) {
    clearCache('dashboard'); // Clear dashboard cache to refresh stats
  }
  return result;
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
  const cacheKey = `my-tasks${query}`;
  const cached = getCached<Task[]>(cacheKey);
  
  if (cached) {
    return { data: cached };
  }
  
  const result = await apiFetch<Task[]>(`/tasks/me${query}`);
  if (result.data) {
    setCached(cacheKey, result.data);
  }
  return result;
}

/**
 * Update task status.
 * Employee can use: todo, in_progress, submitted (when marking done)
 * Admin can use: todo, in_progress, submitted, approved, rejected
 */
export async function updateTaskStatus(
  taskId: number,
  status: "todo" | "in_progress" | "submitted" | "approved" | "rejected"
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
  return apiFetch<Task[]>(`/tasks/${query}`);
}

/**
 * Create a new task (admin only).
 */
export async function createTask(
  taskData: TaskCreate
): Promise<ApiResponse<Task>> {
  return apiFetch<Task>("/tasks/", {
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
  return apiFetch<LeaveRequest>("/leave/", {
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
  return apiFetch<LeaveRequest[]>(`/leave/${query}`);
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

// ==================== PROFILE MANAGEMENT ====================

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
  age?: number;
  date_joined?: string;
  github_url?: string;
  linkedin_url?: string;
  profile_picture?: string;
}

export interface ProfileUpdate {
  name: string;
  age: number;
  date_joined: string;
  github_url: string;
  linkedin_url: string;
  profile_picture?: string;
}

/**
 * Get current user's profile.
 */
export async function getMyProfile(): Promise<ApiResponse<UserProfile>> {
  console.log('[API] Get my profile - Token:', getToken() ? '✓ Present' : '✗ Missing');
  return apiFetch<UserProfile>("/users/me");
}

/**
 * Get all active employees (for task/subtask assignment).
 */
export async function getAllEmployees(): Promise<ApiResponse<User[]>> {
  return apiFetch<User[]>("/users/employees");
}

/**
 * Update current user's profile.
 */
export async function updateMyProfile(
  data: ProfileUpdate
): Promise<ApiResponse<UserProfile>> {
  console.log('[API] Update my profile - Token:', getToken() ? '✓ Present' : '✗ Missing');
  console.log('[API] Update data:', data);
  clearCache("users/me");
  return apiFetch<UserProfile>("/users/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Upload profile picture.
 */
export async function uploadProfilePicture(
  file: File
): Promise<ApiResponse<{ message: string; preview?: string }>> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getToken();
  console.log('[API] Upload profile picture - Token:', token ? '✓ Present' : '✗ Missing');
  
  if (!token) {
    console.error('[API] No token found, cannot upload');
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return { error: 'Session expired. Please login again.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/me/upload-picture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: formData,
    });

    console.log('[API] Upload response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.error('[API] 401 Unauthorized - clearing auth');
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return { error: 'Session expired. Please login again.' };
      }
      const error = await response.json();
      console.error('[API] Upload failed:', error);
      return { error: error.detail || "Upload failed" };
    }

    const data = await response.json();
    console.log('[API] Upload successful');
    clearCache("users/me");
    return { data };
  } catch (error: any) {
    console.error('[API] Upload error:', error);
    return { error: 'Network error. Please try again.' };
  }
}

/**
 * Get user by ID (admin only).
 */
export async function getUserById(userId: number): Promise<ApiResponse<UserProfile>> {
  return apiFetch<UserProfile>(`/admin/users/${userId}`);
}

/**
 * Get all users (admin only).
 */
export async function getAllUsers(): Promise<ApiResponse<UserProfile[]>> {
  return apiFetch<UserProfile[]>("/admin/users");
}

// ==================== NOTIFICATION API ====================

/**
 * Get all notifications for current user.
 */
export async function getNotifications(): Promise<ApiResponse<Notification[]>> {
  return apiFetch<Notification[]>("/notifications/");
}

/**
 * Get unread notification count.
 */
export async function getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
  return apiFetch<{ count: number }>("/notifications/unread/count");
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: number): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<ApiResponse<{ message: string }>> {
  clearCache("notifications");
  return apiFetch<{ message: string }>("/notifications/read-all", {
    method: "PATCH",
  });
}

// ==================== TASK COMMENTS API ====================

/**
 * Create a comment on a task.
 */
export async function createTaskComment(commentData: TaskCommentCreate): Promise<ApiResponse<TaskComment>> {
  return apiFetch<TaskComment>("/comments", {
    method: "POST",
    body: JSON.stringify(commentData),
  });
}

/**
 * Get all comments for a specific task.
 */
export async function getTaskComments(taskId: number): Promise<ApiResponse<TaskComment[]>> {
  return apiFetch<TaskComment[]>(`/comments/task/${taskId}`);
}

/**
 * Delete a comment.
 */
export async function deleteTaskComment(commentId: number): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/comments/${commentId}`, {
    method: "DELETE",
  });
}

// ==================== SUBTASKS API ====================

/**
 * Create a subtask for a task.
 */
export async function createSubtask(taskId: number, subtaskData: SubtaskCreate): Promise<ApiResponse<Subtask>> {
  return apiFetch<Subtask>(`/tasks/${taskId}/subtasks`, {
    method: "POST",
    body: JSON.stringify(subtaskData),
  });
}

/**
 * Get all subtasks for a task.
 */
export async function getTaskSubtasks(taskId: number): Promise<ApiResponse<Subtask[]>> {
  return apiFetch<Subtask[]>(`/tasks/${taskId}/subtasks`);
}

/**
 * Update subtask status.
 */
export async function updateSubtaskStatus(subtaskId: number, status: string): Promise<ApiResponse<Subtask>> {
  return apiFetch<Subtask>(`/tasks/subtasks/${subtaskId}/status?new_status=${status}`, {
    method: "PATCH",
  });
}

/**
 * Delete a subtask.
 */
export async function deleteSubtask(subtaskId: number): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/tasks/subtasks/${subtaskId}`, {
    method: "DELETE",
  });
}

export type { ApiResponse, LoginResponse, RegisterResponse };
