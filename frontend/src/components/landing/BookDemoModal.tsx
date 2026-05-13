"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  User,
  Mail,
  Phone,
  Building2,
  Users,
  Sparkles,
  Clock,
  Briefcase,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

/* ─── types ─── */
interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  teamSize: string;
  role: string;
  useCase: string;
  demoDate: string;
  timeSlot: string;
  problem: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  phone: "+91",
  company: "",
  teamSize: "",
  role: "",
  useCase: "",
  demoDate: "",
  timeSlot: "",
  problem: "",
};

/* ─── component ─── */
export function BookDemoModal({
  buttonClassName = "demo-cta px-4 py-2 text-sm font-semibold rounded-full",
  style = {},
  buttonIcon,
}: {
  buttonClassName?: string;
  style?: React.CSSProperties;
  buttonIcon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /* ── Validation ── */
  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email address";
    if (!form.phone.trim() || form.phone.trim() === "+91")
      errs.phone = "Phone number is required";
    return errs;
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/send-demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send request");
      }
      setSuccess(true);
    } catch (err: any) {
      setSubmitError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── Reset on close ── */
  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        setSuccess(false);
        setForm(INITIAL_FORM);
        setErrors({});
        setSubmitError("");
        setLoading(false);
      }, 300);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className={buttonClassName} style={style}>
          <span className="inline-flex items-center gap-2">
            {buttonIcon}
            <span>Book a Demo</span>
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl demo-modal-container backdrop-blur-xl">
        {success ? (
          /* ═══════ SUCCESS STATE ═══════ */
          <div className="flex flex-col items-center justify-center py-14 px-8 demo-success-anim">
            {/* Animated checkmark */}
            <div className="mb-5">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="url(#successGrad)"
                  strokeWidth="3"
                  className="demo-check-circle"
                />
                <path
                  d="M22 37L32 47L50 27"
                  stroke="url(#successGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  className="demo-check-path"
                />
                <defs>
                  <linearGradient
                    id="successGrad"
                    x1="0"
                    y1="0"
                    x2="72"
                    y2="72"
                  >
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#c026d3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center">
              🎉 Demo Request Sent!
            </h2>
            <p className="text-sm text-center max-w-xs opacity-70 leading-relaxed">
              Thank you for your interest in WorkForce Pro.
              <br />
              We&apos;ll contact you soon with next steps.
            </p>
          </div>
        ) : (
          /* ═══════ FORM ═══════ */
          <form
            className="px-7 pt-7 pb-6 max-h-[82vh] overflow-y-auto"
            autoComplete="off"
            onSubmit={handleSubmit}
          >
            <DialogHeader className="mb-5">
              <DialogTitle className="text-center text-xl font-bold">
                Book a Demo
              </DialogTitle>
              <DialogDescription className="text-center text-sm opacity-65 mt-1 leading-relaxed">
                Experience WorkForce Pro in action. Fill out the form and
                our team will reach out to schedule your personalized demo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {/* ── Full Name ── */}
              <div>
                <label htmlFor="demo-name" className="demo-modal-label">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="demo-name"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={set("name")}
                    className={`demo-modal-input ${errors.name ? "demo-input-error" : ""}`}
                  />
                  <User size={16} className="demo-input-icon" />
                </div>
                {errors.name && (
                  <p className="demo-field-error">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>

              {/* ── Work Email ── */}
              <div>
                <label htmlFor="demo-email" className="demo-modal-label">
                  Work Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="demo-email"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={set("email")}
                    className={`demo-modal-input ${errors.email ? "demo-input-error" : ""}`}
                  />
                  <Mail size={16} className="demo-input-icon" />
                </div>
                {errors.email && (
                  <p className="demo-field-error">
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                )}
              </div>

              {/* ── Phone Number ── */}
              <div>
                <label htmlFor="demo-phone" className="demo-modal-label">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="demo-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set("phone")}
                    className={`demo-modal-input ${errors.phone ? "demo-input-error" : ""}`}
                  />
                  <Phone size={16} className="demo-input-icon" />
                </div>
                {errors.phone && (
                  <p className="demo-field-error">
                    <AlertCircle size={12} /> {errors.phone}
                  </p>
                )}
              </div>

              {/* ── Company Name ── */}
              <div>
                <label htmlFor="demo-company" className="demo-modal-label">
                  Company Name
                </label>
                <div className="relative">
                  <input
                    id="demo-company"
                    type="text"
                    placeholder="Acme Inc."
                    value={form.company}
                    onChange={set("company")}
                    className="demo-modal-input"
                  />
                  <Building2 size={16} className="demo-input-icon" />
                </div>
              </div>

              {/* ── Team Size ── */}
              <div>
                <label className="demo-modal-label">Team Size</label>
                <Select
                  value={form.teamSize}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, teamSize: v }))
                  }
                >
                  <SelectTrigger className="demo-modal-select">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="opacity-40" />
                      <SelectValue placeholder="Select team size" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1–10</SelectItem>
                    <SelectItem value="11-50">11–50</SelectItem>
                    <SelectItem value="51-200">51–200</SelectItem>
                    <SelectItem value="201-1000">201–1000</SelectItem>
                    <SelectItem value=">1000">1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Role ── */}
              <div>
                <label className="demo-modal-label">Role</label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v }))
                  }
                >
                  <SelectTrigger className="demo-modal-select">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="opacity-40" />
                      <SelectValue placeholder="Select your role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Founder">Founder</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Use Case ── */}
              <div>
                <label htmlFor="demo-usecase" className="demo-modal-label">
                  Use Case
                </label>
                <div className="relative">
                  <textarea
                    id="demo-usecase"
                    rows={3}
                    placeholder="Briefly describe your use case…"
                    value={form.useCase}
                    onChange={set("useCase")}
                    className="demo-modal-textarea"
                  />
                  <Sparkles size={16} className="demo-input-icon-ta" />
                </div>
              </div>

              {/* ── Preferred Demo Date ── */}
              <div>
                <label htmlFor="demo-date" className="demo-modal-label">
                  Preferred Demo Date
                </label>
                <div className="relative">
                  <input
                    id="demo-date"
                    type="date"
                    value={form.demoDate}
                    onChange={set("demoDate")}
                    className="demo-modal-input"
                  />
                  <Calendar size={16} className="demo-input-icon" />
                </div>
              </div>

              {/* ── Preferred Time Slot ── */}
              <div>
                <label className="demo-modal-label">Preferred Time Slot</label>
                <Select
                  value={form.timeSlot}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, timeSlot: v }))
                  }
                >
                  <SelectTrigger className="demo-modal-select">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="opacity-40" />
                      <SelectValue placeholder="Select a time slot" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:00-10:00 AM">
                      9:00 – 10:00 AM
                    </SelectItem>
                    <SelectItem value="11:00-12:00 PM">
                      11:00 – 12:00 PM
                    </SelectItem>
                    <SelectItem value="2:00-3:00 PM">
                      2:00 – 3:00 PM
                    </SelectItem>
                    <SelectItem value="4:00-5:00 PM">
                      4:00 – 5:00 PM
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Problem (Optional) ── */}
              <div>
                <label htmlFor="demo-problem" className="demo-modal-label">
                  What problem are you trying to solve?{" "}
                  <span className="text-xs opacity-50">(Optional)</span>
                </label>
                <div className="relative">
                  <textarea
                    id="demo-problem"
                    rows={2}
                    placeholder="Describe your main challenge…"
                    value={form.problem}
                    onChange={set("problem")}
                    className="demo-modal-textarea"
                  />
                  <MessageSquare size={16} className="demo-input-icon-ta" />
                </div>
              </div>
            </div>

            {/* ── Submit Error ── */}
            {submitError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {submitError}
              </div>
            )}

            {/* ── Submit Button ── */}
            <button
              type="submit"
              disabled={loading}
              className="demo-modal-btn mt-6 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="demo-spinner" />
                  Sending…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Book Demo
                </>
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
