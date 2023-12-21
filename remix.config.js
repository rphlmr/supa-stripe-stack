/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
	ignoredRouteFiles: ["**/.*"],
	serverModuleFormat: "cjs",
	tailwind: true,
	watchPaths: ["./tailwind.config.ts"],
	serverPlatform: "node",
	serverDependenciesToBundle:[
		/^remix-utils*/,
	]
};
