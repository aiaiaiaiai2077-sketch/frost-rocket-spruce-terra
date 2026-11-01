import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { n as DEFAULT_SOURCES } from "./constants-C8_IJGli.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-B_UrVFdm.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
var collectSources_createServerFn_handler = createServerRpc({
	id: "eb398ee26597307f723cda3bbc592dd6a28f70681da25585f6a46b3cc657cfc5",
	name: "collectSources",
	filename: "src/lib/cf/api.ts"
}, (opts) => collectSources.__executeServer(opts));
var collectSources = createServerFn({ method: "POST" }).validator((input) => ({ urls: cleanUrls(input) })).handler(collectSources_createServerFn_handler, async ({ data }) => {
	const { collectAll } = await import("./collect.server-BeK40G7B.mjs");
	return collectAll(data.urls.length ? data.urls : DEFAULT_SOURCES);
});
var TYPES = /* @__PURE__ */ new Set([
	"ipv4",
	"ipv6",
	"domain"
]);
var runSpeedTest_createServerFn_handler = createServerRpc({
	id: "dd446908f6ec2407a9501cb5f77e0078ec6a601b6c78c07cc5f745e0229ce572",
	name: "runSpeedTest",
	filename: "src/lib/cf/api.ts"
}, (opts) => runSpeedTest.__executeServer(opts));
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
}).handler(runSpeedTest_createServerFn_handler, async ({ data }) => {
	const { probeMany } = await import("./probe.server-OyS3-Lhx.mjs");
	return { results: await probeMany(data.targets) };
});
//#endregion
export { collectSources_createServerFn_handler, runSpeedTest_createServerFn_handler };
