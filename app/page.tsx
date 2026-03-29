"use client";

import { useCallback, useEffect, useState } from "react";
import { config } from "../lib/config";

type Rule = {
  keyword: string;
  asset: string;
  direction: "bullish" | "bearish" | "neutral";
  reason: string;
};

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
        fetch("http://localhost:3001/admin/sources", { headers: { Authorization: `Basic ${auth}` } }),
        fetch("http://localhost:3001/admin/rules", { headers: { Authorization: `Basic ${auth}` } }),
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
      const res = await fetch(`http://localhost:3001${path}`, {
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

  return (
    <div style={{ padding: 12, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <h1>管理台</h1>
      <button
        style={{ marginBottom: 16, padding: "6px 12px", borderRadius: 6, border: "1px solid #999" }}
        onClick={() => (window.location.href = config.dashboardUrl)}
      >
        返回 Dashboard
      </button>
      <div style={{ marginBottom: 12, color: "#333" }}>{message}</div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <section style={{ flex: 1, minWidth: 280 }}>
          <h2>RSS 数据源</h2>
          <ul>
            {sources.map((source) => (
              <li key={source} style={{ marginBottom: 6 }}>
                <span>{source}</span>
                <button style={{ marginLeft: 8 }} onClick={() => removeSource(source)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
          <input
            placeholder="新增 RSS URL"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            style={{ width: "100%", padding: 6, marginBottom: 6 }}
          />
          <button onClick={addSource}>添加数据源</button>
        </section>

        <section style={{ flex: 1, minWidth: 280 }}>
          <h2>信号规则</h2>
          <ul>
            {rules.map((rule) => (
              <li key={rule.keyword} style={{ marginBottom: 6 }}>
                <strong>{rule.keyword}</strong> =&gt; {rule.asset} ({rule.direction}) {rule.reason && `- ${rule.reason}`}
                <button style={{ marginLeft: 8 }} onClick={() => removeRule(rule.keyword)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              placeholder="keyword"
              value={newRule.keyword}
              onChange={(e) => setNewRule((prev) => ({ ...prev, keyword: e.target.value }))}
              style={{ width: "100%", padding: 6 }}
            />
            <input
              placeholder="asset"
              value={newRule.asset}
              onChange={(e) => setNewRule((prev) => ({ ...prev, asset: e.target.value }))}
              style={{ width: "100%", padding: 6 }}
            />
            <select
              value={newRule.direction}
              onChange={(e) => setNewRule((prev) => ({ ...prev, direction: e.target.value as Rule["direction"] }))}
              style={{ width: "100%", padding: 6 }}
            >
              <option value="bullish">bullish</option>
              <option value="bearish">bearish</option>
              <option value="neutral">neutral</option>
            </select>
            <input
              placeholder="reason"
              value={newRule.reason}
              onChange={(e) => setNewRule((prev) => ({ ...prev, reason: e.target.value }))}
              style={{ width: "100%", padding: 6 }}
            />
            <button onClick={addRule}>添加/更新规则</button>
          </div>
        </section>
      </div>

      <button style={{ marginTop: 16, padding: "8px 14px" }} onClick={refreshNews}>
        刷新新闻+信号
      </button>
    </div>
  );
}
