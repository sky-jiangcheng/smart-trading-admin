// App configuration
export const config = {
  // Dashboard app URL
  dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://smart-trading-dashboard-gules.vercel.app",

  // Admin console URL
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || "https://smart-trading-admin.vercel.app",

  // API base URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "https://smart-trading-api.vercel.app",
};
