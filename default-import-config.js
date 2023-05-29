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
import {
	act as act3,
	cleanup as cleanup3,
	/**
	 * @includeMemberCalls
	 * e.g. fireEvent.click()
	 */
	fireEvent as fireEvent3,
	render as render3,
	renderHook as renderHook3,
} from "@testing-library/react-native";
import {
	act as act4,
	cleanup as cleanup4,
	/**
	 * @includeMemberCalls
	 * e.g. fireEvent.click()
	 */
	fireEvent as fireEvent4,
	render as render4,
	renderHook as renderHook4,
} from "@testing-library/react-native/pure";
import { unstable_act } from "react";
import { act as ReactTestUtilsAct } from "react-dom/test-utils";
import { act as ReactTestRendererAct } from "react-test-renderer";
