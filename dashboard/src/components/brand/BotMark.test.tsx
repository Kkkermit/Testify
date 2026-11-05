import { fireEvent, render, screen } from "@testing-library/react";
import { BotBanner } from "@/components/brand/BotBanner";
import { BotMark } from "@/components/brand/BotMark";

describe("BotMark", () => {
	/** The bot's face is never swapped for a built-in mark: a fork's sign-in screen must not wear another bot's logo. */
	it("shows the bot's initial, never a built-in mark, while there is no picture yet", () => {
		const { container } = render(<BotMark src={undefined} name="Fixxer2.0" />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("svg")).toBeNull();
		expect(container).toHaveTextContent("F");
	});

	/** Discord's CDN being unreachable must cost the picture, not leave a broken image icon in the sidebar. */
	it("falls back to the initial when the picture fails to load, and tries a new picture again", () => {
		const { container, rerender } = render(
			<BotMark src="https://cdn.discordapp.com/avatars/1/gone.png" name="Fixxer" />,
		);

		fireEvent.error(container.querySelector("img")!);
		expect(container.querySelector("img")).toBeNull();
		expect(container).toHaveTextContent("F");

		rerender(<BotMark src="https://cdn.discordapp.com/avatars/1/new.png" name="Fixxer" />);
		expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.discordapp.com/avatars/1/new.png");
	});

	it("is decorative, so it never doubles the name beside it", () => {
		render(
			<span>
				<BotMark src="https://cdn.discordapp.com/avatars/1/abc.png" name="Fixxer" />
				Fixxer
			</span>,
		);

		expect(screen.queryByRole("img")).toBeNull();
	});
});

describe("BotBanner", () => {
	/** Most bots have no banner, so the wash is the common case. */
	it("renders a wash rather than an empty box when there is none", () => {
		const { container } = render(<BotBanner src={null} accent={null} />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.firstChild).toHaveClass("bg-accent-wash");
	});

	it("uses the profile accent when Discord gives one", () => {
		const { container } = render(<BotBanner src={null} accent="#7c3aed" />);
		expect(container.firstChild).toHaveStyle({ backgroundColor: "#7c3aed" });
	});

	it("drops back to the wash if the banner fails to load", () => {
		const { container } = render(<BotBanner src="https://cdn.discordapp.com/banners/1/gone.png" accent={null} />);

		fireEvent.error(container.querySelector("img")!);

		expect(container.querySelector("img")).toBeNull();
	});
});
