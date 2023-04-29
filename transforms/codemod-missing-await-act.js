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
 * @param {t.CallExpression} callExpression
 */
function isActOrCallsAct(callExpression) {
	// act()
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "act"
	) {
		return true;
	}

	// fireEvent.*()
	if (
		callExpression.callee.type === "MemberExpression" &&
		callExpression.callee.object.type === "Identifier" &&
		callExpression.callee.object.name === "fireEvent"
	) {
		return true;
	}

	// fireEvent()
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "fireEvent"
	) {
		return true;
	}

	// render
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "render"
	) {
		return true;
	}

	// renderHook
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "renderHook"
	) {
		return true;
	}

	// rerender
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "rerender"
	) {
		return true;
	}

	// unmount
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "unmount"
	) {
		return true;
	}

	// cleanup
	if (
		callExpression.callee.type === "Identifier" &&
		callExpression.callee.name === "cleanup"
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
					if (t.isCallExpression(referencePath.parent)) {
						ensureAwait(
							/** @type {babel.NodePath<t.CallExpression>} */
							(referencePath.parentPath)
						);
					}
				});
			}
		}
	}

	let changedSome = false;
	// ast.get("program").value is sufficient for unit tests but not actually running it on files
	// TODO: How to test?
	const traverseRoot = ast.paths()[0].value;
	traverse(traverseRoot, {
		CallExpression(path) {
			const callExpression = path.node;
			const shouldHaveAwait = isActOrCallsAct(callExpression);

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
