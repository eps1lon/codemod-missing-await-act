const { describe, expect, test } = require("@jest/globals");
const childProcess = require("child_process");
const path = require("path");
const { promisify } = require("util");

describe("codemod-missing-await", () => {
	const exec = promisify(childProcess.exec);
	const typesReactCodemodBin = path.join(
		__dirname,
		"../codemod-missing-await.cjs"
	);
	function execCodemodMissingAwait(args) {
		return exec(`${typesReactCodemodBin} ${args}`, {});
	}

	test("provides help", async () => {
		await expect(execCodemodMissingAwait("--help")).resolves
			.toMatchInlineSnapshot(`
		{
		  "stderr": "Debugger attached.
		Waiting for the debugger to disconnect...
		",
		  "stdout": "codemod-missing-await <paths...>

		Positionals:
		  paths                                                      [string] [required]

		Options:
		  --version         Show version number                                [boolean]
		  --help            Show help                                          [boolean]
		  --dry                                               [boolean] [default: false]
		  --ignore-pattern                      [string] [default: "**/node_modules/**"]
		  --verbose                                           [boolean] [default: false]

		Examples:
		  codemod-missing-await ./                  Ignores \`node_modules\` and \`build\`
		  --ignore-pattern                          folders
		  "**/{node_modules,build}/**"
		",
		}
	`);
	});

	test("provides its version", async () => {
		const { version } = require("../../package.json");
		const { stdout } = await execCodemodMissingAwait("--version");
		expect(stdout.trim()).toBe(version);
	});

	test("can execute jscodeshift", async () => {
		const fixture = path.resolve(__dirname, "./__fixtures__/smoke-test");
		// Does't matter which transform as long as it is one that doesn't change code in the fixture
		const { stderr } = await execCodemodMissingAwait(`${fixture}`);

		// Everything ok
		expect(stderr).toMatchInlineSnapshot(`
		"Debugger attached.
		Debugger attached.
		Debugger attached.
		Waiting for the debugger to disconnect...
		Waiting for the debugger to disconnect...
		Waiting for the debugger to disconnect...
		"
	`);
	});
});
