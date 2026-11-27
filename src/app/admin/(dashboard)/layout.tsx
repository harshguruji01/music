"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { signOutAdminClient, verifyAdminSessionClient } from "@/lib/admin-api";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      const res = await verifyAdminSessionClient();
      if (!active) return;
      if (!res.ok) {
        if (res.reason === "expired") {
          await signOutAdminClient().catch(() => {});
        }
        router.replace(`/admin/login/?reason=${res.reason}`);
      } else {
        setAdminEmail(res.email);
      }
    };

    void verify();
    const interval = setInterval(() => {
      void verify();
    }, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
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
