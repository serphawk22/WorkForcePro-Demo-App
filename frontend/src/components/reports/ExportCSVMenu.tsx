import React, { useState } from "react";
import { Download, ChevronDown, CalendarDays, CalendarRange, Infinity } from "lucide-react";

interface ExportCSVMenuProps {
  data: any[];
  filename: string;
  // function to extract the date from a data row to filter
  getDate: (row: any) => Date;
  // function to format a row into CSV columns
  formatRow: (row: any) => Record<string, string | number>;
}

export default function ExportCSVMenu({ data, filename, getDate, formatRow }: ExportCSVMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const downloadCSV = (filteredData: any[], label: string) => {
    if (filteredData.length === 0) {
      alert("No data available for the selected period.");
      return;
    }

    const formattedData = filteredData.map(formatRow);
    const headers = Object.keys(formattedData[0]);
    const csvContent = [
      headers.join(","),
      ...formattedData.map(row => 
        headers.map(header => {
          const val = row[header] !== null && row[header] !== undefined ? String(row[header]) : "";
          // Escape quotes and wrap in quotes if contains comma
          return `"${val.replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}_${label.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  const handleExport = (period: "week" | "month" | "all") => {
    const now = new Date();
    let filtered = data;

    if (period === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      filtered = data.filter(row => getDate(row) >= oneWeekAgo);
      downloadCSV(filtered, "Last_7_Days");
    } else if (period === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filtered = data.filter(row => getDate(row) >= oneMonthAgo);
      downloadCSV(filtered, "Last_30_Days");
    } else {
      downloadCSV(filtered, "All_Time");
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-purple-100 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export CSV</span>
        <ChevronDown size={14} className="opacity-50" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-[#2B124C] shadow-lg ring-1 ring-black ring-opacity-5 z-50 border border-slate-100 dark:border-purple-800/50">
            <div className="py-1">
              <button
                onClick={() => handleExport("week")}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <CalendarDays size={14} /> Last 7 Days
              </button>
              <button
                onClick={() => handleExport("month")}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <CalendarRange size={14} /> Last 30 Days
              </button>
              <button
                onClick={() => handleExport("all")}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <Infinity size={14} /> All Time
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
