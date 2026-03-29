import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin · Operations Console",
  description: "Investment API 运维控制台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
