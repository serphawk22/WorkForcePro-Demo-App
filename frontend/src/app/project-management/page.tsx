"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectManagementRoot() {
  const router = useRouter();
  useEffect(() => { router.replace("/project-management/summary"); }, [router]);
  return null;
}
