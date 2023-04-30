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

The following methods will be awaited when the codemod is applied:

- from `react`:
  - `unstable_act`
- from `react-dom/test-utils`:
  - `act`
- from `react-test-renderer`:
  - `act`
- from `@testing-library/react`:
  - `act`
  - `cleanup`
  - `fireEvent`
  - `fireEvent.*`
  - `render`
  - `renderHook`

Right now we assume that any call to `rerender` and `unmount` should be awaited.
These are all names of methods from React Testing Library.´

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
  paths                                               [string] [required]

Options:
  --version         Show version number                         [boolean]
  --help            Show help                                   [boolean]
  --dry                                        [boolean] [default: false]
  --ignore-pattern               [string] [default: "**/node_modules/**"]
  --verbose                                    [boolean] [default: false]

Examples:
  codemod-missing-await-act ./              Ignores `node_modules` and
  --ignore-pattern                      `build` folders
  "**/{node_modules,build}/**"
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
