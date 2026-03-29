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
};

const SOURCE_PRESETS: SourcePreset[] = [
  { group: "china", label: "中国新闻网 - 财经", url: "https://www.chinanews.com.cn/rss/finance.xml" },
  { group: "china", label: "人民网 - 时政", url: "http://www.people.com.cn/rss/politics.xml" },
  { group: "china", label: "中国日报 - 中国新闻", url: "http://www.chinadaily.com.cn/rss/china_rss.xml" },
  { group: "china", label: "36氪 - 最新快讯", url: "https://www.36kr.com/feed-newsflash" },
  { group: "global", label: "CNBC - Top Stories", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { group: "global", label: "MarketWatch - Top Stories", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
];

const DEFAULT_SOURCE_GROUPS = {
  china: SOURCE_PRESETS.filter((preset) => preset.group === "china"),
  global: SOURCE_PRESETS.filter((preset) => preset.group === "global"),
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

export default function AdminPage() {
  const [sources, setSources] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newSource, setNewSource] = useState("");
  const [newRule, setNewRule] = useState<Rule>({ keyword: "", asset: "", direction: "neutral", reason: "" });
  const [message, setMessage] = useState("");

  const auth = btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER || "admin"}:${process.env.NEXT_PUBLIC_ADMIN_PASS || "password"}`);

  const loadConfig = useCallback(async () => {
    try {
      const [sResp, rResp] = await Promise.all([
        fetch(`${config.apiUrl}/admin/sources`, { headers: { Authorization: `Basic ${auth}` } }),
        fetch(`${config.apiUrl}/admin/rules`, { headers: { Authorization: `Basic ${auth}` } }),
      ]);

      if (!sResp.ok || !rResp.ok) {
        setMessage("请确认投资 API 管理端已启动，并使用正确的用户名密码 (admin/password)。");
        return;
      }

      const sJson = await sResp.json();
      const rJson = await rResp.json();

      setSources(sJson.sources || []);
      setRules(rJson.rules || []);
      setMessage("配置加载成功");
    } catch (error) {
      setMessage(`加载失败：${error}`);
    }
  }, [auth]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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

  async function refreshNews() {
    const res = await requestAdmin("/admin/refresh", "POST");
    const newsCount = res.newsCount as number | undefined;
    const signalCount = res.signalCount as number | undefined;
    setMessage(`刷新完成：新闻 ${newsCount ?? 0}，信号 ${signalCount ?? 0}`);
  }

  const chinaEnabled = DEFAULT_SOURCE_GROUPS.china.filter((preset) => sources.includes(preset.url));
  const globalEnabled = DEFAULT_SOURCE_GROUPS.global.filter((preset) => sources.includes(preset.url));
  const customSources = sources.filter((url) => !SOURCE_PRESETS.some((preset) => preset.url === url));

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
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.08)",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={refreshNews}
          >
            刷新新闻 + 信号
          </button>
        </div>
      </header>

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

      <div style={{ marginBottom: -4, color: "#475569", fontSize: 12 }}>{message}</div>

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
                已启用的多个 RSS 源会由 API 同时聚合成一个新闻流。
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {sources.map((source) => {
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

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>推荐中国来源</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {DEFAULT_SOURCE_GROUPS.china.map((preset) => {
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

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>推荐国际来源</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {DEFAULT_SOURCE_GROUPS.global.map((preset) => {
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
                规则会在刷新新闻后自动触发，可按 keyword/asset 进行快速编排。
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{rules.length} rules</div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {rules.map((rule) => (
                <div
                  key={rule.keyword}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid rgba(15,23,42,0.08)",
                    backgroundColor: "#fff",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{rule.keyword}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                        {rule.asset} · {rule.direction}
                      </div>
                    </div>
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
              ))}
              {rules.length === 0 && (
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
                  暂无规则，先添加一条来开始自动生成信号。
                </div>
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
