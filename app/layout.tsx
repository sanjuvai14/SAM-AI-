import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAM — Private AI Assistant",
  description: "SAM private AI assistant workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
