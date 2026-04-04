/**
 * API client for connecting to FastAPI backend.
 * Uses both localStorage (access token) and HTTP-only cookies for authentication.
 */

/**
 * Resolve API origin (no trailing slash).
 * - If NEXT_PUBLIC_API_URL is set → use it (production / custom backend).
 * - In the browser during `next dev` → `/api` (proxied to FastAPI by next.config.js).
 * - Server-side (RSC / SSR) → direct loopback URL.
 */
export function getApiBaseUrl(): string {
  const explicitApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  // If we are executing inside the user's browser:
  if (typeof window !== "undefined") {
    // Always use same-origin proxy in the browser to avoid CORS preflight issues.
    return "/api";
  }

  // If we are executing server-side (Next.js RSC/SSR):
  return explicitApiUrl || "https://work-force-pro-demo-app-production.up.railway.app";
}

if (typeof window !== "undefined") {
  console.log("[API] Base URL:", getApiBaseUrl());
}

// Simple cache to prevent redundant API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 2000; // 2 seconds - shorter to prevent stale data
let hasTriedWakeupRetry = false;

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

async function wakeBackendIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (hasTriedWakeupRetry) return;

  hasTriedWakeupRetry = true;
  try {
    await fetch("/api/health", {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    });
  } catch {
    // Best-effort warm-up only.
  }

  await new Promise(resolve => setTimeout(resolve, 1500));
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
  is_active?: boolean;  // Added for UI state synchronization
  user_name?: string;
  user_email?: string;
  user_role?: "admin" | "employee";
  user_profile_picture?: string;
}

export interface AttendanceStatus {
  status: "not_started" | "working" | "completed";
  punch_in: string | null;
  punch_out: string | null;
  elapsed_seconds: number;
  is_active: boolean;  // Added for UI state synchronization
  total_hours: number | null;
}

export type RecurrenceType = "daily" | "weekly" | "monthly";

export interface Task {
  id: number;
  public_id: string;
  parent_task_id?: number | null;
  workspace_id?: number | null;
  workspace_name?: string | null;
  workspace_icon?: string | null;
  workspace_color?: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  start_date: string;
  due_date: string | null;
  completed_at?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
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
  progress?: number;  // Task completion progress (0-100)
  subtask_count?: number;
  /** Recurring task template fields */
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType | string | null;
  recurrence_interval?: number;
  /** JSON string from API, e.g. "[1,3,5]" weekdays Mon=0 */
  repeat_days?: string | null;
  recurrence_start_date?: string | null;
  recurrence_end_date?: string | null;
  monthly_day?: number | null;
}

export interface TaskCreate {
  title: string;
  workspace_id: number;
  parent_task_id?: number;
  description?: string;
  priority?: "low" | "medium" | "high";
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_to?: number;
  assigned_by?: number;
  github_link?: string;
  deployed_link?: string;
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  repeat_days?: number[];
  recurrence_start_date?: string;
  recurrence_end_date?: string;
  monthly_day?: number;
}

export interface TaskInstanceSummary {
  id: number;
  task_id: number;
  instance_date: string;
  status: "todo" | "in_progress" | "completed" | "skipped";
  created_at: string;
  updated_at: string;
  task_title?: string;
  public_id?: string;
  priority?: string;
  assigned_to?: number | null;
  assignee_name?: string | null;
}

export interface RecurringInstancesSummary {
  today: TaskInstanceSummary[];
  upcoming: TaskInstanceSummary[];
  completed_recent: TaskInstanceSummary[];
}

export interface TaskRecurringInstancesResponse {
  upcoming: TaskInstanceSummary[];
  history: TaskInstanceSummary[];
  next_occurrence_date: string | null;
}

export interface Workspace {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  created_by: number;
  created_at: string;
  project_count?: number;
}

export interface WorkspaceProjectsResponse {
  workspace: Workspace;
  projects: Task[];
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
  user_profile_picture?: string | null;
  document_data?: string | null;
  document_filename?: string | null;
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
  // Real-time extended fields
  employees_on_leave_today: number;
  late_checkins_today: number;
  active_tasks_count: number;
  total_tasks_count: number;
  upcoming_tasks: {
    id: number;
    public_id: string;
    title: string;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high';
    status: string;
    assignee_name: string | null;
  }[];
}

export interface EmployeeDashboardStats {
  current_session: {
    clocked_in: boolean;
    punch_in: string | null;
    punch_out?: string | null;
    hours_worked: number;
    elapsed_seconds: number;
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
  completed: number;  // Approved tasks
  in_progress: number;
  overdue: number;  // Tasks past due date and not approved
  completion_percent: number;  // Overall completion percentage
  tasks_assigned?: number;
  tasks_completed?: number;
  on_time_completion?: number;
  delayed_tasks?: number;
  average_completion_time?: number;
  // Legacy fields for backward compatibility
  todo: number;
  submitted: number;
  reviewing: number;
  approved: number;
  rejected: number;
}

export interface EmployeePerformance {
  period: string;
  score: number;
  department?: string;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  on_leave: number;
  total: number;
}

export interface EmployeeListItem {
  id: number;
  name: string;
  email: string;
  role?: string;
  contract_type?: string;
  team?: string;
  workspace?: string;
  is_active: boolean;
  attendance_rate?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  task_id: number | null;
  weekly_progress_id?: number | null;
  is_read: boolean;
  created_at: string;
}

// ==================== WEEKLY PROGRESS ====================

export interface WeeklyComment {
  id: number;
  weekly_progress_id: number;
  admin_id: number;
  comment: string;
  created_at: string;
  admin_name?: string | null;
}

export interface WeeklyProgressEntry {
  id: number;
  user_id: number;
  week_start_date: string;
  description: string;
  github_link: string | null;
  deployed_link: string | null;
  last_seen_comments_at: string | null;
  created_at: string;
  updated_at: string;
  comments: WeeklyComment[];
  has_unread_comments: boolean;
  employee_name?: string | null;
  employee_email?: string | null;
}

export async function getMyWeeklyProgress(): Promise<ApiResponse<WeeklyProgressEntry[]>> {
  return apiFetch<WeeklyProgressEntry[]>("/weekly-progress/me");
}

export async function upsertMyWeeklyProgress(data: {
  week_start_date: string;
  description: string;
  github_link?: string;
  deployed_link?: string;
}): Promise<ApiResponse<WeeklyProgressEntry>> {
  return apiFetch<WeeklyProgressEntry>("/weekly-progress/me", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMyWeeklyProgress(
  entryId: number,
  data: { description?: string; github_link?: string; deployed_link?: string }
): Promise<ApiResponse<WeeklyProgressEntry>> {
  return apiFetch<WeeklyProgressEntry>(`/weekly-progress/me/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function markWeeklyCommentsSeen(entryId: number): Promise<ApiResponse<WeeklyProgressEntry>> {
  return apiFetch<WeeklyProgressEntry>(`/weekly-progress/me/${entryId}/seen-comments`, {
    method: "PATCH",
  });
}

export async function getAdminWeeklyProgress(params?: {
  week_start?: string;
  employee_id?: number;
}): Promise<ApiResponse<WeeklyProgressEntry[]>> {
  const sp = new URLSearchParams();
  if (params?.week_start) sp.append("week_start", params.week_start);
  if (params?.employee_id != null) sp.append("employee_id", String(params.employee_id));
  const q = sp.toString();
  return apiFetch<WeeklyProgressEntry[]>(`/weekly-progress/admin${q ? `?${q}` : ""}`);
}

export async function getAdminWeeklyByEmployee(userId: number): Promise<ApiResponse<WeeklyProgressEntry[]>> {
  return apiFetch<WeeklyProgressEntry[]>(`/weekly-progress/admin/employee/${userId}`);
}

export async function postAdminWeeklyComment(
  entryId: number,
  comment: string
): Promise<ApiResponse<WeeklyComment>> {
  return apiFetch<WeeklyComment>(`/weekly-progress/admin/${entryId}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export async function postMyWeeklyComment(
  entryId: number,
  comment: string
): Promise<ApiResponse<WeeklyComment>> {
  return apiFetch<WeeklyComment>(`/weekly-progress/me/${entryId}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
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
  user_profile_picture?: string | null;
}

export interface TaskCommentCreate {
  task_id: number;
  comment: string;
}

export interface SubtaskTree extends Subtask {
  children: SubtaskTree[];
}

export interface TaskDetailData extends Task {
  assignee_profile_picture?: string | null;
}

export interface ProjectDetails {
  task: TaskDetailData;
  subtasks: SubtaskTree[];
  comments: TaskComment[];
}

export interface Subtask {
  id: number;
  public_id: string;
  parent_task_id: number;
  parent_subtask_id?: number | null;  // For nested subtasks
  title: string;
  description: string | null;
  start_date?: string;
  due_date?: string | null;
  completed_at?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  assigned_to: number | null;
  assigned_by: number;
  status: "todo" | "in_progress" | "completed" | "reviewing" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
  assigned_by_name?: string;
  children?: Subtask[];  // For hierarchical structure
}

export interface SubtaskCreate {
  title: string;
  description?: string;
  assigned_to?: number;
  parent_subtask_id?: number;  // For creating nested subtasks
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
  options: RequestInit = {},
  retries = 1
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s — covers Railway cold start
  
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

    const baseUrl = typeof window !== "undefined" ? "/api" : getApiBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      credentials: "include", // Send cookies
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle empty and non-JSON responses safely (e.g. plain "Internal Server Error")
    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }

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
        return { error: data.detail || "Access forbidden. Insufficient permissions." };
      }
      return { error: data.detail || `Request failed (${response.status})` };
    }

    return { data };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // Retry once on timeout (covers Railway cold-start > 10s)
      if (retries > 0) {
        console.warn(`[API] Timeout on ${endpoint}, retrying...`);
        return apiFetch<T>(endpoint, options, retries - 1);
      }
      console.error("Request timeout:", endpoint);
      return { error: "Request timeout. Please check your connection." };
    }
    
    // Check for CORS errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      if (retries > 0) {
        await wakeBackendIfNeeded();
        return apiFetch<T>(endpoint, options, retries - 1);
      }
      console.error("[API] CORS or Network Error:", {
        endpoint,
        apiBaseUrl: typeof window !== "undefined" ? "/api" : getApiBaseUrl(),
        error: error.message
      });
      return { 
        error: "Cannot connect to server. Please ensure the backend is running." 
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
 * Get employee performance data (admin only).
 */
export async function getEmployeePerformance(): Promise<ApiResponse<EmployeePerformance[]>> {
  const cacheKey = 'employee-performance';
  const cached = getCached<EmployeePerformance[]>(cacheKey);
  if (cached) {
    return { data: cached };
  }

  const result = await apiFetch<EmployeePerformance[]>("/admin/employee-performance");
  if (result.data) {
    setCached(cacheKey, result.data);
  }
  return result;
}

/**
 * Get attendance statistics (admin only).
 */
export async function getAttendanceStats(): Promise<ApiResponse<AttendanceStats>> {
  const cacheKey = 'attendance-stats';
  const cached = getCached<AttendanceStats>(cacheKey);
  if (cached) {
    return { data: cached };
  }

  const result = await apiFetch<AttendanceStats>("/admin/attendance-stats");
  if (result.data) {
    setCached(cacheKey, result.data);
  }
  return result;
}

/**
 * Get employees list with performance data (admin only).
 */
export async function getEmployeesList(): Promise<ApiResponse<EmployeeListItem[]>> {
  const cacheKey = 'employees-list';
  const cached = getCached<EmployeeListItem[]>(cacheKey);
  if (cached) {
    return { data: cached };
  }

  const result = await apiFetch<EmployeeListItem[]>("/admin/employees-list");
  if (result.data) {
    setCached(cacheKey, result.data);
  }
  return result;
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

/**
 * Create a new employee directly (admin only). Account is auto-approved.
 */
export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  role: "employee" | "admin";
}): Promise<ApiResponse<User>> {
  return apiFetch<User>("/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
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
  filters?: {
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
    sort?: "asc" | "desc";
    limit?: number;
  }
): Promise<ApiResponse<AttendanceRecord[]>> {
  const params = new URLSearchParams();
  
  if (filters?.dateFilter) {
    params.append("date_filter", filters.dateFilter);
  }
  if (filters?.startDate) {
    params.append("start_date", filters.startDate);
  }
  if (filters?.endDate) {
    params.append("end_date", filters.endDate);
  }
  if (filters?.sort) {
    params.append("sort", filters.sort);
  }
  if (filters?.limit) {
    params.append("limit", filters.limit.toString());
  }
  
  const query = params.toString() ? `?${params.toString()}` : "";
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
  status: "todo" | "in_progress" | "submitted" | "reviewing" | "approved" | "rejected"
): Promise<ApiResponse<Task>> {
  return apiFetch<Task>(`/tasks/${taskId}/status?new_status=${status}`, {
    method: "PATCH",
  });
}

/**
 * Get all organization tasks (all authenticated users).
 */
export async function getAllTasks(
  statusFilter?: string,
  assignedTo?: number,
  workspaceId?: number,
  opts?: { parentTaskId?: number; rootsOnly?: boolean }
): Promise<ApiResponse<Task[]>> {
  const params = new URLSearchParams();
  if (statusFilter) params.append("status_filter", statusFilter);
  if (assignedTo) params.append("assigned_to", String(assignedTo));
  if (workspaceId) params.append("workspace_id", String(workspaceId));
  if (opts?.parentTaskId !== undefined) params.append("parent_task_id", String(opts.parentTaskId));
  if (opts?.rootsOnly) params.append("roots_only", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Task[]>(`/tasks/${query}`);
}

export async function getTaskChildren(taskId: number): Promise<ApiResponse<Task[]>> {
  return apiFetch<Task[]>(`/tasks/${taskId}/children`);
}

export async function getWorkspaces(): Promise<ApiResponse<Workspace[]>> {
  return apiFetch<Workspace[]>("/workspaces/");
}

export async function createWorkspace(data: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}): Promise<ApiResponse<Workspace>> {
  return apiFetch<Workspace>("/workspaces/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkspace(
  workspaceId: number,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
  }
): Promise<ApiResponse<Workspace>> {
  return apiFetch<Workspace>(`/workspaces/${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWorkspace(
  workspaceId: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>(`/workspaces/${workspaceId}`, {
    method: "DELETE",
  });
}

export async function getWorkspaceProjects(
  workspaceId: number,
  filters?: {
    statusFilter?: string;
    ownerId?: number;
    recentDays?: number;
  }
): Promise<ApiResponse<WorkspaceProjectsResponse>> {
  const params = new URLSearchParams();
  if (filters?.statusFilter) params.append("status_filter", filters.statusFilter);
  if (filters?.ownerId) params.append("owner_id", String(filters.ownerId));
  if (filters?.recentDays) params.append("recent_days", String(filters.recentDays));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<WorkspaceProjectsResponse>(`/workspaces/${workspaceId}/projects${query}`);
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

/** Today's / upcoming / recent completed recurring occurrences for the current user */
export async function getMyRecurringInstancesSummary(): Promise<ApiResponse<RecurringInstancesSummary>> {
  return apiFetch<RecurringInstancesSummary>("/tasks/recurring/my-summary");
}

export async function updateTaskInstanceStatus(
  instanceId: number,
  status: "todo" | "in_progress" | "completed" | "skipped"
): Promise<ApiResponse<TaskInstanceSummary>> {
  return apiFetch<TaskInstanceSummary>(`/tasks/recurring/instances/${instanceId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getTaskRecurringInstances(
  taskId: number,
  upcomingLimit: number = 10,
  historyLimit: number = 10
): Promise<ApiResponse<TaskRecurringInstancesResponse>> {
  const params = new URLSearchParams();
  params.append("upcoming_limit", String(upcomingLimit));
  params.append("history_limit", String(historyLimit));
  return apiFetch<TaskRecurringInstancesResponse>(
    `/tasks/recurring/tasks/${taskId}/instances?${params.toString()}`
  );
}

/**
 * Update a task (admin only).
 */
export async function updateTask(
  taskId: number,
  taskData: Partial<TaskCreate> & { status?: string; assigned_by?: number }
): Promise<ApiResponse<Task>> {
  return apiFetch<Task>(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(taskData),
  });
}

/**
 * Update task links (GitHub and deployed) - employee or admin.
 */
export async function updateTaskLinks(
  taskId: number,
  github_link?: string | null,
  deployed_link?: string | null
): Promise<ApiResponse<Task>> {
  const params = new URLSearchParams();
  if (github_link !== undefined) params.append("github_link", github_link || "");
  if (deployed_link !== undefined) params.append("deployed_link", deployed_link || "");
  
  return apiFetch<Task>(`/tasks/${taskId}/links?${params.toString()}`, {
    method: "PATCH",
  });
}

/**
 * Get full project details including task, subtasks tree, and comments.
 */
export async function getProjectDetails(
  taskId: number
): Promise<ApiResponse<ProjectDetails>> {
  return apiFetch<ProjectDetails>(`/tasks/${taskId}/details`);
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
 * Create a leave request (with optional document attachment).
 */
export async function createLeaveRequest(
  data: LeaveRequestCreate,
  document?: File | null
): Promise<ApiResponse<LeaveRequest>> {
  const token = getToken();
  const formData = new FormData();
  formData.append("reason", data.reason);
  formData.append("start_date", data.start_date);
  formData.append("end_date", data.end_date);
  formData.append("leave_type", data.leave_type || "personal");
  if (document) {
    formData.append("document", document);
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/leave/`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: formData,
    });

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    if (!response.ok) {
      if (response.status === 401) {
        clearAuth();
        if (typeof window !== "undefined") window.location.href = "/login";
        return { error: "Session expired. Please login again." };
      }
      return { error: result.detail || "Failed to submit leave request" };
    }
    return { data: result };
  } catch (err) {
    return { error: "Network error. Please try again." };
  }
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

export async function getLeaveRequestById(
  id: number
): Promise<ApiResponse<LeaveRequest>> {
  return apiFetch<LeaveRequest>(`/leave/${id}`);
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
  status?: "PENDING" | "APPROVED" | "REJECTED";
  approved_at?: string;
  approved_by?: number;
  created_at: string;
  age?: number;
  date_joined?: string;
  github_url?: string;
  linkedin_url?: string;
  profile_picture?: string;
  department?: string;
  base_salary?: number;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
}

export interface PayrollRecord {
  id: number;
  employee_id: number;
  name: string;
  department: string | null;
  month: number;
  year: number;
  salary: number;
  status: "Pending" | "Paid" | "Processing";
  pay_date: string | null;
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

/** Active admins + employees for task/subtask assignment (project management, AI, etc.) */
export async function getAssignableUsers(): Promise<ApiResponse<User[]>> {
  return apiFetch<User[]>("/users/assignable");
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
 * Update current user's bank details.
 */
export async function updateMyBankDetails(data: {
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_name?: string | null;
  bank_account_holder?: string | null;
}): Promise<ApiResponse<UserProfile>> {
  return apiFetch<UserProfile>("/users/me/bank-details", {
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
    const response = await fetch(`${getApiBaseUrl()}/users/me/upload-picture`, {
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

export async function getPendingUsers(): Promise<ApiResponse<UserProfile[]>> {
  return apiFetch<UserProfile[]>("/admin/users?status=PENDING");
}

export async function approveUser(userId: number): Promise<ApiResponse<{ message: string; status: string }>> {
  return apiFetch<{ message: string; status: string }>(`/admin/users/${userId}/approve`, {
    method: "PUT",
  });
}

export async function rejectUser(userId: number): Promise<ApiResponse<{ message: string; status: string }>> {
  return apiFetch<{ message: string; status: string }>(`/admin/users/${userId}/reject`, {
    method: "PUT",
  });
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
 * Update a subtask (admin or assignee can update).
 */
export async function updateSubtask(
  subtaskId: number,
  subtaskData: Partial<SubtaskCreate> & { status?: string }
): Promise<ApiResponse<Subtask>> {
  return apiFetch<Subtask>(`/tasks/subtasks/${subtaskId}`, {
    method: "PUT",
    body: JSON.stringify(subtaskData),
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

/**
 * Create a comment on a task.
 */
export async function createComment(
  commentData: TaskCommentCreate
): Promise<ApiResponse<TaskComment>> {
  return apiFetch<TaskComment>(`/comments/`, {
    method: "POST",
    body: JSON.stringify(commentData),
  });
}

export type { ApiResponse, LoginResponse, RegisterResponse };

export interface PublicIdSearchResult {
  type: 'task' | 'subtask';
  task_id: number;
  subtask_id: number | null;
  public_id: string;
}

export async function searchByPublicId(query: string): Promise<ApiResponse<PublicIdSearchResult>> {
  return apiFetch<PublicIdSearchResult>(`/tasks/search/by-ref?query=${encodeURIComponent(query)}`);
}

// ==================== PAYROLL ====================

/**
 * Get all employee payroll records for a specific month/year.
 */
export async function getPayroll(month?: number, year?: number): Promise<ApiResponse<PayrollRecord[]>> {
  const params = new URLSearchParams();
  if (month !== undefined) params.set("month", String(month));
  if (year !== undefined) params.set("year", String(year));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<PayrollRecord[]>(`/payroll/${query}`);
}

/**
 * Mark a payroll record as paid.
 */
export async function markPayrollPaid(payrollId: number): Promise<ApiResponse<PayrollRecord>> {
  return apiFetch<PayrollRecord>(`/payroll/${payrollId}/mark-paid`, { method: "PUT" });
}

/**
 * Update a payroll record's status (Paid | Pending).
 */
export async function updatePayrollStatus(
  payrollId: number,
  status: "Paid" | "Pending"
): Promise<ApiResponse<PayrollRecord>> {
  return apiFetch<PayrollRecord>(`/payroll/${payrollId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/**
 * Get the current employee's own latest payroll record (no admin needed).
 */
export async function getMyPayroll(): Promise<ApiResponse<PayrollRecord>> {
  return apiFetch<PayrollRecord>(`/payroll/me?_t=${Date.now()}`);
}

/**
 * Get the latest payroll record for a specific employee (for profile page).
 */
export async function getLatestPayroll(employeeId: number): Promise<ApiResponse<PayrollRecord>> {
  return apiFetch<PayrollRecord>(`/payroll/latest/${employeeId}?_t=${Date.now()}`);
}

/**
 * Update an employee's base salary and optionally their department.
 */
export async function updateEmployeeBaseSalary(
  employeeId: number,
  baseSalary: number,
  department?: string
): Promise<ApiResponse<UserProfile>> {
  const params = new URLSearchParams();
  params.set("base_salary", String(baseSalary));
  if (department !== undefined) params.set("department", department);
  return apiFetch<UserProfile>(`/payroll/employee/${employeeId}/base-salary?${params.toString()}`, {
    method: "PATCH",
  });
}

/**
 * Update an employee's date of joining (admin only).
 */
export async function updateEmployeeDateJoined(
  employeeId: number,
  dateJoined: string | null
): Promise<ApiResponse<{ message: string; date_joined: string | null }>> {
  const params = dateJoined ? `?date_joined=${encodeURIComponent(dateJoined)}` : "";
  return apiFetch<{ message: string; date_joined: string | null }>(
    `/admin/users/${employeeId}/date-joined${params}`,
    { method: "PATCH" }
  );
}

// ==================== MY SPACE API ====================

export interface TaskSheetEntry {
  id: number;
  user_id: number;
  date: string;
  achievements: string;
  repo_link?: string | null;
  created_at: string;
}

export interface HappySheetEntry {
  id: number;
  user_id: number;
  date: string;
  what_made_you_happy: string;
  what_made_others_happy: string;
  goals_without_greed: string;
  dreams_supported: string;
  goals_without_greed_impossible: string;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  profile_picture?: string | null;
}

export interface DailyHappySheetReportRow {
  user_id: number;
  user_name: string;
  user_email: string;
  date: string;
  what_made_you_happy?: string | null;
  what_made_others_happy?: string | null;
  goals_without_greed?: string | null;
  dreams_supported?: string | null;
  goals_without_greed_impossible?: string | null;
}

export interface HappySheetReactionSummary {
  emoji: string;
  count: number;
  users: string[];
  reacted_by_me: boolean;
}

export interface HappySheetCommentEntry {
  id: number;
  entry_id: number;
  user_id: number;
  comment_text: string;
  parent_comment_id?: number | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  profile_picture?: string | null;
}

export interface HappySheetAppreciationEntry {
  id: number;
  entry_id: number;
  from_user_id: number;
  message: string;
  created_at: string;
  from_user_name?: string | null;
  from_user_email?: string | null;
}

export interface HappySheetStreakEntry {
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_entry_date?: string | null;
  user_name?: string | null;
}

export interface HappySheetWeeklyHighlightEntry {
  entry_id: number;
  user_id: number;
  user_name: string;
  date: string;
  excerpt: string;
  appreciation_count: number;
}

export interface HappySheetLeaderboardEntry {
  user_id: number;
  user_name: string;
  appreciation_count: number;
}

export interface HappySheetAiInsights {
  sentiment: string;
  themes: string[];
  bullets: string[];
}

export interface DreamProjectEntry {
  id: number;
  user_id: number;
  description: string;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  profile_picture?: string | null;
}

export interface LearningFocusEntry {
  id: number;
  user_id: number;
  focus: string;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
  profile_picture?: string | null;
}

export interface PersonalProjectEntry {
  id: number;
  user_id: number;
  title: string;
  tag?: string | null;
  created_at: string;
}

// Task Sheet
export async function submitTaskSheet(data: {
  achievements: string;
  repo_link?: string;
  date?: string; // YYYY-MM-DD; defaults to today if omitted
}): Promise<ApiResponse<TaskSheetEntry>> {
  return apiFetch<TaskSheetEntry>("/my-space/task-sheet", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyTaskSheets(limit = 30): Promise<ApiResponse<TaskSheetEntry[]>> {
  return apiFetch<TaskSheetEntry[]>(`/my-space/task-sheet/me?limit=${limit}`);
}

// Happy Sheet
export async function submitHappySheet(data: {
  what_made_you_happy: string;
  what_made_others_happy: string;
  goals_without_greed: string;
  dreams_supported: string;
  goals_without_greed_impossible: string;
  date?: string; // YYYY-MM-DD; defaults to today if omitted
}): Promise<ApiResponse<HappySheetEntry>> {
  return apiFetch<HappySheetEntry>("/my-space/happy-sheet", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyHappySheets(limit = 30): Promise<ApiResponse<HappySheetEntry[]>> {
  return apiFetch<HappySheetEntry[]>(`/my-space/happy-sheet/me?limit=${limit}`);
}

export async function getAllTeamHappySheets(limit = 100): Promise<ApiResponse<HappySheetEntry[]>> {
  return apiFetch<HappySheetEntry[]>(`/my-space/happy-sheet/team?limit=${limit}`);
}

export async function getTeamHappySheetsByDate(date: string): Promise<ApiResponse<HappySheetEntry[]>> {
  return apiFetch<HappySheetEntry[]>(`/my-space/happy-sheet/team/by-date?date=${encodeURIComponent(date)}`);
}

export async function getAdminDailyHappySheetReport(date: string): Promise<ApiResponse<DailyHappySheetReportRow[]>> {
  return apiFetch<DailyHappySheetReportRow[]>(`/my-space/happy-sheet/admin/daily-report?date=${encodeURIComponent(date)}`);
}

export async function getHappySheetReactions(entryId: number): Promise<ApiResponse<HappySheetReactionSummary[]>> {
  return apiFetch<HappySheetReactionSummary[]>(`/my-space/happy-sheet/entry/${entryId}/reactions`);
}

export async function toggleHappySheetReaction(entryId: number, emoji: string): Promise<ApiResponse<{ active: boolean }>> {
  return apiFetch<{ active: boolean }>(`/my-space/happy-sheet/entry/${entryId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export async function getHappySheetComments(entryId: number): Promise<ApiResponse<HappySheetCommentEntry[]>> {
  return apiFetch<HappySheetCommentEntry[]>(`/my-space/happy-sheet/entry/${entryId}/comments`);
}

export async function addHappySheetComment(
  entryId: number,
  data: { comment_text: string; parent_comment_id?: number | null }
): Promise<ApiResponse<HappySheetCommentEntry>> {
  return apiFetch<HappySheetCommentEntry>(`/my-space/happy-sheet/entry/${entryId}/comments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getHappySheetAppreciations(entryId: number): Promise<ApiResponse<HappySheetAppreciationEntry[]>> {
  return apiFetch<HappySheetAppreciationEntry[]>(`/my-space/happy-sheet/entry/${entryId}/appreciations`);
}

export async function addHappySheetAppreciation(
  entryId: number,
  data: { message: string }
): Promise<ApiResponse<HappySheetAppreciationEntry>> {
  return apiFetch<HappySheetAppreciationEntry>(`/my-space/happy-sheet/entry/${entryId}/appreciations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getHappySheetStreaks(): Promise<ApiResponse<HappySheetStreakEntry[]>> {
  return apiFetch<HappySheetStreakEntry[]>("/my-space/happy-sheet/streaks");
}

export async function getHappySheetWeeklyHighlights(): Promise<ApiResponse<HappySheetWeeklyHighlightEntry[]>> {
  return apiFetch<HappySheetWeeklyHighlightEntry[]>("/my-space/happy-sheet/weekly/highlights");
}

export async function getHappySheetWeeklyLeaderboard(): Promise<ApiResponse<HappySheetLeaderboardEntry[]>> {
  return apiFetch<HappySheetLeaderboardEntry[]>("/my-space/happy-sheet/weekly/leaderboard");
}

export async function getHappySheetWeeklyAiInsights(): Promise<ApiResponse<HappySheetAiInsights>> {
  return apiFetch<HappySheetAiInsights>("/my-space/happy-sheet/weekly/ai-insights");
}

// Dream Project (Visionary Canvas)
export async function submitDreamProject(data: {
  description: string;
}): Promise<ApiResponse<DreamProjectEntry>> {
  return apiFetch<DreamProjectEntry>("/my-space/dream-project", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAllDreamProjects(limit = 50): Promise<ApiResponse<DreamProjectEntry[]>> {
  return apiFetch<DreamProjectEntry[]>(`/my-space/dream-project/all?limit=${limit}`);
}

// Learning Focus (Learning Canvas)
export async function submitLearningFocus(data: {
  focus: string;
}): Promise<ApiResponse<LearningFocusEntry>> {
  return apiFetch<LearningFocusEntry>("/my-space/learning-focus", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAllLearningFocuses(limit = 50): Promise<ApiResponse<LearningFocusEntry[]>> {
  return apiFetch<LearningFocusEntry[]>(`/my-space/learning-focus/all?limit=${limit}`);
}

// Personal Projects (Learning Canvas)
export async function submitPersonalProject(data: {
  title: string;
  tag?: string;
}): Promise<ApiResponse<PersonalProjectEntry>> {
  return apiFetch<PersonalProjectEntry>("/my-space/personal-project", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyPersonalProjects(limit = 30): Promise<ApiResponse<PersonalProjectEntry[]>> {
  return apiFetch<PersonalProjectEntry[]>(`/my-space/personal-project/me?limit=${limit}`);
}

// ==================== TEAMS MEETINGS ====================

export interface TeamsMeeting {
  id: number;
  title: string;
  meeting_link: string;
  created_by: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
}

/** Admin: share (create/replace) a Teams meeting link. */
export async function shareMeetingLink(data: {
  title: string;
  meeting_link: string;
}): Promise<ApiResponse<TeamsMeeting>> {
  clearCache("teams");
  return apiFetch<TeamsMeeting>("/teams/meeting", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** All users: get the active Teams meeting link. */
export async function getActiveMeeting(): Promise<ApiResponse<TeamsMeeting | null>> {
  const cacheKey = "teams-meeting";
  const cached = getCached<TeamsMeeting | null>(cacheKey);
  if (cached !== null) return { data: cached };
  const result = await apiFetch<TeamsMeeting | null>("/teams/meeting");
  if (result.data !== undefined) {
    setCached(cacheKey, result.data);
  }
  return result;
}

/** Admin: remove the active Teams meeting link. */
export async function removeMeetingLink(): Promise<ApiResponse<{ message: string }>> {
  clearCache("teams");
  return apiFetch<{ message: string }>("/teams/meeting", { method: "DELETE" });
}

