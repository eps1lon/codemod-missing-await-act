const parseSync = require("./utils/parseSync");
const t = require("@babel/types");
const traverse = require("@babel/traverse").default;

/**
 * @param {babel.NodePath<t.Function>} path
 */
function getBindingFromFunctionPath(path) {
	let bindingName = null;
	path.node.type;
	if (t.isFunctionDeclaration(path.node)) {
		bindingName = path.node.id.name;
	} else if (
		t.isFunctionExpression(path.node) ||
		t.isArrowFunctionExpression(path.node)
	) {
		if (t.isVariableDeclarator(path.parent)) {
			bindingName = path.parent.id.name;
		}
	}

	const binding = path.scope.getBinding(bindingName);
	return binding;
}

/**
 * @type {import('jscodeshift').Transform}
 *
 * Summary for Klarna's klapp@TODO
 */
const useCallbackImplicitAnyTransform = (file) => {
	const ast = parseSync(file);

	/**
	 *
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
			/**
			 * @type {babel.NodePath<t.Function>}
			 */
			const functionPath = maybeFunctionScope.path;
			if (expressionNeedsAwait) {
				functionPath.node.async = true;
			}

			// propagate await to refernces
			const binding = getBindingFromFunctionPath(functionPath);
			if (binding) {
				binding.referencePaths.forEach((referencePath) => {
					if (t.isCallExpression(referencePath.parent)) {
						ensureAwait(referencePath.parentPath);
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
			let shouldHaveAwait = false;
			if (
				callExpression.callee.type === "Identifier" &&
				callExpression.callee.name === "act"
			) {
				shouldHaveAwait = true;
			}

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

module.exports = useCallbackImplicitAnyTransform;
