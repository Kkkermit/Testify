import { type RunsBody } from "@testify/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import { idFromLookup, narrowed, runWhat } from "@/features/owner/usage/runs.utils";
import { i18next } from "@/i18n";
import { expectNoViolations } from "@/test/axe";
import { runsPage } from "@/test/fixtures/usageSections";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const t = i18next.t.bind(i18next);
const PERSON = "100000000000000007";

function renderRuns() {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=usage&view=runs" });
}

/** Every request the log made, with where it went and what it carried. */
function watchRuns(): { url: string; body: RunsBody }[] {
	const sent: { url: string; body: RunsBody }[] = [];
	server.use(
		http.post("/api/analytics/runs", async ({ request }) => {
			sent.push({ url: request.url, body: (await request.json()) as RunsBody });
			return HttpResponse.json(runsPage);
		}),
	);
	return sent;
}

describe("the run log's rules", () => {
	it("looks somebody up only by an exact id", () => {
		expect(idFromLookup(` ${PERSON} `)).toBe(PERSON);
		for (const text of ["", "maple.fox", "1000000000", `<@${PERSON}>`, `${PERSON}0000`]) {
			expect(idFromLookup(text)).toBeNull();
		}
	});

	it("drops a filter that is cleared rather than sending it empty", () => {
		expect(narrowed({ userId: PERSON, command: "warn" }, { userId: null })).toEqual({ command: "warn" });
		expect(narrowed({}, { outcome: "failed", guildId: "" })).toEqual({ outcome: "failed" });
	});

	it("says what ran as somebody would type it", () => {
		expect(runWhat({ command: "warn", sub: "create", handler: null })).toBe("/warn create");
		expect(runWhat({ command: null, sub: null, handler: "shop:buy" })).toBe("shop:buy");
	});
});

describe("Who ran what", () => {
	/** A username is whatever its owner typed, so one shaped like markup is drawn as those characters. */
	it("lists each run with who, what, where and how it ended, drawing names as text", async () => {
		const { container } = renderRuns();

		const list = await screen.findByRole("list", { name: t("owner.runs.listLabel") });
		expect(within(list).getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
		expect(container.querySelector("img[src='x']")).toBeNull();
		expect(within(list).getByText("/warn create")).toBeInTheDocument();
		expect(within(list).getByText(t("owner.runs.directMessages"))).toBeInTheDocument();
		expect(within(list).getByText(t("owner.runs.unknownPerson"))).toBeInTheDocument();
		expect(within(list).getAllByText(t("owner.runs.error")).length).toBeGreaterThan(0);
		await expectNoViolations(container);
	});

	/** A person looked up must not land in an address, where history, a proxy or a shared link would keep them. */
	it("looks one person up by id in the request body, and never in an address", async () => {
		const sent = watchRuns();
		const view = renderRuns();
		await screen.findByRole("list", { name: t("owner.runs.listLabel") });

		await userEvent.type(screen.getByLabelText(t("owner.runs.person")), PERSON);
		await userEvent.click(screen.getByRole("button", { name: t("owner.runs.lookUp") }));

		expect(await screen.findByText(t("owner.runs.onlyPerson", { id: PERSON }))).toBeInTheDocument();
		const last = sent.at(-1);
		expect(last?.body.userId).toBe(PERSON);
		for (const { url } of sent) expect(url).not.toContain(PERSON);
		expect(view.search()).not.toContain(PERSON);
		expect(window.location.href).not.toContain(PERSON);
	});

	it("refuses anything but an exact id, and asks nothing for it", async () => {
		const sent = watchRuns();
		renderRuns();
		await screen.findByRole("list", { name: t("owner.runs.listLabel") });
		const before = sent.length;

		await userEvent.type(screen.getByLabelText(t("owner.runs.person")), "maple.fox");
		await userEvent.click(screen.getByRole("button", { name: t("owner.runs.lookUp") }));

		expect(await screen.findByText(t("owner.runs.notAnId"))).toBeInTheDocument();
		expect(sent).toHaveLength(before);
	});

	it("narrows to somebody from the busiest list, and pages back with the collector's own cursor", async () => {
		const sent = watchRuns();
		renderRuns();

		await userEvent.click(
			await screen.findByRole("button", { name: t("owner.runs.onlyRunsBy", { name: "maple.fox" }) }),
		);
		expect(sent.at(-1)?.body.userId).toBe("100000000000000002");

		await userEvent.click(await screen.findByRole("button", { name: t("owner.runs.older") }));
		expect(sent.at(-1)?.body.before).toBe(runsPage.next);
	});

	/** The log is read with its own key, so the reason it is missing names that key and not the read key. */
	it("says the activity key is missing rather than the read key", async () => {
		server.use(
			http.post("/api/analytics/runs", () =>
				HttpResponse.json({ error: { code: "analytics_off", message: "Off." } }, { status: 503 }),
			),
		);
		renderRuns();

		expect(await screen.findByText(t("owner.runs.off"))).toBeInTheDocument();
		expect(screen.queryByText(t("owner.analyticsOff"))).toBeNull();
	});
});

describe("the live numbers", () => {
	it("shows what the bot is doing this minute above the sections", async () => {
		renderRuns();

		expect(await screen.findByRole("heading", { name: t("owner.live.title") })).toBeInTheDocument();
		expect(screen.getByText(t("common.partOf", { part: 1, whole: 2 }))).toBeInTheDocument();
	});

	/** With Shardlens off the section below already says why, so a second notice would only repeat it. */
	it("says nothing while Shardlens is off", async () => {
		server.use(http.get("/api/analytics/live", () => HttpResponse.json({ numbers: null, problem: "off" })));
		renderRuns();
		await screen.findByRole("list", { name: t("owner.runs.listLabel") });

		expect(screen.queryByRole("heading", { name: t("owner.live.title") })).toBeNull();
		expect(screen.queryByText(t("owner.live.unavailable"))).toBeNull();
	});
});
