import { render as rtlRender } from "@testing-library/react";

export function render() {
	rtlRender();
}

export function makeRender() {
	return () => {
		render();
	};
}
