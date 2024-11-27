import { render } from "./utils";

test("should render", () => {
	render();
});

function test(description, fn) {
	fn();
}
