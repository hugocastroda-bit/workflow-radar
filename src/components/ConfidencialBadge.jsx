import { Lock } from "lucide-react";

export default function ConfidencialBadge({ size = "sm" }) {
  if (size === "xs") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-px rounded-full dark:bg-[#200A15] dark:text-[#FF3B30] dark:border-[#58131A]">
        <Lock className="h-2.5 w-2.5" />
        Confidencial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded dark:bg-[#200A15] dark:text-[#FF3B30] dark:border-[#58131A]">
      <Lock className="h-3 w-3" />
      Confidencial
    </span>
  );
}