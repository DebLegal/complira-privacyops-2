import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Complira PrivacyOps",
  icons: { icon: "/favicon.svg" },
  description: "Synthetic seven-module privacy operations workspace",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
