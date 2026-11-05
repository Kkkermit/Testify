import { type RoleSummary } from "@testify/shared";
import { deletedRoleIds, rolesSummary, useText } from "@/features/roles/roles.utils";
import { t } from "@/test/english";

const role = (id: string): RoleSummary => ({
	id,
	name: id,
	colour: null,
	position: 1,
	managed: false,
	assignableByBot: true,
	powerful: false,
});

describe("deletedRoleIds", () => {
	/** A deleted role a setting still names is the one thing a manager most needs to find. */
	it("names roles a setting points at that the server no longer has", () => {
		expect(deletedRoleIds({ live: [{ kind: "dj" }], gone: [{ kind: "joinRole" }] }, [role("live")])).toEqual(["gone"]);
	});
});

describe("rolesSummary", () => {
	it("counts only the server's own roles that something uses", () => {
		expect(rolesSummary({}, [role("a")], t)).toBe("Testify does not use any of this server’s roles.");
		expect(rolesSummary({ a: [{ kind: "dj" }], gone: [{ kind: "dj" }] }, [role("a"), role("b")], t)).toBe(
			"Testify uses 1 of this server’s roles.",
		);
	});
});

describe("useText", () => {
	it("writes a boost's multiplier as a number in the reader's language", () => {
		expect(useText({ kind: "levelBoost", multiplier: 1.5 }, t)).toBe("Earns 1.5 times the XP");
	});
});
