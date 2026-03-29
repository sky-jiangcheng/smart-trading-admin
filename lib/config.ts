// App configuration
const DEFAULT_DASHBOARD_URL = "https://smart-trading-dashboard-gules.vercel.app";

function resolveDashboardUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();

  if (!configuredUrl) {
    return DEFAULT_DASHBOARD_URL;
  }

  if (configuredUrl.includes("smart-trading-dashboard.vercel.app") && !configuredUrl.includes("gules")) {
    return DEFAULT_DASHBOARD_URL;
  }

  return configuredUrl;
}

export const config = {
  // Dashboard app URL
  dashboardUrl: resolveDashboardUrl(),

  // Admin console URL
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || "https://smart-trading-admin.vercel.app",

  // API base URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "https://smart-trading-api.vercel.app",
};
