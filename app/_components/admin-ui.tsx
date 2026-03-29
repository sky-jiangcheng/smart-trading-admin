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
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            backgroundColor: "rgba(15,23,42,0.06)",
            color: "#475569",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div style={{ marginTop: 10, fontSize: 18, color: "#0f172a", fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.02em" }}>
          {title}
        </div>
        <div style={{ marginTop: 6, maxWidth: 760, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
      {action ? <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, meta, tone = "#0f172a", background = "rgba(255,255,255,0.8)" }: StatCardProps) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.08)",
        backgroundColor: background,
        boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
        display: "grid",
        gap: 8,
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0) 100%)",
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{value}</div>
      {meta ? <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>{meta}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px dashed rgba(15,23,42,0.12)",
        backgroundColor: "rgba(248,250,252,0.86)",
        color: "#64748b",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.55 }}>{description}</div>
    </div>
  );
}
