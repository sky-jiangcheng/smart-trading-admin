import AdminPage from "../page";

export const metadata = {
  title: "Investment Admin - Sources",
  description: "Investment API 数据源管理",
};

export default function SourcesPage() {
  return <AdminPage initialWorkspace="sources" />;
}
