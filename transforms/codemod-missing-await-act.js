const parseSync = require("./utils/parseSync");
const babylon = require("@babel/parser");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const { dirname, extname, resolve } = require("path");
const { fileURLToPath } = require("url");

/**
 * @param {babel.NodePath<t.Function>} path
 */
function getBindingFromFunctionPath(path) {
	/** @type {string | undefined} */
	let bindingName;
	path.node.type;
	if (t.isFunctionDeclaration(path.node)) {
		bindingName = path.node.id?.name;
	} else if (
		t.isFunctionExpression(path.node) ||
		t.isArrowFunctionExpression(path.node)
	) {
		if (t.isVariableDeclarator(path.parent)) {
			bindingName =
				path.parent.id.type === "Identifier" ? path.parent.id.name : undefined;
		}
	}

	const binding =
		bindingName !== undefined ? path.scope.getBinding(bindingName) : undefined;
	return binding;
}

/**
 * @type {Map<string, t.Node | undefined>}
 */
const importConfigAsts = new Map();

/**
 * True if the call looks like a call of act() or contains a call to act().
 * For local bindings we hardcoded some names (e.g. rerender and unmount).
 * For imported bindings we match the imports of the `importConfigAst`.
 * @param {t.Node} importConfigAst
 * @param {t.CallExpression['callee'] | t.PrivateName} callee
 * @param {string} calleeModulePath The absolute path to the module containing {@link callee}
 * @param {string | undefined} importSource undefined if the callee has a local binding
 */
function isActOrCallsAct(
	importConfigAst,
	callee,
	calleeModulePath,
	importSource
) {
	// rerender
	if (
		importSource === undefined &&
		callee.type === "Identifier" &&
		callee.name === "rerender"
	) {
		return true;
	}

	// unmount
	if (
		importSource === undefined &&
		callee.type === "Identifier" &&
		callee.name === "unmount"
	) {
		return true;
	}

	let isActOrCallsAct = false;

	/**
	 * @param {t.Node} node
	 */
	function shouldIncludeAllMembers(node) {
		return node.leadingComments?.some((comment) => {
			return comment.value.includes("@includeMemberCalls");
		});
	}

	traverse(importConfigAst, {
		ImportDeclaration(path) {
			const { source, specifiers } = path.node;

			function importSourcesMatch() {
				// source.value = file:///Users/sebbie/utils.js
				// importSource = ./utils.js
				if (source.value === importSource) {
					return true;
				}

				let sourceValue = source.value;
				// If the importSource isn't a relative import, we don't even need to consider
				// filepaths since we don't implement full module resolution.
				if (
					importSource?.startsWith(".") &&
					sourceValue.startsWith("file://")
				) {
					try {
						sourceValue = fileURLToPath(sourceValue);
					} catch (cause) {
						throw new Error(
							"Failed to parse URL from source value: " + sourceValue,
							// @ts-expect-error -- Types don't know about `cause` yet.
							{ cause }
						);
					}
					const absoluteImportSource = resolve(
						dirname(resolve(process.cwd(), calleeModulePath)),
						importSource
					);

					return (
						absoluteImportSource === sourceValue ||
						// support extension-less, relative imports
						absoluteImportSource ===
							sourceValue.replace(extname(sourceValue), "")
					);
				}

				return false;
			}

			if (importSourcesMatch()) {
				isActOrCallsAct =
					isActOrCallsAct ||
					specifiers.some((specifier) => {
						switch (specifier.type) {
							case "ImportDefaultSpecifier": {
								const specifierName = specifier.local.name;
								return (
									(callee.type === "Identifier" &&
										callee.name === specifierName) ||
									(shouldIncludeAllMembers(specifier) &&
										callee.type === "MemberExpression" &&
										callee.object.type === "Identifier" &&
										callee.object.name === specifierName)
								);
							}
							case "ImportNamespaceSpecifier":
								throw new Error(
									"Namespace imports (`import * as RTL from '...'`) are not supported. Just list the namespace members directly e.g. `import { act, render } from '...'`"
								);
							case "ImportSpecifier": {
								const specifierName =
									specifier.imported.type === "Identifier"
										? specifier.imported.name
										: specifier.imported.value;
								return (
									(callee.type === "Identifier" &&
										callee.name === specifierName) ||
									(shouldIncludeAllMembers(specifier) &&
										callee.type === "MemberExpression" &&
										callee.object.type === "Identifier" &&
										callee.object.name === specifierName)
								);
							}
							default:
								console.warn(
									// @ts-expect-error This is future-proofing the code but TypeScript assumes we'll never reach this branch.
									`Unsupported import specifier type '${specifier.type}'`
								);
								break;
						}
					});
			}
		},
	});

	return isActOrCallsAct;
}

/**
 * @type {import('jscodeshift').Transform}
 *
 * Summary for Klarna's klapp@TODO
 */
const codemodMissingAwaitActTransform = (file, api, options) => {
	// Ideally we'd not match these earlier but it seems easier to bail out here.
	const isDeclarationFile =
		file.path.endsWith(".d.ts") ||
		file.path.endsWith(".d.cts") ||
		file.path.endsWith(".d.mts");
	if (isDeclarationFile) {
		// undefined return marks the file as skipped in JSCodeShift (nice!)
		return;
	}

	let maybeImportConfigAst = importConfigAsts.get(options.importConfig);
	if (maybeImportConfigAst === undefined) {
		const importConfigSource = fs.readFileSync(options.importConfig, {
			encoding: "utf-8",
		});
		maybeImportConfigAst = babylon.parse(importConfigSource, {
			sourceType: "module",
		}).program;
		importConfigAsts.set(options.importConfig, maybeImportConfigAst);
	}
	const importConfigAst = /** @type {t.Node} */ (maybeImportConfigAst);

	const ast = parseSync(file);
	/** @type {Set<string>} */
	const warnedExports = new Set();

	/**
	 * @param {babel.NodePath<t.Expression>} path
	 */
	function ensureAwait(path) {
		const expression = path.node;

		const expressionNeedsAwait = !(
			t.isAwaitExpression(path.node) ||
			t.isAwaitExpression(path.parent) ||
			t.isReturnStatement(path.parent) ||
			// i.e. implicit return
			t.isArrowFunctionExpression(path.parent)
		);

		if (expressionNeedsAwait) {
			const awaitExpression = t.awaitExpression(expression);
			path.replaceWith(awaitExpression);
			changedSome = true;
		}

		let maybeFunctionScope = path.scope;
		while (maybeFunctionScope && !maybeFunctionScope.path.isFunction()) {
			maybeFunctionScope = maybeFunctionScope.parent;
		}

		if (maybeFunctionScope) {
			const functionPath = /** @type {babel.NodePath<t.Function>} */ (
				maybeFunctionScope.path
			);

			if (expressionNeedsAwait) {
				functionPath.node.async = true;
			}

			// propagate await to refernces
			const binding = getBindingFromFunctionPath(functionPath);
			if (binding) {
				binding.referencePaths.forEach((referencePath) => {
					// propage await to `binding()` but not `other(binding)`
					if (
						t.isCallExpression(referencePath.parent) &&
						referencePath.key === "callee"
					) {
						ensureAwait(
							/** @type {babel.NodePath<t.CallExpression>} */
							(referencePath.parentPath)
						);
					} else if (
						t.isExportSpecifier(referencePath.parent) &&
						referencePath.key === "local"
					) {
						const exportSpecifier = /** @type {t.ExportSpecifier} */ (
							referencePath.parent
						);
						const exportName =
							// exported is Identifier | StringLiteral
							exportSpecifier.exported.type === "Identifier"
								? exportSpecifier.exported.name
								: exportSpecifier.exported.value;

						if (!warnedExports.has(exportName)) {
							console.warn(
								`${file.path}: Export '${exportName}' is now async. ` +
									`Make sure to update the rules of this codemod and run it again.`
							);
							warnedExports.add(exportName);
						}
					} else if (
						t.isExportDefaultDeclaration(referencePath.parent) &&
						referencePath.key === "declaration"
					) {
						const exportName = "default";

						if (!warnedExports.has(exportName)) {
							console.warn(
								`${file.path}: Default export is now async. ` +
									`Make sure to update the rules of this codemod and run it again.`
							);
							warnedExports.add(exportName);
						}
					} else if (referencePath.node.type === "ExportNamedDeclaration") {
						const declaration = /** @type {t.Declaration} */ (
							referencePath.node.declaration
						);
						// export const
						if (declaration.type === "VariableDeclaration") {
							const id = declaration.declarations[0].id;
							if (id.type === "Identifier") {
								const exportName = id.name;
								if (!warnedExports.has(exportName)) {
									console.warn(
										`${file.path}: Export '${exportName}' is now async. ` +
											`Make sure to update the rules of this codemod and run it again.`
									);
									warnedExports.add(exportName);
								}
							}
						} else if (declaration.type === "FunctionDeclaration") {
							// `export function` needs to have an identifier
							// `export function() {}` would be a syntax error
							const id = /** @type {t.Identifier} */ (declaration.id);
							const exportName = id.name;
							if (!warnedExports.has(exportName)) {
								console.warn(
									`${file.path}: Export '${exportName}' is now async. ` +
										`Make sure to update the rules of this codemod and run it again.`
								);
								warnedExports.add(exportName);
							}
						}
					} else if (referencePath.type === "ExportDefaultDeclaration") {
						const exportName = "default";

						if (!warnedExports.has(exportName)) {
							console.warn(
								`${file.path}: Default export is now async. ` +
									`Make sure to update the rules of this codemod and run it again.`
							);
							warnedExports.add(exportName);
						}
					}
				});
			}
		}
	}

	/**
	 * @param {babel.NodePath<t.CallExpression>} path
	 * @returns {{ callee: t.CallExpression['callee'] | t.PrivateName, importSource: string | undefined }}
	 */
	function getCalleeAndModuleName(path) {
		const callExpression = path.node;

		if (callExpression.callee.type === "Identifier") {
			const bindingName = callExpression.callee.name;
			const binding = path.scope.getBinding(bindingName);

			if (binding !== undefined) {
				const bindingPath = binding.path;
				if (bindingPath.parentPath?.isImportDeclaration()) {
					const importDeclaration = bindingPath.parentPath.node;
					const importSource = importDeclaration.source.value;
					const importSpecifier = bindingPath.node;

					let callee;
					switch (importSpecifier.type) {
						// import * as foo from '...'
						//             ^^^ local
						// import foo from '...'
						//        ^^^ local
						case "ImportDefaultSpecifier":
						case "ImportNamespaceSpecifier":
							callee = importSpecifier.local;
							break;
						// import { act as rtlAct } from '...'
						//                 ^^^^^^ local
						//          ^^^ imported
						case "ImportSpecifier":
							callee = importSpecifier.imported;
							break;
						default:
							throw new Error(
								`Can't resolve callee for import specifier of type '${importSpecifier.type}'`
							);
					}
					return { callee, importSource: importSource };
				}
			}
		} else if (callExpression.callee.type === "MemberExpression") {
			const bindingName =
				callExpression.callee.object.type === "Identifier"
					? callExpression.callee.object.name
					: undefined;
			const binding =
				bindingName === undefined
					? undefined
					: path.scope.getBinding(bindingName);

			if (binding !== undefined) {
				const bindingPath = binding.path;
				if (bindingPath.parentPath?.isImportDeclaration()) {
					const importDeclaration = bindingPath.parentPath.node;
					const importSource = importDeclaration.source.value;
					const callee =
						// For `React.act` we want `act` as the callee
						// iff `React` comes from a namespace import e.g `import * as React from 'react'`
						// Otherwise we assume `React` comes from e.g. `import { React } from 'react'`
						// in which case we just want `React.act` as the callee.
						bindingPath.node.type === "ImportNamespaceSpecifier"
							? callExpression.callee.property
							: callExpression.callee;
					return { callee, importSource: importSource };
				}
			}
		}

		const callee = callExpression.callee;
		return { callee, importSource: undefined };
	}

	let changedSome = false;
	// ast.get("program").value is sufficient for unit tests but not actually running it on files
	// TODO: How to test?
	const traverseRoot = ast.paths()[0].value;
	traverse(traverseRoot, {
		CallExpression(path) {
			const { callee, importSource } = getCalleeAndModuleName(path);
			const shouldHaveAwait = isActOrCallsAct(
				importConfigAst,
				callee,
				file.path,
				importSource
			);

			if (shouldHaveAwait) {
				ensureAwait(path);
			}
		},
	});

	// Otherwise some files will be marked as "modified" because formatting changed
	if (changedSome) {
		return ast.toSource();
	}
	return file.source;
};

module.exports = codemodMissingAwaitActTransform;
