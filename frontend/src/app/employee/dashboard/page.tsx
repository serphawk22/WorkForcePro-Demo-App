"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/employee-dashboard");
  }, [router]);
  return null;
}
