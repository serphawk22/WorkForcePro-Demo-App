"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { User, Mail, Phone, Building2, Shield, Camera } from "lucide-react";

export default function ProfilePage() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>

        {/* Avatar section */}
        <div className="rounded-xl border border-border bg-card p-6 card-shadow">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground text-2xl font-bold">
                A
              </div>
              <button className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground">
                <Camera size={12} />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Administrator</h2>
              <p className="text-sm text-muted-foreground">@admin</p>
              <span className="mt-1 inline-block rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border bg-card p-6 card-shadow space-y-5">
          <h3 className="text-base font-semibold text-card-foreground">Personal Information</h3>
          {[
            { icon: User, label: "Full Name", value: "Administrator" },
            { icon: Mail, label: "Email", value: "admin@workforce.pro" },
            { icon: Phone, label: "Phone", value: "+1 (555) 000-1234" },
            { icon: Building2, label: "Department", value: "Management" },
            { icon: Shield, label: "Role", value: "System Administrator" },
          ].map((field) => (
            <div key={field.label} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
              <field.icon size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p className="text-sm font-medium text-card-foreground">{field.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
