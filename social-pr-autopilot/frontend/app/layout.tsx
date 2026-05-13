import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Social PR Autopilot",
  description: "Autonomous social and PR campaign dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
