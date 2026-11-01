//#region node_modules/.nitro/vite/services/ssr/assets/parse-BEw-bU8y.js
var IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
function isPrivateV4(ip) {
	const parts = ip.split(".").map((p) => Number(p));
	const a = parts[0] ?? -1;
	const b = parts[1] ?? -1;
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 192 && b === 168) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 169 && b === 254) return true;
	if (ip === "255.255.255.255") return true;
	return false;
}
function isPublicIPv4(ip) {
	if (!IPV4.test(ip)) return false;
	if (ip.split(".").some((p) => p.length > 1 && p.startsWith("0"))) return false;
	return !isPrivateV4(ip);
}
function isPublicIPv6(ip) {
	if (!ip || ip.length > 64) return false;
	if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
	const colons = ip.split(":").length - 1;
	if (!ip.includes("::") && colons < 3) return false;
	if (ip.includes(":::")) return false;
	const lower = ip.toLowerCase();
	if (lower === "::" || lower === "::1") return false;
	if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return false;
	if (lower.startsWith("::ffff:")) return false;
	return true;
}
var DOMAIN = /^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
function isDomain(value) {
	if (!DOMAIN.test(value)) return false;
	if (/^\d+(\.\d+)+$/.test(value)) return false;
	return /[a-z]/i.test(value);
}
function stablePrefix(seed) {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(36).slice(0, 6);
}
function normalizeDomain(raw) {
	let host = raw.trim().toLowerCase().replace(/\.$/, "");
	if (host.startsWith("*.")) host = `${stablePrefix(host)}.${host.slice(2)}`;
	return isDomain(host) ? host : null;
}
function parseToken(token) {
	let value = token.trim().replace(/^\[|\]$/g, "");
	if (!value || value.length > 253) return null;
	let port = 443;
	const bracket = token.trim().match(/^\[([^\]]+)\]:(\d+)$/);
	if (bracket) {
		value = bracket[1] ?? "";
		port = Number(bracket[2]);
	} else if (isPublicIPv4(value.split(":")[0] ?? "") && value.includes(":")) {
		const [ip, p] = value.split(":");
		if (ip && p && /^\d+$/.test(p)) {
			value = ip;
			port = Number(p);
		}
	}
	if (!Number.isInteger(port) || port < 1 || port > 65535) port = 443;
	if (isPublicIPv4(value)) return {
		address: value,
		port,
		type: "ipv4"
	};
	if (isPublicIPv6(value)) return {
		address: value.toLowerCase(),
		port,
		type: "ipv6"
	};
	const domain = normalizeDomain(value);
	if (domain) return {
		address: domain,
		port,
		type: "domain"
	};
	return null;
}
function cleanHint(hint) {
	if (!hint) return null;
	const text = hint.replace(/\s+/g, " ").trim();
	if (!text || text.length > 48) return null;
	if (/^(ipv4|ipv6|ip|addr|address|优选地址|地址)$/i.test(text)) return null;
	if (/^\d+(\.\d+)?%?$/.test(text)) return null;
	return text;
}
function add(map, token, hint) {
	const parsed = parseToken(token);
	if (!parsed) return;
	const key = `${parsed.type}:${parsed.address}`;
	const prev = map.get(key);
	const nextHint = cleanHint(hint);
	if (!prev) {
		map.set(key, {
			...parsed,
			hint: nextHint
		});
		return;
	}
	if (!prev.hint && nextHint) prev.hint = nextHint;
}
function cellText(html) {
	return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&/gi, "&").replace(/&#39;|'/gi, "'").replace(/"/gi, "\"").replace(/\s+/g, " ").trim();
}
function parseHtmlRows(html, map) {
	const rows = html.split(/<tr\b/i).slice(1);
	for (const row of rows) {
		const cells = [...row.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map((m) => {
			return {
				label: /data-label=["']([^"']+)["']/i.exec(m[1] ?? "")?.[1] ?? "",
				text: cellText(m[2] ?? "")
			};
		});
		if (cells.length === 0) continue;
		let addressCell = null;
		let hint = null;
		for (const cell of cells) {
			const label = cell.label;
			if (/优选地址|地址名称|IP|域名|Host/i.test(label) && cell.text) addressCell = cell.text.split(/\s+/)[0] ?? cell.text;
			else if (/线路|名称|备注|地区|location/i.test(label)) hint = cell.text;
		}
		if (!addressCell) for (const cell of cells) {
			const token = cell.text.split(/\s+/)[0] ?? "";
			if (parseToken(token)) {
				addressCell = token;
				break;
			}
		}
		if (!hint) hint = cells.find((c) => {
			const token = c.text.split(/\s+/)[0] ?? "";
			return c.text && token !== addressCell && !parseToken(token) && c.text.length <= 32;
		})?.text ?? null;
		if (addressCell) add(map, addressCell, hint);
	}
}
function parseLines(text, map) {
	const lines = text.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
		const hash = trimmed.split("#");
		const left = (hash[0] ?? "").trim().split(/\s+/)[0] ?? "";
		const hint = hash.length > 1 ? hash.slice(1).join("#") : null;
		if (left) add(map, left, hint);
	}
}
function extractAddresses(body) {
	const map = /* @__PURE__ */ new Map();
	if (/<t[dh]\b/i.test(body)) parseHtmlRows(body, map);
	parseLines(body.replace(/<script[\s\S]*?<\/script>/gi, "\n").replace(/<style[\s\S]*?<\/style>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(tr|p|div|li)>/gi, "\n").replace(/<[^>]+>/g, " "), map);
	return [...map.values()];
}
function isBlacklisted(address, list) {
	const target = address.toLowerCase();
	for (const raw of list) {
		const item = raw.trim().toLowerCase();
		if (!item || item.startsWith("#")) continue;
		if (target === item || target.endsWith(`.${item}`)) return true;
	}
	return false;
}
function sourceLabel(url) {
	try {
		const u = new URL(url);
		const path = u.pathname === "/" ? "" : u.pathname;
		return `${u.hostname}${path}`;
	} catch {
		return url;
	}
}
//#endregion
export { sourceLabel as a, isPublicIPv6 as i, isBlacklisted as n, isPublicIPv4 as r, extractAddresses as t };
