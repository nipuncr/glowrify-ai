import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Glowrify | Wear your own kind of confidence",
  description:
    "A personal styling studio that brings your proportions, your plans, and the forecast together.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
