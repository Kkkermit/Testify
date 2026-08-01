/**
 * Both pickers grey out what the bot cannot use and say why. That check is the same one the bot makes at
 * runtime — surfacing it here is the difference between a configuration that fails silently later and one that
 * cannot be saved wrong in the first place.
 */

export { ChannelPicker, postableChannels } from "@/components/form/ChannelPicker";
export { CheckList, type CheckItem } from "@/components/form/CheckList";
export { CHECK_ROW, FIELD } from "@/components/form/field";
export { RoleChecklist } from "@/components/form/RoleChecklist";
export { RoleSwatch } from "@/components/form/RoleSwatch";
export { SavingIndicator, savingStateOf, type SavingState } from "@/components/form/SavingIndicator";
export { Toggle } from "@/components/form/Toggle";
export { Warning } from "@/components/form/Warning";
