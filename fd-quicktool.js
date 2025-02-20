// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      2.5
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  /***************************************************
   * 0) SVG Icons
   ***************************************************/
  const moonIconSVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     xmlns="http://www.w3.org/2000/svg">
  <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9 9 0 1 0 20.354 15.354z"></path>
</svg>`;

  const sunIconSVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="5"></circle>
  <path d="M12 1v2"></path>
  <path d="M12 21v2"></path>
  <path d="M4.22 4.22l1.42 1.42"></path>
  <path d="M18.36 18.36l1.42 1.42"></path>
  <path d="M1 12h2"></path>
  <path d="M21 12h2"></path>
  <path d="M4.22 19.78l1.42-1.42"></path>
  <path d="M18.36 5.64l1.42-1.42"></path>
</svg>`;

  const personIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
  <path d="M2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"/>
</svg>`;

  const pinIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M4.146 14.354a.5.5 0 0 0 .708 0L8 11.207l3.146 3.147a.5.5 0 0 0 .708-.708L8 6.793 4.966 3.76a.5.5 0 0 0-.708.708l3.034 3.034-3.146 3.146a.5.5 0 0 0 0 .708z"/>
</svg>`;

  const settingsIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.115 2.693l.319.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.115l-.094.319c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291a1.873 1.873 0 0 0-1.115-2.693l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094a1.873 1.873 0 0 0 1.115-2.693l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.693-1.115l.094-.319z"/>
</svg>`;

  /***************************************************
   * 1) Inject CSS
   ***************************************************/
  function injectCSS() {
    if (document.getElementById("multitool-beast-css")) return;
    const style = document.createElement('style');
    style.id = "multitool-beast-css";
    style.innerHTML = `
/* 
  Pastel "Material-ish" Panel 
  With a tiny drag handle at top center,
  and separated top bar (circle buttons on left, toggle on right).
*/

/* Light / Dark mode color definitions */
:root {
  /* Light mode */
  --light-panel-bg: #fffaf5;  
  --light-panel-fg: #2f2f2f;
  --light-panel-border: #d1ccc9;

  /* Dark mode */
  --dark-panel-bg: #1e293b;
  --dark-panel-fg: #e2e8f0;
  --dark-panel-border: #475569;

  /* Tabs (pastel) */
  --tab-bg: #e8f1fa;
  --tab-border: #b3d4f0; 
  --tab-fg: #14425c;    

  --tab-active-bg: #d3eafc; 
  --tab-active-border: #91c7f3;
  --tab-active-fg: #0f2d3f;
}

/* Switch variable sets based on body class */
body:not(.dark-mode-override) {
  --panel-bg: var(--light-panel-bg);
  --panel-fg: var(--light-panel-fg);
  --panel-border: var(--light-panel-border);
}
body.dark-mode-override {
  --panel-bg: var(--dark-panel-bg);
  --panel-fg: var(--dark-panel-fg);
  --panel-border: var(--dark-panel-border);
}

#multitool-beast-wrapper {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 380px;
  min-width: 280px;
  min-height: 220px;
  background-color: var(--panel-bg);
  color: var(--panel-fg);
  border: 2px solid var(--panel-border);
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  z-index: 999999;
  display: none; /* toggled by script */
  resize: both;
  overflow: auto;
  transition: box-shadow 0.2s;
}

/* Add bigger shadow + higher z-index while dragging */
#multitool-beast-wrapper.dragging {
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  z-index: 9999999;
}

/* Tiny tab drag handle at top center */
.drag-handle {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 10px;
  background-color: var(--panel-border);
  border-radius: 6px 6px 0 0;
  cursor: move;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

/* The top bar with circle buttons on left, toggle on right */
.mtb-top-bar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
}

.mtb-top-bar-left, .mtb-top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Round/cute circle buttons for up/down/close */
.circle-btn {
  width: 30px;
  height: 30px;
  background-color: #f5f5f5;
  border: 1px solid #d0d0d0;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, box-shadow 0.15s;
}
.circle-btn:hover {
  background-color: #e9e9e9;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.circle-btn:active {
  background-color: #dadada;
}

/* "Close" is a bit more alarming color */
.close-btn {
  background-color: #ffe5e5;
  border: 1px solid #ffaaaa;
  color: #cc0000;
}
.close-btn:hover {
  background-color: #ffd6d6;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.close-btn:active {
  background-color: #ffcccc;
}

/* Theme toggle switch */
.theme-toggle-wrapper {
  position: relative;
  width: 44px;
  height: 22px;
}
.theme-toggle {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.theme-toggle + label {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, #f1c40f 0%, #9b59b6 100%);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.3s;
}
.theme-toggle + label:before {
  content: "";
  position: absolute;
  top: 1px;
  left: 1px;
  width: 20px;
  height: 20px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
}
.toggle-icon {
  position: absolute;
  width: 14px;
  height: 14px;
  top: 4px;
  color: #fff;
}
.toggle-icon--moon {
  left: 4px;
}
.toggle-icon--sun {
  right: 4px;
}
.theme-toggle:checked + label:before {
  transform: translateX(22px);
}

/* The header (logo + title), below top bar */
.mtb-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  gap: 8px;
  border-bottom: 1px solid var(--panel-border);
}
.mtb-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.mtb-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

/* The main content area (tabs + tab content) */
.mtb-content {
  padding: 8px 12px;
}

/* Tabs row */
.mtb-tabs {
  display: flex;
  gap: 8px;
  margin: 0;
  margin-bottom: 8px;
  padding: 0;
  list-style: none;
  justify-content: flex-start;
}
.mtb-tab {
  padding: 6px 12px;
  border-radius: 12px;
  background-color: var(--tab-bg);
  color: var(--tab-fg);
  border: 1px solid var(--tab-border);
  cursor: pointer;
  transition: background-color 0.15s, box-shadow 0.15s;
}
.mtb-tab:hover {
  background-color: #eef7ff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.mtb-tab.active {
  background-color: var(--tab-active-bg);
  border-color: var(--tab-active-border);
  color: var(--tab-active-fg);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* Hide tab content by default */
.tab-content {
  display: none;
}

/* Section block styling inside each tab content */
.mtb-section {
  background-color: rgba(0,0,0,0.02);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}

/* Field rows */
.fieldRow {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  gap: 6px;
}
.fieldRow .fw-bold {
  font-weight: 600;
}

/* For text-based copy buttons */
.sway-btn-text {
  padding: 6px 12px;
  border-radius: 12px;
  background-color: var(--tab-bg);
  color: var(--tab-fg);
  border: 1px solid var(--tab-border);
  cursor: pointer;
  transition: background-color 0.15s, box-shadow 0.15s;
  font-size: 14px;
}
.sway-btn-text:hover {
  background-color: #eef7ff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* For icon-only copy buttons */
.sway-btn-icon {
  background-color: transparent;
  border: 1px solid var(--tab-border);
  color: var(--panel-fg);
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.15s, box-shadow 0.15s;
}
.sway-btn-icon:hover {
  background-color: rgba(0,0,0,0.05);
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* The open button (floating) at bottom-right corner of page */
#sway-open-btn {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 99999;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  padding: 8px;
  background-color: #374151;
  border: 1px solid #4b5563;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
  cursor: pointer;
}
#sway-open-btn img {
  width: 40px; 
  height: 40px; 
  object-fit: contain;
}
    `;
    document.head.appendChild(style);
  }

  /***************************************************
   * 2) Basic Checks & Utilities
   ***************************************************/
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  function extractTicketId() {
    const match = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  function savePref(key, value) {
    localStorage.setItem("mtb_"+key, JSON.stringify(value));
  }
  function loadPref(key, defaultVal) {
    const v = localStorage.getItem("mtb_"+key);
    return v ? JSON.parse(v) : defaultVal;
  }

  /***************************************************
   * 3) Dark Mode
   ***************************************************/
  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode-override");
    } else {
      document.body.classList.remove("dark-mode-override");
    }
  }
  function initTheme() {
    const storedTheme = loadPref("theme", "light");
    applyTheme(storedTheme);
  }
  function toggleTheme(force) {
    let current = loadPref("theme", "light");
    let newTheme = force ? force : (current === "dark" ? "light" : "dark");
    savePref("theme", newTheme);
    applyTheme(newTheme);
  }

  /***************************************************
   * 4) Tab Switching
   ***************************************************/
  function showTab(which) {
    ["profile","pinned","settings"].forEach(id => {
      const contentEl = document.getElementById("tab-content-"+id);
      const tabEl = document.getElementById("tab-btn-"+id);
      if (!contentEl || !tabEl) return;
      if (id === which) {
        contentEl.style.display = "block";
        tabEl.classList.add("active");
      } else {
        contentEl.style.display = "none";
        tabEl.classList.remove("active");
      }
    });
  }

  /***************************************************
   * 5) Profile Tab Logic
   ***************************************************/
  function getFieldValue(el) {
    if (!el) return "";
    let val = el.value || el.getAttribute('value') || el.getAttribute('placeholder') || "";
    val = val.trim();
    if (!val) {
      let p = el.parentElement;
      if (p) val = p.innerText.trim();
    }
    if (!val || ["account", "profile"].includes(val.toLowerCase())) val = "N/A";
    return val;
  }
  function getSummary() {
    const note = document.querySelector('.ticket_note[data-note-id]');
    return note ? note.textContent.trim() : "";
  }
  function getRecentTickets(currentId) {
    const tickets = [];
    const els = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
    if (!els.length) return tickets;
    const now = new Date();
    const threshold = 7 * 24 * 60 * 60 * 1000;
    els.forEach(function(el) {
      const timeEl = el.querySelector('[data-test-id="timeline-activity-time"]');
      if (timeEl) {
        let dt = new Date(timeEl.textContent.trim().replace(',', ''));
        if (!isNaN(dt) && (now - dt <= threshold) && dt <= now) {
          const linkEl = el.querySelector('a.text__link-heading');
          if (linkEl) {
            const href = linkEl.href;
            const subject = linkEl.textContent.trim();
            const m = href.match(/\/a\/tickets\/(\d+)/);
            const foundId = m ? m[1] : "";
            if (currentId && parseInt(foundId,10) === parseInt(currentId,10)) return;
            tickets.push({ href: href, subject: subject, date: dt });
          }
        }
      }
    });
    return tickets;
  }
  function fetchCARR(callback) {
    const compLink = document.querySelector('a[href*="/a/companies/"]');
    if (!compLink) return callback("N/A");
    const rel = compLink.getAttribute('href');
    const compURL = window.location.origin + rel;
    const iframe = document.createElement('iframe');
    iframe.style.position = "absolute";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.visibility = "hidden";
    iframe.src = compURL;
    iframe.onload = function() {
      setTimeout(function() {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const showMore = doc.querySelector('div.contacts__sidepanel--state[data-test-toggle]');
          if (showMore) showMore.click();
          setTimeout(function() {
            try {
              const cElem = doc.querySelector('[data-test-id="fields-info-carr_usd"] [data-test-field-content="CARR (converted)"] .text__content');
              let cVal = cElem ? cElem.textContent.trim() : "N/A";
              if (cVal !== "N/A" && !isNaN(cVal.replace(/[.,]/g, ""))) {
                cVal = parseInt(cVal.replace(/[.,]/g, ""), 10).toLocaleString() + "$";
              }
              document.body.removeChild(iframe);
              callback(cVal);
            } catch(e) {
              document.body.removeChild(iframe);
              callback("N/A");
            }
          }, 2000);
        } catch(e) {
          document.body.removeChild(iframe);
          callback("N/A");
        }
      }, 2000);
    };
    document.body.appendChild(iframe);
  }

  function copyAllSelected() {
    let copyText = "";
    document.querySelectorAll('.fieldRow').forEach(function(row) {
      const chk = row.querySelector('.field-selector');
      if (chk && chk.checked) {
        const lblSpan = row.querySelector('span');
        const valEl = row.querySelector('.fresh-value');
        if (lblSpan && valEl) {
          let labelText = lblSpan.textContent.replace(/:\s*$/, "");
          let valueText = valEl.textContent.trim();
          if (labelText.toLowerCase() === "ticket id") {
            const numericId = valueText.replace("#", "");
            const link = window.location.origin + "/a/tickets/" + numericId;
            labelText = `**${labelText}**`;
            valueText = `[#${numericId}](${link})`;
          } else {
            labelText = `**${labelText}**`;
          }
          copyText += `${labelText}: ${valueText}\n`;
        }
      }
    });
    const summaryCheck = document.getElementById('include-summary');
    if (summaryCheck && summaryCheck.checked) {
      const summaryText = getSummary();
      if (summaryText) {
        copyText += `\n**Summary**:\n${summaryText}\n`;
      }
    }
    const copyBtn = document.getElementById('copy-all-selected-btn');
    navigator.clipboard.writeText(copyText).then(function() {
      if (copyBtn) {
        copyBtn.textContent = "Copied Selected!";
        setTimeout(function() { copyBtn.textContent = "Copy Selected"; }, 2000);
      }
    });
  }

  // Create a field row
  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "fieldRow";

    const check = document.createElement('input');
    check.type = "checkbox";
    check.checked = true;
    check.className = "field-selector";
    row.appendChild(check);

    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    row.appendChild(lbl);

    const finalVal = valueText || "N/A";
    const valSpan = document.createElement('span');
    valSpan.textContent = finalVal;
    valSpan.className = "fresh-value";
    row.appendChild(valSpan);

    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "sway-btn-icon"; // icon-only style
      btn.style.marginLeft = "8px";
      btn.innerHTML = `📋`;
      btn.title = "Copy";
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(finalVal).then(function() {
          btn.innerHTML = `<span style="color: green;">&#10003;</span>`;
          setTimeout(function() { btn.innerHTML = `📋`; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  // Populate the Profile tab
  function populateProfileTab(container) {
    container.innerHTML = "";

    const currentTicketId = extractTicketId();
    const tIdVal = currentTicketId ? "#" + currentTicketId : "N/A";
    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]') || { value: "" }).value.trim();

    // A "section" with the main fields
    const secProfile = document.createElement('div');
    secProfile.className = "mtb-section";
    secProfile.appendChild(createMenuItem("Ticket ID", tIdVal));
    secProfile.appendChild(createMenuItem("Account", accountVal));
    secProfile.appendChild(createMenuItem("Account Profile", profileVal));
    const carrRow = createMenuItem("CARR", "Fetching...", false);
    secProfile.appendChild(carrRow);
    secProfile.appendChild(createMenuItem("Relevant URLs", urlsVal));

    // Copy account/profile button
    const copyAccBtn = document.createElement('button');
    copyAccBtn.textContent = "Copy Account/Profile";
    copyAccBtn.className = "sway-btn-text"; // pastel tab-like
    copyAccBtn.style.marginTop = "8px";

    copyAccBtn.addEventListener('click', function() {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(function() {
        copyAccBtn.textContent = "Copied!";
        setTimeout(function() { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });

    // Copy selected button
    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.className = "sway-btn-text"; // pastel tab-like
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.style.marginTop = "8px";
    copyAllBtn.addEventListener('click', copyAllSelected);

    // Put them side by side
    const copyRow = document.createElement('div');
    copyRow.style.display = "flex";
    copyRow.style.gap = "8px";
    copyRow.style.marginTop = "8px";
    copyRow.appendChild(copyAccBtn);
    copyRow.appendChild(copyAllBtn);

    secProfile.appendChild(copyRow);

    // Include summary below
    const summaryDiv = document.createElement('div');
    summaryDiv.style.marginTop = '8px';
    const sumCheck = document.createElement('input');
    sumCheck.type = 'checkbox';
    sumCheck.id = 'include-summary';
    sumCheck.style.marginRight = '4px';
    summaryDiv.appendChild(sumCheck);
    summaryDiv.appendChild(document.createTextNode('Include Summary'));

    secProfile.appendChild(summaryDiv);
    container.appendChild(secProfile);

    // A "section" with recent tickets
    const secRecent = document.createElement('div');
    secRecent.className = "mtb-section";
    const rHead = document.createElement('div');
    rHead.textContent = "Recent Tickets (last 7 days)";
    rHead.style.fontWeight = "600";
    rHead.style.marginBottom = "8px";
    secRecent.appendChild(rHead);

    const recTix = getRecentTickets(currentTicketId);
    if (recTix.length > 0) {
      recTix.forEach(function(t) {
        const tDiv = document.createElement('div');
        tDiv.style.marginBottom = "8px";
        tDiv.style.paddingBottom = "8px";
        tDiv.style.borderBottom = "1px solid var(--panel-border)";

        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.style.color = "#2563eb";
        tDiv.appendChild(a);

        const cpBtn = document.createElement('button');
        cpBtn.className = "sway-btn-icon";
        cpBtn.style.marginLeft = "8px";
        cpBtn.innerHTML = `📋`;
        cpBtn.title = "Copy Link";
        cpBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(t.href).then(function() {
            cpBtn.innerHTML = `<span style="color: green;">&#10003;</span>`;
            setTimeout(function() { cpBtn.innerHTML = `📋`; }, 2000);
          });
        });
        tDiv.appendChild(cpBtn);

        secRecent.appendChild(tDiv);
      });
    } else {
      const noDiv = document.createElement('div');
      noDiv.textContent = "No tickets in the last 7 days";
      secRecent.appendChild(noDiv);
    }
    container.appendChild(secRecent);

    // Async fetch CARR
    fetchCARR(function(cVal) {
      const vEl = carrRow.querySelector('.fresh-value');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***************************************************
   * 6) Pinned Tab
   ***************************************************/
  function buildPinnedTabContent(container) {
    container.innerHTML = "";
    const sec = document.createElement('div');
    sec.className = "mtb-section";
    sec.style.display = "flex";
    sec.style.flexWrap = "wrap";
    sec.style.gap = "8px";

    const items = [
      { icon: '📄', label: 'Docs', link: 'https://docs.google.com/' },
      { icon: '🔗', label: 'Website', link: 'https://www.example.com' },
      { icon: '📊', label: 'Analytics', link: 'https://analytics.google.com' },
      { icon: '🚀', label: 'Rocket', link: 'https://www.spacex.com' }
    ];

    items.forEach(function(item) {
      const card = document.createElement('div');
      card.style.width = "calc(50% - 4px)";
      card.style.backgroundColor = "#f7fafc";
      card.style.border = "1px solid var(--panel-border)";
      card.style.borderRadius = "6px";
      card.style.textAlign = "center";
      card.style.padding = "12px";
      card.style.cursor = "pointer";
      card.style.color = "var(--panel-fg)";
      card.style.transition = "background-color 0.15s, box-shadow 0.15s";
      card.innerHTML = `
        <div style="font-size:24px;">${item.icon}</div>
        <div style="margin-top:6px;font-weight:500;">${item.label}</div>
      `;
      card.addEventListener('click', function() {
        window.open(item.link, '_blank');
      });
      card.addEventListener('mouseover', () => {
        card.style.backgroundColor = "#eef4f8";
        card.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
      });
      card.addEventListener('mouseout', () => {
        card.style.backgroundColor = "#f7fafc";
        card.style.boxShadow = "none";
      });
      sec.appendChild(card);
    });

    container.appendChild(sec);
  }

  /***************************************************
   * 7) Settings Tab
   ***************************************************/
  function buildSettingsContent(container) {
    container.innerHTML = "";
    const sec = document.createElement('div');
    sec.className = "mtb-section";

    const keepOpenDiv = document.createElement('div');
    keepOpenDiv.style.marginBottom = "8px";
    const keepOpenChk = document.createElement('input');
    keepOpenChk.type = "checkbox";
    keepOpenChk.id = "keep-box-open-chk";
    keepOpenChk.checked = loadPref("keepOpen", false);
    keepOpenChk.style.marginRight = "6px";
    keepOpenChk.addEventListener('change', function() {
      savePref("keepOpen", keepOpenChk.checked);
    });
    keepOpenDiv.appendChild(keepOpenChk);
    keepOpenDiv.appendChild(document.createTextNode(" Keep box open by default"));

    sec.appendChild(keepOpenDiv);
    container.appendChild(sec);
  }

  /***************************************************
   * 8) Main init
   ***************************************************/
  function initTool() {
    if (!isTicketPage()) return;
    if (document.getElementById("multitool-beast-wrapper")) return;

    injectCSS();
    initTheme();

    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";

    // Restore position if saved
    const pos = loadPref("boxPosition", null);
    if (pos && pos.top && pos.left) {
      wrapper.style.top = pos.top;
      wrapper.style.left = pos.left;
    }

    // Display preference
    wrapper.style.display = loadPref("keepOpen", false) ? "block" : "none";
    if (loadPref("keepOpen", false)) {
      savePref("multitool_open", true);
    }
    const isOpen = loadPref("multitool_open", false);
    if (!isOpen) {
      wrapper.style.display = "none";
    }

    // Drag handle (tiny tab in top center)
    const dragHandle = document.createElement('div');
    dragHandle.className = "drag-handle";
    wrapper.appendChild(dragHandle);

    // Top bar
    const topBar = document.createElement('div');
    topBar.className = "mtb-top-bar";

    // left container (circle buttons)
    const topBarLeft = document.createElement('div');
    topBarLeft.className = "mtb-top-bar-left";

    // Up/down/close circle buttons
    const upBtn = document.createElement('button');
    upBtn.className = "circle-btn";
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const downBtn = document.createElement('button');
    downBtn.className = "circle-btn";
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));

    const closeBtn = document.createElement('button');
    closeBtn.className = "circle-btn close-btn";
    closeBtn.textContent = "×";
    closeBtn.title = "Close Panel";
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = "none";
      savePref("multitool_open", false);
      const openBtn = document.getElementById('sway-open-btn');
      if (openBtn) openBtn.style.display = "block";
    });

    topBarLeft.appendChild(upBtn);
    topBarLeft.appendChild(downBtn);
    topBarLeft.appendChild(closeBtn);

    // right container (theme toggle)
    const topBarRight = document.createElement('div');
    topBarRight.className = "mtb-top-bar-right";

    const toggleWrapper = document.createElement('div');
    toggleWrapper.className = "theme-toggle-wrapper";
    const toggleInput = document.createElement('input');
    toggleInput.type = "checkbox";
    toggleInput.id = "theme-toggle";
    toggleInput.className = "theme-toggle";
    toggleInput.checked = (loadPref("theme","light") === "dark");
    toggleInput.addEventListener('change', () => {
      toggleTheme(toggleInput.checked ? "dark" : "light");
    });
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = "theme-toggle";
    const moonSpan = document.createElement('span');
    moonSpan.className = "toggle-icon toggle-icon--moon";
    moonSpan.innerHTML = moonIconSVG;
    const sunSpan = document.createElement('span');
    sunSpan.className = "toggle-icon toggle-icon--sun";
    sunSpan.innerHTML = sunIconSVG;
    toggleLabel.appendChild(moonSpan);
    toggleLabel.appendChild(sunSpan);
    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleLabel);

    topBarRight.appendChild(toggleWrapper);

    // assemble top bar
    topBar.appendChild(topBarLeft);
    topBar.appendChild(topBarRight);
    wrapper.appendChild(topBar);

    // The header (logo + title)
    const header = document.createElement('div');
    header.className = "mtb-header";

    const tealiumLogo = document.createElement('img');
    tealiumLogo.className = "mtb-logo";
    tealiumLogo.src = "https://www.tealium.com/wp-content/uploads/2021/07/cropped-Tealium-logo-2021-32x32.png"; 
    // ^ Replace with your desired Tealium logo

    const h3 = document.createElement('h3');
    h3.className = "mtb-title";
    h3.textContent = "MultiTool Beast";

    header.appendChild(tealiumLogo);
    header.appendChild(h3);
    wrapper.appendChild(header);

    // The main content area (tabs + content)
    const content = document.createElement('div');
    content.className = "mtb-content";

    // Tabs row
    const tabsUL = document.createElement('ul');
    tabsUL.className = "mtb-tabs";

    const profileTab = document.createElement('li');
    profileTab.id = "tab-btn-profile";
    profileTab.className = "mtb-tab active";
    profileTab.innerHTML = `${personIconSVG} <span>Profile</span>`;
    profileTab.addEventListener('click', () => showTab('profile'));

    const pinnedTab = document.createElement('li');
    pinnedTab.id = "tab-btn-pinned";
    pinnedTab.className = "mtb-tab";
    pinnedTab.innerHTML = `${pinIconSVG} <span>Pinned</span>`;
    pinnedTab.addEventListener('click', () => showTab('pinned'));

    const settingsTab = document.createElement('li');
    settingsTab.id = "tab-btn-settings";
    settingsTab.className = "mtb-tab";
    settingsTab.innerHTML = `${settingsIconSVG} <span>Settings</span>`;
    settingsTab.addEventListener('click', () => showTab('settings'));

    tabsUL.appendChild(profileTab);
    tabsUL.appendChild(pinnedTab);
    tabsUL.appendChild(settingsTab);

    content.appendChild(tabsUL);

    // Tab contents
    const profileContent = document.createElement('div');
    profileContent.id = "tab-content-profile";
    profileContent.className = "tab-content";
    profileContent.style.display = "block";

    const pinnedContent = document.createElement('div');
    pinnedContent.id = "tab-content-pinned";
    pinnedContent.className = "tab-content";

    const settingsContent = document.createElement('div');
    settingsContent.id = "tab-content-settings";
    settingsContent.className = "tab-content";

    content.appendChild(profileContent);
    content.appendChild(pinnedContent);
    content.appendChild(settingsContent);

    wrapper.appendChild(content);
    document.body.appendChild(wrapper);

    // Populate tabs
    populateProfileTab(profileContent);
    buildPinnedTabContent(pinnedContent);
    buildSettingsContent(settingsContent);

    // Drag events
    let isDragging = false;
    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      isDragging = true;
      wrapper.classList.add("dragging");
      let posX = e.clientX;
      let posY = e.clientY;
      function dragMove(e2) {
        if (!isDragging) return;
        e2.preventDefault();
        let deltaX = posX - e2.clientX;
        let deltaY = e2.clientY - posY;
        posX = e2.clientX;
        posY = e2.clientY;
        wrapper.style.top = (wrapper.offsetTop + deltaY) + "px";
        wrapper.style.left = (wrapper.offsetLeft - deltaX) + "px";
      }
      function closeDrag() {
        isDragging = false;
        wrapper.classList.remove("dragging");
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', closeDrag);
        // Save new position
        savePref("boxPosition", {
          top: wrapper.style.top,
          left: wrapper.style.left
        });
      }
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', closeDrag);
    });

    // Show default tab
    showTab('profile');
  }

  // Update content if the ticket changes
  let currentId = extractTicketId();
  setInterval(function() {
    const newId = extractTicketId();
    if (newId && newId !== currentId) {
      currentId = newId;
      const container = document.getElementById('tab-content-profile');
      if (container) {
        populateProfileTab(container);
      }
    }
  }, 3000);

  /***************************************************
   * 9) The Open Button
   ***************************************************/
  const openBtn = document.createElement('button');
  openBtn.id = "sway-open-btn";
  openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=40,h=40,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png">`;

  const isOpenPref = loadPref("multitool_open", false) || loadPref("keepOpen", false);
  if (isOpenPref) {
    openBtn.style.display = "none";
  }
  openBtn.addEventListener('click', function() {
    const panel = document.getElementById('multitool-beast-wrapper');
    if (panel) {
      panel.style.display = "block";
      savePref("multitool_open", true);
    }
    openBtn.style.display = "none";
    showTab('profile');
    const container = document.getElementById('tab-content-profile');
    if (container) {
      populateProfileTab(container);
    }
  });
  document.body.appendChild(openBtn);

  /***************************************************
   * 10) Initialize on DOM ready
   ***************************************************/
  if (!isTicketPage()) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initTheme();
      setTimeout(initTool, 1500);
    });
  } else {
    initTheme();
    setTimeout(initTool, 1500);
  }

})();
