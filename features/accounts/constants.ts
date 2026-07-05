import Bank from "@/icons/Bank";
import Wallet from "@/icons/Wallet";

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
