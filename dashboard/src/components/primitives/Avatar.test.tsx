import { render } from "@testing-library/react";
import { Avatar } from "@/components/primitives/Avatar";

describe("Avatar", () => {
	/** Preflight caps an image at its container's width, so the sidebar's 18px icon slot squashed a 26px avatar. */
	it("keeps its own width inside a narrower container", () => {
		const { container } = render(<Avatar name="someone" url="https://cdn.discordapp.com/a.png" size={26} />);
		const image = container.querySelector("img");

		expect(image).toHaveClass("max-w-none", "object-cover", "shrink-0");
		expect(image).toHaveStyle({ width: "26px", height: "26px" });
	});

	it("letters the tile when there is no picture", () => {
		const { container } = render(<Avatar name="someone" url={null} />);

		expect(container.textContent).toBe("S");
	});
});
