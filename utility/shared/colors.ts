export const PrimaryColors = {
  primary: {
    primary: "bg-primary",
    primaryValue: "#4394b3",
    bg: "bg-primary-background",
    text: "text-primary",
    box: "bg-primary-background border border-primary-border text-primary",
  },

  secondary: {
    primary: "bg-secondary",
    primaryValue: "#7b7b7b",
    text: "text-secondary",
    bg: "bg-secondary-background",
    box: "bg-elements-background border border-elements-border text-black",
  },

  red: {
    primary: "bg-red",
    primaryValue: "#a40000",
    text: "text-red",
    bg: "bg-red-background",
    box: "bg-red-background border border-red-border text-red",
  },

  disabled: {
    primary: "bg-secondary",
    primaryValue: "#7b7b7b",
    text: "text-secondary opacity-75",
    bg: "bg-elements-background",
    box: "border-elements-border bg-elements-background text-secondary opacity-75",
  },
};

export const AccountColors = {
  black: {
    primary: "bg-account-black-primary",
    primaryValue: "#444444",
    text: "text-account-black-primary",
    border: "border-account-black-border",
    surface: "bg-account-black-background",
    shadow: "#44444420",
    name: "مشکی",
  },

  blue1: {
    primary: "bg-account-blue1-primary",
    primaryValue: "#2889d2",
    text: "text-account-blue1-primary",
    border: "border-account-blue1-border",
    surface: "bg-account-blue1-background",
    shadow: "#2889d220",
    name: "آبی ۱",
  },

  blue2: {
    primary: "bg-account-blue2-primary",
    primaryValue: "#455ee3",
    text: "text-account-blue2-primary",
    border: "border-account-blue2-border",
    surface: "bg-account-blue2-background",
    shadow: "#455ee320",
    name: "آبی ۲",
  },

  green1: {
    primary: "bg-account-green1-primary",
    primaryValue: "#43b3ac",
    text: "text-account-green1-primary",
    border: "border-account-green1-border",
    surface: "bg-account-green1-background",
    shadow: "#43b3ac20",
    name: "سبز ۱",
  },

  green2: {
    primary: "bg-account-green2-primary",
    primaryValue: "#3eb818",
    text: "text-account-green2-primary",
    border: "border-account-green2-border",
    surface: "bg-account-green2-background",
    shadow: "#3eb81820",
    name: "سبز ۲",
  },

  orange: {
    primary: "bg-account-orange-primary",
    primaryValue: "#b3752f",
    text: "text-account-orange-primary",
    border: "border-account-orange-border",
    surface: "bg-account-orange-background",
    shadow: "#b3752f20",
    name: "نارنجی",
  },

  magenta: {
    primary: "bg-account-magenta-primary",
    primaryValue: "#dc2f76",
    text: "text-account-magenta-primary",
    border: "border-account-magenta-border",
    surface: "bg-account-magenta-background",
    shadow: "#dc2f7620",
    name: "صورتی",
  },

  red: {
    primary: "bg-account-red-primary",
    primaryValue: "#d33131",
    text: "text-account-red-primary",
    border: "border-account-red-border",
    surface: "bg-account-red-background",
    shadow: "#d3313120",
    name: "قرمز",
  },
} as const;

export type PrimaryColorsType = keyof typeof PrimaryColors;
export type PrimaryColorsItemType = (typeof PrimaryColors)["primary"];
