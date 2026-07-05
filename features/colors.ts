export const PrimaryColors = {
  primary: {
    primary: "bg-primary",
    bg: "bg-primary-background",
    text: "text-primary",
    box: "bg-primary-background border border-primary-border text-primary",
  },

  secondary: {
    primary: "bg-secondary",
    text: "text-secondary",
    bg: "bg-secondary-background",
    box: "bg-elements-background border border-elements-border text-black",
  },

  red: {
    primary: "bg-red",
    text: "text-red",
    bg: "bg-red-background",
    box: "bg-red-background border border-red-border text-red",
  },

  disabled: {
    primary: "bg-secondary",
    text: "text-secondary opacity-75",
    bg: "bg-elements-background",
    box: "border-elements-border bg-elements-background text-secondary opacity-75",
  },
};

export const AccountColors = {
  black: {
    primary: "bg-account-black-primary",
    text: "text-account-black-primary",
    border: "border-account-black-border",
    surface: "bg-account-black-background",
    shadow: "#44444420",
  },

  blue1: {
    primary: "bg-account-blue1-primary",
    text: "text-account-blue1-primary",
    border: "border-account-blue1-border",
    surface: "bg-account-blue1-background",
    shadow: "#2889d220",
  },

  blue2: {
    primary: "bg-account-blue2-primary",
    text: "text-account-blue2-primary",
    border: "border-account-blue2-border",
    surface: "bg-account-blue2-background",
    shadow: "#455ee320",
  },

  green1: {
    primary: "bg-account-green1-primary",
    text: "text-account-green1-primary",
    border: "border-account-green1-border",
    surface: "bg-account-green1-background",
    shadow: "#20b07a20",
  },

  green2: {
    primary: "bg-account-green2-primary",
    text: "text-account-green2-primary",
    border: "border-account-green2-border",
    surface: "bg-account-green2-background",
    shadow: "#3eb81820",
  },

  orange: {
    primary: "bg-account-orange-primary",
    text: "text-account-orange-primary",
    border: "border-account-orange-border",
    surface: "bg-account-orange-background",
    shadow: "#b3752f20",
  },

  magenta: {
    primary: "bg-account-magenta-primary",
    text: "text-account-magenta-primary",
    border: "border-account-magenta-border",
    surface: "bg-account-magenta-background",
    shadow: "#dc2f7620",
  },

  red: {
    primary: "bg-account-red-primary",
    text: "text-account-red-primary",
    border: "border-account-red-border",
    surface: "bg-account-red-background",
    shadow: "#d3313120",
  },
} as const;

export type PrimaryColorsType = keyof typeof PrimaryColors;
export type PrimaryColorsItemType = (typeof PrimaryColors)["primary"];
