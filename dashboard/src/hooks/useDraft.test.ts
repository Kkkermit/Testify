import { act, renderHook } from "@testing-library/react";
import { useDraft } from "@/hooks/useDraft";

interface Limits {
	min: string;
	max: string;
}

describe("useDraft", () => {
	it("shows the saved value until it is edited, and nothing before it has loaded", () => {
		const { result, rerender } = renderHook(({ saved }: { saved: Limits | undefined }) => useDraft(saved), {
			initialProps: { saved: undefined as Limits | undefined },
		});
		expect(result.current[0]).toBeUndefined();

		act(() => {
			result.current[1]({ min: "1", max: "" });
		});
		expect(result.current[0]).toBeUndefined();

		rerender({ saved: { min: "10", max: "" } });
		expect(result.current[0]).toEqual({ min: "10", max: "" });
	});

	/** The casino's game switches answer with the whole settings, which once wiped the bet limits being typed. */
	it("keeps an edit when the saved value comes back unchanged as a new object", () => {
		const { result, rerender } = renderHook(({ saved }: { saved: Limits }) => useDraft(saved), {
			initialProps: { saved: { min: "10", max: "" } },
		});

		act(() => {
			result.current[1]((was) => ({ ...was, min: "25" }));
		});
		rerender({ saved: { min: "10", max: "" } });

		expect(result.current[0]).toEqual({ min: "25", max: "" });
	});

	it("drops the edit once the saved value itself changes", () => {
		const { result, rerender } = renderHook(({ saved }: { saved: Limits }) => useDraft(saved), {
			initialProps: { saved: { min: "10", max: "" } },
		});

		act(() => {
			result.current[1]({ min: "25", max: "" });
		});
		rerender({ saved: { min: "50", max: "" } });

		expect(result.current[0]).toEqual({ min: "50", max: "" });
	});
});
