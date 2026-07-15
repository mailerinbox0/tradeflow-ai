# TradeFlow Mailing Extension

Chrome extension that searches TradeFlow leads, saves new emails, and sends the admin campaign message.

## Install

1. Start the TradeFlow web app (`web` → `npm run dev` on http://localhost:3000).
2. Open `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select this folder: `extensions/lead-capture`.
4. Pin **TradeFlow Mail** (search icon).

## Use

1. In Admin → **Leads**, set the campaign subject/message (uses `{{name}}`, `{{email}}`).
2. Click the extension search icon.
3. Enter an email and tap search.
   - **Exists** → already in leads/users.
   - **New** → saved to leads; a **right float tab** opens on the current page.
4. Enter the lead name → **Send** → sends the campaign message → float closes.
5. Admin → **Leads** shows each lead as **sent** or **failed**.

## API base

Default `http://localhost:3000`. Change it in the extension popup if needed.
