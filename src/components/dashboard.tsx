import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Copy,
  Download,
  Gauge,
  RefreshCw,
  Settings,
  Timer,
  X,
} from "lucide-react";
import { collectSources, runSpeedTest } from "@/lib/cf/api";
import { PROBE_BATCH, TEST_BYTES, TEST_CAP_OPTIONS, TOP_PER_COUNTRY, CRON_EXPRESSION, CRON_HOURS } from "@/lib/cf/constants";
import { displayAddress, formatBandwidth, formatBytes, formatFastLine, latencyTone } from "@/lib/cf/format";
import { isBlacklisted } from "@/lib/cf/parse";
import { compareSpeed, selectQuality } from "@/lib/cf/rank";
import { COUNTRIES, asCountry, countryName, regionLabel } from "@/lib/cf/regions";
import { parseLines, useCfStore } from "@/lib/cf/store";
import type { NodeRec } from "@/lib/cf/types";

type View = "quality" | "kept" | "pending";
type Phase = { done: number; total: number; text: string } | null;

function clock(iso: string | null): string {
  if (!iso) return "从未";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function download(filename: string, text: string) {
  const blob = new Blob([text.endsWith("\n") ? text : `${text}\n`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string) {
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

function toneClass(tone: ReturnType<typeof latencyTone>): string {
  if (tone === "ok") return "text-ok";
  if (tone === "warn") return "text-warn";
  if (tone === "bad") return "text-bad";
  return "text-subtle";
}

export function Dashboard() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"update" | "test" | null>(null);
  const [phase, setPhase] = useState<Phase>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [view, setView] = useState<View>("quality");
  const [country, setCountry] = useState<string>("ALL");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [itdogOpen, setItdogOpen] = useState(false);
  const cancelRef = useRef(false);

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

  useEffect(() => {
    const persist = useCfStore.persist;
    const finish = () => setReady(true);
    if (persist.hasHydrated()) finish();
    const unsub = persist.onFinishHydration(finish);
    return unsub;
  }, []);

  const quality = useMemo(() => selectQuality(nodes), [nodes]);
  const kept = useMemo(
    () => nodes.filter((n) => n.success && asCountry(n.countryCode)).sort(compareSpeed),
    [nodes],
  );
  const pending = useMemo(() => nodes.filter((n) => !n.testedAt), [nodes]);
  const excluded = useMemo(
    () => nodes.filter((n) => n.testedAt && !asCountry(n.countryCode)).length,
    [nodes],
  );

  const baseList = view === "quality" ? quality : view === "kept" ? kept : pending;
  const filtered =
    view === "pending" || country === "ALL"
      ? baseList
      : baseList.filter((node) => node.countryCode === country);
  const shown = view === "quality" || listLimit <= 0 ? filtered : filtered.slice(0, listLimit);
  const planned = Math.min(testCap, pending.length || nodes.length);
  const estimateBytes = (pending.length ? Math.min(testCap, pending.length) : Math.min(testCap, nodes.length)) * TEST_BYTES;

  function flash(text: string, tone: "ok" | "bad" = "ok") {
    setMessage({ tone, text });
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
      const next: NodeRec[] = [];
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
          error: old?.error ?? null,
        });
      }
      replaceCollection(next, data.sources, {
        at: new Date().toISOString(),
        durationMs: data.durationMs,
        collected: data.addresses.length,
        keptCandidates: next.length,
        byType: data.byType,
        sources: data.sources,
      });
      flash(`已收集 ${next.length} 个地址，用时 ${(data.durationMs / 1000).toFixed(1)} 秒`);
      if (next.length === 0) setView("pending");
    } catch (error) {
      flash(error instanceof Error ? error.message : "更新失败", "bad");
    } finally {
      setBusy(null);
    }
  }

  async function runTargets(targets: NodeRec[], label: string, resetBytes: boolean) {
    if (targets.length === 0) {
      flash("没有可测的地址", "bad");
      return;
    }
    cancelRef.current = false;
    setBusy("test");
    setPhase({ done: 0, total: targets.length, text: label });
    if (resetBytes) resetTransferred();
    let failed = 0;
    try {
      for (let i = 0; i < targets.length; i += PROBE_BATCH) {
        if (cancelRef.current) break;
        const batch = targets.slice(i, i + PROBE_BATCH);
        const response = await runSpeedTest({
          data: { targets: batch.map((n) => ({ address: n.address, type: n.type })) },
        });
        applyProbes(response.results);
        failed += response.results.filter((item) => !item.success).length;
        setPhase({
          done: Math.min(i + batch.length, targets.length),
          total: targets.length,
          text: label,
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
    const pool = pending.length > 0 ? pending : nodes;
    const targets = pool.slice(0, testCap);
    void runTargets(targets, "小文件测速", true);
  }

  function onSingle(node: NodeRec) {
    void runTargets([node], node.address, false);
  }

  const fastText = quality.map(formatFastLine).join("\n");
  const plainText = (view === "quality" ? quality : shown).map((n) => displayAddress(n)).join("\n");

  const progressPct = phase && phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-subtle uppercase">Cloudflare</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">六区优选</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            保留多来源采集、黑名单和线路名。测速改为 300KB 小文件，读响应里的机房地区，只留香港、台湾、韩国、日本、新加坡、美国，每国按延迟和带宽取前 {TOP_PER_COUNTRY}。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button className="btn btn-primary" type="button" onClick={() => void onUpdate()} disabled={!ready || busy !== null}>
            <RefreshCw className="size-4" aria-hidden />
            立即更新
          </button>
          <button className="btn btn-primary" type="button" id="speedtest-btn" onClick={onSpeedTest} disabled={!ready || busy !== null || nodes.length === 0}>
            <Gauge className="size-4" aria-hidden />
            开始测速
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={quality.length === 0}
            onClick={() => download("cloudflare_fast_ips.txt", fastText)}
          >
            <Download className="size-4" aria-hidden />
            下载优质 IP
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setItdogOpen(true)} disabled={nodes.length === 0}>
            ITDog
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" aria-hidden />
            设置
          </button>
        </div>
      </header>

      {message ? (
        <p className={`mb-4 rounded-md border border-line px-4 py-3 text-sm ${message.tone === "bad" ? "text-bad" : "text-ok"}`} role="status">
          {message.text}
        </p>
      ) : null}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="收集地址" value={ready ? String(nodes.length) : "—"} />
        <Stat label="六区测通" value={ready ? String(kept.length) : "—"} />
        <Stat label="优质 IP" value={ready ? String(quality.length) : "—"} hint={`每国最多 ${TOP_PER_COUNTRY}`} />
        <Stat label="上次测速" value={ready ? clock(lastTested) : "—"} />
      </section>

      <section className="mb-4 grid gap-3 lg:grid-cols-2">
        <article className="panel p-5">
          <h2 className="text-sm font-medium text-fg">单次测速流量</h2>
          <p className="mt-3 font-mono text-2xl font-medium tabular-nums text-fg">{formatBytes(TEST_BYTES)}</p>
          <p className="mt-1 text-sm text-muted">每个地址只下载这一小段，用耗时算延迟，用大小除以时间算 MB/s。</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-subtle">本轮计划</dt>
              <dd className="mt-1 font-mono tabular-nums text-fg">{planned} 个</dd>
            </div>
            <div>
              <dt className="text-subtle">预计流量</dt>
              <dd className="mt-1 font-mono tabular-nums text-fg">{nodes.length === 0 ? "—" : formatBytes(estimateBytes)}</dd>
            </div>
            <div>
              <dt className="text-subtle">本轮已传输</dt>
              <dd className="mt-1 font-mono tabular-nums text-fg">{formatBytes(transferredBytes)}</dd>
            </div>
            <div>
              <dt className="text-subtle">并发</dt>
              <dd className="mt-1 text-fg">每批 2 个，间隔 0.4 秒</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {TEST_CAP_OPTIONS.map((cap) => (
              <button key={cap} type="button" className="chip" data-on={testCap === cap} onClick={() => setTestCap(cap)}>
                测 {cap} 个
              </button>
            ))}
          </div>
          {phase ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>{phase.text}</span>
                <span className="font-mono tabular-nums">{phase.done}/{phase.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="bar-fill h-full bg-accent" style={{ width: `${progressPct}%` }} />
              </div>
              <button className="btn btn-ghost mt-3" type="button" onClick={() => { cancelRef.current = true; }}>
                停止
              </button>
            </div>
          ) : null}
        </article>

        <article className="panel p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            <Timer className="size-4" aria-hidden />
            Cron 频率建议
          </div>
          <p className="mt-3 font-mono text-2xl font-medium text-fg">每 {CRON_HOURS} 小时</p>
          <p className="mt-2 font-mono text-sm text-muted">{CRON_EXPRESSION}</p>
          <p className="mt-3 text-sm text-muted">
            定时任务建议：拉取来源，小文件测速，再按六国各留前 {TOP_PER_COUNTRY}。8 小时一次，避免反复打满 speed.cloudflare.com。单轮流量约等于「候选地址数 × 300KB」。
          </p>
          {lastUpdate ? (
            <p className="mt-4 text-xs text-subtle">
              上次更新 {clock(lastUpdate.at)} · {(lastUpdate.durationMs / 1000).toFixed(1)} 秒 · IPv4 {lastUpdate.byType.ipv4} · IPv6 {lastUpdate.byType.ipv6} · 域名 {lastUpdate.byType.domain}
              {excluded > 0 ? ` · 已排除非六区 ${excluded}` : ""}
            </p>
          ) : (
            <p className="mt-4 text-xs text-subtle">还没有更新记录。点「立即更新」从来源拉取地址。</p>
          )}
        </article>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {COUNTRIES.map((item) => {
          const pool = kept.filter((n) => n.countryCode === item.code).length;
          const best = quality.filter((n) => n.countryCode === item.code).length;
          return (
            <button
              key={item.code}
              type="button"
              className="panel px-3 py-3 text-left"
              onClick={() => {
                setCountry(item.code);
                setView(best > 0 ? "quality" : "kept");
              }}
            >
              <div className="text-xs text-subtle">{item.code}</div>
              <div className="mt-1 text-base font-medium text-fg">{item.name}</div>
              <div className="mt-2 font-mono text-xs tabular-nums text-muted">优质 {best} / 测通 {pool}</div>
            </button>
          );
        })}
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["quality", "优质"],
                ["kept", "六区全部"],
                ["pending", "待测速"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className="chip" data-on={view === id} onClick={() => setView(id)}>
                {label}
                <span className="ml-1 font-mono tabular-nums">
                  {id === "quality" ? quality.length : id === "kept" ? kept.length : pending.length}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" data-on={country === "ALL"} onClick={() => setCountry("ALL")}>
              全部国家
            </button>
            {COUNTRIES.map((item) => (
              <button key={item.code} type="button" className="chip" data-on={country === item.code} onClick={() => setCountry(item.code)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-subtle">
            {view === "quality"
              ? "优质 IP 是这六个国家里，按延迟从低到高、带宽从高到低，每国留下的前 20。"
              : view === "pending"
                ? "这些地址还没测过，地区要等测速响应才能确定。"
                : "测通且机房落在六区的地址。地区来自响应头里的国家、城市和 colo。"}
          </p>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={shown.length === 0}
            onClick={() => void copyText(view === "quality" ? fastText : plainText).then(() => flash("已复制"))}
          >
            <Copy className="size-4" aria-hidden />
            复制当前列表
          </button>
        </div>

        {!ready ? (
          <p className="py-10 text-center text-sm text-muted">正在读取本地记录…</p>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {nodes.length === 0
              ? "还没有地址。先更新来源。"
              : view === "quality"
                ? "还没有优质结果。开始测速后，落在六区的地址会按国家挤进前 20。"
                : "这一栏是空的。"}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((node) => (
              <NodeRow key={`${node.type}:${node.address}`} node={node} busy={busy !== null} onTest={() => onSingle(node)} onCopy={() => void copyText(node.success ? formatFastLine(node) : displayAddress(node)).then(() => flash("已复制"))} />
            ))}
          </ul>
        )}
        {view !== "quality" && listLimit > 0 && filtered.length > shown.length ? (
          <p className="mt-3 text-xs text-subtle">列表限制为 {listLimit} 条，其余仍在本地记录里。</p>
        ) : null}
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-medium text-fg">数据来源</h2>
        <div className="mt-3 grid gap-2">
          {sources.length === 0 ? (
            <p className="text-sm text-muted">更新之后会显示每个来源拿到多少地址。</p>
          ) : (
            sources.map((source) => (
              <div key={source.name} className="flex flex-col gap-1 border-l-2 border-line py-1 pl-3 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-sm text-fg">{source.name}</span>
                <span className={`text-xs ${source.status === "success" ? "text-ok" : "text-bad"}`}>
                  {source.status === "success" ? `成功 ${source.count} 个` : `失败 ${source.error ?? ""}`}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <footer className="mt-8 text-xs text-subtle">
        测速直连该地址的 443 端口，SNI 与 Host 使用 speed.cloudflare.com。节点地区是这次连接真正落到的机房；同一批地址换网络后可能落到别的国家。预览所在网络若在美国，结果会主要出现在美国。
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sourcesText={sourcesText}
        blacklistText={blacklistText}
        listLimit={listLimit}
        onSources={setSourcesText}
        onBlacklist={setBlacklistText}
        onLimit={setListLimit}
      />
      <ItdogDialog
        open={itdogOpen}
        onOpenChange={setItdogOpen}
        onCopy={() => void copyText(nodes.map((n) => displayAddress(n)).join("\n")).then(() => flash("已复制，可粘贴到 ITDog"))}
      />
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="panel px-4 py-4">
      <div className="text-xs text-subtle">{label}</div>
      <div className="mt-2 truncate font-mono text-lg font-medium tabular-nums text-fg">{value}</div>
      {hint ? <div className="mt-1 text-xs text-subtle">{hint}</div> : null}
    </article>
  );
}

function NodeRow({
  node,
  busy,
  onTest,
  onCopy,
}: {
  node: NodeRec;
  busy: boolean;
  onTest: () => void;
  onCopy: () => void;
}) {
  const tone = toneClass(latencyTone(node.latency));
  const country = asCountry(node.countryCode);
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-fg break-all">{displayAddress(node)}</span>
          <span className="rounded-sm border border-line px-1.5 py-0.5 text-xs text-muted">
            {node.type === "domain" ? "域名" : node.type === "ipv6" ? "IPv6" : "IPv4"}
          </span>
          {country ? (
            <span className="text-xs text-muted">{countryName(country)}</span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{node.hint ? `线路 ${node.hint}` : "无线路名"}</span>
          <span>{regionLabel(node.countryCode, node.city, node.colo)}</span>
          {node.error ? <span className="text-bad">{node.error}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:shrink-0">
        <span className={`w-16 font-mono text-sm tabular-nums ${tone}`}>
          {node.latency != null ? `${Math.round(node.latency)} ms` : "—"}
        </span>
        <span className={`w-24 font-mono text-sm tabular-nums ${tone}`}>{formatBandwidth(node.bandwidth)}</span>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={onTest}>
          测速
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCopy}>
          复制
        </button>
      </div>
    </li>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  sourcesText,
  blacklistText,
  listLimit,
  onSources,
  onBlacklist,
  onLimit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcesText: string;
  blacklistText: string;
  listLimit: number;
  onSources: (value: string) => void;
  onBlacklist: (value: string) => void;
  onLimit: (value: number) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80" />
        <Dialog.Content className="panel fixed inset-x-4 top-16 bottom-16 z-50 mx-auto max-w-lg overflow-y-auto p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="text-lg font-medium text-fg">来源与黑名单</Dialog.Title>
            <Dialog.Close className="btn btn-ghost size-10 p-0" aria-label="关闭">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-muted">
            设置只保存在这台浏览器。黑名单和来源在下一次「立即更新」时生效。每行一个。
          </Dialog.Description>
          <label className="mb-1 block text-xs text-subtle" htmlFor="sources">
            来源 URL
          </label>
          <textarea id="sources" className="field mb-4 min-h-36 font-mono" value={sourcesText} onChange={(e) => onSources(e.target.value)} />
          <label className="mb-1 block text-xs text-subtle" htmlFor="blacklist">
            黑名单
          </label>
          <textarea id="blacklist" className="field mb-4 min-h-24 font-mono" value={blacklistText} onChange={(e) => onBlacklist(e.target.value)} placeholder="整段地址或域名后缀" />
          <label className="mb-1 block text-xs text-subtle" htmlFor="limit">
            列表显示条数，0 表示不限制。优质名单始终是每国前 20。
          </label>
          <input
            id="limit"
            className="field"
            inputMode="numeric"
            value={listLimit === 0 ? "" : String(listLimit)}
            placeholder="不限制"
            onChange={(e) => {
              const raw = e.target.value.trim();
              const num = raw === "" ? 0 : Number(raw);
              if (Number.isInteger(num) && num >= 0 && num <= 5000) onLimit(num);
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ItdogDialog({
  open,
  onOpenChange,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80" />
        <Dialog.Content className="panel fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 p-5">
          <Dialog.Title className="text-lg font-medium text-fg">ITDog 批量 TCPing</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">
            复制地址后打开 ITDog，粘贴到批量 TCPing。免费额度可能限制条数，太多就分批。
          </Dialog.Description>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close className="btn btn-ghost">关闭</Dialog.Close>
            <button className="btn btn-ghost" type="button" onClick={onCopy}>
              复制地址
            </button>
            <a className="btn btn-primary" href="https://www.itdog.cn/batch_tcping/" target="_blank" rel="noreferrer">
              打开 ITDog
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
