import { ReactNode } from "react";
import { IconRail } from "./icon-rail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <IconRail />
      <div className="pl-16">{children}</div>
    </div>
  );
}
