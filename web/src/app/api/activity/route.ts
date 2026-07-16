import { json } from "@/lib/api";
import { ACTIVITY_SEED_1000 } from "@/lib/activity-seed";
import { getStore } from "@/lib/demo-store";

const FALLBACK = ACTIVITY_SEED_1000.slice(0, 40).map((a) => ({
  id: a.id,
  kind: a.kind,
  message: a.message,
  amountUsd: a.amountUsd,
  amountLabel: a.amountLabel,
  createdAt: a.createdAt,
}));

export async function GET() {
  const live = getStore().activities.filter((a) => a?.message?.trim());
  const items = (live.length ? live : FALLBACK).slice(0, 1000);
  return json({ items, count: items.length });
}
