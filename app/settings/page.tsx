import AdminPage from "../page";

export const metadata = {
  title: "Investment Admin - Settings",
  description: "Investment API 全局设置",
};

export default function SettingsPage() {
  return <AdminPage initialWorkspace="settings" />;
}
