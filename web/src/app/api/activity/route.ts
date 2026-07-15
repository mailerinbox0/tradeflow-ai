import { json } from "@/lib/api";
import { getStore } from "@/lib/demo-store";

export async function GET() {
  // Newest first — full unique ticker set (up to 1000 seeded + live events prepended)
  const items = getStore().activities.slice(0, 1000);
  return json({ items, count: items.length });
}
