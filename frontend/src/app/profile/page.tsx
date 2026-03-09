"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Github, Linkedin, Mail, User as UserIcon, Upload, Camera, Building2, CreditCard, Hash, Landmark, Banknote, Briefcase, Clock, BadgeCheck, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { getMyProfile, updateMyProfile, updateMyBankDetails, uploadProfilePicture, getMyPayroll, UserProfile, PayrollRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payroll, setPayroll] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    date_joined: "",
    github_url: "",
    linkedin_url: "",
  });

  const [bankData, setBankData] = useState({
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_name: "",
    bank_account_holder: "",
  });

  // Invalidate Next.js route cache on every mount so payroll data is always fresh
  useEffect(() => {
    router.refresh();
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadProfile();
  }, [user, router]);

  const loadProfile = async () => {
    setLoading(true);
    const response = await getMyProfile();
    
    if (response.data) {
      setProfile(response.data);
      setFormData({
        name: response.data.name || "",
        age: response.data.age?.toString() || "",
        date_joined: response.data.date_joined || "",
        github_url: response.data.github_url || "",
        linkedin_url: response.data.linkedin_url || "",
      });
      setBankData({
        bank_account_number: response.data.bank_account_number || "",
        bank_ifsc_code: response.data.bank_ifsc_code || "",
        bank_name: response.data.bank_name || "",
        bank_account_holder: response.data.bank_account_holder || "",
      });
      // Fetch latest payroll for this user
      if (response.data.id) {
        const payRes = await getMyPayroll();
        if (payRes.data) setPayroll(payRes.data);
      }
    } else if (response.error) {
      setMessage({ type: "error", text: response.error });
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    const res = await updateMyBankDetails({
      bank_account_number: bankData.bank_account_number || null,
      bank_ifsc_code: bankData.bank_ifsc_code || null,
      bank_name: bankData.bank_name || null,
      bank_account_holder: bankData.bank_account_holder || null,
    });
    if (res.data) {
      toast({
        title: "Bank details saved",
        description: "Your bank information has been updated successfully.",
      });
    } else {
      toast({
        title: "Failed to save",
        description: res.error || "Could not save bank details. Please try again.",
        variant: "destructive",
      });
    }
    setSavingBank(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!formData.name || !formData.age || !formData.date_joined || !formData.github_url || !formData.linkedin_url) {
      setMessage({ type: "error", text: "All fields are required except profile picture" });
      return;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 18 || age > 100) {
      setMessage({ type: "error", text: "Age must be between 18 and 100" });
      return;
    }

    if (!formData.github_url.startsWith("https://github.com/")) {
      setMessage({ type: "error", text: "GitHub URL must start with https://github.com/" });
      return;
    }

    if (!formData.linkedin_url.match(/^https:\/\/(www\.)?linkedin\.com\//)) {
      setMessage({ type: "error", text: "LinkedIn URL must start with https://linkedin.com/ or https://www.linkedin.com/" });
      return;
    }

    setSaving(true);

    const response = await updateMyProfile({
      name: formData.name,
      age: age,
      date_joined: formData.date_joined,
      github_url: formData.github_url,
      linkedin_url: formData.linkedin_url,
    });

    if (response.data) {
      setProfile(response.data);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      // Refresh global user state to update sidebar and navbar
      console.log('[Profile] Calling refreshUser() after profile update...');
      await refreshUser();
      console.log('[Profile] refreshUser() completed');
    } else if (response.error) {
      setMessage({ type: "error", text: response.error });
    }

    setSaving(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB" });
      return;
    }

    setUploading(true);
    setMessage(null);

    const response = await uploadProfilePicture(file);

    if (response.data) {
      setMessage({ type: "success", text: "Profile picture uploaded successfully!" });
      // Reload profile to get updated picture
      await loadProfile();
      // Refresh global user state to update sidebar and navbar
      console.log('[Profile] Calling refreshUser() after picture upload...');
      await refreshUser();
      console.log('[Profile] refreshUser() completed');
    } else if (response.error) {
      setMessage({ type: "error", text: response.error });
    }

    setUploading(false);
  };

  const getProfilePictureUrl = () => {
    if (!profile?.profile_picture) return null;
    // If it's a data URI (base64), return it directly
    if (profile.profile_picture.startsWith("data:")) return profile.profile_picture;
    // Otherwise treat as URL
    if (profile.profile_picture.startsWith("http")) return profile.profile_picture;
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${profile.profile_picture}`;
  };

  if (loading) {
    return (
      <DashboardLayout role={user?.role || "employee"}>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={user?.role || "employee"}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Picture Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload your profile photo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                  {getProfilePictureUrl() ? (
                    <img
                      src={getProfilePictureUrl()!}
                      alt={profile?.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-16 w-16 text-white" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or GIF. Max 5MB.
              </p>
            </CardContent>
          </Card>

          {/* Profile Form Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (cannot be changed)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                      <Input
                        id="email"
                        value={profile?.email || ""}
                        disabled
                        className="pl-10 bg-muted cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="age">
                      Age <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        min="18"
                        max="100"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="25"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_joined">
                      Date Joined <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                      <Input
                        id="date_joined"
                        name="date_joined"
                        type="date"
                        value={formData.date_joined}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_url">
                    GitHub URL <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                    <Input
                      id="github_url"
                      name="github_url"
                      value={formData.github_url}
                      onChange={handleChange}
                      placeholder="https://github.com/username"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">
                    LinkedIn URL <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                    <Input
                      id="linkedin_url"
                      name="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/username"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Salary & Department Card — read-only, set by admin */}
        {(profile?.base_salary || profile?.department || payroll) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                <span className="flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 p-1.5 text-primary">
                  <Banknote className="h-4 w-4" />
                </span>
                Salary &amp; Department
              </CardTitle>
              <CardDescription>Set by your administrator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Base Salary</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-primary/70" />
                    <p className="text-sm font-semibold text-card-foreground">
                      {profile?.base_salary
                        ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(profile.base_salary)
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{profile?.department || "—"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Last Payment Date</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {payroll?.pay_date
                        ? new Date(payroll.pay_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
                        : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
                  <p className="mt-1">
                    {payroll ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          payroll.status === "Paid"
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : payroll.status === "Pending"
                            ? "bg-secondary/60 text-primary-light dark:bg-primary/10 dark:text-primary-light"
                            : "bg-primary/5 text-accent"
                        }`}
                      >
                        {payroll.status === "Paid"
                          ? <BadgeCheck className="h-3 w-3" />
                          : <Clock className="h-3 w-3" />}
                        {payroll.status}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <span className="flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 p-1.5 text-primary">
                <Landmark className="h-4 w-4" />
              </span>
              Bank Details
            </CardTitle>
            <CardDescription>Your salary will be credited to this account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBankSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_holder">Account Holder Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                    <Input
                      id="bank_account_holder"
                      name="bank_account_holder"
                      value={bankData.bank_account_holder}
                      onChange={handleBankChange}
                      placeholder="As on bank account"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                    <Input
                      id="bank_name"
                      name="bank_name"
                      value={bankData.bank_name}
                      onChange={handleBankChange}
                      placeholder="e.g. State Bank of India"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                    <Input
                      id="bank_account_number"
                      name="bank_account_number"
                      value={bankData.bank_account_number}
                      onChange={handleBankChange}
                      placeholder="e.g. 1234567890"
                      className="pl-10"
                      maxLength={30}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-500 dark:text-white/70" />
                    <Input
                      id="bank_ifsc_code"
                      name="bank_ifsc_code"
                      value={bankData.bank_ifsc_code}
                      onChange={handleBankChange}
                      placeholder="e.g. SBIN0001234"
                      className="pl-10 uppercase"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={savingBank}>
                  {savingBank ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Bank Details"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
