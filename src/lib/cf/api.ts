import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_SOURCES } from "./constants";
import type { AddrType } from "./types";

function cleanUrls(input: unknown): string[] {
  if (!input || typeof input !== "object") throw new Error("参数无效");
  const urls = (input as { urls?: unknown }).urls;
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("请至少填写一个来源");
  const clean = urls
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (clean.length === 0) throw new Error("请至少填写一个来源");
  return clean;
}

export const collectSources = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ urls: cleanUrls(input) }))
  .handler(async ({ data }) => {
    const { collectAll } = await import("./collect.server");
    return collectAll(data.urls.length ? data.urls : DEFAULT_SOURCES);
  });

const TYPES = new Set<AddrType>(["ipv4", "ipv6", "domain"]);

export const runSpeedTest = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("参数无效");
    const targets = (input as { targets?: unknown }).targets;
    if (!Array.isArray(targets) || targets.length === 0) throw new Error("没有要测的地址");
    const clean = targets.slice(0, 6).map((item) => {
      if (!item || typeof item !== "object") throw new Error("地址无效");
      const address = (item as { address?: unknown }).address;
      const type = (item as { type?: unknown }).type;
      if (typeof address !== "string" || address.length < 3 || address.length > 253) {
        throw new Error("地址无效");
      }
      if (typeof type !== "string" || !TYPES.has(type as AddrType)) throw new Error("类型无效");
      return { address: address.trim(), type: type as AddrType };
    });
    return { targets: clean };
  })
  .handler(async ({ data }) => {
    const { probeMany } = await import("./probe.server");
    const results = await probeMany(data.targets);
    return { results };
  });
