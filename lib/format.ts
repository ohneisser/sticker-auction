export const DESIGN_FEE_CENTS = 88600; // custom sticker design by Andries
export const TICKET_PRICE_CENTS = 9900; // one Prime raffle ticket

export function usd(cents: number | null | undefined) {
  if (cents == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function nextMinBid(minBidCents: number, currentBidCents: number | null) {
  if (currentBidCents == null) return minBidCents;
  return currentBidCents + Math.max(2500, Math.floor(currentBidCents * 0.1));
}

export type SlotPublic = {
  key: string;
  label: string;
  format: string;
  width_cm: number;
  height_cm: number;
  x_mm: number;
  y_mm: number;
  min_bid_cents: number;
  current_bid_cents: number | null;
  ends_at: string;
  status: string;
  kind: string;
  sort_order: number;
  bid_count: number;
};
