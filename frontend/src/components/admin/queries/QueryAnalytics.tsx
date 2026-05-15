"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Query {
  id: number;
  workspace_name: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  started_at?: string;
  resolved_at?: string;
  duration_hours?: number;
  time_to_start_hours?: number;
}

interface QueryAnalyticsProps {
  queries: Query[];
  workspaces: Array<{ id: number; name: string }>;
}

export function QueryAnalytics({ queries, workspaces }: QueryAnalyticsProps) {
  // Calculate metrics by workspace
  const workspaceMetrics = workspaces.map((ws) => {
    const wsQueries = queries.filter((q) => q.workspace_name === ws.name);
    const resolvedQueries = wsQueries.filter((q) => q.status === "resolved" || q.status === "closed");
    const avgDuration =
      resolvedQueries.length > 0
        ? resolvedQueries.reduce((sum, q) => sum + (q.duration_hours || 0), 0) / resolvedQueries.length
        : 0;
    const avgTimeToStart =
      wsQueries.filter((q) => q.started_at).length > 0
        ? wsQueries
            .filter((q) => q.started_at)
            .reduce((sum, q) => sum + (q.time_to_start_hours || 0), 0) /
          wsQueries.filter((q) => q.started_at).length
        : 0;

    return {
      name: ws.name,
      total: wsQueries.length,
      resolved: resolvedQueries.length,
      avgDuration: Math.round(avgDuration * 10) / 10,
      avgTimeToStart: Math.round(avgTimeToStart * 10) / 10,
    };
  });

  // Calculate metrics by priority
  const priorityMetrics = (["low", "medium", "high"] as const).map((priority) => {
    const priorityQueries = queries.filter((q) => q.priority === priority);
    const resolvedQueries = priorityQueries.filter((q) => q.status === "resolved" || q.status === "closed");
    return {
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      total: priorityQueries.length,
      resolved: resolvedQueries.length,
    };
  });

  // Status distribution
  const statusMetrics = ["open", "in_progress", "resolved", "closed", "on_hold"].map((status) => {
    const count = queries.filter((q) => q.status === status).length;
    return {
      name: status.replace("_", " ").toUpperCase(),
      value: count,
    };
  });

  // Time to resolution timeline (last 7 resolved tickets)
  const timelineData = queries
    .filter((q) => q.resolved_at)
    .sort((a, b) => new Date(b.resolved_at!).getTime() - new Date(a.resolved_at!).getTime())
    .slice(0, 7)
    .reverse()
    .map((q, i) => ({
      name: `Q${q.id}`,
      duration: Math.round((q.duration_hours || 0) * 10) / 10,
    }));

  const colors = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Time to Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queries.filter((q) => q.started_at).length > 0
                ? (
                    queries
                      .filter((q) => q.started_at)
                      .reduce((sum, q) => sum + (q.time_to_start_hours || 0), 0) /
                    queries.filter((q) => q.started_at).length
                  ).toFixed(1)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queries.filter((q) => q.resolved_at).length > 0
                ? (
                    queries
                      .filter((q) => q.resolved_at)
                      .reduce((sum, q) => sum + (q.duration_hours || 0), 0) /
                    queries.filter((q) => q.resolved_at).length
                  ).toFixed(1)
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queries.length > 0
                ? Math.round(
                    (queries.filter((q) => q.resolved_at).length / queries.length) * 100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Breakdown of ticket statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusMetrics.filter((s) => s.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusMetrics.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Breakdown</CardTitle>
            <CardDescription>Tickets by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total" />
                <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time to Resolution Trend */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution Time Trend</CardTitle>
            <CardDescription>Time taken for recently resolved tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="#3b82f6"
                  dot={{ fill: "#3b82f6" }}
                  name="Duration (hours)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Workspace Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Project Performance</CardTitle>
          <CardDescription>Metrics by project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold">Project</th>
                  <th className="text-right py-2 font-semibold">Total</th>
                  <th className="text-right py-2 font-semibold">Resolved</th>
                  <th className="text-right py-2 font-semibold">Avg Time</th>
                  <th className="text-right py-2 font-semibold">Avg to Start</th>
                </tr>
              </thead>
              <tbody>
                {workspaceMetrics.map((ws) => (
                  <tr key={ws.name} className="border-b hover:bg-muted/50">
                    <td className="py-2">{ws.name}</td>
                    <td className="text-right">{ws.total}</td>
                    <td className="text-right">{ws.resolved}</td>
                    <td className="text-right">{ws.avgDuration}h</td>
                    <td className="text-right">{ws.avgTimeToStart}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
