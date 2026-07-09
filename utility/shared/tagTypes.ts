import { TagType } from "../tags/type";

export const TagItemTypes: { value: TagType["type"]; label: string }[] = [
  { value: "Person", label: "شخص حقیقی" },
  { value: "Firm", label: "شخص حقوقی" },
  { value: "Other", label: "سایر" },
];
