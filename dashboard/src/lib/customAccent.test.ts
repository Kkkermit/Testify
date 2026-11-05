import { readHex } from "@/lib/colour";
import { customAccent } from "@/lib/customAccent";

/** The colour somebody chose is what they get wherever it is already legible; only a theme that needs it moves. */
it("keeps a colour that already sits in its band, and moves it only where a theme needs it", () => {
	const indigo = readHex("#4338ca")!;
	const { light, dark } = customAccent(indigo);

	expect([light.primary, light.accent]).toEqual(["#4338ca", "#4338ca"]);
	expect(dark.primary).not.toBe("#4338ca");
	expect(dark.accent).not.toBe("#4338ca");
});
