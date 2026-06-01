"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

interface WeeklyProgressDownloadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyProgressDownload({ isOpen, onClose }: WeeklyProgressDownloadProps) {
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Get Monday of current week as default
  const getDefaultWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday = 0
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  React.useEffect(() => {
    if (isOpen && !weekStartDate) {
      setWeekStartDate(getDefaultWeekStart());
    }
  }, [isOpen, weekStartDate]);

  const handleDownload = async () => {
    if (!weekStartDate) {
      toast.error("Please select a week start date");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/my-space/weekly-sheet/admin/download-weekly-progress?week_start_date=${encodeURIComponent(weekStartDate)}`,
        {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to download report");
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `weekly_progress_${weekStartDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("Weekly progress report downloaded successfully");
      onClose();
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={20} />
            Download Weekly Progress Report
          </DialogTitle>
          <DialogDescription>
            Select the week you want to download the progress report for. The report will include all employees&apos; weekly summaries for that week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Week Start Date Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar size={16} />
              Week Starting (Monday)
            </label>
            <Input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="w-full"
              placeholder="Select week start date"
            />
            <p className="text-xs text-muted-foreground">
              Select the Monday of the week you want to download
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 The report will include all employees&apos; weekly sheets for the selected week and be saved as a PDF file.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isLoading || !weekStartDate}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
