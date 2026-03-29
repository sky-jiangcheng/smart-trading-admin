"use client";

import { useCallback, useEffect, useState } from "react";
import { config } from "../lib/config";

type Rule = {
  keyword: string;
  asset: string;
  direction: "bullish" | "bearish" | "neutral";
  reason: string;
};

type SourcePreset = {
  label: string;
  url: string;
  group: "global" | "china";
  section: "china-news" | "china-hot" | "global";
};

type DashboardSettings = {
  newsLimit: number;
};

type RefreshSummary = {
  newsCount?: number;
  signalCount?: number;
};

type RuleRiskFilter = "all" | "bullish" | "bearish" | "neutral";

const RULE_RISK_ORDER: RuleRiskFilter[] = ["bullish", "bearish", "neutral"];

const NEWS_LIMIT_OPTIONS = [50, 100, 200] as const;
const LAST_REFRESH_STORAGE_KEY = "investment-admin:last-refresh-at";
const LAST_SYNC_STORAGE_KEY = "investment-admin:last-config-sync-at";
const LAST_REFRESH_SUMMARY_KEY = "investment-admin:last-refresh-summary";
const RULE_RISK_FILTER_STORAGE_KEY = "investment-admin:rule-risk-filter";
const RULE_COLLAPSED_STORAGE_KEY = "investment-admin:rule-collapsed-state";

const SOURCE_PRESETS: SourcePreset[] = [
  { group: "china", section: "china-news", label: "中国新闻网 - 财经", url: "https://www.chinanews.com.cn/rss/finance.xml" },
  { group: "china", section: "china-news", label: "人民网 - 时政", url: "http://www.people.com.cn/rss/politics.xml" },
  { group: "china", section: "china-news", label: "中国日报 - 中国新闻", url: "http://www.chinadaily.com.cn/rss/china_rss.xml" },
  { group: "china", section: "china-news", label: "央视新闻 - 国内", url: "https://rsshub.app/cctv/china" },
  { group: "china", section: "china-hot", label: "今日头条 - 热榜", url: "https://rsshub.app/zyw/hot/toutiao" },
  { group: "china", section: "china-hot", label: "微博 - 热搜榜", url: "https://rsshub.app/zyw/hot/weibo" },
  { group: "china", section: "china-hot", label: "知乎 - 热榜", url: "https://rsshub.app/zhihu/hot" },
  { group: "china", section: "china-hot", label: "抖音 - 热榜", url: "https://rsshub.app/zyw/hot/douyin" },
  { group: "china", section: "china-hot", label: "36氪 - 最新快讯", url: "https://www.36kr.com/feed-newsflash" },
  { group: "global", section: "global", label: "CNBC - Top Stories", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { group: "global", section: "global", label: "MarketWatch - Top Stories", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
  { group: "global", section: "global", label: "Caixin Global - Latest", url: "https://rsshub.app/caixinglobal/latest" },
];

const DEFAULT_SOURCE_GROUPS = {
  china: SOURCE_PRESETS.filter((preset) => preset.group === "china"),
  global: SOURCE_PRESETS.filter((preset) => preset.group === "global"),
};

const PRESET_SECTIONS = {
  "china-news": SOURCE_PRESETS.filter((preset) => preset.section === "china-news"),
  "china-hot": SOURCE_PRESETS.filter((preset) => preset.section === "china-hot"),
  global: SOURCE_PRESETS.filter((preset) => preset.section === "global"),
};

function getSourceLabel(url: string) {
  const preset = SOURCE_PRESETS.find((item) => item.url === url);
  if (preset) {
    return preset.label;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getRuleRiskMeta(direction: Rule["direction"]) {
  switch (direction) {
    case "bullish":
      return { label: "高关注", tone: "#166534", background: "rgba(34,197,94,0.12)" };
    case "bearish":
      return { label: "风险", tone: "#b91c1c", background: "rgba(239,68,68,0.12)" };
    default:
      return { label: "观察", tone: "#92400e", background: "rgba(245,158,11,0.12)" };
  }
}

function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) {
    return "暂无记录";
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天前`;
}

function readStoredTimestamp(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeStoredTimestamp(key: string, value: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, String(value));
}

function readStoredRefreshSummary() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LAST_REFRESH_SUMMARY_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RefreshSummary;
  } catch {
    return null;
  }
}

function writeStoredRefreshSummary(summary: RefreshSummary | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!summary) {
    window.localStorage.removeItem(LAST_REFRESH_SUMMARY_KEY);
    return;
  }

  window.localStorage.setItem(LAST_REFRESH_SUMMARY_KEY, JSON.stringify(summary));
}

function readStoredRuleRiskFilter() {
  if (typeof window === "undefined") {
    return "all" as RuleRiskFilter;
  }

  const raw = window.localStorage.getItem(RULE_RISK_FILTER_STORAGE_KEY);
  if (!raw || raw === "all" || raw === "bullish" || raw === "bearish" || raw === "neutral") {
    return (raw as RuleRiskFilter) || "all";
  }

  return "all";
}

function writeStoredRuleRiskFilter(filter: RuleRiskFilter) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RULE_RISK_FILTER_STORAGE_KEY, filter);
}

function readStoredCollapsedRuleGroups() {
  if (typeof window === "undefined") {
    return {
      bullish: false,
      bearish: false,
      neutral: false,
    };
  }

  const raw = window.localStorage.getItem(RULE_COLLAPSED_STORAGE_KEY);
  if (!raw) {
    return {
      bullish: false,
      bearish: false,
      neutral: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<Exclude<RuleRiskFilter, "all">, boolean>;
    return {
      bullish: Boolean(parsed?.bullish),
      bearish: Boolean(parsed?.bearish),
      neutral: Boolean(parsed?.neutral),
    };
  } catch {
    return {
      bullish: false,
      bearish: false,
      neutral: false,
    };
  }
}

function writeStoredCollapsedRuleGroups(value: Record<Exclude<RuleRiskFilter, "all">, boolean>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RULE_COLLAPSED_STORAGE_KEY, JSON.stringify(value));
}

export default function AdminPage() {
  const [sources, setSources] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>({ newsLimit: 200 });
  const [newSource, setNewSource] = useState("");
  const [sourceSearch, setSourceSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleRiskFilter, setRuleRiskFilter] = useState<RuleRiskFilter>("all");
  const [collapsedRuleGroups, setCollapsedRuleGroups] = useState<Record<Exclude<RuleRiskFilter, "all">, boolean>>({
    bullish: false,
    bearish: false,
    neutral: false,
  });
  const [selectedRuleKeywords, setSelectedRuleKeywords] = useState<string[]>([]);
  const [newRule, setNewRule] = useState<Rule>({ keyword: "", asset: "", direction: "neutral", reason: "" });
  const [message, setMessage] = useState("");
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [lastConfigSyncAt, setLastConfigSyncAt] = useState<number | null>(null);
  const [lastRefreshSummary, setLastRefreshSummary] = useState<RefreshSummary | null>(null);

  const auth = btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER || "admin"}:${process.env.NEXT_PUBLIC_ADMIN_PASS || "password"}`);

  const loadConfig = useCallback(async () => {
    try {
      const [sResp, rResp, settingsResp] = await Promise.all([
        fetch(`${config.apiUrl}/admin/sources`, { headers: { Authorization: `Basic ${auth}` } }),
        fetch(`${config.apiUrl}/admin/rules`, { headers: { Authorization: `Basic ${auth}` } }),
        fetch(`${config.apiUrl}/admin/settings`, { headers: { Authorization: `Basic ${auth}` } }),
      ]);

      if (!sResp.ok || !rResp.ok || !settingsResp.ok) {
        setMessage("请确认投资 API 管理端已启动，并使用正确的用户名密码 (admin/password)。");
        return;
      }

      const sJson = await sResp.json();
      const rJson = await rResp.json();
      const settingsJson = await settingsResp.json();

      setSources(sJson.sources || []);
      setRules(rJson.rules || []);
      if ([50, 100, 200].includes(Number(settingsJson?.settings?.newsLimit))) {
        setSettings({ newsLimit: Number(settingsJson.settings.newsLimit) });
      }
      const syncedAt = Date.now();
      setLastConfigSyncAt(syncedAt);
      writeStoredTimestamp(LAST_SYNC_STORAGE_KEY, syncedAt);
      setMessage("配置加载成功");
    } catch (error) {
      setMessage(`加载失败：${error}`);
    }
  }, [auth]);

  useEffect(() => {
    setRuleRiskFilter(readStoredRuleRiskFilter());
    setCollapsedRuleGroups(readStoredCollapsedRuleGroups());
    setLastRefreshAt(readStoredTimestamp(LAST_REFRESH_STORAGE_KEY));
    setLastConfigSyncAt(readStoredTimestamp(LAST_SYNC_STORAGE_KEY));
    setLastRefreshSummary(readStoredRefreshSummary());
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    setSelectedRuleKeywords((current) => current.filter((keyword) => rules.some((rule) => rule.keyword === keyword)));
  }, [rules]);

  useEffect(() => {
    writeStoredRuleRiskFilter(ruleRiskFilter);
  }, [ruleRiskFilter]);

  useEffect(() => {
    writeStoredCollapsedRuleGroups(collapsedRuleGroups);
  }, [collapsedRuleGroups]);

  async function requestAdmin(path: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(`${config.apiUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${err}`);
      }

      return (await res.json()) as Record<string, unknown>;
    } catch (error) {
      setMessage(`操作失败: ${error}`);
      return {};
    }
  }

  async function addSource() {
    if (!newSource.trim()) return;
    const res = await requestAdmin("/admin/sources", "POST", { url: newSource.trim() });
    const updated = res.sources as string[] | undefined;
    if (updated) setSources(updated);
    setNewSource("");
  }

  async function addPresetSourceByUrl(url: string) {
    if (sources.includes(url)) return;
    const res = await requestAdmin("/admin/sources", "POST", { url });
    const updated = res.sources as string[] | undefined;
    if (updated) setSources(updated);
  }

  async function addPresetGroup(group: keyof typeof DEFAULT_SOURCE_GROUPS) {
    const presets = DEFAULT_SOURCE_GROUPS[group];
    const missing = presets.filter((preset) => !sources.includes(preset.url));

    if (missing.length === 0) {
      setMessage(`${group === "china" ? "中国" : "全球"}默认来源已全部启用`);
      return;
    }

    for (const preset of missing) {
      // Sequential writes keep the saved source list stable even when the API persists immediately.
      await addPresetSourceByUrl(preset.url);
    }
  }

  async function removeSource(url: string) {
    const res = await requestAdmin("/admin/sources", "DELETE", { url });
    const updated = res.sources as string[] | undefined;
    if (updated) setSources(updated);
  }

  async function addRule() {
    if (!newRule.keyword.trim() || !newRule.asset.trim()) return;
    const res = await requestAdmin("/admin/rules", "POST", newRule);
    const updated = res.rules as Rule[] | undefined;
    if (updated) setRules(updated);
    setNewRule({ keyword: "", asset: "", direction: "neutral", reason: "" });
  }

  async function removeRule(keyword: string) {
    const res = await requestAdmin("/admin/rules", "DELETE", { keyword });
    const updated = res.rules as Rule[] | undefined;
    if (updated) setRules(updated);
  }

  function toggleRuleSelection(keyword: string) {
    setSelectedRuleKeywords((current) =>
      current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword],
    );
  }

  function toggleSelectVisibleRules(visibleRules: Rule[]) {
    const visibleKeywords = visibleRules.map((rule) => rule.keyword);
    setSelectedRuleKeywords((current) => {
      const visibleSelected = visibleKeywords.filter((keyword) => current.includes(keyword));
      if (visibleSelected.length === visibleKeywords.length && visibleKeywords.length > 0) {
        return current.filter((keyword) => !visibleKeywords.includes(keyword));
      }

      return Array.from(new Set([...current, ...visibleKeywords]));
    });
  }

  function toggleRuleGroupCollapse(group: Exclude<RuleRiskFilter, "all">) {
    setCollapsedRuleGroups((current) => ({ ...current, [group]: !current[group] }));
  }

  function setAllRuleGroupsCollapsed(collapsed: boolean) {
    setCollapsedRuleGroups({
      bullish: collapsed,
      bearish: collapsed,
      neutral: collapsed,
    });
  }

  function resetRuleView() {
    setRuleSearch("");
    setRuleRiskFilter("all");
    setSelectedRuleKeywords([]);
    setAllRuleGroupsCollapsed(false);
  }

  function selectRuleGroup(visibleRules: Rule[]) {
    const visibleKeywords = visibleRules.map((rule) => rule.keyword);
    setSelectedRuleKeywords((current) => Array.from(new Set([...current, ...visibleKeywords])));
  }

  async function deleteRuleGroup(visibleRules: Rule[]) {
    const keywords = visibleRules.map((rule) => rule.keyword);
    if (keywords.length === 0) {
      return;
    }

    for (const keyword of keywords) {
      await removeRule(keyword);
    }
    setSelectedRuleKeywords((current) => current.filter((keyword) => !keywords.includes(keyword)));
  }

  async function deleteSelectedRules() {
    if (selectedRuleKeywords.length === 0) {
      return;
    }

    const confirmed = window.confirm(`确定要删除已选的 ${selectedRuleKeywords.length} 条规则吗？此操作无法撤销。`);
    if (!confirmed) {
      return;
    }

    const keywords = [...selectedRuleKeywords];
    for (const keyword of keywords) {
      await removeRule(keyword);
    }
    setSelectedRuleKeywords([]);
  }

  async function refreshNews() {
    setIsRefreshingNews(true);
    const res = await requestAdmin("/admin/refresh", "POST");
    setIsRefreshingNews(false);

    if (!res || Object.keys(res).length === 0) {
      return;
    }

    const newsCount = res.newsCount as number | undefined;
    const signalCount = res.signalCount as number | undefined;
    const refreshedAt = Date.now();
    const summary = { newsCount, signalCount };
    setLastRefreshAt(refreshedAt);
    setLastRefreshSummary(summary);
    writeStoredTimestamp(LAST_REFRESH_STORAGE_KEY, refreshedAt);
    writeStoredRefreshSummary(summary);
    setMessage(`刷新完成：新闻 ${newsCount ?? 0}，信号 ${signalCount ?? 0}`);
  }

  async function updateNewsLimit(newsLimit: number) {
    if (!NEWS_LIMIT_OPTIONS.includes(newsLimit as (typeof NEWS_LIMIT_OPTIONS)[number])) {
      return;
    }

    const res = await requestAdmin("/admin/settings", "POST", { newsLimit });
    const updated = res.settings as DashboardSettings | undefined;
    if (updated && [50, 100, 200].includes(Number(updated.newsLimit))) {
      setSettings({ newsLimit: Number(updated.newsLimit) });
      const syncedAt = Date.now();
      setLastConfigSyncAt(syncedAt);
      writeStoredTimestamp(LAST_SYNC_STORAGE_KEY, syncedAt);
      setMessage(`展示上限已更新为 ${updated.newsLimit}`);
    }
  }

  const chinaEnabled = DEFAULT_SOURCE_GROUPS.china.filter((preset) => sources.includes(preset.url));
  const globalEnabled = DEFAULT_SOURCE_GROUPS.global.filter((preset) => sources.includes(preset.url));
  const customSources = sources.filter((url) => !SOURCE_PRESETS.some((preset) => preset.url === url));
  const sourceSearchTerm = sourceSearch.trim().toLowerCase();
  const filteredSources = sources.filter((source) => {
    if (!sourceSearchTerm) {
      return true;
    }

    return `${getSourceLabel(source)} ${source}`.toLowerCase().includes(sourceSearchTerm);
  });
  const ruleSearchTerm = ruleSearch.trim().toLowerCase();
  const filteredRules = rules.filter((rule) => {
    if (ruleRiskFilter !== "all" && rule.direction !== ruleRiskFilter) {
      return false;
    }

    if (!ruleSearchTerm) {
      return true;
    }

    const haystack = `${rule.keyword} ${rule.asset} ${rule.direction} ${rule.reason}`.toLowerCase();
    return haystack.includes(ruleSearchTerm);
  });
  const selectedVisibleRuleCount = filteredRules.filter((rule) => selectedRuleKeywords.includes(rule.keyword)).length;
  const ruleRiskCounts = {
    bullish: rules.filter((rule) => rule.direction === "bullish").length,
    bearish: rules.filter((rule) => rule.direction === "bearish").length,
    neutral: rules.filter((rule) => rule.direction === "neutral").length,
  };
  const groupedFilteredRules = RULE_RISK_ORDER.filter((group) => ruleRiskFilter === "all" || ruleRiskFilter === group).map((group) => ({
    group,
    rules: filteredRules.filter((rule) => rule.direction === group),
  }));
  const visibleGroupCount = groupedFilteredRules.length;
  const totalPresetSources = SOURCE_PRESETS.length;
  const lastRefreshLabel = formatRelativeTime(lastRefreshAt);
  const lastSyncLabel = formatRelativeTime(lastConfigSyncAt);
  const lastRefreshDetail =
    lastRefreshSummary?.newsCount !== undefined || lastRefreshSummary?.signalCount !== undefined
      ? `新闻 ${lastRefreshSummary.newsCount ?? 0} · 信号 ${lastRefreshSummary.signalCount ?? 0}`
      : "暂无刷新结果";
  const selectedRuleRate = rules.length > 0 ? Math.round((selectedRuleKeywords.length / rules.length) * 100) : 0;

  function renderPresetSection(title: string, presets: SourcePreset[]) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{presets.length} sources</div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {presets.map((preset) => {
            const alreadyAdded = sources.includes(preset.url);
            return (
              <button
                key={preset.url}
                type="button"
                disabled={alreadyAdded}
                onClick={() => addPresetSourceByUrl(preset.url)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(15,23,42,0.08)",
                  backgroundColor: alreadyAdded ? "rgba(15,23,42,0.04)" : "#fff",
                  color: alreadyAdded ? "#94a3b8" : "#0f172a",
                  cursor: alreadyAdded ? "not-allowed" : "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{preset.label}</div>
                    <div style={{ marginTop: 3, fontSize: 11, color: "#64748b", wordBreak: "break-all" }}>
                      {preset.url}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: alreadyAdded ? "rgba(15,23,42,0.08)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    {alreadyAdded ? "已启用" : "添加"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "18px 20px",
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 24,
          background: "rgba(255,255,255,0.82)",
          boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                backgroundColor: "rgba(15,23,42,0.06)",
                color: "#0f172a",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              管理台
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Investment API 控制中心</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            数据源与信号编排
          </h1>
          <div style={{ fontSize: 13, color: "#475569", maxWidth: 820, lineHeight: 1.5 }}>
            在这里管理多个 RSS 源、快速启用中外默认来源，并把新闻刷新为可直接消费的信号流。
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => (window.location.href = config.dashboardUrl)}
          >
            返回 Dashboard
          </button>
          <button
            type="button"
            disabled={isRefreshingNews}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: isRefreshingNews ? "rgba(15,23,42,0.06)" : "#ffffff",
              color: isRefreshingNews ? "#64748b" : "#0f172a",
              fontWeight: 700,
              cursor: isRefreshingNews ? "wait" : "pointer",
              minWidth: 168,
              boxShadow: isRefreshingNews ? "none" : "0 8px 22px rgba(15,23,42,0.06)",
            }}
            onClick={refreshNews}
          >
            {isRefreshingNews ? "刷新中..." : "刷新新闻 + 信号"}
          </button>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "最近刷新", value: lastRefreshLabel, meta: lastRefreshDetail },
          { label: "配置同步", value: lastSyncLabel, meta: `${sources.length} sources · ${rules.length} rules` },
          { label: "默认源覆盖", value: `${chinaEnabled.length + globalEnabled.length}/${totalPresetSources}`, meta: `中国 ${chinaEnabled.length} · 国际 ${globalEnabled.length}` },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: "rgba(255,255,255,0.8)",
              boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.05 }}>{item.value}</div>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{item.meta}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "总来源", value: sources.length },
          { label: "中国默认", value: chinaEnabled.length },
          { label: "国际默认", value: globalEnabled.length },
          { label: "自定义", value: customSources.length },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: "rgba(255,255,255,0.78)",
              boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{item.value}</div>
          </div>
        ))}
      </div>

      <section
        style={{
          padding: 16,
          borderRadius: 18,
          border: "1px solid rgba(15,23,42,0.08)",
          backgroundColor: "rgba(255,255,255,0.78)",
          boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
          display: "grid",
          gap: 12,
        }}
      >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>展示设置</div>
              <div style={{ marginTop: 4, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                Dashboard 的新闻展示上限由这里统一控制
              </div>
            </div>
          <div style={{ display: "grid", gap: 2, justifyItems: "end" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>当前值：{settings.newsLimit}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>保存后立即同步到 API</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {NEWS_LIMIT_OPTIONS.map((option) => {
            const active = settings.newsLimit === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => updateNewsLimit(option)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.08)",
                  backgroundColor: active ? "#0f172a" : "#fff",
                  color: active ? "#fff" : "#0f172a",
                  fontWeight: 800,
                  cursor: "pointer",
                  minHeight: 48,
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </section>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.08)",
          backgroundColor: message.startsWith("操作失败") ? "rgba(254,242,242,0.95)" : "rgba(248,250,252,0.95)",
          color: message.startsWith("操作失败") ? "#b91c1c" : "#475569",
          fontSize: 12,
          boxShadow: "0 8px 22px rgba(15,23,42,0.04)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: message.startsWith("操作失败") ? "#ef4444" : "#10b981",
            flex: "0 0 auto",
          }}
        />
        <span>{message || "配置已就绪，继续调整来源或新闻展示上限。"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", gap: 16, flex: 1 }}>
        <section
          style={{
            minWidth: 0,
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 24,
            background: "rgba(255,255,255,0.82)",
            boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
            padding: 18,
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>RSS 数据源</h2>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
                已启用的多个 RSS 源会由 API 同时聚合成一个新闻流，支持搜索、分组和快捷启用。
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => addPresetGroup("china")}
                style={{
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.08)",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                一键启用中国默认源
              </button>
              <button
                onClick={() => addPresetGroup("global")}
                style={{
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.08)",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                一键启用国际默认源
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>已启用来源</div>
              <input
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="搜索已启用来源"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.12)",
                  backgroundColor: "#fff",
                  fontSize: 12,
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {filteredSources.map((source) => {
                  const isPreset = SOURCE_PRESETS.some((preset) => preset.url === source);
                  return (
                    <div
                      key={source}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(15,23,42,0.08)",
                        backgroundColor: isPreset ? "rgba(15,23,42,0.05)" : "rgba(239,246,255,0.9)",
                        color: "#0f172a",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{getSourceLabel(source)}</span>
                      <span style={{ color: "#64748b", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {source}
                      </span>
                      <button
                        onClick={() => removeSource(source)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#ef4444",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        删除
                      </button>
                    </div>
                  );
                })}
                {filteredSources.length === 0 && sources.length > 0 && (
                  <div style={{ color: "#64748b", fontSize: 12 }}>没有匹配的来源。</div>
                )}
                {sources.length === 0 && <div style={{ color: "#64748b", fontSize: 12 }}>暂无来源，先启用默认组或手动添加。</div>}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 14,
                borderRadius: 18,
                backgroundColor: "rgba(248,250,252,0.9)",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>手动添加源</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    placeholder="新增 RSS URL"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    style={{
                      flex: "1 1 280px",
                      minWidth: 0,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.12)",
                      backgroundColor: "#fff",
                    }}
                  />
                  <button
                    onClick={addSource}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.08)",
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>

              {renderPresetSection("推荐中国新闻", PRESET_SECTIONS["china-news"])}
              {renderPresetSection("推荐中国热榜", PRESET_SECTIONS["china-hot"])}
              {renderPresetSection("推荐国际来源", PRESET_SECTIONS.global)}
            </div>
          </div>
        </section>

        <section
          style={{
            minWidth: 0,
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 24,
            background: "rgba(255,255,255,0.82)",
            boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
            padding: 18,
            backdropFilter: "blur(16px)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>信号规则</h2>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
                规则会在刷新新闻后自动触发，可按 keyword / asset / reason 进行快速编排，也支持批量处理。
              </div>
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>{rules.length} rules</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                已选 {selectedRuleKeywords.length} · 当前筛选 {filteredRules.length}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                视图分组 {visibleGroupCount} · 选中率 {selectedRuleRate}%
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
              marginTop: 14,
            }}
          >
            {[
              { key: "all", label: "全部规则", value: rules.length, tone: "#0f172a", background: "rgba(15,23,42,0.06)" },
              { key: "bullish", label: "高关注", value: ruleRiskCounts.bullish, tone: "#166534", background: "rgba(34,197,94,0.12)" },
              { key: "bearish", label: "风险", value: ruleRiskCounts.bearish, tone: "#b91c1c", background: "rgba(239,68,68,0.12)" },
              { key: "neutral", label: "观察", value: ruleRiskCounts.neutral, tone: "#92400e", background: "rgba(245,158,11,0.12)" },
            ].map((item) => {
              const active = ruleRiskFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRuleRiskFilter(item.key as RuleRiskFilter)}
                  style={{
                    textAlign: "left",
                    padding: 14,
                    borderRadius: 18,
                    border: `1px solid ${active ? "rgba(37,99,235,0.24)" : "rgba(15,23,42,0.08)"}`,
                    backgroundColor: active ? "rgba(239,246,255,0.95)" : "#fff",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
                    cursor: "pointer",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 24, lineHeight: 1.05, fontWeight: 800, color: item.tone }}>{item.value}</div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "fit-content",
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      color: item.tone,
                      backgroundColor: item.background,
                    }}
                  >
                    {active ? "当前筛选" : "点击筛选"}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12, flex: 1, minHeight: 0 }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 14,
                borderRadius: 18,
                backgroundColor: "rgba(248,250,252,0.9)",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  placeholder="搜索规则 keyword / asset / reason"
                  style={{
                    flex: "1 1 260px",
                    minWidth: 0,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                    backgroundColor: "#fff",
                    fontSize: 12,
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleSelectVisibleRules(filteredRules)}
                  disabled={filteredRules.length === 0}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.08)",
                    backgroundColor: "#fff",
                    color: "#0f172a",
                    fontWeight: 700,
                    cursor: filteredRules.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {selectedVisibleRuleCount === filteredRules.length && filteredRules.length > 0 ? "取消当前筛选" : "全选当前筛选"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedRules}
                  disabled={selectedRuleKeywords.length === 0}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(239,68,68,0.18)",
                    backgroundColor: selectedRuleKeywords.length === 0 ? "rgba(248,250,252,0.9)" : "rgba(239,68,68,0.1)",
                    color: selectedRuleKeywords.length === 0 ? "#94a3b8" : "#b91c1c",
                    fontWeight: 700,
                    cursor: selectedRuleKeywords.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  删除已选 {selectedRuleKeywords.length}
                </button>
              </div>

              {selectedRuleKeywords.length > 0 && (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  已选择 {selectedRuleKeywords.length} 条规则，可继续勾选或直接批量删除。
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.08)",
                  backgroundColor: "rgba(255,255,255,0.9)",
                }}
              >
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>运营操作条</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    当前风险筛选、搜索与批量选择都在这里统一收口。
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setAllRuleGroupsCollapsed(true)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.08)",
                      backgroundColor: "#fff",
                      color: "#0f172a",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    全部收起
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllRuleGroupsCollapsed(false)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.08)",
                      backgroundColor: "#fff",
                      color: "#0f172a",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    全部展开
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRuleKeywords([])}
                    disabled={selectedRuleKeywords.length === 0}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.08)",
                      backgroundColor: selectedRuleKeywords.length === 0 ? "rgba(248,250,252,0.9)" : "#fff",
                      color: selectedRuleKeywords.length === 0 ? "#94a3b8" : "#0f172a",
                      fontWeight: 700,
                      cursor: selectedRuleKeywords.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    清空选择
                  </button>
                  <button
                    type="button"
                    onClick={resetRuleView}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.08)",
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    重置视图
                  </button>
                </div>
              </div>

              {groupedFilteredRules.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "#64748b",
                    border: "1px dashed rgba(15,23,42,0.18)",
                    borderRadius: 18,
                    backgroundColor: "rgba(248,250,252,0.9)",
                  }}
                >
                  {rules.length === 0 ? "暂无规则，先添加一条来开始自动生成信号。" : "没有匹配的规则。"}
                </div>
              ) : (
                groupedFilteredRules.map(({ group, rules: groupRules }) => {
                  const risk = getRuleRiskMeta(group);
                  const collapsed = collapsedRuleGroups[group];
                  const selectedCount = groupRules.filter((rule) => selectedRuleKeywords.includes(rule.keyword)).length;
                  const groupKeywords = groupRules.map((rule) => rule.keyword);
                  const allSelected = groupRules.length > 0 && selectedCount === groupRules.length;
                  const groupLabel = risk.label;

                  return (
                    <div
                      key={group}
                      style={{
                        borderRadius: 18,
                        border: `1px solid ${group === "bullish" ? "rgba(34,197,94,0.14)" : group === "bearish" ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.14)"}`,
                        backgroundColor: "rgba(255,255,255,0.96)",
                        boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "12px 14px",
                          backgroundColor: risk.background,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRuleGroupCollapse(group)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              backgroundColor: risk.tone,
                              flex: "0 0 auto",
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                              {groupLabel} · {groupRules.length}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 11, color: "#475569" }}>
                              已选 {selectedCount} · 点击可收起 / 展开
                            </div>
                          </div>
                        </button>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => (allSelected ? setSelectedRuleKeywords((current) => current.filter((keyword) => !groupKeywords.includes(keyword))) : selectRuleGroup(groupRules))}
                            disabled={groupRules.length === 0}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(15,23,42,0.08)",
                              backgroundColor: "#fff",
                              color: "#0f172a",
                              fontWeight: 700,
                              cursor: groupRules.length === 0 ? "not-allowed" : "pointer",
                            }}
                          >
                            {allSelected ? "取消本组" : "全选本组"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRuleGroup(groupRules)}
                            disabled={groupRules.length === 0}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(239,68,68,0.18)",
                              backgroundColor: "rgba(239,68,68,0.1)",
                              color: "#b91c1c",
                              fontWeight: 700,
                              cursor: groupRules.length === 0 ? "not-allowed" : "pointer",
                            }}
                          >
                            删除本组
                          </button>
                        </div>
                      </div>

                      {!collapsed && (
                        <div style={{ display: "grid", gap: 10, padding: 14 }}>
                          {groupRules.map((rule) => {
                            const selected = selectedRuleKeywords.includes(rule.keyword);
                            const itemRisk = getRuleRiskMeta(rule.direction);

                            return (
                              <div
                                key={rule.keyword}
                                style={{
                                  padding: 14,
                                  borderRadius: 18,
                                  border: `1px solid ${selected ? "rgba(37,99,235,0.18)" : "rgba(15,23,42,0.08)"}`,
                                  backgroundColor: selected ? "rgba(239,246,255,0.95)" : "#fff",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                                  <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", flex: 1, minWidth: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleRuleSelection(rule.keyword)}
                                      style={{ marginTop: 4, flex: "0 0 auto" }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{rule.keyword}</div>
                                        <span
                                          style={{
                                            padding: "4px 8px",
                                            borderRadius: 999,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: itemRisk.tone,
                                            backgroundColor: itemRisk.background,
                                          }}
                                        >
                                          {itemRisk.label}
                                        </span>
                                      </div>
                                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                                        {rule.asset} · {rule.direction}
                                      </div>
                                    </div>
                                  </label>
                                  <button
                                    style={{
                                      border: "none",
                                      background: "rgba(239,68,68,0.08)",
                                      color: "#dc2626",
                                      borderRadius: 999,
                                      padding: "6px 10px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => removeRule(rule.keyword)}
                                  >
                                    删除
                                  </button>
                                </div>
                                {rule.reason && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{rule.reason}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                padding: 14,
                borderRadius: 18,
                backgroundColor: "rgba(248,250,252,0.9)",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>编辑规则</div>
              <input
                placeholder="keyword"
                value={newRule.keyword}
                onChange={(e) => setNewRule((prev) => ({ ...prev, keyword: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.12)",
                  backgroundColor: "#fff",
                }}
              />
              <input
                placeholder="asset"
                value={newRule.asset}
                onChange={(e) => setNewRule((prev) => ({ ...prev, asset: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.12)",
                  backgroundColor: "#fff",
                }}
              />
              <select
                value={newRule.direction}
                onChange={(e) => setNewRule((prev) => ({ ...prev, direction: e.target.value as Rule["direction"] }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.12)",
                  backgroundColor: "#fff",
                }}
              >
                <option value="bullish">bullish</option>
                <option value="bearish">bearish</option>
                <option value="neutral">neutral</option>
              </select>
              <input
                placeholder="reason"
                value={newRule.reason}
                onChange={(e) => setNewRule((prev) => ({ ...prev, reason: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.12)",
                  backgroundColor: "#fff",
                }}
              />
              <button
                onClick={addRule}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,0.08)",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                添加 / 更新规则
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
