"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { getUserById, UserProfile } from "@/lib/api";
import { ArrowLeft, Mail, Calendar, Github, Linkedin, User as UserIcon, Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [employee, setEmployee] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userId) {
      loadEmployee();
    }
  }, [userId]);

  const loadEmployee = async () => {
    setLoading(true);
    setError("");
    
    const response = await getUserById(parseInt(userId));
    
    if (response.data) {
      setEmployee(response.data);
    } else if (response.error) {
      setError(response.error);
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
                    {employee.date_joined && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Date Joined</label>
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {new Date(employee.date_joined).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Account Created</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {new Date(employee.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
