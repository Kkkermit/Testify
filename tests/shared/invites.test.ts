import { type InviteSnapshot, usedInvite } from "@testify/shared";

const snap = (uses: number): InviteSnapshot => ({ uses, inviterId: "1", inviterName: "kermit" });

describe("usedInvite", () => {
	/** A wrong guess credits somebody with a member they never brought, so anything unclear is left unknown. */
	it("names the one invite whose uses went up, and nobody when two did or none did", () => {
		const before = new Map([
			["abc", snap(3)],
			["def", snap(1)],
		]);

		expect(
			usedInvite(
				before,
				new Map([
					["abc", snap(4)],
					["def", snap(1)],
				]),
			),
		).toBe("abc");
		expect(
			usedInvite(
				before,
				new Map([
					["abc", snap(4)],
					["def", snap(2)],
				]),
			),
		).toBeNull();
		expect(usedInvite(before, new Map(before))).toBeNull();
	});

	it("counts a new invite used before it was seen, and one Discord deleted on its last use", () => {
		const before = new Map([["abc", snap(3)]]);

		expect(
			usedInvite(
				before,
				new Map([
					["abc", snap(3)],
					["new", snap(1)],
				]),
			),
		).toBe("new");
		expect(
			usedInvite(
				new Map([
					["abc", snap(3)],
					["once", snap(0)],
				]),
				new Map([["abc", snap(3)]]),
			),
		).toBe("once");
	});
});
