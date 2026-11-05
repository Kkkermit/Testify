import { render, screen } from "@testing-library/react";
import { Field } from "@/components/form/Field";
import { SettingRows } from "@/components/form/SettingRows";
import { Toggle } from "@/components/form/Toggle";
import { expectNoViolations } from "@/test/axe";

describe("SettingRows", () => {
	/** A row moves the words into their own column, which must not cost a control its name. */
	it("keeps every control named and the panel labelled by its heading", async () => {
		const { container } = render(
			<SettingRows title="Board" description="Where starred messages go.">
				<Toggle label="Starboard on" hint="Reposts starred messages." checked onChange={() => undefined} />
				<Field label="Stars needed" htmlFor="stars">
					<input id="stars" defaultValue="3" />
				</Field>
				<Field label="Wrapped">
					<input defaultValue="x" />
				</Field>
			</SettingRows>,
		);

		expect(screen.getByRole("region", { name: "Board" })).toBeInTheDocument();
		expect(screen.getByRole("switch", { name: /starboard on/i })).toBeChecked();
		expect(screen.getByRole("textbox", { name: "Stars needed" })).toHaveValue("3");
		expect(screen.getByRole("textbox", { name: "Wrapped" })).toHaveValue("x");
		await expectNoViolations(container);
	});
});
