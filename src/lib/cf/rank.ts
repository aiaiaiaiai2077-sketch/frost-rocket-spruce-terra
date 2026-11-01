import { COUNTRIES, asCountry } from "./regions";
import type { NodeRec } from "./types";
import { TOP_PER_COUNTRY } from "./constants";

export function compareSpeed(a: NodeRec, b: NodeRec): number {
  const la = a.latency ?? Number.POSITIVE_INFINITY;
  const lb = b.latency ?? Number.POSITIVE_INFINITY;
  if (la !== lb) return la - lb;
  const ba = b.bandwidth ?? 0;
  const bb = a.bandwidth ?? 0;
  if (ba !== bb) return ba - bb;
  return a.address.localeCompare(b.address);
}

/** 六区里测通的地址，每国按延迟升序、带宽降序取前 N。 */
export function selectQuality(nodes: NodeRec[], top = TOP_PER_COUNTRY): NodeRec[] {
  const picked: NodeRec[] = [];
  for (const country of COUNTRIES) {
    const group = nodes
      .filter(
        (n) =>
          n.success &&
          n.latency != null &&
          asCountry(n.countryCode) === country.code,
      )
      .sort(compareSpeed)
      .slice(0, top);
    picked.push(...group);
  }
  return picked;
}

export function countByCountry(nodes: NodeRec[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const country of COUNTRIES) counts[country.code] = 0;
  for (const node of nodes) {
    const code = asCountry(node.countryCode);
    if (code && node.success) counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}
