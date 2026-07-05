import Bank from "@/icons/Bank";
import Wallet from "@/icons/Wallet";

/**
 * Defines `Account Types` object
 * 
 * Every account is one of these types
 * 
 * Every Account Type haves:
 * - `name`: This is account type display name
 * - `icon`: this is account type icon
 */

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
