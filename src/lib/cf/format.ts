import { regionLabel } from "./regions";
import type { NodeRec } from "./types";

export function displayAddress(node: Pick<NodeRec, "address" | "type" | "port">): string {
  const host = node.type === "ipv6" ? `[${node.address}]` : node.address;
  return node.port && node.port !== 443 ? `${host}:${node.port}` : host;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatBandwidth(mbps: number | null): string {
  if (mbps == null || !Number.isFinite(mbps)) return "—";
  return `${mbps.toFixed(2)} MB/s`;
}

/** 优质列表导出：IP#地区_延迟#带宽 */
export function formatFastLine(node: NodeRec): string {
  const region = regionLabel(node.countryCode, node.city, node.colo).replace(/\s+/g, "");
  const latency = node.latency != null ? `${Math.round(node.latency)}ms` : "";
  const bandwidth = node.bandwidth != null ? `${node.bandwidth.toFixed(2)}MB/s` : "";
  return `${displayAddress(node)}#${region}${latency ? `_${latency}` : ""}${bandwidth ? `#${bandwidth}` : ""}`;
}

export function latencyTone(latency: number | null): "ok" | "warn" | "bad" | "muted" {
  if (latency == null) return "muted";
  if (latency < 200) return "ok";
  if (latency < 500) return "warn";
  return "bad";
}
