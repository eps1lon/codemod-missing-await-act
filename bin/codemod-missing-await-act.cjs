#!/usr/bin/env node
// @ts-check
const childProcess = require("child_process");
const process = require("process");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { readFileSync } = require("fs");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const currentImportConfigSchemaVersion = "v1";

async function main() {
	const transformsRoot = path.join(__dirname, "../transforms");
	const codemod = "codemod-missing-await-act";

	yargs(hideBin(process.argv))
		.scriptName("codemod-missing-await-act")
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
						.option("import-config", {
							description:
								"A path to a JS file importing all methods whose calls should be awaited.",
							type: "string",
						})
						.option("verbose", { default: false, type: "boolean" })
						// Ignoring `build`: https://www.digitalocean.com/community/tools/glob?comments=true&glob=%2A%2A%2F%7Bnode_modules%2Cbuild%7D%2F%2A%2A&matches=false&tests=package%2Fnode_modules%2Ftest.js&tests=package%2Fbuild%2Ftest.js&tests=package%2Ftest.js
						.example(
							'$0 ./ --ignore-pattern "**/{node_modules,build}/**"',
							"Ignores `node_modules` and `build` folders",
						)
						.example(
							"$0 ./ --import-confg ./missing-await-import-config.js",
							"Adds await to to all calls of methods imported in that file.",
						)
						.demandOption(["paths"])
				);
			},
			async (argv) => {
				const { dry, importConfig: importConfigArg, paths, verbose } = argv;
				const importConfig =
					typeof importConfigArg === "string"
						? path.resolve(importConfigArg)
						: path.resolve(__dirname, "../config/default-import-config.json");

				// TODO: npx instead?
				const jscodeshiftExecutable = require.resolve(
					"jscodeshift/bin/jscodeshift.js",
				);

				const tmpDirPrefix = path.join(
					os.tmpdir(),
					"codemod-missing-await-act",
				);
				await fs.mkdir(tmpDirPrefix, { recursive: true });
				const tmpDir = await fs.mkdtemp(tmpDirPrefix + path.sep);
				const escapedBindingsPath = path.join(tmpDir, "escaped-bindings");
				await fs.mkdir(escapedBindingsPath);

				/**
				 * @type {string[]}
				 */
				const args = [
					"--extensions=js,jsx,mjs,cjs,ts,tsx,mts,cts",
					`"--ignore-pattern=${argv.ignorePattern}"`,
					`"--escapedBindingsPath=${escapedBindingsPath}"`,
					`--importConfig=${importConfig}`,
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

				const escapedBindingsFiles = await fs.readdir(escapedBindingsPath);
				if (escapedBindingsFiles.length > 0) {
					console.warn(
						"Make sure to update import config to include the following files and their exports.",
					);

					const importConfigPath = path.join(
						tmpDir,
						"newly-async-import-config.json",
					);
					const importConfig = {
						$schema: `https://github.com/eps1lon/codemod-missing-await-act/tree/main/config/schema-${currentImportConfigSchemaVersion}.json`,
						imports: escapedBindingsFiles.map((escapedBindingsFile) => {
							const { filePath, escapedBindings } =
								/** @type {{filePath: String, escapedBindings: string[]}} */ (
									JSON.parse(
										readFileSync(
											path.join(escapedBindingsPath, escapedBindingsFile),
											"utf8",
										),
									)
								);

							return {
								source: [`file://${filePath}`],
								specifiers: escapedBindings,
							};
						}),
					};
					await fs.writeFile(
						importConfigPath,
						JSON.stringify(importConfig, null, 2),
					);

					console.warn(
						`Some codemodded files export newly async functions.` +
							`A new import config considering these files was generated in ${importConfigPath}\n` +
							"If these files are not necessarily imported as relative paths, " +
							"you should add additional entries to the import config as explained in " +
							"https://github.com/eps1lon/codemod-missing-await-act#custom-import-config.\n" +
							"After you adjusted above import config accordingly, run the same command again with" +
							`\n\`--import-config ${importConfigPath}\``,
					);
				}
			},
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
