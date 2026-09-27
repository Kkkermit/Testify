import { fireEvent, render, screen } from "@testing-library/react";
import { BotBanner } from "@/components/brand/BotBanner";
import { BotMark } from "@/components/brand/BotMark";

describe("BotMark", () => {
	it("shows the bot's avatar when there is one", () => {
		const { container } = render(<BotMark src="https://cdn.discordapp.com/avatars/1/abc.png" />);
		expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.discordapp.com/avatars/1/abc.png");
	});

	/** The profile is fetched after first paint, so the mark has to render before it arrives. */
	it("falls back to the built-in mark while the profile is still loading", () => {
		const { container } = render(<BotMark src={undefined} />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("falls back when the bot has no avatar at all", () => {
		expect(render(<BotMark src={null} />).container.querySelector("svg")).toBeInTheDocument();
	});

	/** Discord's CDN being unreachable must cost the mark, not leave a broken image icon in the sidebar. */
	it("falls back when the image fails to load", () => {
		const { container } = render(<BotMark src="https://cdn.discordapp.com/avatars/1/gone.png" />);

		fireEvent.error(container.querySelector("img")!);

		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("is decorative, so it never doubles the name beside it", () => {
		render(
			<span>
				<BotMark src="https://cdn.discordapp.com/avatars/1/abc.png" />
				Testify
			</span>,
		);

		expect(screen.getByText("Testify")).toHaveTextContent("Testify");
		expect(screen.queryByRole("img")).toBeNull();
	});
});

describe("BotBanner", () => {
	it("shows the banner when the application has one", () => {
		const { container } = render(<BotBanner src="https://cdn.discordapp.com/banners/1/def.png" accent={null} />);
		expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.discordapp.com/banners/1/def.png");
	});

	/** Most bots have no banner, so the wash is the common case. */
	it("renders a wash rather than an empty box when there is none", () => {
		const { container } = render(<BotBanner src={null} accent={null} />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.firstChild).toHaveClass("bg-gradient-to-br");
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

	it("is decorative and hidden from assistive technology", () => {
		const { container } = render(<BotBanner src={null} accent={null} />);
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
	});
});
