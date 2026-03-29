import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin",
  description: "Investment API 管理台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
