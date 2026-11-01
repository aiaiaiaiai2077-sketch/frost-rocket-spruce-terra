import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SOURCES, TEST_CAP_OPTIONS } from "./constants";
import type { NodeRec, ProbeResult, SourceStat, UpdateSummary } from "./types";

type CfState = {
  sourcesText: string;
  blacklistText: string;
  listLimit: number;
  testCap: number;
  nodes: NodeRec[];
  sources: SourceStat[];
  lastUpdate: UpdateSummary | null;
  lastTested: string | null;
  transferredBytes: number;
  setSourcesText: (value: string) => void;
  setBlacklistText: (value: string) => void;
  setListLimit: (value: number) => void;
  setTestCap: (value: number) => void;
  replaceCollection: (nodes: NodeRec[], sources: SourceStat[], summary: UpdateSummary) => void;
  applyProbes: (results: ProbeResult[]) => void;
  resetTransferred: () => void;
};

function mergeProbe(node: NodeRec, result: ProbeResult): NodeRec {
  if (!result.success) {
    return {
      ...node,
      testedAt: new Date().toISOString(),
      success: false,
      error: result.error,
      bytes: node.bytes + result.bytes,
    };
  }
  return {
    ...node,
    latency: result.latency,
    bandwidth: result.bandwidth,
    bytes: node.bytes + result.bytes,
    testedAt: new Date().toISOString(),
    success: true,
    countryCode: result.countryCode,
    city: result.city,
    colo: result.colo,
    error: null,
  };
}

export const useCfStore = create<CfState>()(
  persist(
    (set) => ({
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
      replaceCollection: (nodes, sources, lastUpdate) =>
        set({ nodes, sources, lastUpdate, transferredBytes: 0 }),
      applyProbes: (results) =>
        set((state) => {
          const byAddress = new Map(results.map((item) => [item.address, item]));
          const nodes = state.nodes.map((node) => {
            const result = byAddress.get(node.address);
            return result ? mergeProbe(node, result) : node;
          });
          const transferredBytes =
            state.transferredBytes + results.reduce((sum, item) => sum + item.bytes, 0);
          return {
            nodes,
            transferredBytes,
            lastTested: new Date().toISOString(),
          };
        }),
      resetTransferred: () => set({ transferredBytes: 0 }),
    }),
    {
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
        transferredBytes: state.transferredBytes,
      }),
    },
  ),
);

export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
