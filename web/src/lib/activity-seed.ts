/**
 * Deterministic demo activity feed — 1000 unique name + amount combinations.
 * Used for the scrolling dashboard banner only.
 */

export type ActivitySeed = {
  id: string;
  kind: "deposit" | "withdrawal" | "trade" | "cashout" | "funding";
  /** Text without the trailing amount (amount rendered once in green). */
  message: string;
  amountUsd: number;
  /** Green suffix, e.g. $1,250 or +$842 */
  amountLabel: string;
  createdAt: string;
};

const FIRST = [
  "James","Sofia","David","Amina","Chen","Omar","Elena","Kwame","Priya","Lucas",
  "Nora","Hassan","Mia","Andre","Fatima","Noah","Yuki","Ibrahim","Chloe","Mateo",
  "Zara","Ethan","Lila","Carlos","Aisha","Owen","Hana","Diego","Maya","Ryan",
  "Nia","Felix","Sara","Theo","Leila","Jonah","Rina","Marco","Ada","Kai",
  "Vera","Samir","Jade","Leo","Ines","Tariq","Ruby","Omar","Nina","Ben",
  "Amara","Hugo","Sana","Ivan","Keisha","Paul","Alya","Ravi","Grace","Tom",
  "Yara","Chris","Noor","Adam","Suki","Dan","Lina","Pete","Mina","Alex",
  "Dina","George","Tessa","Farid","Zoe","Ken","Rita","Luis","Anika","Joe",
  "Hera","Mark","Sofi","Dale","Kira","Phil","Esme","Wade","Lara","Sean",
  "Iris","Neil","Pam","Cole","Bess","Drew","Nina","Vince","Ade","Skye",
];

const LAST = "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""); // no I/O lookalikes spam

const ASSETS = ["USDT", "BTC", "ETH", "SOL", "USDC", "BNB", "XRP", "LTC"];
const PAIRS = [
  "BTC/USD", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT",
  "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "MATIC/USDT", "XAU/USD",
];

function money(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function uniqueAmount(i: number, base: number, span: number) {
  // Spread amounts so no two share the same dollar value in the full set
  return base + ((i * 37 + 13) % span);
}

export function buildActivitySeed(count = 1000): ActivitySeed[] {
  const out: ActivitySeed[] = [];
  const seen = new Set<string>();
  const seenAmounts = new Set<number>();
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length];
    const initial = LAST[Math.floor(i / FIRST.length) % LAST.length];
    // Extra salt so after name-cycle exhaust we still stay unique
    const salt = Math.floor(i / (FIRST.length * LAST.length));
    const name = salt > 0 ? `${first}${salt} ${initial}.` : `${first} ${initial}.`;

    const type = i % 5;
    let kind: ActivitySeed["kind"];
    let message: string;
    // Unique realistic amounts ($150–$9,999) via collision-free probe
    let amountUsd = 150 + ((i * 7919) % 9850);
    while (seenAmounts.has(amountUsd)) {
      amountUsd = 150 + ((amountUsd + 97) % 9850);
    }
    seenAmounts.add(amountUsd);
    let amountLabel: string;

    if (type === 0) {
      kind = "deposit";
      message = `${name} funded account`;
      amountLabel = `$${money(amountUsd)}`;
    } else if (type === 1) {
      kind = "withdrawal";
      const asset = ASSETS[i % ASSETS.length];
      message = `${name} withdrew ${asset}`;
      amountLabel = `$${money(amountUsd)}`;
    } else if (type === 2) {
      kind = "trade";
      const pair = PAIRS[i % PAIRS.length];
      message = `${name} closed ${pair}`;
      amountLabel = `+$${money(amountUsd)}`;
    } else if (type === 3) {
      kind = "cashout";
      message = `${name} cashed out`;
      amountLabel = `$${money(amountUsd)}`;
    } else {
      kind = "funding";
      const asset = ASSETS[(i + 3) % ASSETS.length];
      message = `${name} funded ${asset} session`;
      amountLabel = `$${money(amountUsd)}`;
    }

    const key = `${message}|${amountLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: `seed_${String(i + 1).padStart(4, "0")}`,
      kind,
      message,
      amountUsd,
      amountLabel,
      createdAt: new Date(now - i * 45_000).toISOString(),
    });
  }

  // Top up if any skipped (shouldn't happen with salted names)
  let extra = count;
  while (out.length < count) {
    extra += 1;
    let amountUsd = 2000 + extra;
    while (seenAmounts.has(amountUsd)) amountUsd += 1;
    seenAmounts.add(amountUsd);
    const message = `Trader ${extra} Z. completed session`;
    const amountLabel = `+$${money(amountUsd)}`;
    const key = `${message}|${amountLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `seed_x_${extra}`,
      kind: "trade",
      message,
      amountUsd,
      amountLabel,
      createdAt: new Date(now - extra * 45_000).toISOString(),
    });
  }

  return out.slice(0, count);
}

export const ACTIVITY_SEED_1000 = buildActivitySeed(1000);
