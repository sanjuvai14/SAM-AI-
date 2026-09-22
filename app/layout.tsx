import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAM — Private AI Assistant",
  description: "SAM private AI assistant workspace",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/sam-icon.svg",
    apple: "/sam-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
