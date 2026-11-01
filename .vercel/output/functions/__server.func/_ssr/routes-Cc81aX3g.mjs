import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogOverlay, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as TEST_CAP_OPTIONS, n as DEFAULT_SOURCES, r as TEST_BYTES, t as CRON_EXPRESSION } from "./constants-C8_IJGli.mjs";
import { n as isBlacklisted } from "./parse-BEw-bU8y.mjs";
import { a as RefreshCw, c as Copy, i as Settings, o as Gauge, r as Timer, s as Download, t as X } from "../_libs/lucide-react.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cc81aX3g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function cleanUrls(input) {
	if (!input || typeof input !== "object") throw new Error("参数无效");
	const urls = input.urls;
	if (!Array.isArray(urls) || urls.length === 0) throw new Error("请至少填写一个来源");
	const clean = urls.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 12);
	if (clean.length === 0) throw new Error("请至少填写一个来源");
	return clean;
}
var collectSources = createServerFn({ method: "POST" }).validator((input) => ({ urls: cleanUrls(input) })).handler(createSsrRpc("eb398ee26597307f723cda3bbc592dd6a28f70681da25585f6a46b3cc657cfc5"));
var TYPES = /* @__PURE__ */ new Set([
	"ipv4",
	"ipv6",
	"domain"
]);
var runSpeedTest = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("参数无效");
	const targets = input.targets;
	if (!Array.isArray(targets) || targets.length === 0) throw new Error("没有要测的地址");
	return { targets: targets.slice(0, 6).map((item) => {
		if (!item || typeof item !== "object") throw new Error("地址无效");
		const address = item.address;
		const type = item.type;
		if (typeof address !== "string" || address.length < 3 || address.length > 253) throw new Error("地址无效");
		if (typeof type !== "string" || !TYPES.has(type)) throw new Error("类型无效");
		return {
			address: address.trim(),
			type
		};
	}) };
}).handler(createSsrRpc("dd446908f6ec2407a9501cb5f77e0078ec6a601b6c78c07cc5f745e0229ce572"));
var COUNTRIES = [
	{
		code: "HK",
		name: "香港"
	},
	{
		code: "TW",
		name: "台湾"
	},
	{
		code: "KR",
		name: "韩国"
	},
	{
		code: "JP",
		name: "日本"
	},
	{
		code: "SG",
		name: "新加坡"
	},
	{
		code: "US",
		name: "美国"
	}
];
var COUNTRY_SET = new Set(COUNTRIES.map((c) => c.code));
function asCountry(code) {
	if (!code) return null;
	const upper = code.trim().toUpperCase();
	return COUNTRY_SET.has(upper) ? upper : null;
}
function countryName(code) {
	return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
/** 测速响应里的国家 / 城市 / colo，拼成节点地区。 */
function regionLabel(countryCode, city, colo) {
	const country = asCountry(countryCode);
	if (!country) {
		if (countryCode) return `其他 · ${countryCode}${colo ? ` · ${colo}` : ""}`;
		return "未测速";
	}
	const parts = [countryName(country)];
	if (city) parts.push(city);
	if (colo) parts.push(colo);
	return parts.join(" · ");
}
function displayAddress(node) {
	const host = node.type === "ipv6" ? `[${node.address}]` : node.address;
	return node.port && node.port !== 443 ? `${host}:${node.port}` : host;
}
function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
	if (bytes < 1024) return `${Math.round(bytes)} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function formatBandwidth(mbps) {
	if (mbps == null || !Number.isFinite(mbps)) return "—";
	return `${mbps.toFixed(2)} MB/s`;
}
/** 优质列表导出：IP#地区_延迟#带宽 */
function formatFastLine(node) {
	const region = regionLabel(node.countryCode, node.city, node.colo).replace(/\s+/g, "");
	const latency = node.latency != null ? `${Math.round(node.latency)}ms` : "";
	const bandwidth = node.bandwidth != null ? `${node.bandwidth.toFixed(2)}MB/s` : "";
	return `${displayAddress(node)}#${region}${latency ? `_${latency}` : ""}${bandwidth ? `#${bandwidth}` : ""}`;
}
function latencyTone(latency) {
	if (latency == null) return "muted";
	if (latency < 200) return "ok";
	if (latency < 500) return "warn";
	return "bad";
}
function compareSpeed(a, b) {
	const la = a.latency ?? Number.POSITIVE_INFINITY;
	const lb = b.latency ?? Number.POSITIVE_INFINITY;
	if (la !== lb) return la - lb;
	const ba = b.bandwidth ?? 0;
	const bb = a.bandwidth ?? 0;
	if (ba !== bb) return ba - bb;
	return a.address.localeCompare(b.address);
}
/** 六区里测通的地址，每国按延迟升序、带宽降序取前 N。 */
function selectQuality(nodes, top = 20) {
	const picked = [];
	for (const country of COUNTRIES) {
		const group = nodes.filter((n) => n.success && n.latency != null && asCountry(n.countryCode) === country.code).sort(compareSpeed).slice(0, top);
		picked.push(...group);
	}
	return picked;
}
function mergeProbe(node, result) {
	if (!result.success) return {
		...node,
		testedAt: (/* @__PURE__ */ new Date()).toISOString(),
		success: false,
		error: result.error,
		bytes: node.bytes + result.bytes
	};
	return {
		...node,
		latency: result.latency,
		bandwidth: result.bandwidth,
		bytes: node.bytes + result.bytes,
		testedAt: (/* @__PURE__ */ new Date()).toISOString(),
		success: true,
		countryCode: result.countryCode,
		city: result.city,
		colo: result.colo,
		error: null
	};
}
var useCfStore = create()(persist((set) => ({
	sourcesText: DEFAULT_SOURCES.join("\n"),
	blacklistText: "",
	listLimit: 0,
	testCap: TEST_CAP_OPTIONS[1],
	nodes: [],
	sources: [],
	lastUpdate: null,
	lastTested: null,
	transferredBytes: 0,
	setSourcesText: (sourcesText) => set({ sourcesText }),
	setBlacklistText: (blacklistText) => set({ blacklistText }),
	setListLimit: (listLimit) => set({ listLimit }),
	setTestCap: (testCap) => set({ testCap }),
	replaceCollection: (nodes, sources, lastUpdate) => set({
		nodes,
		sources,
		lastUpdate,
		transferredBytes: 0
	}),
	applyProbes: (results) => set((state) => {
		const byAddress = new Map(results.map((item) => [item.address, item]));
		return {
			nodes: state.nodes.map((node) => {
				const result = byAddress.get(node.address);
				return result ? mergeProbe(node, result) : node;
			}),
			transferredBytes: state.transferredBytes + results.reduce((sum, item) => sum + item.bytes, 0),
			lastTested: (/* @__PURE__ */ new Date()).toISOString()
		};
	}),
	resetTransferred: () => set({ transferredBytes: 0 })
}), {
	name: "cf-six-region",
	partialize: (state) => ({
		sourcesText: state.sourcesText,
		blacklistText: state.blacklistText,
		listLimit: state.listLimit,
		testCap: state.testCap,
		nodes: state.nodes,
		sources: state.sources,
		lastUpdate: state.lastUpdate,
		lastTested: state.lastTested,
		transferredBytes: state.transferredBytes
	})
}));
function parseLines(text) {
	return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}
function clock(iso) {
	if (!iso) return "从未";
	return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}
function download(filename, text) {
	const blob = new Blob([text.endsWith("\n") ? text : `${text}\n`], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const area = document.createElement("textarea");
	area.value = text;
	document.body.appendChild(area);
	area.select();
	document.execCommand("copy");
	area.remove();
}
function toneClass(tone) {
	if (tone === "ok") return "text-ok";
	if (tone === "warn") return "text-warn";
	if (tone === "bad") return "text-bad";
	return "text-subtle";
}
function Dashboard() {
	const [ready, setReady] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [phase, setPhase] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [view, setView] = (0, import_react.useState)("quality");
	const [country, setCountry] = (0, import_react.useState)("ALL");
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [itdogOpen, setItdogOpen] = (0, import_react.useState)(false);
	const cancelRef = (0, import_react.useRef)(false);
	const sourcesText = useCfStore((s) => s.sourcesText);
	const blacklistText = useCfStore((s) => s.blacklistText);
	const listLimit = useCfStore((s) => s.listLimit);
	const testCap = useCfStore((s) => s.testCap);
	const nodes = useCfStore((s) => s.nodes);
	const sources = useCfStore((s) => s.sources);
	const lastUpdate = useCfStore((s) => s.lastUpdate);
	const lastTested = useCfStore((s) => s.lastTested);
	const transferredBytes = useCfStore((s) => s.transferredBytes);
	const setSourcesText = useCfStore((s) => s.setSourcesText);
	const setBlacklistText = useCfStore((s) => s.setBlacklistText);
	const setListLimit = useCfStore((s) => s.setListLimit);
	const setTestCap = useCfStore((s) => s.setTestCap);
	const replaceCollection = useCfStore((s) => s.replaceCollection);
	const applyProbes = useCfStore((s) => s.applyProbes);
	const resetTransferred = useCfStore((s) => s.resetTransferred);
	(0, import_react.useEffect)(() => {
		const persist = useCfStore.persist;
		const finish = () => setReady(true);
		if (persist.hasHydrated()) finish();
		return persist.onFinishHydration(finish);
	}, []);
	const quality = (0, import_react.useMemo)(() => selectQuality(nodes), [nodes]);
	const kept = (0, import_react.useMemo)(() => nodes.filter((n) => n.success && asCountry(n.countryCode)).sort(compareSpeed), [nodes]);
	const pending = (0, import_react.useMemo)(() => nodes.filter((n) => !n.testedAt), [nodes]);
	const excluded = (0, import_react.useMemo)(() => nodes.filter((n) => n.testedAt && !asCountry(n.countryCode)).length, [nodes]);
	const baseList = view === "quality" ? quality : view === "kept" ? kept : pending;
	const filtered = view === "pending" || country === "ALL" ? baseList : baseList.filter((node) => node.countryCode === country);
	const shown = view === "quality" || listLimit <= 0 ? filtered : filtered.slice(0, listLimit);
	const planned = Math.min(testCap, pending.length || nodes.length);
	const estimateBytes = (pending.length ? Math.min(testCap, pending.length) : Math.min(testCap, nodes.length)) * TEST_BYTES;
	function flash(text, tone = "ok") {
		setMessage({
			tone,
			text
		});
	}
	async function onUpdate() {
		const urls = parseLines(sourcesText);
		if (urls.length === 0) {
			flash("请先在设置里填写来源", "bad");
			return;
		}
		setBusy("update");
		setMessage(null);
		try {
			const data = await collectSources({ data: { urls } });
			const blacklist = parseLines(blacklistText);
			const previous = new Map(useCfStore.getState().nodes.map((n) => [n.address, n]));
			const next = [];
			for (const item of data.addresses) {
				if (isBlacklisted(item.address, blacklist)) continue;
				const old = previous.get(item.address);
				next.push({
					address: item.address,
					port: item.port,
					type: item.type,
					hint: item.hint ?? old?.hint ?? null,
					latency: old?.latency ?? null,
					bandwidth: old?.bandwidth ?? null,
					bytes: old?.bytes ?? 0,
					testedAt: old?.testedAt ?? null,
					success: old?.success ?? false,
					countryCode: old?.countryCode ?? null,
					city: old?.city ?? null,
					colo: old?.colo ?? null,
					error: old?.error ?? null
				});
			}
			replaceCollection(next, data.sources, {
				at: (/* @__PURE__ */ new Date()).toISOString(),
				durationMs: data.durationMs,
				collected: data.addresses.length,
				keptCandidates: next.length,
				byType: data.byType,
				sources: data.sources
			});
			flash(`已收集 ${next.length} 个地址，用时 ${(data.durationMs / 1e3).toFixed(1)} 秒`);
			if (next.length === 0) setView("pending");
		} catch (error) {
			flash(error instanceof Error ? error.message : "更新失败", "bad");
		} finally {
			setBusy(null);
		}
	}
	async function runTargets(targets, label, resetBytes) {
		if (targets.length === 0) {
			flash("没有可测的地址", "bad");
			return;
		}
		cancelRef.current = false;
		setBusy("test");
		setPhase({
			done: 0,
			total: targets.length,
			text: label
		});
		if (resetBytes) resetTransferred();
		let failed = 0;
		try {
			for (let i = 0; i < targets.length; i += 4) {
				if (cancelRef.current) break;
				const batch = targets.slice(i, i + 4);
				const response = await runSpeedTest({ data: { targets: batch.map((n) => ({
					address: n.address,
					type: n.type
				})) } });
				applyProbes(response.results);
				failed += response.results.filter((item) => !item.success).length;
				setPhase({
					done: Math.min(i + batch.length, targets.length),
					total: targets.length,
					text: label
				});
			}
			const stopped = cancelRef.current;
			flash(stopped ? "测速已停止" : `测速结束，失败 ${failed} 个`);
			setView("quality");
		} catch (error) {
			flash(error instanceof Error ? error.message : "测速失败", "bad");
		} finally {
			setBusy(null);
			setPhase(null);
		}
	}
	function onSpeedTest() {
		runTargets((pending.length > 0 ? pending : nodes).slice(0, testCap), "小文件测速", true);
	}
	function onSingle(node) {
		runTargets([node], node.address, false);
	}
	const fastText = quality.map(formatFastLine).join("\n");
	const plainText = (view === "quality" ? quality : shown).map((n) => displayAddress(n)).join("\n");
	const progressPct = phase && phase.total > 0 ? Math.round(phase.done / phase.total * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-8 flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-widest text-subtle uppercase",
						children: "Cloudflare"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl",
						children: "六区优选"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 max-w-xl text-sm text-muted",
						children: [
							"保留多来源采集、黑名单和线路名。测速改为 300KB 小文件，读响应里的机房地区，只留香港、台湾、韩国、日本、新加坡、美国，每国按延迟和带宽取前 ",
							20,
							"。"
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-primary",
							type: "button",
							onClick: () => void onUpdate(),
							disabled: !ready || busy !== null,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								className: "size-4",
								"aria-hidden": true
							}), "立即更新"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-primary",
							type: "button",
							id: "speedtest-btn",
							onClick: onSpeedTest,
							disabled: !ready || busy !== null || nodes.length === 0,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, {
								className: "size-4",
								"aria-hidden": true
							}), "开始测速"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							disabled: quality.length === 0,
							onClick: () => download("cloudflare_fast_ips.txt", fastText),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
								className: "size-4",
								"aria-hidden": true
							}), "下载优质 IP"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: () => setItdogOpen(true),
							disabled: nodes.length === 0,
							children: "ITDog"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: () => setSettingsOpen(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {
								className: "size-4",
								"aria-hidden": true
							}), "设置"]
						})
					]
				})]
			}),
			message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `mb-4 rounded-md border border-line px-4 py-3 text-sm ${message.tone === "bad" ? "text-bad" : "text-ok"}`,
				role: "status",
				children: message.text
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "收集地址",
						value: ready ? String(nodes.length) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "六区测通",
						value: ready ? String(kept.length) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "优质 IP",
						value: ready ? String(quality.length) : "—",
						hint: `每国最多 20`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "上次测速",
						value: ready ? clock(lastTested) : "—"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4 grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium text-fg",
							children: "单次测速流量"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 font-mono text-2xl font-medium tabular-nums text-fg",
							children: formatBytes(TEST_BYTES)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "每个地址只下载这一小段，用耗时算延迟，用大小除以时间算 MB/s。"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-2 gap-3 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "本轮计划"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
									className: "mt-1 font-mono tabular-nums text-fg",
									children: [planned, " 个"]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "预计流量"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-1 font-mono tabular-nums text-fg",
									children: nodes.length === 0 ? "—" : formatBytes(estimateBytes)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "本轮已传输"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-1 font-mono tabular-nums text-fg",
									children: formatBytes(transferredBytes)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-subtle",
									children: "并发"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-1 text-fg",
									children: "每批 2 个，间隔 0.4 秒"
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: TEST_CAP_OPTIONS.map((cap) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "chip",
								"data-on": testCap === cap,
								onClick: () => setTestCap(cap),
								children: [
									"测 ",
									cap,
									" 个"
								]
							}, cap))
						}),
						phase ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-2 flex items-center justify-between text-xs text-muted",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: phase.text }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono tabular-nums",
										children: [
											phase.done,
											"/",
											phase.total
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-1.5 overflow-hidden rounded-full bg-surface-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "bar-fill h-full bg-accent",
										style: { width: `${progressPct}%` }
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn btn-ghost mt-3",
									type: "button",
									onClick: () => {
										cancelRef.current = true;
									},
									children: "停止"
								})
							]
						}) : null
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "panel p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-sm font-medium text-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, {
								className: "size-4",
								"aria-hidden": true
							}), "Cron 频率建议"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 font-mono text-2xl font-medium text-fg",
							children: [
								"每 ",
								8,
								" 小时"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-mono text-sm text-muted",
							children: CRON_EXPRESSION
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm text-muted",
							children: [
								"定时任务建议：拉取来源，小文件测速，再按六国各留前 ",
								20,
								"。8 小时一次，避免反复打满 speed.cloudflare.com。单轮流量约等于「候选地址数 × 300KB」。"
							]
						}),
						lastUpdate ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-4 text-xs text-subtle",
							children: [
								"上次更新 ",
								clock(lastUpdate.at),
								" · ",
								(lastUpdate.durationMs / 1e3).toFixed(1),
								" 秒 · IPv4 ",
								lastUpdate.byType.ipv4,
								" · IPv6 ",
								lastUpdate.byType.ipv6,
								" · 域名 ",
								lastUpdate.byType.domain,
								excluded > 0 ? ` · 已排除非六区 ${excluded}` : ""
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-xs text-subtle",
							children: "还没有更新记录。点「立即更新」从来源拉取地址。"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6",
				children: COUNTRIES.map((item) => {
					const pool = kept.filter((n) => n.countryCode === item.code).length;
					const best = quality.filter((n) => n.countryCode === item.code).length;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "panel px-3 py-3 text-left",
						onClick: () => {
							setCountry(item.code);
							setView(best > 0 ? "quality" : "kept");
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-subtle",
								children: item.code
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 text-base font-medium text-fg",
								children: item.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 font-mono text-xs tabular-nums text-muted",
								children: [
									"优质 ",
									best,
									" / 测通 ",
									pool
								]
							})
						]
					}, item.code);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "panel p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: [
								["quality", "优质"],
								["kept", "六区全部"],
								["pending", "待测速"]
							].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "chip",
								"data-on": view === id,
								onClick: () => setView(id),
								children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-1 font-mono tabular-nums",
									children: id === "quality" ? quality.length : id === "kept" ? kept.length : pending.length
								})]
							}, id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "chip",
								"data-on": country === "ALL",
								onClick: () => setCountry("ALL"),
								children: "全部国家"
							}), COUNTRIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "chip",
								"data-on": country === item.code,
								onClick: () => setCountry(item.code),
								children: item.name
							}, item.code))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-subtle",
							children: view === "quality" ? "优质 IP 是这六个国家里，按延迟从低到高、带宽从高到低，每国留下的前 20。" : view === "pending" ? "这些地址还没测过，地区要等测速响应才能确定。" : "测通且机房落在六区的地址。地区来自响应头里的国家、城市和 colo。"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost",
							type: "button",
							disabled: shown.length === 0,
							onClick: () => void copyText(view === "quality" ? fastText : plainText).then(() => flash("已复制")),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
								className: "size-4",
								"aria-hidden": true
							}), "复制当前列表"]
						})]
					}),
					!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-10 text-center text-sm text-muted",
						children: "正在读取本地记录…"
					}) : shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-10 text-center text-sm text-muted",
						children: nodes.length === 0 ? "还没有地址。先更新来源。" : view === "quality" ? "还没有优质结果。开始测速后，落在六区的地址会按国家挤进前 20。" : "这一栏是空的。"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-line",
						children: shown.map((node) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeRow, {
							node,
							busy: busy !== null,
							onTest: () => onSingle(node),
							onCopy: () => void copyText(node.success ? formatFastLine(node) : displayAddress(node)).then(() => flash("已复制"))
						}, `${node.type}:${node.address}`))
					}),
					view !== "quality" && listLimit > 0 && filtered.length > shown.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs text-subtle",
						children: [
							"列表限制为 ",
							listLimit,
							" 条，其余仍在本地记录里。"
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "panel mt-4 p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-sm font-medium text-fg",
					children: "数据来源"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid gap-2",
					children: sources.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "更新之后会显示每个来源拿到多少地址。"
					}) : sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-1 border-l-2 border-line py-1 pl-3 sm:flex-row sm:items-baseline sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-fg",
							children: source.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `text-xs ${source.status === "success" ? "text-ok" : "text-bad"}`,
							children: source.status === "success" ? `成功 ${source.count} 个` : `失败 ${source.error ?? ""}`
						})]
					}, source.name))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "mt-8 text-xs text-subtle",
				children: "测速直连该地址的 443 端口，SNI 与 Host 使用 speed.cloudflare.com。节点地区是这次连接真正落到的机房；同一批地址换网络后可能落到别的国家。预览所在网络若在美国，结果会主要出现在美国。"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsDialog, {
				open: settingsOpen,
				onOpenChange: setSettingsOpen,
				sourcesText,
				blacklistText,
				listLimit,
				onSources: setSourcesText,
				onBlacklist: setBlacklistText,
				onLimit: setListLimit
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItdogDialog, {
				open: itdogOpen,
				onOpenChange: setItdogOpen,
				onCopy: () => void copyText(nodes.map((n) => displayAddress(n)).join("\n")).then(() => flash("已复制，可粘贴到 ITDog"))
			})
		]
	});
}
function Stat({ label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "panel px-4 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-subtle",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 truncate font-mono text-lg font-medium tabular-nums text-fg",
				children: value
			}),
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 text-xs text-subtle",
				children: hint
			}) : null
		]
	});
}
function NodeRow({ node, busy, onTest, onCopy }) {
	const tone = toneClass(latencyTone(node.latency));
	const country = asCountry(node.countryCode);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-sm text-fg break-all",
						children: displayAddress(node)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-sm border border-line px-1.5 py-0.5 text-xs text-muted",
						children: node.type === "domain" ? "域名" : node.type === "ipv6" ? "IPv6" : "IPv4"
					}),
					country ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-muted",
						children: countryName(country)
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: node.hint ? `线路 ${node.hint}` : "无线路名" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: regionLabel(node.countryCode, node.city, node.colo) }),
					node.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-bad",
						children: node.error
					}) : null
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 sm:shrink-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `w-16 font-mono text-sm tabular-nums ${tone}`,
					children: node.latency != null ? `${Math.round(node.latency)} ms` : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `w-24 font-mono text-sm tabular-nums ${tone}`,
					children: formatBandwidth(node.bandwidth)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn btn-ghost",
					type: "button",
					disabled: busy,
					onClick: onTest,
					children: "测速"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn btn-ghost",
					type: "button",
					onClick: onCopy,
					children: "复制"
				})
			]
		})]
	});
}
function SettingsDialog({ open, onOpenChange, sourcesText, blacklistText, listLimit, onSources, onBlacklist, onLimit }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "panel fixed inset-x-4 top-16 bottom-16 z-50 mx-auto max-w-lg overflow-y-auto p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "text-lg font-medium text-fg",
						children: "来源与黑名单"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
						className: "btn btn-ghost size-10 p-0",
						"aria-label": "关闭",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mb-4 text-sm text-muted",
					children: "设置只保存在这台浏览器。黑名单和来源在下一次「立即更新」时生效。每行一个。"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mb-1 block text-xs text-subtle",
					htmlFor: "sources",
					children: "来源 URL"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "sources",
					className: "field mb-4 min-h-36 font-mono",
					value: sourcesText,
					onChange: (e) => onSources(e.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mb-1 block text-xs text-subtle",
					htmlFor: "blacklist",
					children: "黑名单"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "blacklist",
					className: "field mb-4 min-h-24 font-mono",
					value: blacklistText,
					onChange: (e) => onBlacklist(e.target.value),
					placeholder: "整段地址或域名后缀"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mb-1 block text-xs text-subtle",
					htmlFor: "limit",
					children: "列表显示条数，0 表示不限制。优质名单始终是每国前 20。"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id: "limit",
					className: "field",
					inputMode: "numeric",
					value: listLimit === 0 ? "" : String(listLimit),
					placeholder: "不限制",
					onChange: (e) => {
						const raw = e.target.value.trim();
						const num = raw === "" ? 0 : Number(raw);
						if (Number.isInteger(num) && num >= 0 && num <= 5e3) onLimit(num);
					}
				})
			]
		})] })
	});
}
function ItdogDialog({ open, onOpenChange, onCopy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "panel fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-lg font-medium text-fg",
					children: "ITDog 批量 TCPing"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "mt-2 text-sm text-muted",
					children: "复制地址后打开 ITDog，粘贴到批量 TCPing。免费额度可能限制条数，太多就分批。"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
							className: "btn btn-ghost",
							children: "关闭"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn btn-ghost",
							type: "button",
							onClick: onCopy,
							children: "复制地址"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "btn btn-primary",
							href: "https://www.itdog.cn/batch_tcping/",
							target: "_blank",
							rel: "noreferrer",
							children: "打开 ITDog"
						})
					]
				})
			]
		})] })
	});
}
var SplitComponent = Dashboard;
//#endregion
export { SplitComponent as component };
