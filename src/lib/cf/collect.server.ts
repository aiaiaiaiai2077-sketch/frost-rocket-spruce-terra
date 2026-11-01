import { extractAddresses, sourceLabel } from "./parse";
import type { RawAddress, SourceStat } from "./types";

const MAX_URLS = 12;
const MAX_BODY = 1_500_000;

function blockedHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (host === "0.0.0.0" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) {
    return true;
  }
  const m = /^172\.(\d+)\./.exec(host);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

export function assertFetchUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("来源地址无效");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("来源只允许 http/https");
  }
  if (blockedHost(url.hostname)) throw new Error("已拦截内网来源");
  return url.toString();
}

async function fetchSource(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Cloudflare-IP-Collector/1.0)",
      Accept: "text/html,application/json,text/plain,*/*",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return text.slice(0, MAX_BODY);
}

export async function collectAll(urls: string[]): Promise<{
  durationMs: number;
  addresses: RawAddress[];
  sources: SourceStat[];
  byType: { ipv4: number; ipv6: number; domain: number };
}> {
  const started = Date.now();
  const limited = urls.slice(0, MAX_URLS);
  const sources: SourceStat[] = [];
  const merged = new Map<string, RawAddress>();

  const batchSize = 3;
  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map((url) => fetchSource(assertFetchUrl(url))));
    settled.forEach((result, index) => {
      const url = batch[index] ?? "";
      const name = sourceLabel(url);
      if (result.status === "fulfilled") {
        const found = extractAddresses(result.value);
        for (const item of found) {
          const key = `${item.type}:${item.address}`;
          const prev = merged.get(key);
          if (!prev) merged.set(key, item);
          else if (!prev.hint && item.hint) prev.hint = item.hint;
        }
        sources.push({ name, status: "success", count: found.length, error: null });
      } else {
        const message = result.reason instanceof Error ? result.reason.message : "拉取失败";
        sources.push({ name, status: "error", count: 0, error: message });
      }
    });
  }

  const addresses = [...merged.values()].slice(0, 1500);
  const byType = { ipv4: 0, ipv6: 0, domain: 0 };
  for (const item of addresses) byType[item.type] += 1;

  return {
    durationMs: Date.now() - started,
    addresses,
    sources,
    byType,
  };
}
