import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Budget",
  description: "Private household budgeting and wealth planning"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
