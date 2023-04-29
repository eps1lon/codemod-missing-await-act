# codemod-missing-await-act

Adds missing `await` to `act` calls or methods that like contain an `act` call using [jscodeshift](https://github.com/facebook/jscodeshift).
We all track usage of these methods throughout the file.
For example, given

```tsx
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

Right now we assume calls to `act`, `render`, `rerender`, `fireEvent` and `cleanup` should be awaited.
These are all names of methods from React Testing Library.

Note that any call expression that calls a method from an object (so called "member expression") are not codemodded.
For example, this codemod will not add an `await` to `someObj.cleanup()`.

## Getting started

```bash
$ npx codemod-missing-await-act ./src

TODO
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
