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
import { unstable_act } from "react";
import { act as act3 } from "react-dom/test-utils";
import { act as act4 } from "react-test-renderer";
