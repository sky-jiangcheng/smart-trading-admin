import AdminPage from "../page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Admin · Activity",
  description: "Investment API 操作记录",
};

export default function ActivityPage() {
  return <AdminPage initialWorkspace="activity" />;
}
