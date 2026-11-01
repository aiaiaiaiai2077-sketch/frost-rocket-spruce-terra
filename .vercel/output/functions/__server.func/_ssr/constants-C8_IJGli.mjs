//#region node_modules/.nitro/vite/services/ssr/assets/constants-C8_IJGli.js
/** 小文件测速体积。与参考脚本一致：300KB，避免大流量。 */
var TEST_BYTES = 3e5;
/** 参考脚本的定时频率：每 8 小时拉一次并测速。 */
var CRON_EXPRESSION = "0 */8 * * *";
var DEFAULT_SOURCES = [
	"https://ip.164746.xyz",
	"https://ip.haogege.xyz/",
	"https://stock.hostmonit.com/CloudFlareYes",
	"https://api.uouin.com/cloudflare.html",
	"https://addressesapi.090227.xyz/CloudFlareYes",
	"https://addressesapi.090227.xyz/ip.164746.xyz",
	"https://www.wetest.vip/page/cloudflare/address_v4.html",
	"https://www.wetest.vip/page/cloudflare/address_v6.html",
	"https://www.wetest.vip/page/cloudflare/cname.html"
];
var TEST_CAP_OPTIONS = [
	12,
	24,
	48,
	120
];
//#endregion
export { TEST_CAP_OPTIONS as i, DEFAULT_SOURCES as n, TEST_BYTES as r, CRON_EXPRESSION as t };
