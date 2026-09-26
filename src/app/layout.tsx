import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "12 Week Year Local",
  description: "Your personal 12 Week Year operating system — local-first, self-hosted.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
