"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { BarChart3, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyData = [
  { month: "Sep", hours: 1680 },
  { month: "Oct", hours: 1720 },
  { month: "Nov", hours: 1650 },
  { month: "Dec", hours: 1580 },
  { month: "Jan", hours: 1740 },
  { month: "Feb", hours: 1200 },
];

export default function ReportsPage() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Workforce analytics and insights.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors card-shadow">
            <Download size={16} /> Export
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-accent" />
            <h3 className="text-base font-semibold text-card-foreground">Monthly Working Hours</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(22 30% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(289 20% 40%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(289 20% 40%)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(22 30% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="hours" fill="hsl(266 62% 18%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
