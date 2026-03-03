"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { fetchEmployees, deleteUser, createEmployee, type User } from "@/lib/api";
import { Search, Plus, Mail, UserCircle, Loader2, Github, Linkedin, Calendar, Trash2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  Active: "bg-green-500/10 text-green-500",
  Inactive: "bg-red-500/10 text-red-500",
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Add Employee modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" as "employee" | "admin" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadEmployees() {
      setIsLoading(true);
      const result = await fetchEmployees();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setEmployees(result.data);
      }
      setIsLoading(false);
    }
    loadEmployees();
  }, []);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProfilePictureUrl = (profilePicture?: string) => {
    if (!profilePicture) return null;
    // If it's a data URI (base64), return it directly
    if (profilePicture.startsWith("data:")) return profilePicture;
    // Otherwise treat as URL
    if (profilePicture.startsWith("http")) return profilePicture;
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${profilePicture}`;
  };

  const handleEmployeeClick = (empId: number) => {
    router.push(`/admin/users/${empId}`);
  };

  const handleDeleteEmployee = async (empId: number, empName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to permanently delete ${empName}? This action cannot be undone and will remove all associated data (tasks, attendance records, etc.).`)) {
      return;
    }

    const result = await deleteUser(empId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${empName} has been permanently deleted`);
      // Reload employees list
      const refreshResult = await fetchEmployees();
      if (refreshResult.data) {
        setEmployees(refreshResult.data);
      }
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("All fields are required.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const result = await createEmployee(form);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
    } else {
      toast.success(`${form.name} has been added successfully.`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "employee" });
      // Refresh list
      const refresh = await fetchEmployees();
      if (refresh.data) setEmployees(refresh.data);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name} userHandle={`@${user?.email?.split("@")[0]}`}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Employees</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your team members.</p>
            </div>
            <button
              onClick={() => { setShowModal(true); setFormError(""); setForm({ name: "", email: "", password: "", role: "employee" }); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus size={16} /> Add Employee
            </button>
          </div>

          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <UserCircle size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <div 
                  key={emp.id} 
                  onClick={() => handleEmployeeClick(emp.id)}
                  className="rounded-xl border border-border bg-card p-5 card-shadow hover:card-shadow-hover transition-all duration-300 cursor-pointer hover:border-primary/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/50 text-white font-semibold text-sm overflow-hidden">
                      {getProfilePictureUrl(emp.profile_picture) ? (
                        <img
                          src={getProfilePictureUrl(emp.profile_picture)!}
                          alt={emp.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-card-foreground truncate">{emp.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle[emp.is_active ? "Active" : "Inactive"]}`}>
                          {emp.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{emp.role}</p>
                    </div>
                    {emp.is_active && (
                      <button
                        onClick={(e) => handleDeleteEmployee(emp.id, emp.name, e)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2 rounded-lg transition-all duration-200"
                        title="Deactivate employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <Mail size={12} /> {emp.email}
                    </p>
                    {emp.age && (
                      <p className="text-xs text-muted-foreground">
                        Age: {emp.age}
                      </p>
                    )}
                    {emp.date_joined && (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar size={12} /> Joined: {new Date(emp.date_joined).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {emp.github_url && (
                        <a
                          href={emp.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Github size={14} />
                        </a>
                      )}
                      {emp.linkedin_url && (
                        <a
                          href={emp.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Linkedin size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">Add New Employee</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Account will be immediately active.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "employee" | "admin" }))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <p className="text-xs text-destructive font-medium">{formError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {submitting ? "Adding..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
