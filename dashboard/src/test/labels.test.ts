import { AUDIT_EVENTS, AUDIT_GROUPS, AUTOMOD_PRESETS, SUPPORT_TOPICS, WELCOME_PLACEHOLDERS } from "@testify/shared";
import { EVENT_LABELS, GROUP_LABELS } from "@/features/audit-log/auditLog.labels";
import { PRESET_LABELS } from "@/features/automod/automod.labels";
import { TOPIC_LABELS } from "@/features/help/help.labels";
import { PLACEHOLDER_LABELS } from "@/features/welcome/welcome.labels";
import { t } from "@/test/english";

/** A key with no copy behind it renders as the key, which reads to a user as a broken page. */
describe("the label registries", () => {
	it("names and describes every audit event", () => {
		for (const event of AUDIT_EVENTS) {
			expect(t(EVENT_LABELS[event].label)).not.toContain("auditLog.");
			expect(t(EVENT_LABELS[event].describes)).not.toContain("auditLog.");
		}
	});

	it("names every audit group", () => {
		for (const group of AUDIT_GROUPS) expect(t(GROUP_LABELS[group])).not.toContain("auditLog.");
	});

	it("names and describes every automod preset", () => {
		for (const preset of AUTOMOD_PRESETS) {
			expect(t(PRESET_LABELS[preset].label)).not.toContain("automod.");
			expect(t(PRESET_LABELS[preset].describes)).not.toContain("automod.");
		}
	});

	it("names every help topic", () => {
		for (const topic of SUPPORT_TOPICS) expect(t(TOPIC_LABELS[topic])).not.toContain("help.");
	});

	it("describes every greeting placeholder", () => {
		for (const token of WELCOME_PLACEHOLDERS) expect(t(PLACEHOLDER_LABELS[token])).not.toContain("welcome.");
	});
});
