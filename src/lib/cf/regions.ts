export const COUNTRIES = [
  { code: "HK", name: "香港" },
  { code: "TW", name: "台湾" },
  { code: "KR", name: "韩国" },
  { code: "JP", name: "日本" },
  { code: "SG", name: "新加坡" },
  { code: "US", name: "美国" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

const COUNTRY_SET = new Set<string>(COUNTRIES.map((c) => c.code));

export function asCountry(code: string | null | undefined): CountryCode | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return COUNTRY_SET.has(upper) ? (upper as CountryCode) : null;
}

export function countryName(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/** 测速响应里的国家 / 城市 / colo，拼成节点地区。 */
export function regionLabel(
  countryCode: string | null,
  city: string | null,
  colo: string | null,
): string {
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
