// App configuration
const DEFAULT_DASHBOARD_URL = "https://smart-trading-dashboard-gules.vercel.app";

function resolveDashboardUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();

  // 如果没有明确配置，则使用默认强制 GULES 域。
  if (!configuredUrl) {
    return DEFAULT_DASHBOARD_URL;
  }

  // 额外安全：若配置不是合法 URL，也强制回 fallback。
  try {
    const parsed = new URL(configuredUrl);

    // 全局“老域名”强制兜底：只要主机名还是旧的 dashboard 域，就回到 gules 版本。
    if (parsed.hostname === "smart-trading-dashboard.vercel.app") {
      return DEFAULT_DASHBOARD_URL;
    }

    return configuredUrl;
  } catch {
    return DEFAULT_DASHBOARD_URL;
  }
}

export const config = {
  // Dashboard app URL
  dashboardUrl: resolveDashboardUrl(),

  // Admin console URL
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || "https://smart-trading-admin.vercel.app",

  // API base URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "https://smart-trading-api.vercel.app",
};
