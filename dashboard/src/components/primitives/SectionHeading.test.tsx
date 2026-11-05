import { render, screen } from "@testing-library/react";
import { SectionHeading } from "@/components/primitives/SectionHeading";

describe("SectionHeading", () => {
	/** A screen labels a `<section>` with it, so it has to carry the id that names one. */
	it("becomes a heading that a section can point at", () => {
		render(
			<section aria-labelledby="servers-heading">
				<SectionHeading as="h2" id="servers-heading">
					Servers
				</SectionHeading>
			</section>,
		);

		expect(screen.getByRole("heading", { level: 2, name: "Servers" })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: "Servers" })).toBeInTheDocument();
	});
});
