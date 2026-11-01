export type AddrType = "ipv4" | "ipv6" | "domain";

export type RawAddress = {
  address: string;
  port: number;
  type: AddrType;
  hint: string | null;
};

export type SourceStat = {
  name: string;
  status: "success" | "error";
  count: number;
  error: string | null;
};

export type NodeRec = {
  address: string;
  port: number;
  type: AddrType;
  hint: string | null;
  latency: number | null;
  bandwidth: number | null;
  bytes: number;
  testedAt: string | null;
  success: boolean;
  countryCode: string | null;
  city: string | null;
  colo: string | null;
  error: string | null;
};

export type ProbeResult = {
  address: string;
  success: boolean;
  latency: number | null;
  bandwidth: number | null;
  bytes: number;
  error: string | null;
  countryCode: string | null;
  city: string | null;
  colo: string | null;
};

export type UpdateSummary = {
  at: string;
  durationMs: number;
  collected: number;
  keptCandidates: number;
  byType: { ipv4: number; ipv6: number; domain: number };
  sources: SourceStat[];
};
