const parseSync = require("./utils/parseSync");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;

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
 * True if the call looks like a call of act() or contains a call to act().
 * We use the naming of APIs from React Testing Library:
 * act, render, rerender and fireEvent are assumed to be methods from React Testing Library.
 * @param {t.CallExpression['callee'] | t.PrivateName} callee
 * @param {string | undefined} importSource undefined if the callee has a local binding
 */
function isActOrCallsAct(callee, importSource) {
	// unstable_act
	if (
		importSource === "react" &&
		callee.type === "Identifier" &&
		callee.name === "unstable_act"
	) {
		return true;
	}

	// act()
	if (
		(importSource?.startsWith("@testing-library/") ||
			importSource === "react-dom/test-utils" ||
			importSource === "react-test-renderer") &&
		callee.type === "Identifier" &&
		callee.name === "act"
	) {
		return true;
	}

	// fireEvent.*()
	if (
		(importSource === "@testing-library/react" ||
			importSource === "@testing-library/react/pure") &&
		callee.type === "MemberExpression" &&
		callee.object.type === "Identifier" &&
		callee.object.name === "fireEvent"
	) {
		return true;
	}

	// fireEvent()
	if (
		(importSource === "@testing-library/react" ||
			importSource === "@testing-library/react/pure") &&
		callee.type === "Identifier" &&
		callee.name === "fireEvent"
	) {
		return true;
	}

	// render
	if (
		(importSource === "@testing-library/react" ||
			importSource === "@testing-library/react/pure") &&
		callee.type === "Identifier" &&
		callee.name === "render"
	) {
		return true;
	}

	// renderHook
	if (
		(importSource === "@testing-library/react" ||
			importSource === "@testing-library/react/pure") &&
		callee.type === "Identifier" &&
		callee.name === "renderHook"
	) {
		return true;
	}

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

	// cleanup
	if (
		(importSource === "@testing-library/react" ||
			importSource === "@testing-library/react/pure") &&
		callee.type === "Identifier" &&
		callee.name === "cleanup"
	) {
		return true;
	}

	return false;
}

/**
 * @type {import('jscodeshift').Transform}
 *
 * Summary for Klarna's klapp@TODO
 */
const codemodMissingAwaitActTransform = (file) => {
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
						const exportName = exportSpecifier.exported.name;

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
					const importSpecifier =
						/** @type {t.ImportNamespaceSpecifier | t.ImportSpecifier} */ (
							bindingPath.node
						);
					// import * as foo from '...'
					//             ^^^ local
					// import { act as rtlAct } from '...'
					//                 ^^^^^^ local
					//          ^^^ imported
					const callee =
						importSpecifier.type === "ImportNamespaceSpecifier"
							? importSpecifier.local
							: importSpecifier.imported;
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
			const shouldHaveAwait = isActOrCallsAct(callee, importSource);

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
