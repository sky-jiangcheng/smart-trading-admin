import AdminPage from "../page";

export const metadata = {
  title: "Investment Admin - Rules",
  description: "Investment API 规则管理",
};

export default function RulesPage() {
  return <AdminPage initialWorkspace="rules" />;
}
