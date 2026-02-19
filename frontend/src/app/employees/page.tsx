"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { fetchEmployees, type User } from "@/lib/api";
import { Search, Plus, Mail, UserCircle, Loader2 } from "lucide-react";

const statusStyle: Record<string, string> = {
  Active: "bg-green-500/10 text-green-500",
  Inactive: "bg-red-500/10 text-red-500",
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name} userHandle={`@${user?.email?.split("@")[0]}`}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Employees</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your team members.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
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
                <div key={emp.id} className="rounded-xl border border-border bg-card p-5 card-shadow hover:card-shadow-hover transition-all duration-300 cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold text-sm">
                      {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
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
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail size={12} /> {emp.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(emp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
