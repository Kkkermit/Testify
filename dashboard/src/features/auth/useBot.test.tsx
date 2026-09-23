import { BOT_NAME } from "@testify/shared";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useTranslation } from "react-i18next";
import { useBot } from "@/features/auth/useBot";
import { usePageTitle } from "@/hooks/usePageTitle";
import { currentBotName, nameTheBot } from "@/i18n";
import { botProfile } from "@/test/handlers";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/setup";

function Named(): React.JSX.Element {
	useBot();
	usePageTitle("Servers");
	const { t } = useTranslation();

	return <p>{t("guilds.invitableTitle")}</p>;
}

afterEach(() => {
	nameTheBot(BOT_NAME);
});

describe("the bot's name", () => {
	it("is the built-in one until Discord says otherwise", () => {
		expect(currentBotName()).toBe(BOT_NAME);
	});

	/** A fork renamed in Discord kept reading as the original everywhere the dashboard names the bot. */
	it("follows the bot's own username into every string and the page title", async () => {
		server.use(http.get("/api/bot", () => HttpResponse.json({ ...botProfile, username: "Helper" })));
		renderWithProviders(<Named />);

		expect(await screen.findByText("Add Helper")).toBeInTheDocument();
		await waitFor(() => {
			expect(document.title).toBe("Servers · Helper");
		});
	});
});
