"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { DollarSign, Download, TrendingUp } from "lucide-react";

const payrollData = [
  { name: "Sarah K.", department: "Engineering", salary: "$8,500", status: "Paid", date: "Feb 1" },
  { name: "Mike R.", department: "Design", salary: "$7,200", status: "Paid", date: "Feb 1" },
  { name: "Lisa T.", department: "Marketing", salary: "$6,800", status: "Pending", date: "Feb 1" },
  { name: "John D.", department: "Engineering", salary: "$9,100", status: "Paid", date: "Feb 1" },
  { name: "Anna P.", department: "HR", salary: "$6,500", status: "Processing", date: "Feb 1" },
];

const statusStyle: Record<string, string> = {
  Paid: "text-green-500",
  Pending: "text-yellow-500",
  Processing: "text-blue-500",
};

export default function PayrollPage() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-sm text-muted-foreground mt-1">February 2026 payroll summary.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors card-shadow">
            <Download size={16} /> Export
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Total Payroll" value="$186,400" subtitle="This month" trend="3.2%" trendType="up" />
          <StatCard icon={TrendingUp} label="Avg Salary" value="$7,620" subtitle="Per employee" trend="Stable" trendType="stable" />
          <StatCard icon={DollarSign} label="Bonuses" value="$12,300" subtitle="Performance based" />
        </div>

        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-5 text-left font-semibold">Employee</th>
                <th className="py-3 text-left font-semibold">Department</th>
                <th className="py-3 text-left font-semibold">Salary</th>
                <th className="py-3 text-left font-semibold">Status</th>
                <th className="py-3 text-left font-semibold">Pay Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payrollData.map((row) => (
                <tr key={row.name} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3.5 pl-5 font-medium text-card-foreground">{row.name}</td>
                  <td className="py-3.5 text-muted-foreground">{row.department}</td>
                  <td className="py-3.5 font-semibold text-card-foreground">{row.salary}</td>
                  <td className={`py-3.5 font-medium text-xs ${statusStyle[row.status]}`}>{row.status}</td>
                  <td className="py-3.5 text-muted-foreground">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
