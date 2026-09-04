import type { SlotPublic } from "./format";

export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("x.supabase.co");

const end = () => new Date(Date.now() + 6 * 86400000 + 14 * 3600000).toISOString();

export const demoSlots: SlotPublic[] = [
  { key: "prime", label: "Prime", format: "1:1", width_cm: 8, height_cm: 8, x_mm: 138, y_mm: 84, min_bid_cents: 0, current_bid_cents: null, ends_at: end(), status: "prize", kind: "prize", sort_order: 0, bid_count: 0 },
  { key: "hero", label: "Hero", format: "4:3", width_cm: 12.4, height_cm: 9.3, x_mm: 8, y_mm: 8, min_bid_cents: 150000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 1, bid_count: 0 },
  { key: "strip-1", label: "Strip 1", format: "3:1", width_cm: 12.4, height_cm: 4, x_mm: 224, y_mm: 8, min_bid_cents: 60000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 2, bid_count: 0 },
  { key: "strip-2", label: "Strip 2", format: "3:1", width_cm: 12.4, height_cm: 4, x_mm: 224, y_mm: 52, min_bid_cents: 60000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 3, bid_count: 0 },
  { key: "center-top", label: "Center top", format: "1:1", width_cm: 7.4, height_cm: 7.4, x_mm: 141, y_mm: 8, min_bid_cents: 70000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 4, bid_count: 0 },
  { key: "center-bottom", label: "Center bottom", format: "4:3", width_cm: 8.4, height_cm: 6.3, x_mm: 136, y_mm: 177, min_bid_cents: 70000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 5, bid_count: 0 },
  { key: "sq-1", label: "Square 1", format: "1:1", width_cm: 6, height_cm: 6, x_mm: 8, y_mm: 105, min_bid_cents: 40000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 6, bid_count: 0 },
  { key: "sq-2", label: "Square 2", format: "1:1", width_cm: 6, height_cm: 6, x_mm: 72, y_mm: 181, min_bid_cents: 40000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 7, bid_count: 0 },
  { key: "sq-3", label: "Square 3", format: "1:1", width_cm: 6, height_cm: 6, x_mm: 224, y_mm: 96, min_bid_cents: 40000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 8, bid_count: 0 },
  { key: "box-1", label: "Box 1", format: "4:3", width_cm: 6, height_cm: 4.5, x_mm: 288, y_mm: 96, min_bid_cents: 35000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 9, bid_count: 0 },
  { key: "box-2", label: "Box 2", format: "4:3", width_cm: 6, height_cm: 4.5, x_mm: 288, y_mm: 189, min_bid_cents: 35000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 10, bid_count: 0 },
  { key: "wide-1", label: "Wide 1", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 72, y_mm: 105, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 11, bid_count: 0 },
  { key: "wide-2", label: "Wide 2", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 72, y_mm: 143, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 12, bid_count: 0 },
  { key: "wide-3", label: "Wide 3", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 8, y_mm: 169, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 13, bid_count: 0 },
  { key: "wide-4", label: "Wide 4", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 8, y_mm: 207, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 14, bid_count: 0 },
  { key: "wide-5", label: "Wide 5", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 224, y_mm: 160, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 15, bid_count: 0 },
  { key: "wide-7", label: "Wide 7", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 288, y_mm: 150, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 17, bid_count: 0 },
  { key: "wide-6", label: "Wide 6", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 224, y_mm: 198, min_bid_cents: 30000, current_bid_cents: null, ends_at: end(), status: "open", kind: "auction", sort_order: 16, bid_count: 0 },
];
