import { type ChannelSummary } from "@testify/shared";
import { render, screen } from "@testing-library/react";
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
	/** Nothing is posted in a voice channel or a category, so one the bot cannot post in is still a choice. */
	it("never disables a channel for being one the bot cannot post in", () => {
		renderPicker("category", null);

		expect(screen.getByRole("option", { name: "Support" })).toBeEnabled();
	});

	/** Without its own option a deleted channel would read as the first one offered. */
	it("names a channel that has been deleted rather than showing another", () => {
		renderPicker("voice", "400000000000000009");

		expect(picker().selectedOptions[0]?.textContent).toBe("A channel that no longer exists");
		expect(screen.getByText(/has been deleted/i)).toBeInTheDocument();
	});
});
