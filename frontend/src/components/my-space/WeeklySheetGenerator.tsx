"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Download, Mail, RefreshCw, Save, Eye } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiBaseUrl } from "@/lib/api";

interface WeeklySheet {
  id?: number;
  status?: "draft" | "submitted";
  weekly_summary: string;
  major_accomplishments: string;
  tasks_completed: string;
  pending_tasks: string;
  blockers: string;
  productivity_insights: string;
  time_utilization: string;
  suggested_priorities: string;
}

export default function WeeklySheetGenerator() {
  const [sheet, setSheet] = useState<WeeklySheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentSheet();
  }, []);

  const fetchCurrentSheet = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/my-space/weekly-sheet/current`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSheet(data);
      }
    } catch (error) {
      console.error("Error fetching current sheet:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSheet = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/my-space/weekly-sheet/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to generate weekly sheet");
      const data = await res.json();
      setSheet(data);
      toast.success("AI generated your weekly sheet!");
    } catch (error) {
      toast.error("Error generating weekly sheet");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const saveSheet = async (status: "draft" | "submitted" = "draft") => {
    if (!sheet) return;
    setSaving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/my-space/weekly-sheet/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ...sheet, status }),
      });
      if (!res.ok) throw new Error("Failed to save weekly sheet");
      const data = await res.json();
      setSheet(data);
      toast.success(status === "submitted" ? "Sheet submitted!" : "Draft saved!");
    } catch (error) {
      toast.error("Error saving weekly sheet");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewReport = async () => {
    if (!printRef.current) return;
    setIsPreviewLoading(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      setPreviewImage(imgData);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error("Preview failed", err);
      toast.error("Failed to generate preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Weekly_Sheet.pdf");
  };

  const handleExportExcel = () => {
    if (!sheet) return;
    const data = [
      { Field: "Weekly Summary", Content: sheet.weekly_summary },
      { Field: "Major Accomplishments", Content: sheet.major_accomplishments },
      { Field: "Tasks Completed", Content: sheet.tasks_completed },
      { Field: "Pending Tasks", Content: sheet.pending_tasks },
      { Field: "Blockers", Content: sheet.blockers },
      { Field: "Productivity Insights", Content: sheet.productivity_insights },
      { Field: "Time Utilization", Content: sheet.time_utilization },
      { Field: "Suggested Priorities", Content: sheet.suggested_priorities },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Sheet");
    XLSX.writeFile(wb, "Weekly_Sheet.xlsx");
  };

  const handleEmail = () => {
    if (!sheet) return;
    const subject = encodeURIComponent("My Weekly Progress Sheet");
    const body = encodeURIComponent(
      `Weekly Summary:\n${sheet.weekly_summary}\n\nMajor Accomplishments:\n${sheet.major_accomplishments}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <RefreshCw className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">No Weekly Sheet Generated Yet</h2>
        <p className="text-muted-foreground max-w-md">
          Use the power of AI to automatically generate your weekly sheet based on your tasks, attendance, and activity for the week.
        </p>
        <Button onClick={generateSheet} disabled={generating} size="lg" className="mt-4">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate AI Weekly Sheet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-black/20 p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Current Weekly Sheet</h2>
          <span className={`px-2 py-1 text-xs rounded-full ${sheet.status === "submitted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            {sheet.status === "submitted" ? "Submitted" : "Draft"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviewReport} disabled={isPreviewLoading}>
            {isPreviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmail}>
            <Mail className="mr-2 h-4 w-4" /> Email
          </Button>
          <Button variant="outline" size="sm" onClick={generateSheet} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Regenerate
          </Button>
        </div>
      </div>

      <div ref={printRef} className="space-y-6 bg-white dark:bg-card p-6 rounded-2xl shadow-sm border">
        <h1 className="text-2xl font-bold text-center mb-6 border-b pb-4">Weekly Summary Report</h1>
        
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-none bg-slate-50 dark:bg-slate-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={sheet.weekly_summary || ""} 
                onChange={(e) => setSheet({ ...sheet, weekly_summary: e.target.value })}
                className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-1" 
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-none bg-blue-50/50 dark:bg-blue-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-700 dark:text-blue-400 uppercase tracking-wider">Major Accomplishments</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={sheet.major_accomplishments || ""} 
                  onChange={(e) => setSheet({ ...sheet, major_accomplishments: e.target.value })}
                  className="min-h-[120px] bg-transparent border-none resize-none focus-visible:ring-1" 
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-green-50/50 dark:bg-green-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-700 dark:text-green-400 uppercase tracking-wider">Tasks Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={sheet.tasks_completed || ""} 
                  onChange={(e) => setSheet({ ...sheet, tasks_completed: e.target.value })}
                  className="min-h-[120px] bg-transparent border-none resize-none focus-visible:ring-1" 
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-none bg-orange-50/50 dark:bg-orange-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-orange-700 dark:text-orange-400 uppercase tracking-wider">Pending Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={sheet.pending_tasks || ""} 
                  onChange={(e) => setSheet({ ...sheet, pending_tasks: e.target.value })}
                  className="min-h-[120px] bg-transparent border-none resize-none focus-visible:ring-1" 
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-red-50/50 dark:bg-red-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-700 dark:text-red-400 uppercase tracking-wider">Blockers & Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={sheet.blockers || ""} 
                  onChange={(e) => setSheet({ ...sheet, blockers: e.target.value })}
                  className="min-h-[120px] bg-transparent border-none resize-none focus-visible:ring-1" 
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-none bg-purple-50/50 dark:bg-purple-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-purple-700 dark:text-purple-400 uppercase tracking-wider">Productivity Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={sheet.productivity_insights || ""} 
                  onChange={(e) => setSheet({ ...sheet, productivity_insights: e.target.value })}
                  className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-1" 
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-teal-50/50 dark:bg-teal-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-teal-700 dark:text-teal-400 uppercase tracking-wider">Time Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={sheet.time_utilization || ""} 
                  onChange={(e) => setSheet({ ...sheet, time_utilization: e.target.value })}
                  className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-1" 
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-none bg-indigo-50/50 dark:bg-indigo-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Suggested Priorities for Next Week</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={sheet.suggested_priorities || ""} 
                onChange={(e) => setSheet({ ...sheet, suggested_priorities: e.target.value })}
                className="min-h-[100px] bg-transparent border-none resize-none focus-visible:ring-1" 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={() => saveSheet("draft")} disabled={saving}>
          {saving && sheet.status === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save as Draft
        </Button>
        <Button onClick={() => saveSheet("submitted")} disabled={saving} className="bg-primary text-primary-foreground">
          {saving && sheet.status === "submitted" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit Final Sheet
        </Button>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none">
          <DialogHeader className="p-4 border-b bg-white dark:bg-black/40 shadow-sm flex-shrink-0">
            <DialogTitle className="text-xl font-bold">Weekly Sheet Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-100 dark:bg-black/20">
            {previewImage && (
              <img
                src={previewImage}
                alt="Report Preview"
                className="max-w-full h-auto object-contain shadow-lg rounded border border-slate-200 dark:border-slate-800"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
