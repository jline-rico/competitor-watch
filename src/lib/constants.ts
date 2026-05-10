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
