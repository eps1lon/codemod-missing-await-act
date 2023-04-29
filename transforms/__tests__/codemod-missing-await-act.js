const { expect, test } = require("@jest/globals");
const { default: dedent } = require("dedent-tabs");
const JscodeshiftTestUtils = require("jscodeshift/dist/testUtils");
const codemodMissingAwaitTransform = require("../codemod-missing-await-act");

function applyTransform(source, options = {}) {
	return JscodeshiftTestUtils.applyTransform(
		codemodMissingAwaitTransform,
		options,
		{
			path: "test.ts",
			source: dedent(source),
		}
	);
}

test("act in test", () => {
	expect(
		applyTransform(`
			test("void works", () => {
				act()
			})
			test("return works", () => {
				return act()
			})
		`)
	).toMatchInlineSnapshot(`
		"test("void works", async () => {
			await act()
		})
		test("return works", () => {
			return act()
		})"
	`);
});

test("act in utils #1", () => {
	expect(
		applyTransform(`
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
		"function caseA() {
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
		"async function caseA() {
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
		"const caseA = async () => {
			await act()
		}

		const caseB = () => caseA()

		async function caseC() {
			const test = await caseB()
			
			return test
		}"
	`);
});
