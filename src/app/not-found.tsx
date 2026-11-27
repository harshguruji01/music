import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-5">
      <BrandLogo variant="icon" />
      <h1 className="text-3xl font-black tracking-tight">Page Not Found</h1>
      <p className="text-sm text-[var(--gm-text-muted)] max-w-md">
        The track or page you requested is unavailable or has moved.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full gm-rainbow-gradient text-white text-sm font-bold"
      >
        Back to Guru Music
      </Link>
    </div>
  );
}
