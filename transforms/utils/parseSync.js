const babylon = require("@babel/parser");
// @ts-expect-error -- not typed
const hermesParser = require("hermes-parser");
const j = require("jscodeshift");

/**
 * @type {any}
 */
const baseParserOptions = {
	sourceType: "module",
	allowImportExportEverywhere: true,
	allowReturnOutsideFunction: true,
	startLine: 1,
	tokens: true,
	plugins: [
		"asyncGenerators",
		"bigInt",
		"classPrivateMethods",
		"classPrivateProperties",
		"classProperties",
		"decorators-legacy",
		"doExpressions",
		"dynamicImport",
		"exportDefaultFrom",
		// TODO: rejected by TS
		// "exportExtensions",
		"exportNamespaceFrom",
		"functionBind",
		"functionSent",
		"importAssertions",
		"importMeta",
		"nullishCoalescingOperator",
		"numericSeparator",
		"objectRestSpread",
		"optionalCatchBinding",
		"optionalChaining",
		["pipelineOperator", { proposal: "minimal" }],
		"throwExpressions",
		"explicitResourceManagement",
	],
};

const dtsParserOptions = {
	...baseParserOptions,
	plugins: [...baseParserOptions.plugins, ["typescript", { dts: true }]],
};
const tsParserOptions = {
	...baseParserOptions,
	plugins: [...baseParserOptions.plugins, ["typescript", { dts: false }]],
};
const tsxParserOptions = {
	...tsParserOptions,
	plugins: [...tsParserOptions.plugins, "jsx"],
};

/**
 * Fork `jscodeshift`'s `tsx` parser with support for .d.ts files
 * @param {import('jscodeshift').FileInfo} fileInfo
 */
function parseSync(fileInfo) {
	const ts =
		fileInfo.path.endsWith(".ts") ||
		fileInfo.path.endsWith(".mts") ||
		fileInfo.path.endsWith(".cts");
	const dts =
		fileInfo.path.endsWith(".d.ts") ||
		fileInfo.path.endsWith(".d.mts") ||
		fileInfo.path.endsWith(".d.cts");
	const tsx = fileInfo.path.endsWith(".tsx");

	return j(fileInfo.source, {
		parser: {
			/**
			 * @param {string} code
			 * @returns
			 */
			parse(code) {
				if (dts) {
					try {
						return babylon.parse(code, dtsParserOptions);
					} catch (error) {
						// some .d.ts files are not actually ambient modules at Klarna
						// Instead, they contain statements like `const foo = () => {}` which is no parseable as an ambient module.
						// So if the parser fails in an ambient context we just try again without ambient context
					}
				}
				if (ts) {
					return babylon.parse(code, tsParserOptions);
				} else if (tsx) {
					return babylon.parse(code, tsxParserOptions);
				} else {
					const result = hermesParser.parse(code, {
						babel: true,
						sourceFilename: fileInfo.path,
						tokens: true,
					});
					// Hermes parser bug. Should have tokens field.
					if (result.tokens === undefined) {
						result.tokens = [];
					}
					return result;
				}
			},
		},
	});
}

module.exports = parseSync;
