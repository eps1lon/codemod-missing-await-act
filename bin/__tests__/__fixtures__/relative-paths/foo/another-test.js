import { render } from "../utils.js";

test("should render", () => {
	render();
});

function test(description, fn) {
	fn();
}
