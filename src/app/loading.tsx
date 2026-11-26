import { BrandLogo } from "@/components/brand/BrandLogo";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <BrandLogo variant="loading" />
    </div>
  );
}
