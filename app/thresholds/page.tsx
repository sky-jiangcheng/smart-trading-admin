import AdminPage from "../page";

export const metadata = {
  title: "Investment Admin - Thresholds",
  description: "Investment API 阈值管理",
};

export default function ThresholdsPage() {
  return <AdminPage initialWorkspace="thresholds" />;
}
