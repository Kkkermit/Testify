import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { OwnerPage } from "@/features/owner/OwnerPage";
import {
	chosenSteps,
	formatWait,
	heatLevel,
	isTranslated,
	labelOf,
	REFUSAL_LABELS,
	stepsFrom,
} from "@/features/owner/usage/usage.utils";
import { i18next } from "@/i18n";
import { expectNoViolations } from "@/test/axe";
import { reliability } from "@/test/fixtures/usageSections";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

const t = i18next.t.bind(i18next);

function renderView(view: string, extra = "") {
	return renderWithProviders(<OwnerPage />, { path: "/owner", route: `/owner?tab=usage&view=${view}${extra}` });
}

function refuse(path: string, code = "analytics_off"): void {
	server.use(
		http.get(`/api/analytics/${path}`, () =>
			HttpResponse.json({ error: { code, message: "Shardlens is off." } }, { status: 503 }),
		),
	);
}

describe("the usage sections' rules", () => {
	it("shades an hour by its share of the busiest, and an empty hour not at all", () => {
		expect(heatLevel(0, 10)).toBe(0);
		expect(heatLevel(1, 100)).toBe(1);
		expect(heatLevel(10, 10)).toBe(4);
		expect(heatLevel(5, 0)).toBe(0);
	});

	/** The address is typed into, so anything that could not be a command never reaches the API. */
	/** Picking the second step first once moved it into the first slot. */
	it("keeps each step in its slot, a blank or unknown one as empty, and at most five", () => {
		expect(stepsFrom(null)).toEqual([null, null]);
		expect(stepsFrom(",work")).toEqual([null, "work"]);
		expect(stepsFrom("ban,<script>,levelling, work ,a,b,c")).toEqual(["ban", null, "levelling", "work", "a"]);
	});

	it("follows the steps chosen so far once there are two of them", () => {
		expect(chosenSteps([null, "work"])).toBeNull();
		expect(chosenSteps(["ban", null, "warn"])).toEqual(["ban", "warn"]);
	});

	it("says whether a Discord language has one of the eight translations", () => {
		expect(isTranslated("de")).toBe(true);
		expect(isTranslated("en-GB")).toBe(true);
		expect(isTranslated("pt-BR")).toBe(false);
	});

	/** The API can ship a reason before the page knows it, and an unknown one reads as itself. */
	it("shows a reason it has no words for as the server sent it", () => {
		expect(labelOf(REFUSAL_LABELS, "cooldown", t)).toBe("Still on cooldown");
		expect(labelOf(REFUSAL_LABELS, "something_new", t)).toBe("something_new");
	});

	it("writes a wait in the largest unit above one", () => {
		expect(formatWait(30)).toMatch(/30/);
		expect(formatWait(90)).toMatch(/2 min/);
		expect(formatWait(7_200)).toMatch(/2 h/);
	});
});

describe("the usage sections", () => {
	it("opens on commands and moves to another section through the address", async () => {
		const user = userEvent.setup();
		renderWithProviders(<OwnerPage />, { path: "/owner", route: "/owner?tab=usage" });

		expect(await screen.findByRole("heading", { name: "Most used" })).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "People" }));

		expect(await screen.findByRole("heading", { name: "Busiest hours" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "People" })).toHaveAttribute("aria-pressed", "true");
	});

	/** The point of the languages panel: which of the eight translations people actually read the bot in. */
	it("names each Discord language and says whether the bot speaks it", async () => {
		renderView("people");

		const panel = (await screen.findByRole("heading", { name: "Their Discord language" })).closest(
			"div",
		)!.parentElement!;
		expect(within(panel).getByText("German")).toBeInTheDocument();
		expect(within(panel).getByText("Translated")).toBeInTheDocument();
		expect(within(panel).getByText("Brazilian Portuguese")).toBeInTheDocument();
		expect(within(panel).getByText("Shown in English")).toBeInTheDocument();
		expect(screen.getByText("Members")).toBeInTheDocument();
		expect(screen.getByText(/Europe\/London/)).toBeInTheDocument();
	});

	/** The grid is decoration; the counts behind it have to be readable without it. */
	it("puts the busiest hours in a table for a screen reader", async () => {
		renderView("people");

		const table = await screen.findByRole("table", { name: "Busiest hours" });
		expect(within(table).getAllByRole("row")).toHaveLength(8);
		expect(within(table).getByText("42")).toBeInTheDocument();
	});

	it("warns when Shardlens and Discord disagree about how many servers there are", async () => {
		renderView("servers");

		expect(await screen.findByText(/Shardlens counts 12 servers and Discord says 14/)).toBeInTheDocument();
		expect(screen.getByText("Under a day")).toBeInTheDocument();
		expect(screen.getByText("11-100 members")).toBeInTheDocument();
	});

	it("names each handler's buttons and how many of its forms were never sent", async () => {
		renderView("panels");

		expect(await screen.findByText("shop")).toBeInTheDocument();
		expect(screen.getByText("buy 80, open 40, 2 failed")).toBeInTheDocument();
		expect(screen.getByText("deletemydata")).toBeInTheDocument();
		expect(screen.getByText("60% unsent")).toBeInTheDocument();
	});

	/** A host YouTube has flagged shows here first, by the service and what it said. */
	it("says which service refused music and why", async () => {
		renderView("activity");

		expect(await screen.findByText("YouTube: asked to confirm it is not a bot")).toBeInTheDocument();
		expect(screen.getByText("Not answered by the model")).toBeInTheDocument();
		expect(screen.getByText("Still on cooldown")).toBeInTheDocument();
		expect(screen.getByText("Put back from Changes")).toBeInTheDocument();
		expect(screen.getByText("Level-ups")).toBeInTheDocument();
		// A thing the bot never did is left off rather than drawn as an empty bar.
		expect(screen.queryByText("Auto-responder replies")).not.toBeInTheDocument();
		expect(screen.getByText(/cover the last 7 days/)).toBeInTheDocument();
	});

	it("shows the slow and failed runs beside the gateway's reconnects", async () => {
		renderView("reliability");

		expect(await screen.findByText("Missed Discord’s 3 seconds")).toBeInTheDocument();
		expect(screen.getByText("50013")).toBeInTheDocument();
		expect(screen.getByText("resumed")).toBeInTheDocument();
		expect(screen.getByText("close code 4000")).toBeInTheDocument();
	});

	/** The collector refuses a funnel of one, so nothing is asked until there are two steps. */
	it("asks for a funnel only once two commands are chosen", async () => {
		const asked: string[] = [];
		server.events.on("request:start", ({ request }) => {
			if (request.url.includes("/analytics/funnel")) asked.push(request.url);
		});
		const user = userEvent.setup();
		renderView("journeys");

		expect(await screen.findByText("Choose at least two commands to follow.")).toBeInTheDocument();
		await user.selectOptions(await screen.findByLabelText("Step 1"), "ban");
		expect(asked).toEqual([]);
		await user.selectOptions(screen.getByLabelText("Step 2"), "levelling");

		expect(await screen.findByText(/^Typically 2\smins? after the first$/)).toBeInTheDocument();
		expect(screen.getByText("4 · 40%")).toBeInTheDocument();
		expect(new URL(asked.at(-1) ?? "http://x").searchParams.get("steps")).toBe("ban,levelling");
		server.events.removeAllListeners();
	});

	it("shows who came back, cohort by cohort", async () => {
		renderView("journeys", "&start=ban");

		const table = await screen.findByRole("table", { name: "Whether they came back" });
		expect(within(table).getByText("50%")).toBeInTheDocument();
		expect(within(table).getByText("Week 1")).toBeInTheDocument();
	});

	/** Each section is read on its own, so one Shardlens cannot answer leaves the others working. */
	/** A shard that disconnects and reconnects within the same instant once gave two list rows one React key. */
	it("lists two events of one shard at the same moment as two rows", async () => {
		const at = "2026-08-05T10:00:00.000Z";
		server.use(
			http.get("/api/analytics/reliability", () =>
				HttpResponse.json({
					...reliability,
					shards: {
						...reliability.shards,
						events: [
							{ at, shard: 0, state: "disconnected", closeCode: 1006 },
							{ at, shard: 0, state: "reconnecting", closeCode: null },
						],
					},
				}),
			),
		);
		const warned = jest.spyOn(console, "error").mockImplementation(() => undefined);
		renderView("reliability");

		expect(await screen.findByText("disconnected")).toBeInTheDocument();
		expect(screen.getByText("reconnecting")).toBeInTheDocument();
		expect(warned.mock.calls.flat().join(" ")).not.toMatch(/same key/);
		warned.mockRestore();
	});

	it("says a section cannot be read without taking the others with it", async () => {
		refuse("panels");
		const user = userEvent.setup();
		renderView("panels");

		expect(await screen.findByText(/has no read key for it/i)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Servers" }));
		expect((await screen.findAllByText("Servers added")).length).toBeGreaterThan(0);
	});

	it("offers a retry when the collector did not answer", async () => {
		refuse("reliability", "analytics_unreachable");
		renderView("reliability");

		expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
	});

	it("has no accessibility violations on a full section", async () => {
		const { container } = renderView("activity");

		await screen.findByText("Level-ups");
		await expectNoViolations(container);
	});
});
