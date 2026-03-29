import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

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

type ChromeTone = "primary" | "secondary" | "ghost";

type SurfaceProps = {
  children: ReactNode;
  padding?: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
};

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ChromeTone;
};

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  tone?: ChromeTone;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">;

const CHROME_SURFACE_STYLE: CSSProperties = {
  border: "1px solid var(--admin-border)",
  backgroundColor: "var(--admin-surface)",
  boxShadow: "var(--admin-shadow)",
  backdropFilter: "blur(16px)",
} as const;

const actionToneStyles: Record<ChromeTone, CSSProperties> = {
  primary: {
    backgroundColor: "var(--admin-primary)",
    color: "var(--admin-primary-contrast)",
  },
  secondary: {
    backgroundColor: "var(--admin-surface-strong)",
    color: "var(--admin-text)",
  },
  ghost: {
    backgroundColor: "var(--admin-surface-muted)",
    color: "var(--admin-text)",
  },
};

function getActionStyle(tone: ChromeTone): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--admin-border)",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease, color 150ms ease, border-color 150ms ease",
    boxShadow: tone === "primary" ? "0 8px 22px rgba(15,23,42,0.08)" : "0 8px 22px rgba(15,23,42,0.04)",
    ...actionToneStyles[tone],
  };
}

export function Surface({ children, padding = 16, radius = 20, className, style }: SurfaceProps) {
  return (
    <div
      className={className}
      style={{
        padding,
        borderRadius: radius,
        ...CHROME_SURFACE_STYLE,
        display: "grid",
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ActionButton({ tone = "secondary", style, type = "button", ...props }: ActionButtonProps) {
  return (
    <button
      type={type}
      {...props}
      style={{
        ...getActionStyle(tone),
        ...style,
        ...(props.disabled
          ? {
              opacity: 0.6,
              cursor: "not-allowed",
            }
          : null),
      }}
    />
  );
}

export function ActionLink({ href, tone = "secondary", style, children, ...props }: ActionLinkProps) {
  const isExternal = /^https?:\/\//i.test(href) || href.startsWith("//");

  const linkStyle = {
    ...getActionStyle(tone),
    ...style,
  };

  if (isExternal) {
    return (
      <a href={href} {...props} style={linkStyle}>
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      {...props}
      style={linkStyle}
    >
      {children}
    </Link>
  );
}

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
            backgroundColor: "var(--admin-primary-soft)",
            color: "var(--admin-muted)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div style={{ marginTop: 10, fontSize: 18, color: "var(--admin-text)", fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.02em" }}>
          {title}
        </div>
        <div style={{ marginTop: 6, maxWidth: 760, fontSize: 12, color: "var(--admin-muted)", lineHeight: 1.6 }}>
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
        border: "1px solid var(--admin-border)",
        backgroundColor: background,
        boxShadow: "var(--admin-shadow)",
        display: "grid",
        gap: 8,
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0) 100%)",
        borderTop: `3px solid ${tone}`,
        minHeight: 112,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--admin-muted-strong)", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: tone, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{value}</div>
      {meta ? <div style={{ fontSize: 12, color: "var(--admin-muted)", lineHeight: 1.45 }}>{meta}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px dashed var(--admin-border-strong)",
        backgroundColor: "var(--admin-surface-muted)",
        color: "var(--admin-muted)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--admin-text)" }}>{title}</div>
      <div style={{ fontSize: 12, lineHeight: 1.55 }}>{description}</div>
    </div>
  );
}
