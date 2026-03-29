import AdminPage from "../page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin · Thresholds",
  description: "Investment API 阈值管理",
};

export default function ThresholdsPage() {
  return <AdminPage initialWorkspace="thresholds" />;
}
