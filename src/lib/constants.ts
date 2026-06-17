export const COUNTRIES = [
  "한국",
  "미국",
  "중국",
  "일본",
  "대만",
  "글로벌",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const CATEGORIES = [
  "카메라",
  "도어락",
  "센서",
  "허브",
  "조명",
  "스위치",
  "기타",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CURRENCIES = [
  "KRW",
  "USD",
  "JPY",
  "CNY",
  "TWD",
] as const;

export type Currency = (typeof CURRENCIES)[number];
