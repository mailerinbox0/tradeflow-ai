/**
 * Meta for 1000 demo testimonials + on-demand PNG proof cards.
 */
import { ACTIVITY_SEED_1000, type ActivitySeed } from "@/lib/activity-seed";
import zlib from "zlib";

export type TestimonyVisualKind = "withdrawal" | "trade" | "deposit" | "chat";

export type TestimonyMeta = {
  id: string;
  kind: TestimonyVisualKind;
  seedId: string;
  name: string;
  amountLabel: string;
  caption: string;
  title: string;
  subtitle: string;
  footer: string;
};

const CHAT_LINES = [
  "Just got my withdrawal — cleared in under an hour.",
  "Bot session closed green again. Not complaining.",
  "Started with a small deposit. This platform actually pays out.",
  "Support sorted my transfer same day. Clean.",
  "Cashed out to USDT TRC20. Already in my wallet.",
  "Trade hit TP while I was offline. Nice.",
  "Second week here and still consistent.",
  "Finally a trading app that doesn’t ghost withdrawals.",
];

function nameFromMessage(message: string) {
  return message.split(" ").slice(0, 2).join(" ");
}

function visualKindFromSeed(seed: ActivitySeed, i: number): TestimonyVisualKind {
  if (i % 4 === 3) return "chat";
  if (seed.kind === "withdrawal" || seed.kind === "cashout") return "withdrawal";
  if (seed.kind === "trade") return "trade";
  return "deposit";
}

function captionFor(seed: ActivitySeed, kind: TestimonyVisualKind, i: number) {
  const name = nameFromMessage(seed.message);
  const line = CHAT_LINES[i % CHAT_LINES.length];
  if (kind === "withdrawal") {
    return `${name} completed a withdrawal ${seed.amountLabel}.\n\n${line}`;
  }
  if (kind === "trade") {
    return `${seed.message} ${seed.amountLabel}\n\nPosition closed.`;
  }
  if (kind === "deposit") {
    return `${seed.message} ${seed.amountLabel}\n\nFunding confirmed.`;
  }
  return `${name}: “${line}”\n\n${seed.amountLabel}`;
}

export function buildTestimonyMeta(count = 1000): TestimonyMeta[] {
  const seeds = ACTIVITY_SEED_1000.slice(0, count);
  return seeds.map((seed, i) => {
    const kind = visualKindFromSeed(seed, i);
    const name = nameFromMessage(seed.message);
    const title =
      kind === "withdrawal"
        ? "Withdrawal"
        : kind === "trade"
          ? "Trade closed"
          : kind === "deposit"
            ? "Deposit"
            : "Chat";
    return {
      id: `tst_${String(i + 1).padStart(4, "0")}`,
      kind,
      seedId: seed.id,
      name,
      amountLabel: seed.amountLabel,
      caption: captionFor(seed, kind, i),
      title,
      subtitle: `${name} · ${kind}`,
      footer: new Date(seed.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  });
}

function crc32(buf: Buffer) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Dark mobile-style proof card PNG (no heavy image deps). */
export function renderTestimonyPng(opts: {
  kind: TestimonyVisualKind;
  title: string;
  amount: string;
  subtitle: string;
  meta: string;
}): Buffer {
  const W = 540;
  const H = 720;
  const rows: Buffer[] = [];

  const put = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = 1 + x * 3;
    rows[y][o] = r;
    rows[y][o + 1] = g;
    rows[y][o + 2] = b;
  };

  const fillRect = (x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, r, g, b);
  };

  for (let y = 0; y < H; y++) {
    rows[y] = Buffer.alloc(1 + W * 3);
    for (let i = 1; i < rows[y].length; i += 3) {
      rows[y][i] = 7;
      rows[y][i + 1] = 11;
      rows[y][i + 2] = 20;
    }
  }

  fillRect(24, 40, W - 48, H - 80, 15, 23, 42);
  const accent =
    opts.kind === "trade"
      ? ([34, 197, 94] as const)
      : opts.kind === "withdrawal"
        ? ([56, 189, 248] as const)
        : opts.kind === "chat"
          ? ([14, 165, 233] as const)
          : ([167, 139, 250] as const);
  fillRect(24, 40, W - 48, 8, accent[0], accent[1], accent[2]);

  const drawText = (text: string, x: number, y: number, scale: number, r: number, g: number, b: number) => {
    let cx = x;
    for (const ch of text.slice(0, 40)) {
      if (ch === " ") {
        cx += 3 * scale;
        continue;
      }
      const code = ch.charCodeAt(0);
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (((code * (gx + 3) + gy * 17) % 11) <= 3) continue;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              put(cx + gx * scale + sx, y + gy * scale + sy, r, g, b);
            }
          }
        }
      }
      cx += 6 * scale;
    }
  };

  drawText(opts.title.toUpperCase(), 48, 80, 2, 148, 163, 184);
  drawText(opts.amount, 48, 140, 4, accent[0], accent[1], accent[2]);
  drawText(opts.subtitle, 48, 240, 2, 226, 232, 240);
  drawText(opts.meta, 48, 300, 2, 100, 116, 139);
  drawText("TradeFlow", 48, 620, 2, 51, 65, 85);

  for (let n = 0; n < 1400; n++) {
    const x = 30 + ((n * 47) % (W - 60));
    const y = 50 + ((n * 91) % (H - 100));
    const o = 1 + x * 3;
    rows[y][o] = Math.min(255, rows[y][o] + (n % 3));
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
