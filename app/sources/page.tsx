import AdminPage from "../page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin · Sources",
  description: "Investment API 数据源管理",
};

export default function SourcesPage() {
  return <AdminPage initialWorkspace="sources" />;
}
