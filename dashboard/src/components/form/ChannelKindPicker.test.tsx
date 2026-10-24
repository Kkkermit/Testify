import { type ChannelSummary } from "@testify/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelKindPicker } from "@/components/form/ChannelKindPicker";

const CHANNELS: ChannelSummary[] = [
	{ id: "400000000000000001", name: "general", kind: "text", position: 1, canSend: true },
	{ id: "400000000000000003", name: "Lounge", kind: "voice", position: 2, canSend: false },
	{ id: "400000000000000005", name: "Support", kind: "category", position: 3, canSend: false },
];

function renderPicker(kind: "voice" | "category", value: string | null, onChange = jest.fn()): jest.Mock {
	render(
		<ChannelKindPicker
			kind={kind}
			label="Lobby"
			noneLabel="Nothing chosen"
			channels={CHANNELS}
			value={value}
			onChange={onChange}
		/>,
	);
	return onChange;
}

function picker(): HTMLSelectElement {
	return screen.getByRole("combobox", { name: /Lobby/ });
}

describe("ChannelKindPicker", () => {
	it("offers only the kind it was asked for", () => {
		renderPicker("voice", null);

		const names = within(picker())
			.getAllByRole("option")
			.map((option) => option.textContent);
		expect(names).toEqual(["Nothing chosen", "Lounge"]);
	});

	/** Nothing is posted in a voice channel or a category, so one the bot cannot post in is still a choice. */
	it("never disables a channel for being one the bot cannot post in", () => {
		renderPicker("category", null);

		expect(screen.getByRole("option", { name: "Support" })).toBeEnabled();
	});

	it("reports the choice, and none as null", async () => {
		const user = userEvent.setup();
		const onChange = renderPicker("voice", "400000000000000003");

		await user.selectOptions(picker(), "");

		expect(onChange).toHaveBeenCalledWith(null);
	});

	/** Without its own option a deleted channel would read as the first one offered. */
	it("names a channel that has been deleted rather than showing another", () => {
		renderPicker("voice", "400000000000000009");

		expect(picker().selectedOptions[0]?.textContent).toBe("A channel that no longer exists");
		expect(screen.getByText(/has been deleted/i)).toBeInTheDocument();
	});

	it("counts a channel of the wrong kind as gone", () => {
		renderPicker("voice", "400000000000000001");

		expect(picker().selectedOptions[0]?.textContent).toBe("A channel that no longer exists");
	});
});
