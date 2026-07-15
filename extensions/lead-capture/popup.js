const API_BASE = "http://localhost:3000";

function getApiBase() {
  return API_BASE;
}

function setMsg(text, kind) {
  const msg = document.getElementById("msg");
  msg.className = kind || "";
  msg.textContent = text || "";
}

async function openFloatTab(payload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  if (!tab?.id || /^(chrome|edge|about|devtools):/i.test(url) || url.startsWith("chrome-extension://")) {
    showInlineFloat(payload);
    throw new Error("FLOAT_INLINE");
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-float.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: "TF_OPEN_LEAD_FLOAT", ...payload });
  } catch {
    showInlineFloat(payload);
    throw new Error("FLOAT_INLINE");
  }
}

function showInlineFloat({ apiBase, email }) {
  const wrap = document.querySelector(".wrap");
  wrap.innerHTML = `
    <div class="brand">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#2f7bff" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="#2f7bff" stroke-width="2" stroke-linecap="round"/></svg>
      <div><h1>New lead</h1><p class="sub">${email}</p></div>
    </div>
    <input id="leadName" type="text" placeholder="Lead name" />
    <button id="sendLead" type="button">Send</button>
    <div id="msg"></div>
  `;
  document.getElementById("sendLead").addEventListener("click", async () => {
    const name = document.getElementById("leadName").value.trim();
    const msg = document.getElementById("msg");
    if (!name) {
      msg.className = "err";
      msg.textContent = "Enter the lead name";
      return;
    }
    msg.className = "";
    msg.textContent = "Sending…";
    try {
      const res = await fetch(`${apiBase}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email, name, source: "mailing-extension" }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || data.error || "Failed");
      msg.className = "ok";
      msg.textContent = "Sent";
      setTimeout(() => window.close(), 600);
    } catch (e) {
      msg.className = "err";
      msg.textContent = e.message || "Failed";
    }
  });
}

async function searchLead() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    setMsg("Enter a valid email", "err");
    return;
  }
  setMsg("Searching…");
  const apiBase = getApiBase();
  try {
    const lookup = await fetch(`${apiBase}/api/leads?email=${encodeURIComponent(email)}`);
    const data = await lookup.json();
    if (!lookup.ok) throw new Error(data.error || "Lookup failed");

    if (data.exists) {
      setMsg("Exists", "err");
      return;
    }

    const createRes = await fetch(`${apiBase}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", email, source: "mailing-extension" }),
    });
    const created = await createRes.json();
    if (createRes.status === 409 || created.code === "EXISTS" || created.exists) {
      setMsg("Exists", "err");
      return;
    }
    if (!createRes.ok) throw new Error(created.error || "Could not save lead");

    try {
      await openFloatTab({
        apiBase,
        email,
        leadId: created.lead?.id,
      });
      setMsg("New lead saved — float tab opened on the page", "ok");
      window.close();
    } catch (e) {
      if (e.message === "FLOAT_INLINE") return;
      if (document.getElementById("leadName")) return;
      setMsg(e.message || "Could not open float tab", "err");
    }
  } catch (e) {
    setMsg(e.message || "Network error", "err");
  }
}

document.getElementById("search").addEventListener("click", searchLead);
document.getElementById("email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchLead();
});
