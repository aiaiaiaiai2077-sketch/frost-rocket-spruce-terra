import https from "node:https";
import { isPublicIPv4, isPublicIPv6 } from "./parse";
import type { AddrType, ProbeResult } from "./types";
import { TEST_BYTES } from "./constants";

type Target = { address: string; type: AddrType };

function empty(address: string, error: string, bytes = 0): ProbeResult {
  return {
    address,
    success: false,
    latency: null,
    bandwidth: null,
    bytes,
    error,
    countryCode: null,
    city: null,
    colo: null,
  };
}

function header(res: import("node:http").IncomingMessage, name: string): string | null {
  const value = res.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function probeIp(ip: string, bytes: number, family: 4 | 6): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let bytesRead = 0;
    let settled = false;
    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = https.request(
      {
        host: ip,
        servername: "speed.cloudflare.com",
        path: `/__down?bytes=${bytes}`,
        method: "GET",
        family,
        headers: {
          Host: "speed.cloudflare.com",
          "User-Agent": "Mozilla/5.0 (compatible; CF-Worker-Test/1.0; low-volume)",
          Accept: "*/*",
        },
        timeout: 8000,
      },
      (res) => {
        res.on("data", (chunk: Buffer) => {
          bytesRead += chunk.length;
          if (bytesRead >= bytes) res.destroy();
        });
        const done = (forcedError: string | null) => {
          const latency = Date.now() - started;
          const status = res.statusCode ?? 0;
          const ok = status >= 200 && status < 400 && bytesRead > 1024;
          const bandwidth = latency > 0 ? (bytesRead / 1024 / 1024) / (latency / 1000) : 0;
          const country = header(res, "country") ?? header(res, "cf-meta-country");
          const city = header(res, "city") ?? header(res, "cf-meta-city");
          const coloHeader = header(res, "colo") ?? header(res, "cf-meta-colo");
          const ray = header(res, "cf-ray");
          const colo = coloHeader ?? (ray?.split("-").pop() ?? null);
          if (!ok) {
            finish(empty(ip, forcedError ?? `HTTP ${status || "失败"}`, bytesRead));
            return;
          }
          finish({
            address: ip,
            success: true,
            latency,
            bandwidth: Math.round(bandwidth * 100) / 100,
            bytes: bytesRead,
            error: null,
            countryCode: country ? country.toUpperCase() : null,
            city: city || null,
            colo: colo || null,
          });
        };
        res.on("end", () => done(null));
        res.on("error", () => done(bytesRead > 1024 ? null : "连接中断"));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      finish(empty(ip, "超时", bytesRead));
    });
    req.on("error", (err) => {
      if (bytesRead > 1024) return;
      finish(empty(ip, err.message || "连接失败", bytesRead));
    });
    req.end();
  });
}

async function resolveA(name: string): Promise<string | null> {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=A`,
    {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(4000),
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { Answer?: { type: number; data: string }[] };
  const answer = data.Answer?.find((item) => item.type === 1 && isPublicIPv4(item.data));
  return answer?.data ?? null;
}

async function probeTarget(target: Target, bytes: number): Promise<ProbeResult> {
  if (target.type === "ipv4") {
    if (!isPublicIPv4(target.address)) return empty(target.address, "不是公网 IPv4");
    return probeIp(target.address, bytes, 4);
  }
  if (target.type === "ipv6") {
    if (!isPublicIPv6(target.address)) return empty(target.address, "不是公网 IPv6");
    const result = await probeIp(target.address, bytes, 6);
    return { ...result, address: target.address };
  }
  try {
    const ip = await resolveA(target.address);
    if (!ip) return empty(target.address, "域名没有可用的 A 记录");
    const result = await probeIp(ip, bytes, 4);
    return { ...result, address: target.address };
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失败";
    return empty(target.address, message);
  }
}

export async function probeMany(targets: Target[]): Promise<ProbeResult[]> {
  const bytes = TEST_BYTES;
  const queue = targets.slice(0, 6);
  const results: ProbeResult[] = [];
  const worker = async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      results.push(await probeTarget(next, bytes));
      if (queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  };
  await Promise.all([worker(), worker()]);
  return results;
}
