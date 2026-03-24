import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "IT Dashboard",
  description: "Phase 1 ticket dashboard"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
