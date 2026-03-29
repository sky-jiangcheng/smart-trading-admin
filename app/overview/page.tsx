import AdminPage from "../page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin · Overview",
  description: "Investment API 管理台总览",
};

export default function OverviewPage() {
  return <AdminPage initialWorkspace="overview" />;
}
