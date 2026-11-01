/** 小文件测速体积。与参考脚本一致：300KB，避免大流量。 */
export const TEST_BYTES = 300_000;

/** 每个保留国家的优质名额。 */
export const TOP_PER_COUNTRY = 20;

/** 参考脚本的定时频率：每 8 小时拉一次并测速。 */
export const CRON_EXPRESSION = "0 */8 * * *";
export const CRON_HOURS = 8;

/** 手动测速单次请求里最多带几个地址（服务端再以 2 并发执行）。 */
export const PROBE_BATCH = 4;

export const DEFAULT_SOURCES = [
  "https://ip.164746.xyz",
  "https://ip.haogege.xyz/",
  "https://stock.hostmonit.com/CloudFlareYes",
  "https://api.uouin.com/cloudflare.html",
  "https://addressesapi.090227.xyz/CloudFlareYes",
  "https://addressesapi.090227.xyz/ip.164746.xyz",
  "https://www.wetest.vip/page/cloudflare/address_v4.html",
  "https://www.wetest.vip/page/cloudflare/address_v6.html",
  "https://www.wetest.vip/page/cloudflare/cname.html",
];

export const TEST_CAP_OPTIONS = [12, 24, 48, 120] as const;
