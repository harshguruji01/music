"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { verifyAdminSessionClient } from "@/lib/admin-api";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    verifyAdminSessionClient().then((res) => {
      if (!active) return;
      if (!res.ok) {
        router.replace(`/admin/login/?reason=${res.reason}`);
      } else {
        setAdminEmail(res.email);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (!adminEmail) {
    return (
      <div className="min-h-screen bg-[#07070b] flex items-center justify-center">
        <BrandLogo variant="loading" />
      </div>
    );
  }

  return <AdminShell adminEmail={adminEmail}>{children}</AdminShell>;
}
