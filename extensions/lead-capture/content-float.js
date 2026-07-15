/* TradeFlow mailing extension — right float tab (injected into page) */
(function () {
  if (window.__tfLeadFloatInstalled) return;
  window.__tfLeadFloatInstalled = true;

  const ROOT_ID = "tf-lead-float-root";

  function removePanel() {
    document.getElementById(ROOT_ID)?.remove();
  }

  function openPanel({ apiBase, email }) {
    removePanel();
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <style>
        #${ROOT_ID} {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 2147483646;
          width: min(360px, 92vw);
          height: 100vh;
          font-family: "Segoe UI", system-ui, sans-serif;
          color: #f4f7fb;
          pointer-events: none;
        }
        #${ROOT_ID} .tf-panel {
          pointer-events: auto;
          height: 100%;
          margin-left: auto;
          background: #050b18;
          border-left: 1px solid rgba(148,163,184,.28);
          box-shadow: -12px 0 40px rgba(0,0,0,.45);
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: tf-slide-in .22s ease-out;
        }
        @keyframes tf-slide-in {
          from { transform: translateX(100%); opacity: .4; }
          to { transform: translateX(0); opacity: 1; }
        }
        #${ROOT_ID} h2 { margin: 0; font-size: 18px; }
        #${ROOT_ID} .muted { color: #8b9bb4; font-size: 12px; margin: 0; word-break: break-all; }
        #${ROOT_ID} label { font-size: 12px; color: #8b9bb4; }
        #${ROOT_ID} input {
          width: 100%;
          box-sizing: border-box;
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(148,163,184,.28);
          background: #0b1428;
          color: #fff;
          padding: 0 12px;
          font-size: 14px;
        }
        #${ROOT_ID} .actions { display: flex; gap: 8px; margin-top: 8px; }
        #${ROOT_ID} button {
          flex: 1;
          min-height: 42px;
          border: 0;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        #${ROOT_ID} .send { background: #2f7bff; color: #fff; }
        #${ROOT_ID} .close { background: transparent; color: #f4f7fb; border: 1px solid rgba(148,163,184,.28); }
        #${ROOT_ID} .status { min-height: 18px; font-size: 12px; }
        #${ROOT_ID} .err { color: #ef4444; }
        #${ROOT_ID} .ok { color: #22c55e; }
      </style>
      <div class="tf-panel" role="dialog" aria-label="Send lead campaign">
        <h2>New lead</h2>
        <p class="muted">${email}</p>
        <div>
          <label for="tf-lead-name">Lead name</label>
          <input id="tf-lead-name" type="text" placeholder="Full name" autocomplete="name" />
        </div>
        <div class="actions">
          <button type="button" class="close" id="tf-lead-close">Close</button>
          <button type="button" class="send" id="tf-lead-send">Send</button>
        </div>
        <div class="status" id="tf-lead-status"></div>
      </div>
    `;
    document.documentElement.appendChild(root);

    const nameInput = root.querySelector("#tf-lead-name");
    const statusEl = root.querySelector("#tf-lead-status");
    const sendBtn = root.querySelector("#tf-lead-send");
    root.querySelector("#tf-lead-close").addEventListener("click", removePanel);
    nameInput.focus();

    async function send() {
      const name = String(nameInput.value || "").trim();
      statusEl.className = "status";
      if (!name) {
        statusEl.className = "status err";
        statusEl.textContent = "Enter the lead name";
        return;
      }
      sendBtn.disabled = true;
      statusEl.textContent = "Sending…";
      try {
        const res = await fetch(`${apiBase}/api/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            email,
            name,
            source: "mailing-extension",
          }),
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          throw new Error(data.message || data.error || "Send failed");
        }
        statusEl.className = "status ok";
        statusEl.textContent = "Sent — closing…";
        setTimeout(removePanel, 700);
      } catch (e) {
        statusEl.className = "status err";
        statusEl.textContent = e.message || "Failed";
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener("click", send);
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "TF_OPEN_LEAD_FLOAT") {
      openPanel({ apiBase: msg.apiBase, email: msg.email });
      sendResponse({ ok: true });
    }
    return false;
  });
})();
