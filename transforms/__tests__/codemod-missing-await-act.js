const { afterEach, expect, jest, test } = require("@jest/globals");
const { default: dedent } = require("dedent");
const fs = require("fs/promises");
const JscodeshiftTestUtils = require("jscodeshift/dist/testUtils");
const os = require("os");
const path = require("path");
const codemodMissingAwaitTransform = require("../codemod-missing-await-act");

async function applyTransform(source, options = {}) {
	const transformOptions = {
		escapedBindingsPath: await fs.mkdtemp(
			path.join(
				os.tmpdir(),
				"codemod-missing-await-act-tests-escaped-bindings",
			),
		),
		importConfig: path.resolve(
			__dirname,
			"../../config/default-import-config.json",
		),
		...options,
	};
	const { importConfigSource } = options;
	if (importConfigSource !== undefined) {
		const importConfigPath = path.join(
			os.tmpdir(),
			"codemod-missing-await-act/fixtures/import-config.js",
		);
		await fs.mkdir(path.dirname(importConfigPath), { recursive: true });
		await fs.writeFile(importConfigPath, importConfigSource);
		transformOptions.importConfig = importConfigPath;
	}

	return JscodeshiftTestUtils.applyTransform(
		codemodMissingAwaitTransform,
		transformOptions,
		{
			path: "test.tsx",
			source: /^\s/.test(source) ? dedent(source) : source,
		},
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
		`),
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
		`),
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
	`),
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
		`),
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
		`),
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
		`),
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
		
		`),
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
		
		`),
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
		
		`),
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

			test('testB', () => {
				React.act()
			})
		`),
	).resolves.toMatchInlineSnapshot(`
		"import * as React from 'react'

		test('test', async () => {
			await React.unstable_act()
		})

		test('testB', async () => {
			await React.act()
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
		`),
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
		`),
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
		`),
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

	await expect(applyTransform(code)).resolves.toEqual(code);
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
		`),
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
		`),
	).resolves.toEqual(`
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
		`),
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

test("export newly async persists (separate export statement)", async () => {
	const escapedBindingsPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "codemod-missing-await-act-tests-escaped-bindings"),
	);

	await expect(
		applyTransform(
			`
			import { act as domAct } from 'react-dom/test-utils';
			const act = scope => {
				domAct(scope)
			}
			export default act
			export { act, act as unstable_act, act as 'literal_act' }
		`,
			{ escapedBindingsPath },
		),
	).resolves.toMatchInlineSnapshot(`
		"import { act as domAct } from 'react-dom/test-utils';
		const act = async scope => {
			await domAct(scope)
		}
		export default act
		export { act, act as unstable_act, act as 'literal_act' }"
	`);
	const escapedBindingsFiles = await fs.readdir(escapedBindingsPath);
	expect(escapedBindingsFiles).toHaveLength(1);
	await expect(
		fs
			.readFile(
				path.join(escapedBindingsPath, escapedBindingsFiles[0]),
				"utf-8",
			)
			.then((json) => JSON.parse(json)),
	).resolves.toEqual({
		escapedBindings: ["default", "act", "unstable_act", "literal_act"],
		escapedFactoryBindings: [],
		filePath: expect.any(String),
	});
});

test("export newly async warns", async () => {
	const escapedBindingsPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "codemod-missing-await-act-tests-escaped-bindings"),
	);

	await expect(
		applyTransform(
			`
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
		`,
			{ escapedBindingsPath },
		),
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
	const escapedBindingsFiles = await fs.readdir(escapedBindingsPath);
	expect(escapedBindingsFiles).toHaveLength(1);
	await expect(
		fs
			.readFile(
				path.join(escapedBindingsPath, escapedBindingsFiles[0]),
				"utf-8",
			)
			.then((json) => JSON.parse(json)),
	).resolves.toEqual({
		escapedBindings: ["act", "unstable_act", "default"],
		escapedFactoryBindings: [],
		filePath: expect.any(String),
	});
});

test("export newly async reassignment does not warn", async () => {
	jest.spyOn(console, "warn").mockImplementation(() => {});

	await expect(
		applyTransform(`
			import { act as domAct } from 'react-dom/test-utils';
			// We only track CallExpressions :(
			export const act = domAct;
		`),
	).resolves.toMatchInlineSnapshot(`
		"import { act as domAct } from 'react-dom/test-utils';
		// We only track CallExpressions :(
		export const act = domAct;"
	`);
	await expect(console.warn.mock.calls).toEqual([]);
});

test("import config with default export", async () => {
	expect(
		await applyTransform(
			`
			import render from '../render';
			import alsoRender from '../render';
			import notRender from '../renderNot';
			test('works', () => {
				render(null)
				alsoRender(null)
				notRender(null)
			})
		`,
			{
				importConfigSource: JSON.stringify({
					version: 1,
					imports: [{ sources: "../render", specifiers: ["default"] }],
				}),
			},
		),
	).toMatchInlineSnapshot(`
		"import render from '../render';
		import alsoRender from '../render';
		import notRender from '../renderNot';
		test('works', async () => {
			await render(null)
			await alsoRender(null)
			notRender(null)
		})"
	`);
});

test("missing scope await", async () => {
	const escapedBindingsPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "codemod-missing-await-act-tests-escaped-bindings"),
	);

	const code = dedent`
		import { act } from "@testing-library/react";
		export function typedNewlyAsync(
			scope: () => void | Promise<void>,
		): Promise<void> {
			// Not analyzeable if it always was async without type information.
			return act(scope);
		}
		export function untypedNewlyAsync(scope) {
			// Not analyzeable if it always was async.
			return act(scope);
		}
		export function alwaysAsync(scope) {
			// We know "alwaysAsync" was async all along.
			// Could be confusing to mark this as escaped but also doesn't hurt to check.
			return act(async () => {
				scope();
			});
		}
	`;
	await expect(applyTransform(code, { escapedBindingsPath })).resolves.toEqual(
		code,
	);
	const escapedBindingsFiles = await fs.readdir(escapedBindingsPath);
	expect(escapedBindingsFiles).toHaveLength(1);
	await expect(
		fs
			.readFile(
				path.join(escapedBindingsPath, escapedBindingsFiles[0]),
				"utf-8",
			)
			.then((json) => JSON.parse(json)),
	).resolves.toEqual({
		escapedBindings: ["typedNewlyAsync", "untypedNewlyAsync", "alwaysAsync"],
		escapedFactoryBindings: [],
		filePath: expect.any(String),
	});
});

// FIXME: `take` is almost certainly now `async`
test("async callback as argument turns callee async", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			test('test', () => {
				take(() => {
					act()
				})
			})
		`),
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		test('test', () => {
			take(async () => {
				await act()
			})
		})"
	`);
});

// FIXME: Should turn expect().* into expect().resolves.*
test("expect().toThrow() to async matchers", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			test('sync', () => {
				expect(() => {
					act()
					return 1
				}).toEqual(1)
			})
			test('async', async () => {
				await expect(async () => {
					await null
					act()
					return true
				}).resolves.toEqual(true)
			})
		`),
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		test('sync', () => {
			expect(async () => {
				await act()
				return 1
			}).toEqual(1)
		})
		test('async', async () => {
			await expect(async () => {
				await null
				await act()
				return true
			}).resolves.toEqual(true)
		})"
	`);
});

// FIXME: Should turn expect().toThrow() into expect().rejects.toThrow()
test("expect().toThrow() to async matchers", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			test('sync', () => {
				expect(() => {
					act()	
				}).toThrow()
			})
			test('async', async () => {
				await expect(async () => {
					await null
					act()
					return true
				}).rejects.toThrow()
			})
		`),
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		test('sync', () => {
			expect(async () => {
				await act()	
			}).toThrow()
		})
		test('async', async () => {
			await expect(async () => {
				await null
				await act()
				return true
			}).rejects.toThrow()
		})"
	`);
});

// FIXME: Should turn expect().not.toThrow() into expect().not.rejects.toThrow()
test("expect().not.toThrow() to async matchers", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			test('sync', () => {
				expect(() => {
					act()	
				}).not.toThrow()
			})
			test('async', async () => {
				await expect(async () => {
					act()	
				}).not.rejects.toThrow()
			})
		`),
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		test('sync', () => {
			expect(async () => {
				await act()	
			}).not.toThrow()
		})
		test('async', async () => {
			await expect(async () => {
				await act()	
			}).not.rejects.toThrow()
		})"
	`);
});

// FIXME: Should wrapp returntype in Promise
test("adds Promise type", async () => {
	await expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			function render(): void {
				act()
			}
		`),
	).resolves.toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		async function render(): void {
			await act()
		}"
	`);
});

// FIXME: Should not turn Effect async
test("rerender in effect", async () => {
	await expect(
		applyTransform(`
			function Component() {
				const [, rerender] = useReducer(() => 1, 0)
				useEffect(() => {
					rerender()	
				}, [])
			}
		`),
	).resolves.toMatchInlineSnapshot(`
		"function Component() {
			const [, rerender] = useReducer(() => 1, 0)
			useEffect(async () => {
				await rerender()	
			}, [])
		}"
	`);
});

// FIXME: Should be newly async
test("bound rerender", async () => {
	await expect(
		applyTransform(`
			import {render} from '@testing-library/react'

			test("bound render", () => {
				const view = render()
				view.rerender()
			})
		`),
	).resolves.toMatchInlineSnapshot(`
		"import {render} from '@testing-library/react'

		test("bound render", async () => {
			const view = await render()
			view.rerender()
		})"
	`);
});

test("return newly async function", async () => {
	const escapedBindingsPath = await fs.mkdtemp(
		path.join(
			os.tmpdir(),
			"codemod-missing-await-act-tests-newly-async-factory-return",
		),
	);
	const code = `
		import * as React from 'react'

		export function createAct() {
			return () => {
				React.act()
			}
		}
		
		export const act = createAct();
		export { act as actAlias, createAct as createActAlias }
		export default act;

		test('test', () => {
			act()	
		})
	`;

	const result = await applyTransform(code, { escapedBindingsPath });

	expect(result).toMatchInlineSnapshot(`
		"import * as React from 'react'

		export function createAct() {
			return async () => {
				await React.act()
			};
		}

		export const act = createAct();
		export { act as actAlias, createAct as createActAlias }
		export default act;

		test('test', async () => {
			await act()	
		})"
	`);
	const escapedBindingsFiles = await fs.readdir(escapedBindingsPath);
	expect(escapedBindingsFiles).toHaveLength(1);
	await expect(
		fs
			.readFile(
				path.join(escapedBindingsPath, escapedBindingsFiles[0]),
				"utf-8",
			)
			.then((json) => JSON.parse(json)),
	).resolves.toEqual({
		escapedBindings: ["act", "actAlias", "default"],
		escapedFactoryBindings: ["createAct", "createActAlias"],
		filePath: expect.any(String),
	});
});

test("asyncFunctionFactory", async () => {
	const escapedBindingsPath = await fs.mkdtemp(
		path.join(os.tmpdir(), "codemod-missing-await-act-asyncFunctionFactory"),
	);
	const importConfig = {
		imports: [
			{
				sources: ["@acme/test-utils"],
				specifiers: [{ imported: "makeRender", asyncFunctionFactory: true }],
			},
		],
	};
	const importConfigPath = path.join(
		await fs.mkdtemp(
			path.join(os.tmpdir(), "codemod-missing-await-act-asyncFunctionFactory"),
		),
		"import-config.json",
	);
	await fs.writeFile(importConfigPath, JSON.stringify(importConfig, 2, null));
	const code = `
		import {makeRender} from '@acme/test-utils'

		const render = makeRender()
		test('test', () => {
			render()
		})

		export const makeRenderAliased = makeRender;
		export { makeRender as makeRenderAs, render }
		export default makeRender;
	`;

	const result = await applyTransform(code, {
		escapedBindingsPath,
		importConfig: importConfigPath,
	});

	expect(result).toMatchInlineSnapshot(`
		"import {makeRender} from '@acme/test-utils'

		const render = makeRender()
		test('test', async () => {
			await render()
		})

		export const makeRenderAliased = makeRender;
		export { makeRender as makeRenderAs, render }
		export default makeRender;"
	`);
	const escapedBindingsFiles = await fs.readdir(escapedBindingsPath);
	expect(escapedBindingsFiles).toHaveLength(1);
	await expect(
		fs
			.readFile(
				path.join(escapedBindingsPath, escapedBindingsFiles[0]),
				"utf-8",
			)
			.then((json) => JSON.parse(json)),
	).resolves.toEqual({
		escapedBindings: ["render"],
		escapedFactoryBindings: [],
		// TODO: re-export not tracked
		// escapedFactoryBindings: ["makeRenderAliased", "makeRenderAs", "default"],
		filePath: expect.any(String),
	});
});
