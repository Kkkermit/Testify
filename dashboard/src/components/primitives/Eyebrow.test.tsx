import { render, screen } from "@testing-library/react";
import { Eyebrow } from "@/components/primitives/Eyebrow";

describe("Eyebrow", () => {
	it("is not a heading unless it is asked to be", () => {
		render(<Eyebrow>Servers</Eyebrow>);
		expect(screen.queryByRole("heading")).toBeNull();
	});

	/** Nine screens used it to label a `<section>`, so it has to be able to carry the id that names one. */
	it("becomes a heading that a section can point at", () => {
		render(
			<section aria-labelledby="servers-heading">
				<Eyebrow as="h2" id="servers-heading">
					Servers
				</Eyebrow>
			</section>,
		);

		expect(screen.getByRole("heading", { level: 2, name: "Servers" })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: "Servers" })).toBeInTheDocument();
	});
});
