import { AccountColors } from "../colors";
import { AccountTypes } from "./constants";

/**
 * Defines `Account Colors` type by keys of {@link AccountColors} element
 *
 * Every account haves one of these colors
 */

export type AccountColorType = keyof typeof AccountColors;

/**
 * Defines `Account Types` type by keys of {@link AccountTypes} element
 *
 * Every account is one of these types
 */

export type AccountTypesType = keyof typeof AccountTypes;

/**
 * Defines Account Object type
 *
 * This object contains:
 * @param id Account ID, generated automatically when the account created
 * @param name Account name
 * @param color Account color key
 * @param lastBalance Account last balance, calculated through methods
 * @param type Account type
 */

export type AccountType = {
  id: number;
  name: string;
  color: AccountColorType;
  type: AccountTypesType;
  create: number;
  default?: boolean;
};
