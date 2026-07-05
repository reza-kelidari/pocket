export const PrimaryColors = {
  primary: {
    primary: "bg-primary",
    text: "text-primary",
    box: "bg-primary-background border border-primary-border text-primary",
  },

  secondary: {
    primary: "bg-secondary",
    text: "text-secondary",
    box: "bg-elements-background border border-elements-border text-black",
  },

  red: {
    primary: "bg-red",
    text: "text-red",
    box: "bg-red-background border border-red-border text-red",
  },

  disabled: {
    primary: "bg-secondary",
    text: "text-secondary opacity-75",
    box: "border-elements-border bg-elements-background text-secondary opacity-75",
  },
};

export type PrimaryColorsType = keyof typeof PrimaryColors;
export type PrimaryColorsItemType = (typeof PrimaryColors)["primary"];
