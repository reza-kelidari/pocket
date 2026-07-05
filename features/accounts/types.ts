import { AccountColors } from "../colors";
import { AccountTypes } from "./constants";

export type AccountColorType = keyof typeof AccountColors;

export type AccountTypesType = keyof typeof AccountTypes;

export type AccountType = {
  id: number;
  name: string;
  color: AccountColorType;
  lastBalance: number;
  type: AccountTypesType;
};