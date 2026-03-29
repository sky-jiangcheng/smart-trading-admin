import AdminPage from "../page";

export const metadata = {
  title: "Investment Admin - Activity",
  description: "Investment API 操作记录",
};

export default function ActivityPage() {
  return <AdminPage initialWorkspace="activity" />;
}
