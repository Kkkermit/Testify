import { ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import deleteMyDataButton from "@buttons/deleteMyData";
import deleteMyData from "@commands/info/deleteMyData.command";
import { parseCustomId } from "@core/button";
import { type TestifyClient } from "@core/client";
import { type CommandInput } from "@core/command";
import { ERASE_CONFIRM_FIELD, ERASE_PANEL_ID } from "@lib/account/account.constants";
import { eraseAccount } from "@lib/account/accountActions.util";
import { eraseConfirmForm, erasePanel } from "@lib/account/erasePanel.util";
import { buttonsOf, textOf } from "@tests/helpers/containers";

jest.mock("@lib/account/accountActions.util", () => ({ eraseAccount: jest.fn(() => Promise.resolve()) }));

const USER = "100000000000000002";
const client = {} as TestifyClient;

beforeEach(() => jest.mocked(eraseAccount).mockClear());

describe("/delete-my-data", () => {
	/** It answers only the person who ran it, and no server can switch it off. */
	it("answers privately", () => {
		expect(deleteMyData.private).toBe(true);
	});

	it("answers a slash run with the panel", async () => {
		const reply = jest.fn((_options: unknown) => Promise.resolve());
		const input = { user: { id: USER }, deferred: false, replied: false, reply } as unknown as CommandInput;

		await deleteMyData.run?.(input, client);

		expect(reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.IsComponentsV2 }));
		expect(eraseAccount).not.toHaveBeenCalled();
	});

	/** A prefix reply is posted in the channel for everybody, so the panel goes to a direct message instead. */
	it("sends a prefix run's panel to their direct messages, and says so when those are closed", async () => {
		for (const open of [true, false]) {
			const send = jest.fn(() => (open ? Promise.resolve() : Promise.reject(new Error("closed"))));
			const replyBriefly = jest.fn((_embed: { toJSON(): { description?: string } }) => Promise.resolve());
			const reply = jest.fn();
			const input = { user: { id: USER, send }, reply, replyBriefly } as unknown as CommandInput;

			await deleteMyData.run?.(input, client);

			expect(send).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.IsComponentsV2 }));
			expect(reply).not.toHaveBeenCalled();
			expect(replyBriefly.mock.calls[0]?.[0].toJSON().description).toContain(
				open ? "direct message" : "/delete-my-data",
			);
		}
	});
});

describe("the delete-my-data panel", () => {
	it("warns that nothing brings it back, and offers Cancel and Delete to the person who ran it", () => {
		const panel = erasePanel(USER);
		const buttons = buttonsOf(panel) as { label: string; style: number; custom_id: string }[];

		expect(textOf(panel)).toContain("no way to bring it back");
		expect(textOf(panel)).toContain("blocks against you");
		expect(buttons.map((button) => [button.label, button.style])).toEqual([
			["Cancel", ButtonStyle.Secondary],
			["Delete", ButtonStyle.Danger],
		]);
		expect(buttons.map((button) => parseCustomId(button.custom_id))).toEqual([
			{ id: ERASE_PANEL_ID, action: "cancel", args: [USER] },
			{ id: ERASE_PANEL_ID, action: "confirm", args: [USER] },
		]);
		expect(deleteMyDataButton.ownerOnly).toBe(true);
	});

	it("asks for the username once more in a form that says it is the last step", () => {
		const form = eraseConfirmForm(USER, "kermit").toJSON();
		const label = form.components.find((part) => part.type === ComponentType.Label);

		expect(parseCustomId(form.custom_id)).toEqual({ id: ERASE_PANEL_ID, action: "erase", args: [USER] });
		expect(JSON.stringify(form.components)).toContain("no getting it back");
		expect(label).toMatchObject({
			label: "Type your username to confirm",
			component: { custom_id: ERASE_CONFIRM_FIELD, required: true, placeholder: "kermit" },
		});
	});
});

describe("the delete-my-data buttons", () => {
	function pressed(action: string, typed?: string) {
		return {
			user: { id: USER, username: "kermit" },
			isButton: () => typed === undefined,
			isModalSubmit: () => typed !== undefined,
			isFromMessage: () => true,
			fields: { getTextInputValue: (id: string) => (id === ERASE_CONFIRM_FIELD ? (typed ?? "") : "") },
			update: jest.fn((_message: unknown) => Promise.resolve()),
			showModal: jest.fn((_modal: unknown) => Promise.resolve()),
			deferUpdate: jest.fn(() => Promise.resolve()),
			editReply: jest.fn((_message: unknown) => Promise.resolve()),
			followUp: jest.fn(() => Promise.resolve()),
			action,
		};
	}

	async function press(action: string, typed?: string): Promise<ReturnType<typeof pressed>> {
		const interaction = pressed(action, typed);
		await deleteMyDataButton.run(interaction as never, { client, action, args: [USER] });
		return interaction;
	}

	it("deletes nothing on Cancel, and says so", async () => {
		const interaction = await press("cancel");

		expect(textOf(interaction.update.mock.calls[0]?.[0] as never)).toContain("Nothing was deleted");
		expect(buttonsOf(interaction.update.mock.calls[0]?.[0] as never)).toEqual([]);
		expect(eraseAccount).not.toHaveBeenCalled();
	});

	/** Delete only opens the confirmation; pressing it by mistake deletes nothing. */
	it("opens the confirmation on Delete without deleting anything", async () => {
		const interaction = await press("confirm");

		expect(interaction.showModal).toHaveBeenCalledTimes(1);
		expect(eraseAccount).not.toHaveBeenCalled();
	});

	it("deletes nothing when the confirmation does not match, and offers the panel again", async () => {
		const interaction = await press("erase", "somebody-else");

		expect(eraseAccount).not.toHaveBeenCalled();
		expect(textOf(interaction.update.mock.calls[0]?.[0] as never)).toContain("nothing was deleted");
		expect(buttonsOf(interaction.update.mock.calls[0]?.[0] as never)).toHaveLength(2);
	});

	it("deletes their data once they type their username or their ID, then says it is done", async () => {
		for (const typed of [" Kermit ", USER]) {
			jest.mocked(eraseAccount).mockClear();
			const interaction = await press("erase", typed);

			expect(eraseAccount).toHaveBeenCalledWith(client, USER);
			expect(interaction.deferUpdate).toHaveBeenCalled();
			expect(textOf(interaction.editReply.mock.calls[0]?.[0] as never)).toContain("Your data has been deleted");
		}
	});

	/** The router refuses anybody whose id is not last; the handler checks again rather than trusting it. */
	it("does nothing for somebody else's panel", async () => {
		const interaction = pressed("erase", "kermit");
		await deleteMyDataButton.run({ ...interaction, user: { id: "999", username: "kermit" } } as never, {
			client,
			action: "erase",
			args: [USER],
		});

		expect(eraseAccount).not.toHaveBeenCalled();
	});
});
