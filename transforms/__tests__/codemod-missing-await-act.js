const { expect, test } = require("@jest/globals");
const { default: dedent } = require("dedent-tabs");
const JscodeshiftTestUtils = require("jscodeshift/dist/testUtils");
const codemodMissingAwaitTransform = require("../codemod-missing-await-act");

function applyTransform(source, options = {}) {
	return JscodeshiftTestUtils.applyTransform(
		codemodMissingAwaitTransform,
		options,
		{
			path: "test.tsx",
			source: dedent(source),
		}
	);
}

test("act in test", () => {
	expect(
		applyTransform(`
			import { act } from "@testing-library/react"
			test("void works", () => {
				act()
			})
			test("return works", () => {
				return act()
			})
		`)
	).toMatchInlineSnapshot(`
		"import { act } from "@testing-library/react"
		test("void works", async () => {
			await act()
		})
		test("return works", () => {
			return act()
		})"
	`);
});

test("local act untouched", () => {
	expect(
		applyTransform(`
			function act() {}
			test("void works", () => {
				act()
			})
	`)
	).toMatchInlineSnapshot(`
		"function act() {}
		test("void works", () => {
			act()
		})"
	`);
});

test("act in utils #1", () => {
	expect(
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
	).toMatchInlineSnapshot(`
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

test("act in utils #2", () => {
	expect(
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
	).toMatchInlineSnapshot(`
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

test("act in utils #3", () => {
	expect(
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
	).toMatchInlineSnapshot(`
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

test("React Testing Library api", () => {
	expect(
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
	).toMatchInlineSnapshot(`
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

test("React Testing Library api as namespace", () => {
	expect(
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
	).toMatchInlineSnapshot(`
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

test("react API", () => {
	expect(
		applyTransform(`
			import * as React from 'react'
			
			test('test', () => {
				React.unstable_act()
			})
		`)
	).toMatchInlineSnapshot(`
		"import * as React from 'react'

		test('test', async () => {
			await React.unstable_act()
		})"
	`);
});

test("react-test-renderer API", () => {
	expect(
		applyTransform(`
			import { act } from 'react-test-renderer'
			
			test('test', () => {
				act()
			})
		`)
	).toMatchInlineSnapshot(`
		"import { act } from 'react-test-renderer'

		test('test', async () => {
			await act()
		})"
	`);
});

test("react-dom API", () => {
	expect(
		applyTransform(`
			import { act } from 'react-dom/test-utils'
			import { flushSync } from 'react-dom'
			
			test('test', () => {
				act()
				flushSync()
			})
		`)
	).toMatchInlineSnapshot(`
		"import { act } from 'react-dom/test-utils'
		import { flushSync } from 'react-dom'

		test('test', async () => {
			await act()
			flushSync()
		})"
	`);
});
