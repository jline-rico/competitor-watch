export function formatPrice(
  price: number | null,
  currency: string | null
): string {
  if (price == null) return "가격 미설정";

  const cur = currency || "KRW";

  switch (cur) {
    case "KRW":
      return `${price.toLocaleString("ko-KR")}원`;
    case "USD":
      return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "JPY":
      return `¥${price.toLocaleString("ja-JP")}`;
    case "CNY":
      return `¥${price.toLocaleString("zh-CN")}`;
    case "TWD":
      return `NT$${price.toLocaleString("zh-TW")}`;
    default:
      return `${price.toLocaleString()} ${cur}`;
  }
}
