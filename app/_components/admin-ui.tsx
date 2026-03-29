import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

type StatCardProps = {
  label: string;
  value: string | number;
  meta?: string;
  tone?: string;
  background?: string;
};

type EmptyStateProps = {
  title: string;
  description: string;
};

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{eyebrow}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{title}</div>
        <div style={{ marginTop: 2, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{description}</div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, meta, tone = "#0f172a", background = "rgba(255,255,255,0.8)" }: StatCardProps) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(15,23,42,0.08)",
        backgroundColor: background,
        boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone, lineHeight: 1.05 }}>{value}</div>
      {meta ? <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{meta}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px dashed rgba(15,23,42,0.12)",
        backgroundColor: "rgba(248,250,252,0.8)",
        color: "#64748b",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}
