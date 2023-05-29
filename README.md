# codemod-missing-await-act

Adds missing `await` to `act` calls or methods that like contain an `act` call using [jscodeshift](https://github.com/facebook/jscodeshift).
We all track usage of these methods throughout the file.
For example, given

```tsx
import { act } from "react-dom/test-utils";

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
import { act } from "react-dom/test-utils";

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

<details>
<summary>Methods that will be awaited by default when the codemod is applied</summary>

```js
// codemod-missing-await/default-import-config.js
// Import aliases have no effect on the codemod.
// They're only used to not cause JS Syntax errors in this file.
// The codemod will only consider the imported name.
import {
	act,
	cleanup,
	/**
	 * @includeMemberCalls
	 * e.g. fireEvent.click()
	 */
	fireEvent,
	render,
	renderHook,
} from "@testing-library/react";
import {
	act as act2,
	cleanup as cleanup2,
	/**
	 * @includeMemberCalls
	 * e.g. fireEvent.click()
	 */
	fireEvent as fireEvent2,
	render as render2,
	renderHook as renderHook2,
} from "@testing-library/react/pure";
import {
	act as act3,
	cleanup as cleanup3,
	/**
	 * @includeMemberCalls
	 * e.g. fireEvent.click()
	 */
	fireEvent as fireEvent3,
	render as render3,
	renderHook as renderHook3,
} from "@testing-library/react-native";
import {
	act as act4,
	cleanup as cleanup4,
	/**
	 * @includeMemberCalls
	 * e.g. fireEvent.click()
	 */
	fireEvent as fireEvent4,
	render as render4,
	renderHook as renderHook4,
} from "@testing-library/react-native/pure";
import { unstable_act } from "react";
import { act as ReactTestUtilsAct } from "react-dom/test-utils";
import { act as ReactTestRendererAct } from "react-test-renderer";
```

</details>

You can add more methods if they're imported from somewhere by passing a JS file that only includes imports of those methods e.g. `npx codemod-missing-await-act ./src --import-config ./my-testing-library-imports.js` where `my-testing-library-imports.js` contains

```js
import { renderWithProviders } from "@mycompany/testing-library";
```

Now the codemod will also add an `await` to any `renderWithProviders` call imported from `@mycompany/testing-library`.

By default, the codemod uses the code listed in [codemod-missing-await/default-import-config.js](./default-import-config.js).

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

## Limitations

### Forces call expressions to be awaited

```tsx
const acting = act(scope);
await anotherPromise;
await acting;
```

will add `await` to the `act` call.

This codemod is targetted at act calls.
They're not allowed to be interleaved anyway so the original code was already problematic since it could also contain an `act` call.
I don't think this is common in practice (TODO: check if we use this pattern).

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

- Node.js `14.x || 16.x || 18.x || 19.x || 20.x`

```

```
