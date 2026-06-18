import { Lock } from "lucide-react";

export default function ConfidencialBadge({ size = "sm" }) {
  if (size === "xs") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] px-1.5 py-px rounded-full">
        <Lock className="h-2.5 w-2.5" />
        Confidencial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-full">
      <Lock className="h-3 w-3" />
      Confidencial
    </span>
  );
}