"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { getUserById, getLatestPayroll, updateEmployeeDateJoined, updateEmployeeBaseSalary, UserProfile, PayrollRecord } from "@/lib/api";
import { ArrowLeft, Mail, Calendar, Github, Linkedin, User as UserIcon, Loader2, Shield, DollarSign, Briefcase, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<UserProfile | null>(null);
  const [payroll, setPayroll] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingDateJoined, setEditingDateJoined] = useState(false);
  const [dateJoinedInput, setDateJoinedInput] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);

  // Invalidate Next.js route cache on every mount so navigating back always shows fresh data
  useEffect(() => {
    router.refresh();
  }, []);

  useEffect(() => {
    if (userId) {
      loadEmployee();
    }
  }, [userId]);

  const loadEmployee = async () => {
    setLoading(true);
    setError("");

    const [empRes, payRes] = await Promise.all([
      getUserById(parseInt(userId)),
      getLatestPayroll(parseInt(userId)),
    ]);

    if (empRes.data) {
      setEmployee(empRes.data);
      setDateJoinedInput(empRes.data.date_joined || "");
      setSalaryInput(empRes.data.base_salary?.toString() || "");
      setDepartmentInput(empRes.data.department || "");
    } else if (empRes.error) {
      setError(empRes.error);
    }

    if (payRes.data) {
      setPayroll(payRes.data);
    }

    setLoading(false);
  };

  const getProfilePictureUrl = () => {
    if (!employee?.profile_picture) return null;
    // If it's a data URI (base64), return it directly
    if (employee.profile_picture.startsWith("data:")) return employee.profile_picture;
    // Otherwise treat as URL
    if (employee.profile_picture.startsWith("http")) return employee.profile_picture;
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${employee.profile_picture}`;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <DashboardLayout role="admin" userName={user?.name} userHandle={`@${user?.email?.split("@")[0]}`}>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading employee details...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <DashboardLayout role="admin" userName={user?.name} userHandle={`@${user?.email?.split("@")[0]}`}>
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/employees")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Button>
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name} userHandle={`@${user?.email?.split("@")[0]}`}>
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/employees")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Picture Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                  {getProfilePictureUrl() ? (
                    <img
                      src={getProfilePictureUrl()!}
                      alt={employee.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-16 w-16 text-white" />
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold">{employee.name}</h2>
                  <p className="text-sm text-muted-foreground capitalize">{employee.role}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      employee.is_active
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {employee.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Employee Details Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Employee Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <div className="mt-1 flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{employee.name}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{employee.email}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Role</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium capitalize">{employee.role}</p>
                      </div>
                    </div>

                    {employee.age && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Age</label>
                        <p className="mt-1 text-sm font-medium">{employee.age} years</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Date of Joining — editable by admin */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Date of Joining</label>
                      {editingDateJoined ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="date"
                            value={dateJoinedInput}
                            onChange={(e) => setDateJoinedInput(e.target.value)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <button
                            onClick={async () => {
                              setSavingDate(true);
                              const res = await updateEmployeeDateJoined(
                                parseInt(userId),
                                dateJoinedInput || null
                              );
                              if (res.data) {
                                setEmployee((prev) =>
                                  prev ? { ...prev, date_joined: dateJoinedInput || undefined } : prev
                                );
                              }
                              setSavingDate(false);
                              setEditingDateJoined(false);
                            }}
                            disabled={savingDate}
                            className="rounded-md bg-primary/10 p-1.5 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            {savingDate ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={() => {
                              setDateJoinedInput(employee.date_joined || "");
                              setEditingDateJoined(false);
                            }}
                            className="rounded-md bg-secondary p-1.5 text-muted-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {employee.date_joined
                              ? new Date(employee.date_joined).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                          <button
                            onClick={() => setEditingDateJoined(true)}
                            className="ml-1 rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit date of joining"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {employee.github_url && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">GitHub</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Github className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={employee.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                    )}

                    {employee.linkedin_url && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">LinkedIn</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Linkedin className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={employee.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Salary Information Card */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Salary Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
                {/* Base Salary — editable */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Base Salary (INR)</label>
                  {editingSalary ? (
                    <div className="mt-1">
                      <input
                        type="number"
                        min="0"
                        value={salaryInput}
                        onChange={(e) => setSalaryInput(e.target.value)}
                        placeholder="e.g. 75000"
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-semibold text-card-foreground">
                        {employee.base_salary
                          ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(employee.base_salary)
                          : "Not set"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Department — editable */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  {editingSalary ? (
                    <div className="mt-1">
                      <input
                        type="text"
                        value={departmentInput}
                        onChange={(e) => setDepartmentInput(e.target.value)}
                        placeholder="e.g. Engineering"
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{employee.department ?? <span className="italic text-muted-foreground">Not set</span>}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Last Payment Date</label>
                  <p className="mt-1 text-sm font-medium">
                    {payroll?.pay_date
                      ? new Date(payroll.pay_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
                  <p className="mt-1">
                    {payroll ? (
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          payroll.status === "Paid"
                            ? "bg-green-500/10 text-green-500"
                            : payroll.status === "Pending"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {payroll.status}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No records</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Edit / Save / Cancel buttons */}
              <div className="mt-6 flex items-center gap-3">
                {editingSalary ? (
                  <>
                    <button
                      onClick={async () => {
                        const parsed = parseFloat(salaryInput);
                        if (isNaN(parsed) || parsed < 0) return;
                        setSavingSalary(true);
                        const res = await updateEmployeeBaseSalary(
                          parseInt(userId),
                          parsed,
                          departmentInput || undefined
                        );
                        if (res.data) {
                          setEmployee((prev) =>
                            prev ? { ...prev, base_salary: parsed, department: departmentInput || undefined } : prev
                          );
                        }
                        setSavingSalary(false);
                        setEditingSalary(false);
                      }}
                      disabled={savingSalary}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {savingSalary ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setSalaryInput(employee.base_salary?.toString() || "");
                        setDepartmentInput(employee.department || "");
                        setEditingSalary(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingSalary(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil size={13} /> Edit Salary &amp; Department
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
