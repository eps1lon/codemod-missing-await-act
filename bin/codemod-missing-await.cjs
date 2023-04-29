#!/usr/bin/env node
// @ts-check
const childProcess = require("child_process");
const process = require("process");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const path = require("path");

async function main() {
	const transformsRoot = path.join(__dirname, "../transforms");
	const codemod = 'codemod-missing-await'

	yargs(hideBin(process.argv))
		.scriptName("codemod-missing-await")
		.command(
			"$0 <paths...>",
			"",
			(builder) => {
				return (
					builder
						.positional("paths", {
							array: true,
							type: "string",
						})
						.option("dry", {
							default: false,
							type: "boolean",
						})
						.option("ignore-pattern", {
							default: "**/node_modules/**",
							type: "string",
						})
						.option("verbose", { default: false, type: "boolean" })
						// Ignoring `build`: https://www.digitalocean.com/community/tools/glob?comments=true&glob=%2A%2A%2F%7Bnode_modules%2Cbuild%7D%2F%2A%2A&matches=false&tests=package%2Fnode_modules%2Ftest.js&tests=package%2Fbuild%2Ftest.js&tests=package%2Ftest.js
						.example(
							'$0 ./ --ignore-pattern "**/{node_modules,build}/**"',
							"Ignores `node_modules` and `build` folders"
						)
						.demandOption(["paths"])
				);
			},
			async (argv) => {
				const { dry, paths, verbose } = argv;

				// TODO: npx instead?
				const jscodeshiftExecutable = require.resolve(
					"jscodeshift/bin/jscodeshift.js"
				);

				/**
				 * @type {string[]}
				 */
				const args = [
					"--extensions=tsx,ts",
					`"--ignore-pattern=${argv.ignorePattern}"`,
					// The transforms are published as JS compatible with the supported Node.js versions.
					"--no-babel",
					`--transform ${path.join(transformsRoot, `${codemod}.js`)}`,
				];

				if (dry) {
					args.push("--dry");
				}
				if (verbose) {
					args.push("--print");
					args.push("--verbose=2");
				}

				args.push(...paths);

				const command = `node ${jscodeshiftExecutable} ${args.join(" ")}`;
				console.info(`executing "${command}"`);
				childProcess.execSync(command, { stdio: "inherit" });
			}
		)
		.version()
		.strict(true)
		.help()
		.parse();
}

main().catch((error) => {
	console.error(error);
	process.exit();
});
