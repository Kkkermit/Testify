import { type FeatureDetail } from "@testify/shared";
import { type TFunction } from "i18next";
import { describeDetail } from "@/features/guild-overview/featureStatus.labels";
import { i18next } from "@/i18n";

const t = i18next.t.bind(i18next) as TFunction;
const channel = (id: string): string => (id === "400000000000000001" ? "#general" : "a deleted channel");

describe("describeDetail", () => {
	/** The server sends what each feature is doing as data, so the page names the channel and words the plural. */
	it("words what a feature is doing, by channel name and in the right plural", () => {
		const cases: [FeatureDetail, string][] = [
			[{ kind: "posting", channelId: "400000000000000001" }, "Posting in #general"],
			[{ kind: "posting", channelId: "499999999999999999" }, "Posting in a deleted channel"],
			[{ kind: "count", what: "ticketsSold", count: 1 }, "1 ticket sold"],
			[{ kind: "count", what: "ticketsOpen", count: 3 }, "3 tickets open"],
		];

		expect(cases.filter(([detail, words]) => describeDetail(detail, t, channel) !== words)).toEqual([]);
	});
});
