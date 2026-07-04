import Bank from "@/icons/Bank";
import Wallet from "@/icons/Wallet";
import { AccountColorType, AccountTypesType } from "./types";

export const AccountColors = {
  black: {
    primary: "#444444",
    border: "#44444459",
    background: "#4444441a",
    shadow: "#44444420",
  },

  blue1: {
    primary: "#2889d2",
    border: "#2889d259",
    background: "#2889d21a",
    shadow: "#2889d220",
  },

  blue2: {
    primary: "#455ee3",
    border: "#455ee359",
    background: "#455ee31a",
    shadow: "#455ee320",
  },

  green1: {
    primary: "#20b07a",
    border: "#20b07a59",
    background: "#20b07a1a",
    shadow: "#20b07a20",
  },

  green2: {
    primary: "#3eb818",
    border: "#3eb81859",
    background: "#3eb8181a",
    shadow: "#3eb81820",
  },

  orange: {
    primary: "#b3752f",
    border: "#b3752f59",
    background: "#b3752f1a",
    shadow: "#b3752f20",
  },

  magenta: {
    primary: "#dc2f76",
    border: "#dc2f7659",
    background: "#dc2f761a",
    shadow: "#dc2f7620",
  },

  red: {
    primary: "#d33131",
    border: "#d3313159",
    background: "#d331311a",
    shadow: "#d3313120",
  },
} as const;

export const AccountTypes = {
  Bank: {
    name: "حساب بانکی",
    icon: Bank,
  },

  Wallet: {
    name: "کیف پول نقدی",
    icon: Wallet,
  },
} as const;
