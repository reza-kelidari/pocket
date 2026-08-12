export const TagItemTypes: { value: TagType["type"]; label: string }[] = [
  { value: "Person", label: "شخص حقیقی" },
  { value: "Firm", label: "شخص حقوقی" },
  { value: "Broker", label: "کارگزاری / صرافی" },
  { value: "Place", label: "مکان" },
  { value: "Object", label: "شیء" },
  { value: "Other", label: "سایر" },
];

export const TagTypes = [
  "Person",
  "Firm",
  "Broker",
  "Place",
  "Object",
  "Other",
] as const;

export type TagType = {
  id: string;
  name: string;
  type: (typeof TagTypes)[number];
  order: number;
};
