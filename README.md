# codemod-missing-await-act

Adds missing `await` to `act` calls or methods that contain an `act` call using [jscodeshift](https://github.com/facebook/jscodeshift).
The codemod propagates these changes throughout the file.
For example, given

```tsx
import { act } from "react";

function focus(element) {
	act(() => {
		element.focus();
	});
}

test("focusing", () => {
	const { container } = render("<button />");

	focus(container);
});
```

will add an `await` to `act` and also add `await` to `focus` since `focus` is now an async method.
The end result will be

```tsx
import { act } from "react";

async function focus(element) {
	await act(() => {
		element.focus();
	});
}

test("focusing", async () => {
	const { container } = await render("<button />");

	await focus(container);
});
```

Right now we assume that any call to `rerender` and `unmount` should be awaited.

## Getting started

```bash
$ npx codemod-missing-await-act ./src
Processing 4 files...
All done.
Results:
0 errors
3 unmodified
0 skipped
1 ok
Time elapsed: 0.428seconds
```

## Usage

```bash
$ npx codemod-missing-await-act

codemod-missing-await-act <paths...>

Positionals:
  paths                                                      [string] [required]

Options:
  --version         Show version number                                [boolean]
  --help            Show help                                          [boolean]
  --dry                                               [boolean] [default: false]
  --ignore-pattern                      [string] [default: "**/node_modules/**"]
  --import-config   A path to a JS file importing all methods whose calls should
                    be awaited.                                         [string]
  --verbose                                           [boolean] [default: false]

Examples:
  codemod-missing-await-act ./              Ignores `node_modules` and `build`
  --ignore-pattern                          folders
  "**/{node_modules,build}/**"
  codemod-missing-await-act ./              Adds await to to all calls of
  --import-confg                            methods imported in that file.
  ./missing-await-import-config.js
```

### Custom import config

When a newly async function is exported, the codemod will not automatically update all references.
However, the codemod summarizes at the end which files are impacted and will generate an import config that can be used to update the remaining references if these are imported via relative imports.

<details>
<summary>Methods that will be awaited by default when the codemod is applied</summary>

`codemod-missing-await/config/default-import-config.json`

```json
{
	"$schema": "https://github.com/eps1lon/codemod-missing-await-act/tree/main/config/schema-latest.json",
	"version": 1,
	"imports": [
		{
			"sources": [
				"@testing-library/react",
				"@testing-library/react/pure",
				"@testing-library/react-native",
				"@testing-library/react-native/pure"
			],
			"specifiers": [
				"act",
				"cleanup",
				{ "imported": "fireEvent", "includeMemberCalls": true },
				"render",
				"renderHook"
			]
		},
		{
			"sources": "react",
			"specifiers": ["act", "unstable_act"]
		},
		{
			"sources": ["react-dom/test-utils", "react-test-renderer"],
			"specifiers": ["act"]
		}
	]
}
```

Type:

```ts
interface ImportConfig {
	version: number;
	imports: Array<{
		/**
		 * The module specifier.
		 */
		sources: string;
		/**
		 * The specifiers that should be awaited.
		 * `Array<string>` and `Array<{ imported: string>` are equivalent
		 */
		specifiers: Array<
			| string
			| {
					imported: string;
					/**
					 * If `true` all member calls of the imported specifier will be awaited.
					 * For example, `{ imported: 'fireEvent', includeMemberCalls: true }` will await `fireEvent()` as well as `fireEvent.mouseEnter(element)`, `fireEvent.click(element)` etc..
					 */
					includeMemberCalls?: boolean;
					/**
					 * If true, the imported specifier is assumed to be a factor for a newly
					 * async function.
					 * For example, in `export const makeRender = () => () => render(...)`
					 * we'd specify `{ imported: 'makeRender', asyncFunctionFactory: true }`Ï
					 */
					asyncFunctionFactory?: boolean;
			  }
		>;
	}>;
}
```

[Latest JSON schema](https://github.com/eps1lon/codemod-missing-await-act/tree/main/config/schema-latest.json)
[all versions](https://github.com/eps1lon/codemod-missing-await-act/tree/main/config/)

</details>

For example, when we transform this `~/src/utils.js` file

```tsx
export function hoverAndClick(element) {
	fireEvent.mouseEnter(element);
	fireEvent.click(element);
}
```

`hoverAndClick` will now be async.
The codemod generates an import config that will look something like this

```json
{
	"$schema": "",
	"imports": [
		{
			"sources": ["file:///Users/you/repo/src/utils.js"],
			"specifiers": ["hoverAndClick"]
		}
	]
}
```

You can then run the codemod again with the `--import-config` option.

The codemod will now also await `hoverAndClick` if `utils.js` is imported via a relative path.

```tsx
import { render } from "@testing-library/react";
import { hoverAndClick } from "./utils";

test("hover and click", () => {
	const { container } = render("<button />");

	hoverAndClick(container);
});
```

will be transformed into

```tsx
import { render } from "@testing-library/react";
import { hoverAndClick } from "./utils";

test("hover and click", async () => {
	const { container } = await render("<button />");

	await hoverAndClick(container);
});
```

You need to repeat this process until the codemod no longer prompts you at the end to update the import config.

If you use path aliases or modules with newly async exports are imported via package specifiers, you need to manually adjust the import config e.g.

```diff
 {
 	"$schema": "",
 	"imports": [
 		{
-			"sources": ["file:///Users/you/repo/src/utils.js"],
+			"sources": ["@my/module", "file:///Users/you/repo/src/utils.js"],
 			"specifiers": ["hoverAndClick"]
 		}
 	]
 }
```

## Limitations

### Forces call expressions to be awaited

```tsx
const acting = act(scope);
await anotherPromise;
await acting;
```

will add `await` to the `act` call.

This codemod is targetted at act calls.
`act()` calls are not allowed to overlap anyway so the original code was already problematic since `acting` could also contain an `act` call.

### async class methods are not propagated

We don't track references to class methods.
Only references to (arrow-) function declarations or expressions are tracked.

```tsx
class MyTestUtils {
	render() {
		act(scope);
	}
}

const utils = new MyTestUtils();

utils.render();
```

will be transformed to

```tsx
class MyTestUtils {
	async render() {
		await act(scope);
	}
}

const utils = new MyTestUtils();

// no `await` added
utils.render();
```

## Supported platforms

The following list contains officially supported runtimes.
Please file an issue for runtimes that are not included in this list.

<!-- #nodejs-suppport Should match CI test matrix -->

- Node.js `18.x || 20.x || 22.x || 23.x`
