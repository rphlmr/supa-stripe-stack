const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const toml = require("@iarna/toml");
const sort = require("sort-package-json");

function escapeRegExp(string) {
	// $& means the whole matched string
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRandomString(length) {
	return crypto.randomBytes(length).toString("hex");
}

async function main({ rootDirectory, packageManager }) {
	console.log(`🚀  Making something cool with this template ...`);

	const FLY_TOML_PATH = path.join(rootDirectory, "fly.toml");
	const EXAMPLE_ENV_PATH = path.join(rootDirectory, ".env.example");
	const ENV_PATH = path.join(rootDirectory, ".env");
	const PACKAGE_JSON_PATH = path.join(rootDirectory, "package.json");
	const STACK_GITHUB_ACTION = path.join(
		rootDirectory,
		".github/workflows/for-this-stack-repo-only.yml",
	);
	const DOCKERFILE_PATH = path.join(rootDirectory, "Dockerfile");

	const REPLACER = "remix-supa-stripe-stack";

	const DIR_NAME = path.basename(rootDirectory);
	const SUFFIX = getRandomString(2);
	const APP_NAME = (DIR_NAME + "-" + SUFFIX)
		// get rid of anything that's not allowed in an app name
		.replace(/[^a-zA-Z0-9-_]/g, "-");

	const [prodContent, env, packageJson, dockerfile] = await Promise.all([
		fs.readFile(FLY_TOML_PATH, "utf-8"),
		fs.readFile(EXAMPLE_ENV_PATH, "utf-8"),
		fs.readFile(PACKAGE_JSON_PATH, "utf-8").then((s) => JSON.parse(s)),
		fs.readFile(DOCKERFILE_PATH, "utf-8"),
		fs.rm(STACK_GITHUB_ACTION),
	]);

	const newEnv = env.replace(
		/^SESSION_SECRET=.*$/m,
		`SESSION_SECRET="${getRandomString(16)}"`,
	);

	const prodToml = toml.parse(prodContent);
	prodToml.app = prodToml.app.replace(REPLACER, APP_NAME);

	const newPackageJson =
		JSON.stringify(sort({ ...packageJson, name: APP_NAME }), null, 2) +
		"\n";

	const lockfile = {
		npm: "package-lock.json",
		yarn: "yarn.lock",
		pnpm: "pnpm-lock.yaml",
	}[packageManager];

	const newDockerfile = lockfile
		? dockerfile.replace(
				new RegExp(escapeRegExp("ADD package.json"), "g"),
				`ADD package.json ${lockfile}`,
			)
		: dockerfile;

	await Promise.all([
		fs.writeFile(FLY_TOML_PATH, toml.stringify(prodToml)),
		fs.writeFile(ENV_PATH, newEnv),
		fs.writeFile(PACKAGE_JSON_PATH, newPackageJson),
		fs.writeFile(DOCKERFILE_PATH, newDockerfile),
		fs.copyFile(
			path.join(rootDirectory, "remix.init", "gitignore"),
			path.join(rootDirectory, ".gitignore"),
		),
	]);

	execSync("npm run format -- --loglevel warn", {
		stdio: "inherit",
		cwd: rootDirectory,
	});

	console.log(
		`Setup is complete. You're now ready to rock and roll 🤘

Start by reading the README.md file 😇.
`.trim(),
	);
}

module.exports = main;
