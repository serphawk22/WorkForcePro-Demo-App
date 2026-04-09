"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import StatCard from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, ChevronRight, CheckCircle2, Loader2, Download } from "lucide-react";
import { getPayroll, markPayrollPaid, updatePayrollStatus, PayrollRecord } from "@/lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusStyle: Record<string, string> = {
  Paid: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  Pending: "bg-secondary/60 text-primary-light dark:bg-primary/10 dark:text-primary-light",
  Processing: "bg-primary/5 text-accent dark:bg-primary/10 dark:text-accent",
};

const statusSelectStyle: Record<string, string> = {
  Paid: [
    // light: primary purple tint
    "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20",
    // dark: brighter purple tint
    "dark:bg-primary/20 dark:text-primary dark:border-primary/30 dark:hover:bg-primary/30",
  ].join(" "),
  Pending: [
    // light: beige/accent muted
    "bg-secondary/60 text-primary-light border-secondary hover:bg-secondary/90",
    // dark: muted purple tint
    "dark:bg-primary/10 dark:text-primary-light dark:border-primary/20 dark:hover:bg-primary/20",
  ].join(" "),
};

export default function PayrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadPayroll = useCallback(async () => {
    if (user && user.role !== "admin") return;
    setLoading(true);
    setError("");
    const res = await getPayroll(month, year);
    if (res.data) {
      setRecords(res.data);
    } else {
      setError(res.error || "Failed to load payroll data");
    }
    setLoading(false);
  }, [month, year, user]);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/profile");
    }
  }, [user, router]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const totalPayroll = useMemo(
    () => records.reduce((sum, r) => sum + r.salary, 0),
    [records]
  );
  const avgSalary = useMemo(
    () => (records.length ? totalPayroll / records.length : 0),
    [records, totalPayroll]
  );

  const handleMarkPaid = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setMarkingId(id);
    const res = await markPayrollPaid(id);
    if (res.data) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "Paid", pay_date: res.data!.pay_date } : r
        )
      );
    }
    setMarkingId(null);
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, id: number) => {
    e.stopPropagation();
    const newStatus = e.target.value as "Paid" | "Pending";
    setUpdatingStatusId(id);
    const res = await updatePayrollStatus(id, newStatus);
    if (res.data) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: res.data!.status, pay_date: res.data!.pay_date } : r
        )
      );
    }
    setUpdatingStatusId(null);
  };

  const formatSalary = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatPayDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const downloadCSV = () => {
    const header = ["Employee", "Department", "Salary (INR)", "Status", "Pay Date"];
    const rows = records.map((r) => [
      r.name,
      r.department ?? "",
      r.salary,
      r.status,
      r.pay_date ? new Date(r.pay_date).toLocaleDateString("en-IN") : "",
    ]);
    const totalRow = ["TOTAL", "", records.reduce((s, r) => s + r.salary, 0), "", ""];
    const csvContent = [header, ...rows, [], totalRow]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payroll_${MONTHS[month - 1]}_${year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {MONTHS[month - 1]} {year} payroll summary.
            </p>
          </div>

          {/* Month / Year selectors + Download */}
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground card-shadow focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground card-shadow focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={downloadCSV}
              disabled={loading || records.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors card-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stat Cards (no Bonuses) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={DollarSign}
            label="Total Payroll"
            value={loading ? "—" : formatSalary(totalPayroll)}
            subtitle="This month"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Salary"
            value={loading ? "—" : formatSalary(avgSalary)}
            subtitle="Per employee"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          {error && (
            <div className="p-4 text-sm text-destructive text-center">{error}</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No payroll records for this period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-5 text-left font-semibold">Employee</th>
                  <th className="py-3 text-left font-semibold">Department</th>
                  <th className="py-3 text-left font-semibold">Salary</th>
                  <th className="py-3 text-left font-semibold">Status</th>
                  <th className="py-3 text-left font-semibold">Pay Date</th>
                  <th className="py-3 pr-5 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/admin/users/${row.employee_id}`)}
                    className="cursor-pointer hover:bg-secondary/40 transition-all duration-150 hover:-translate-y-[1px]"
                  >
                    <td className="py-3.5 pl-5 font-medium text-card-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {row.name}
                        <ChevronRight size={14} className="text-muted-foreground/60" />
                      </span>
                    </td>
                    <td className="py-3.5 text-muted-foreground">{row.department ?? "—"}</td>
                    <td className="py-3.5 font-semibold text-card-foreground">{formatSalary(row.salary)}</td>
                    <td className="py-3.5">
                      <div className="relative inline-flex items-center">
                        <select
                          value={row.status === "Processing" ? "Pending" : row.status}
                          onChange={(e) => handleStatusChange(e, row.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updatingStatusId === row.id}
                          className={`appearance-none rounded-full pl-2.5 pr-6 py-0.5 text-xs font-medium border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed ${
                            statusSelectStyle[row.status] ?? statusSelectStyle["Pending"]
                          }`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                        </select>
                        {updatingStatusId === row.id ? (
                          <Loader2 size={10} className="absolute right-1.5 animate-spin text-current pointer-events-none" />
                        ) : (
                          <svg className="absolute right-1.5 w-2.5 h-2.5 pointer-events-none opacity-60" viewBox="0 0 10 6" fill="none">
                            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-muted-foreground">{formatPayDate(row.pay_date)}</td>
                    <td className="py-3.5 pr-5">
                      {row.status === "Pending" ? (
                        <button
                            onClick={(e) => handleMarkPaid(e, row.id)}
                            disabled={markingId === row.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-glow transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                          >
                            {markingId === row.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Mark Paid
                          </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
