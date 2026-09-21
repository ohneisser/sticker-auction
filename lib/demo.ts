import type { SlotPublic } from "./format";

export const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("x.supabase.co");


export const demoSlots: SlotPublic[] = [
  { key: "prime", label: "Prime", format: "1:1", width_cm: 8, height_cm: 8, x_mm: 138, y_mm: 84, price_cents: 498700, status: "open", kind: "auction", sort_order: 0, reserved: false },
  { key: "hero", label: "Hero", format: "4:3", width_cm: 12.4, height_cm: 9.3, x_mm: 8, y_mm: 8, price_cents: 98700, status: "open", kind: "auction", sort_order: 1, reserved: false },
  { key: "strip-1", label: "Strip 1", format: "3:1", width_cm: 12.4, height_cm: 4, x_mm: 224, y_mm: 8, price_cents: 41200, status: "open", kind: "auction", sort_order: 2, reserved: false },
  { key: "strip-2", label: "Strip 2", format: "3:1", width_cm: 12.4, height_cm: 4, x_mm: 224, y_mm: 52, price_cents: 41200, status: "open", kind: "auction", sort_order: 3, reserved: false },
  { key: "center-top", label: "Center top", format: "1:1", width_cm: 7.4, height_cm: 7.4, x_mm: 141, y_mm: 8, price_cents: 48700, status: "open", kind: "auction", sort_order: 4, reserved: false },
  { key: "center-bottom", label: "Center bottom", format: "4:3", width_cm: 8.4, height_cm: 6.3, x_mm: 136, y_mm: 177, price_cents: 48700, status: "open", kind: "auction", sort_order: 5, reserved: false },
  { key: "sq-1", label: "Square 1", format: "1:1", width_cm: 6, height_cm: 6, x_mm: 8, y_mm: 105, price_cents: 27700, status: "open", kind: "auction", sort_order: 6, reserved: false },
  { key: "sq-2", label: "Square 2", format: "1:1", width_cm: 6, height_cm: 6, x_mm: 72, y_mm: 181, price_cents: 27700, status: "open", kind: "auction", sort_order: 7, reserved: false },
  { key: "sq-3", label: "Square 3", format: "1:1", width_cm: 6, height_cm: 6, x_mm: 224, y_mm: 96, price_cents: 27700, status: "open", kind: "auction", sort_order: 8, reserved: false },
  { key: "box-1", label: "Box 1", format: "4:3", width_cm: 6, height_cm: 4.5, x_mm: 288, y_mm: 96, price_cents: 24300, status: "open", kind: "auction", sort_order: 9, reserved: false },
  { key: "box-2", label: "Box 2", format: "4:3", width_cm: 6, height_cm: 4.5, x_mm: 288, y_mm: 189, price_cents: 24300, status: "open", kind: "auction", sort_order: 10, reserved: false },
  { key: "wide-1", label: "Wide 1", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 72, y_mm: 105, price_cents: 20900, status: "open", kind: "auction", sort_order: 11, reserved: false },
  { key: "wide-2", label: "Wide 2", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 72, y_mm: 143, price_cents: 20900, status: "open", kind: "auction", sort_order: 12, reserved: false },
  { key: "wide-3", label: "Wide 3", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 8, y_mm: 169, price_cents: 20900, status: "open", kind: "auction", sort_order: 13, reserved: false },
  { key: "wide-4", label: "Wide 4", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 8, y_mm: 207, price_cents: 20900, status: "open", kind: "auction", sort_order: 14, reserved: false },
  { key: "wide-5", label: "Wide 5", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 224, y_mm: 160, price_cents: 20900, status: "open", kind: "auction", sort_order: 15, reserved: false },
  { key: "wide-7", label: "Wide 7", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 288, y_mm: 150, price_cents: 20900, status: "open", kind: "auction", sort_order: 17, reserved: false },
  { key: "wide-6", label: "Wide 6", format: "16:9", width_cm: 6, height_cm: 3.4, x_mm: 224, y_mm: 198, price_cents: 20900, status: "open", kind: "auction", sort_order: 16, reserved: false },
];
