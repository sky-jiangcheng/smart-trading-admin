import AdminPage from "../page";

export const metadata = {
  title: "Investment Admin - Overview",
  description: "Investment API 管理台总览",
};

export default function OverviewPage() {
  return <AdminPage initialWorkspace="overview" />;
}
