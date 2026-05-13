"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryCreationForm } from "@/components/admin/queries/QueryCreationForm";
import { QueriesList } from "@/components/admin/queries/QueriesList";
import { QueryAnalytics } from "@/components/admin/queries/QueryAnalytics";
import { Loader2 } from "lucide-react";
import { getToken } from "@/lib/api";

const API_BASE = "/api"; // Use the proxied API endpoint in browser

interface Query {
  id: number;
  workspace_id: number;
  workspace_name: string;
  raised_by_name: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "on_hold" | "closed";
  priority: "low" | "medium" | "high";
  created_at: string;
  started_at?: string;
  resolved_at?: string;
  duration_hours?: number;
  time_to_start_hours?: number;
}

export default function AdminQueriesPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ id: number; name: string }>>([]);

  // Fetch queries
  const { data: queries = [], isLoading: queriesLoading, refetch: refetchQueries } = useQuery({
    queryKey: ["admin-queries", selectedWorkspace],
    queryFn: async () => {
      const token = getToken();
      const url = selectedWorkspace
        ? `${API_BASE}/admin/queries/list?workspace_id=${selectedWorkspace}`
        : `${API_BASE}/admin/queries/list`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch queries");
      return response.json();
    },
    enabled: true,
  });

  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setWorkspaces(data);
          if (data.length > 0 && !selectedWorkspace) {
            setSelectedWorkspace(data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleQueryCreated = () => {
    refetchQueries();
  };

  const openQueries = queries.filter((q: Query) => q.status === "open" || q.status === "in_progress");
  const resolvedQueries = queries.filter((q: Query) => q.status === "resolved" || q.status === "closed");

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ticket Management</h1>
        <p className="text-muted-foreground">
          Raise tickets for projects, track status, and monitor resolution times
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create Ticket</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queries.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Open/In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{openQueries.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active tickets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{resolvedQueries.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {resolvedQueries.length > 0
                    ? (
                        resolvedQueries.reduce(
                          (sum: number, q: Query) => sum + (q.duration_hours || 0),
                          0
                        ) / resolvedQueries.length
                      ).toFixed(1)
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">hours</p>
              </CardContent>
            </Card>
          </div>

          {/* Queries List */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Project</CardTitle>
              <CardDescription>
                {selectedWorkspace ? "Filtered by selected project" : "All projects"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <QueriesList
                  queries={queries}
                  onQueryUpdated={refetchQueries}
                  selectedWorkspace={selectedWorkspace}
                  onWorkspaceSelect={setSelectedWorkspace}
                  workspaces={workspaces}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Raise New Ticket</CardTitle>
              <CardDescription>
                Quickly create a ticket for any project. Track status and time to resolution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QueryCreationForm workspaces={workspaces} onSuccess={handleQueryCreated} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <QueryAnalytics queries={queries} workspaces={workspaces} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
