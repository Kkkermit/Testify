import { screen } from "@testing-library/react";
import { PRIVACY, TERMS } from "@/features/legal/legal.content";
import { LegalPage } from "@/features/legal/LegalPage";
import { expectNoViolations } from "@/test/axe";
import { renderWithProviders } from "@/test/renderWithProviders";

describe("the legal pages", () => {
	it.each([
		["terms", TERMS],
		["privacy", PRIVACY],
	])("renders every section of the %s", (path, document) => {
		renderWithProviders(<LegalPage document={document} />, { path: `/${path}` });

		expect(screen.getByRole("heading", { level: 1, name: document.title })).toBeInTheDocument();
		for (const section of document.sections) {
			expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeInTheDocument();
		}
	});

	/** The claims the code has to keep true, so a change that breaks one breaks a test. */
	it("says what the code actually does", () => {
		const text = PRIVACY.sections.flatMap((section) => [...section.paragraphs, ...(section.list ?? [])]).join(" ");

		expect(text).toMatch(/does not read or keep your message history/i);
		expect(text).toMatch(/No user ids are stored/i);
		expect(text).toMatch(/90 days/);
		expect(text).toMatch(/encrypted at rest/i);
		// Screen counts carry neither, which is the whole reason they are safe to keep.
		expect(text).toMatch(/no user id and no server id is stored/i);
		expect(text).toMatch(/IP address is not stored/i);
	});

	it("offers a way back to the dashboard", () => {
		renderWithProviders(<LegalPage document={TERMS} />, { path: "/terms" });

		expect(screen.getByRole("link", { name: /back to the dashboard/i })).toHaveAttribute("href", "/guilds");
	});

	it("has no automatically detectable accessibility violations", async () => {
		const { container } = renderWithProviders(<LegalPage document={PRIVACY} />, { path: "/privacy" });

		await expectNoViolations(container);
	});
});

describe("where the legal pages sit", () => {
	/** Somebody deciding whether to add the bot has to be able to read these before signing in. */
	it("is outside the sign-in gate", async () => {
		const { routes } = await import("@/routes");
		const paths = routes.map((route) => ("path" in route ? route.path : undefined));

		expect(paths).toContain("/terms");
		expect(paths).toContain("/privacy");
	});
});
