export const DESIGN_FEE_CENTS = 148700; // custom sticker design by Andries

export function usd(cents: number | null | undefined) {
  if (cents == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export type SlotPublic = {
  key: string;
  label: string;
  format: string;
  width_cm: number;
  height_cm: number;
  x_mm: number;
  y_mm: number;
  price_cents: number;
  status: string;
  kind: string;
  sort_order: number;
  reserved: boolean;
  locked: boolean;
  sold_count: number;
};

export const LADDER_STEP = 5; // price goes up 15% after every 5 spots sold
export function untilNextRise(soldCount: number) {
  return LADDER_STEP - (soldCount % LADDER_STEP);
}
