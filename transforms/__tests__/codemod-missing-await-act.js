const { afterEach, expect, jest, test } = require("@jest/globals");
const { default: dedent } = require("dedent-tabs");
const fs = require("fs/promises");
const JscodeshiftTestUtils = require("jscodeshift/dist/testUtils");
const os = require("os");
const path = require("path");
const codemodMissingAwaitTransform = require("../codemod-missing-await-act");

async function applyTransform(source, options = {}) {
	const { filePath = "test.js", ...providedTransformOptions } = options;
	const transformOptions = {
		...providedTransformOptions,
		importConfig: path.resolve(__dirname, "../../default-import-config.js"),
	};
	const { importConfigSource } = options;
	if (importConfigSource !== undefined) {
		const importConfigPath = path.join(
			os.tmpdir(),
			"codemod-missing-await-act/fixtures/import-config.js"
		);
		await fs.mkdir(path.dirname(importConfigPath), { recursive: true });
		await fs.writeFile(importConfigPath, importConfigSource);
		transformOptions.importConfig = importConfigPath;
	}

	return JscodeshiftTestUtils.applyTransform(
		codemodMissingAwaitTransform,
		transformOptions,
		{
			path: filePath,
			source: dedent(source),
		}
	);
}

afterEach(() => {
	jest.restoreAllMocks();
});

test("act in test", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			test("void works", () => {
				act()
			})
			test("return works", () => {
				return act()
			})
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		test("void works", async () => {
			await act()
		})
		test("return works", () => {
			return act()
		})"
	`);
});

test("act import alias in test", async () => {
	await expect(
		applyTransform(`
			import { act as rtlAct } from "@testing-library/react"
			const act = scope => {
				rtlAct(scope)
			}
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act as rtlAct } from "@testing-library/react"
		const act = async scope => {
			await rtlAct(scope)
		}"
	`);
});

test("local act untouched", async () => {
	await expect(
		applyTransform(`
			function act() {}
			test("void works", () => {
				act()
			})
	`)
	).resolves.toMatchInlineSnapshot(`
		"function act() {}
		test("void works", () => {
			act()
		})"
	`);
});

test("act in utils #1", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			function caseA() {
				return act()
			}
			
			function caseB() {
				caseA()
			}
			function caseC() {
				const test = caseB()
				
				return test
			}
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		function caseA() {
			return act()
		}

		async function caseB() {
			await caseA()
		}
		async function caseC() {
			const test = await caseB()
			
			return test
		}"
	`);
});

test("act in utils #2", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			function caseA() {
				act()
			}
			
			function caseB() {
				return caseA()
			}
			
			function caseC() {
				const test = caseB()
				
				return test
			}
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		async function caseA() {
			await act()
		}

		function caseB() {
			return caseA()
		}

		async function caseC() {
			const test = await caseB()
			
			return test
		}"
	`);
});

test("act in utils #3", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			const caseA = () => {
				act()
			}
			
			const caseB = () => caseA()
			
			function caseC() {
				const test = caseB()
				
				return test
			}
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		const caseA = async () => {
			await act()
		}

		const caseB = () => caseA()

		async function caseC() {
			const test = await caseB()
			
			return test
		}"
	`);
});

test("React Testing Library api", async () => {
	await expect(
		applyTransform(`
			import {
				cleanup,
				fireEvent,
				render,
				renderHook,
				screen,
			} from "@testing-library/react";
			
			beforeEach(() => {
				cleanup();
			});
			
			function renderWithProviders(element) {
				const { rerender, unmount } = render(<TestProvider>{element}</TestProvider>);
			
				return { rerender, unmount };
			}
			
			test("test", () => {
				const { rerender, unmount } = renderWithProviders(<button>Test</button>);
			
				fireEvent.click(screen.getByRole("button"));
			
				rerender(<span />);
			
				fireEvent(
					screen.getByRole("button"),
					new MouseEvent("click", {
						bubbles: true,
						cancelable: true,
					})
				);
			
				unmount();
			});
			
			test("renderHook", () => {
				const { result, unmount } = renderHook(() => useHook());
			
				unmount();
			});
		
		`)
	).resolves.toMatchInlineSnapshot(`
		"import {
			cleanup,
			fireEvent,
			render,
			renderHook,
			screen,
		} from "@testing-library/react";

		beforeEach(async () => {
			await cleanup();
		});

		async function renderWithProviders(element) {
			const { rerender, unmount } = await render(<TestProvider>{element}</TestProvider>);

			return { rerender, unmount };
		}

		test("test", async () => {
			const { rerender, unmount } = await renderWithProviders(<button>Test</button>);

			await fireEvent.click(screen.getByRole("button"));

			await rerender(<span />);

			await fireEvent(screen.getByRole("button"), new MouseEvent("click", {
		        bubbles: true,
		        cancelable: true,
		    }));

			await unmount();
		});

		test("renderHook", async () => {
			const { result, unmount } = await renderHook(() => useHook());

			await unmount();
		});"
	`);
});

test("React Native Testing Library api", async () => {
	await expect(
		applyTransform(`
			import {
				cleanup,
				fireEvent,
				render,
				renderHook,
				screen,
			} from "@testing-library/react-native";
			
			beforeEach(() => {
				cleanup();
			});
			
			function renderWithProviders(element) {
				const { rerender, unmount } = render(<TestProvider>{element}</TestProvider>);
			
				return { rerender, unmount };
			}
			
			test("test", () => {
				const { rerender, unmount } = renderWithProviders(<button>Test</button>);
			
				fireEvent.click(screen.getByRole("button"));
			
				rerender(<span />);
			
				fireEvent(
					screen.getByRole("button"),
					new MouseEvent("click", {
						bubbles: true,
						cancelable: true,
					})
				);
			
				unmount();
			});
			
			test("renderHook", () => {
				const { result, unmount } = renderHook(() => useHook());
			
				unmount();
			});
		
		`)
	).resolves.toMatchInlineSnapshot(`
		"import {
			cleanup,
			fireEvent,
			render,
			renderHook,
			screen,
		} from "@testing-library/react-native";

		beforeEach(async () => {
			await cleanup();
		});

		async function renderWithProviders(element) {
			const { rerender, unmount } = await render(<TestProvider>{element}</TestProvider>);

			return { rerender, unmount };
		}

		test("test", async () => {
			const { rerender, unmount } = await renderWithProviders(<button>Test</button>);

			await fireEvent.click(screen.getByRole("button"));

			await rerender(<span />);

			await fireEvent(screen.getByRole("button"), new MouseEvent("click", {
		        bubbles: true,
		        cancelable: true,
		    }));

			await unmount();
		});

		test("renderHook", async () => {
			const { result, unmount } = await renderHook(() => useHook());

			await unmount();
		});"
	`);
});

test("React Testing Library api as namespace", async () => {
	await expect(
		applyTransform(`
			import * as RTL from "@testing-library/react";
			
			beforeEach(() => {
				RTL.cleanup();
			});
			
			function renderWithProviders(element) {
				const { rerender, unmount } = RTL.render(<TestProvider>{element}</TestProvider>);
			
				return { rerender, unmount };
			}
			
			test("test", () => {
				const { rerender, unmount } = renderWithProviders(<button>Test</button>);
			
				RTL.fireEvent.click(screen.getByRole("button"));
			
				rerender(<span />);
			
				RTL.fireEvent(
					screen.getByRole("button"),
					new MouseEvent("click", {
						bubbles: true,
						cancelable: true,
					})
				);
			
				unmount();
			});
			
			test("renderHook", () => {
				const { result, unmount } = renderHook(() => useHook());
			
				unmount();
			});
		
		`)
	).resolves.toMatchInlineSnapshot(`
		"import * as RTL from "@testing-library/react";

		beforeEach(async () => {
			await RTL.cleanup();
		});

		async function renderWithProviders(element) {
			const { rerender, unmount } = await RTL.render(<TestProvider>{element}</TestProvider>);

			return { rerender, unmount };
		}

		test("test", async () => {
			const { rerender, unmount } = await renderWithProviders(<button>Test</button>);

			RTL.fireEvent.click(screen.getByRole("button"));

			await rerender(<span />);

			await RTL.fireEvent(screen.getByRole("button"), new MouseEvent("click", {
		        bubbles: true,
		        cancelable: true,
		    }));

			await unmount();
		});

		test("renderHook", async () => {
			const { result, unmount } = renderHook(() => useHook());

			await unmount();
		});"
	`);
});

test("react API", async () => {
	await expect(
		applyTransform(`
			import * as React from 'react'
			
			test('test', () => {
				React.unstable_act()
			})
		`)
	).resolves.toMatchInlineSnapshot(`
		"import * as React from 'react'

		test('test', async () => {
			await React.unstable_act()
		})"
	`);
});

test("react-test-renderer API", async () => {
	await expect(
		applyTransform(`
			import { act } from 'react-test-renderer'
			
			test('test', () => {
				act()
			})
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from 'react-test-renderer'

		test('test', async () => {
			await act()
		})"
	`);
});

test("react-dom API", async () => {
	await expect(
		applyTransform(`
			import { act } from 'react-dom/test-utils'
			import { flushSync } from 'react-dom'
			
			test('test', () => {
				act()
				flushSync()
			})
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from 'react-dom/test-utils'
		import { flushSync } from 'react-dom'

		test('test', async () => {
			await act()
			flushSync()
		})"
	`);
});

test("intentional interleaving is stopped", async () => {
	await expect(
		applyTransform(`
			import { act } from '@testing-library/react'
			test('test', () => {
				Promise.all([act(), act()])
			})
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from '@testing-library/react'
		test('test', async () => {
			Promise.all([await act(), await act()])
		})"
	`);
});

// Found in facebook/react
test.failing("already async act", async () => {
	// Code should be unchanged ideally.
	const code = dedent`
		import { act } from '@testing-library/react'
		test('test', async () => {
			await expect(act(someAsyncScopeFromExternal)).rejects.toThrow()
		})
	`;

	await expect(applyTransform(code)).toEqual(code);
});

test("only calls are codemodded", async () => {
	await expect(
		applyTransform(`
			import { act } from '@testing-library/react'
			test('test', async() => {
				act()
				// don't await this assignment
				const myAct = act
			})
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from '@testing-library/react'
		test('test', async() => {
			await act()
			// don't await this assignment
			const myAct = act
		})"
	`);
});

test.failing("reassignment is not tracked", async () => {
	await expect(
		applyTransform(`
			import { act } from '@testing-library/react'
			
			const myAct = act
			test('test', () => {
				myAct()
			})
		`)
	).toEqual(dedent`
		import { act } from '@testing-library/react'
				
		const myAct = act
		test('test', async () => {
			await myAct()
		})
	`);
});

test("does not add await to calls receiving newly async function as an argument", async () => {
	await expect(
		applyTransform(`
			import { act } from 'react-dom/test-utils';
			function runTests(test) {
				function render(source) {
					act(() => {});
				}
				render()
				test(render);
			}
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act } from 'react-dom/test-utils';
		async function runTests(test) {
			async function render(source) {
				await act(() => {});
			}
			await render()
			test(render);
		}"
	`);
});

test("export newly async warns (separate export statement)", async () => {
	jest.spyOn(console, "warn").mockImplementation(() => {});

	await expect(
		applyTransform(`
			import { act as domAct } from 'react-dom/test-utils';
			const act = scope => {
				domAct(scope)
			}
			export default act
			export { act, act as unstable_act, act as 'literal_act' }
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act as domAct } from 'react-dom/test-utils';
		const act = async scope => {
			await domAct(scope)
		}
		export default act
		export { act, act as unstable_act, act as 'literal_act' }"
	`);
	await expect(console.warn.mock.calls).toEqual([
		[expect.stringContaining("test.tsx: Default export is now async.")],
		[expect.stringContaining("test.tsx: Export 'act' is now async.")],
		[expect.stringContaining("test.tsx: Export 'unstable_act' is now async.")],
		[expect.stringContaining("test.tsx: Export 'literal_act' is now async.")],
	]);
});

test("export newly async warns", async () => {
	jest.spyOn(console, "warn").mockImplementation(() => {});

	await expect(
		applyTransform(`
			import { act as domAct } from 'react-dom/test-utils';
			export const act = scope => {
				domAct(scope)
			}
			export function unstable_act(scope) {
				domAct(scope)
			}
			export default function default_act(scope) {
				domAct(scope)
			}
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act as domAct } from 'react-dom/test-utils';
		export const act = async scope => {
			await domAct(scope)
		}
		export async function unstable_act(scope) {
			await domAct(scope)
		}
		export default async function default_act(scope) {
			await domAct(scope)
		}"
	`);
	await expect(console.warn.mock.calls).toEqual([
		[expect.stringContaining("test.tsx: Export 'act' is now async.")],
		[expect.stringContaining("test.tsx: Export 'unstable_act' is now async.")],
		[expect.stringContaining("test.tsx: Default export is now async.")],
	]);
});

test("export newly async reassignment does not warn", async () => {
	jest.spyOn(console, "warn").mockImplementation(() => {});

	await expect(
		applyTransform(`
			import { act as domAct } from 'react-dom/test-utils';
			// We only track CallExpressions :(
			export const act = domAct;
		`)
	).resolves.toMatchInlineSnapshot(`
		"import { act as domAct } from 'react-dom/test-utils';
		// We only track CallExpressions :(
		export const act = domAct;"
	`);
	await expect(console.warn.mock.calls).toEqual([]);
});

test("import config with default export", async () => {
	await expect(
		applyTransform(
			`
			import render from '../render';
			test('works', () => {
				render(null)
			})
		`,
			{ importConfigSource: "import render from '../render'" }
		)
	).resolves.toMatchInlineSnapshot(`
		"import render from '../render';
		test('works', async () => {
			await render(null)
		})"
	`);
});

test("React Component syntax", async () => {
	await expect(
		applyTransform(
			`
			import { render } from "@testing-library/react"
			test("void works", () => {
				component Foo() {
					return <div />
				}
				render(<Foo />)
			})
		`
		)
	).resolves.toMatchInlineSnapshot(`
		"import { render } from "@testing-library/react"
		test("void works", async () => {
			component Foo() {
				return <div />
			}
			await render(<Foo />)
		})"
	`);
});
