import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function ExtensionsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader solid />
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm text-[var(--blue)]">TradeFlow · Tools</p>
        <h1 className="mt-2 text-3xl font-bold">Mailing extension</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Download the Chrome sender extension, then load it unpacked to search leads and send the
          admin campaign message.
        </p>

        <div className="tf-card mt-8 space-y-4 p-5">
          <a
            href="/downloads/tradeflow-mailing-extension.zip"
            className="tf-btn tf-btn-primary inline-flex"
            download
          >
            Download TradeFlow Mailing (.zip)
          </a>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Unzip the downloaded folder</li>
            <li>Open chrome://extensions and turn on Developer mode</li>
            <li>Click Load unpacked and select the unzipped folder</li>
            <li>Pin TradeFlow Mail (search icon)</li>
          </ol>
          <Link href="/admin" className="text-sm text-[var(--blue)] underline">
            Back to admin
          </Link>
        </div>
      </main>
    </div>
  );
}
