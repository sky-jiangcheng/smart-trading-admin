import AdminPage from "../page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin · Settings",
  description: "Investment API 全局设置",
};

export default function SettingsPage() {
  return <AdminPage initialWorkspace="settings" />;
}
