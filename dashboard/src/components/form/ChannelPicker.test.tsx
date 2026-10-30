import { type ChannelSummary } from "@testify/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelPicker } from "@/components/form/ChannelPicker";

const CHANNELS: ChannelSummary[] = [
	{ id: "400000000000000001", name: "general", kind: "text", position: 1, canSend: true },
	{ id: "400000000000000002", name: "locked", kind: "text", position: 2, canSend: false },
	{ id: "400000000000000003", name: null, kind: "text", position: 3, canSend: true },
];

function renderPicker(value: string | null, onChange = jest.fn()): jest.Mock {
	render(<ChannelPicker label="Post to" channels={CHANNELS} value={value} allowNone={false} onChange={onChange} />);
	return onChange;
}

function picker(): HTMLSelectElement {
	return screen.getByRole("combobox", { name: /Post to/ });
}

describe("ChannelPicker", () => {
	/** With no matching option a browser shows the first channel as chosen, while nothing is saved and choosing it does nothing. */
	it("shows nothing as chosen when nothing is, even when a choice is required", () => {
		renderPicker(null);

		expect(picker().selectedOptions[0]?.textContent).toBe("Choose a channel");
		expect(picker().value).toBe("");
	});

	it("counts the first channel as a choice when it is picked", async () => {
		const user = userEvent.setup();
		const onChange = renderPicker(null);

		await user.selectOptions(picker(), "400000000000000001");

		expect(onChange).toHaveBeenCalledWith("400000000000000001");
	});

	it("shows the saved channel as chosen", () => {
		renderPicker("400000000000000001");

		expect(picker().selectedOptions[0]?.textContent).toBe("#general");
	});

	it("says so when the saved channel has been deleted, rather than showing another one", () => {
		renderPicker("400000000000000009");

		expect(picker().selectedOptions[0]?.textContent).toBe("A channel that no longer exists");
		expect(screen.getByText(/has been deleted/)).toBeInTheDocument();
	});

	/** Discord never names a channel to somebody who cannot view it, and never offers it to them either. */
	it("neither names nor offers a channel the reader cannot see, and says why it cannot be changed", () => {
		renderPicker("400000000000000003");

		expect(picker().selectedOptions[0]?.textContent).toBe("A channel you can’t see");
		expect(screen.getByText(/only somebody who can may change it/)).toBeInTheDocument();
		expect(screen.queryByText(/no longer exists/)).not.toBeInTheDocument();
		expect([...picker().options].filter((option) => !option.disabled).map((option) => option.value)).toEqual([
			"400000000000000001",
		]);
	});

	it("warns when the bot cannot post in the saved channel", () => {
		renderPicker("400000000000000002");

		expect(
			screen.getByText("Testify cannot post in #locked. Give it Send Messages there, or pick another channel."),
		).toBeInTheDocument();
	});
});
