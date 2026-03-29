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
    <html lang="zh-CN">
      <body className="bg-[radial-gradient(circle_at_top_left,#fef3c7_0%,#f8fafc_34%,#eef2ff_100%)] text-slate-900">
        {children}
      </body>
    </html>
  );
}
