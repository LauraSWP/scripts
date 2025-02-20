// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      2.1
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
   * 0) Utility icon definitions (SVG)
   ***************************************************/
  const personIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
  <path d="M2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"/>
</svg>`;

  const pinIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M4.146 14.354a.5.5 0 0 0 .708 0L8 11.207l3.146 3.147a.5.5 0 0 0 .708-.708l-3.147-3.146 3.034-3.034a.5.5 0 0 0-.708-.708L8 6.793 4.966 3.76a.5.5 0 0 0-.708.708l3.034 3.034-3.146 3.146a.5.5 0 0 0 0 .708z"/>
</svg>`;

  const settingsIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.115 2.693l.319.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.115l-.094.319c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291a1.873 1.873 0 0 0-1.115-2.693l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094a1.873 1.873 0 0 0 1.115-2.693l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.693-1.115l.094-.319z"/>
</svg>`;

  // NOTE: Replace the below truncated SVGs with complete, valid SVG definitions
  const sunIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 4a4 4 0 1 0 0 8A4 4 0 0 0 8 4z"/>
  <!-- additional paths for sun icon -->
</svg>`;

  const moonIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M11 0a.5.5 0 0 1 . . ."/>
  <!-- additional paths for moon icon -->
</svg>`;

  /***************************************************
   * X) Inject Pastel Sway CSS Styles
   ***************************************************/
  function injectCSS() {
    if (document.getElementById("multitool-beast-css")) return;
    const style = document.createElement('style');
    style.id = "multitool-beast-css";
    style.innerHTML = `
      /* Wrapper styles */
      #multitool-beast-wrapper {
        background-color: #fdf6e3;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-family: sans-serif;
        padding: 10px;
        z-index: 9999;
      }
      /* Header & Title */
      .sway-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        background-color: #eee;
        border-bottom: 1px solid #ccc;
      }
      .sway-titlebar {
        display: flex;
        align-items: center;
        font-size: 16px;
      }
      .sway-header-buttons button {
        margin-left: 5px;
      }
      /* Tabs */
      .sway-tabs {
        list-style: none;
        display: flex;
        padding: 0;
        margin: 10px 0;
        border-bottom: 1px solid #ccc;
      }
      .sway-tab {
        padding: 5px 10px;
        cursor: pointer;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        background-color: #fdf6e3;
        margin-right: 5px;
      }
      .sway-tab.active {
        background-color: #fff;
        border: 1px solid #ccc;
        border-bottom: none;
      }
      .sway-content {
        padding: 10px;
        background-color: #fff;
        min-height: 100px;
      }
      /* Buttons */
      .sway-btn {
        background-color: #a8dadc;
        border: 1px solid #457b9d;
        color: #1d3557;
        padding: 5px 8px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
      }
      .sway-btn:hover {
        background-color: #457b9d;
        color: #fff;
      }
      .sway-btn-xs {
        font-size: 12px;
        padding: 3px 6px;
      }
      .sway-btn-blue {
        background-color: #2196F3;
        color: #fff;
        border-color: #1976D2;
      }
      .sway-btn-red {
        background-color: #f44336;
        color: #fff;
        border-color: #d32f2f;
      }
      /* Draggable handle */
      .sway-handle {
        background: #eee;
        border: 1px solid #ccc;
        cursor: move;
        display: block;
        width: 100%;
        text-align: center;
        padding: 2px;
        margin-top: 5px;
      }
      /* Field rows */
      .fieldRow {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
      }
      .fieldRow span {
        margin-right: 5px;
      }
      .fw-bold {
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  /***************************************************
   * 1) Utility Functions
   ***************************************************/
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }

  function extractTicketId() {
    const match = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }

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
    console.log("[CARR] Company URL:", compURL);
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
              console.error("[CARR] Error after showMore:", e);
              document.body.removeChild(iframe);
              callback("N/A");
            }
          }, 2000);
        } catch(e) {
          console.error("[CARR] Initial iframe error:", e);
          document.body.removeChild(iframe);
          callback("N/A");
        }
      }, 2000);
    };
    document.body.appendChild(iframe);
  }

  function savePref(key, value) {
    localStorage.setItem("mtb_"+key, JSON.stringify(value));
  }
  function loadPref(key, defaultVal) {
    const v = localStorage.getItem("mtb_"+key);
    return v ? JSON.parse(v) : defaultVal;
  }

  /***************************************************
   * 2) Theme Functions
   ***************************************************/
  function initTheme() {
    const storedTheme = loadPref("theme", "light");
    applyTheme(storedTheme);
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode-override");
      document.body.style.backgroundColor = "#1f2937";
      document.body.style.color = "#e2e8f0";
    } else {
      document.body.classList.remove("dark-mode-override");
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    }
  }

  function toggleTheme() {
    const current = loadPref("theme", "light");
    const newTheme = current === "dark" ? "light" : "dark";
    savePref("theme", newTheme);
    applyTheme(newTheme);
    const iconEl = document.getElementById("theme-icon");
    if (iconEl) {
      iconEl.innerHTML = newTheme === "dark" ? sunIconSVG : moonIconSVG;
    }
  }

  /***************************************************
   * 3) Tab Switching
   ***************************************************/
  function showTab(which) {
    const tabProfile = document.getElementById("tab-content-profile");
    const tabPinned = document.getElementById("tab-content-pinned");
    const tabSettings = document.getElementById("tab-content-settings");

    const navProfile = document.getElementById("tab-btn-profile");
    const navPinned = document.getElementById("tab-btn-pinned");
    const navSettings = document.getElementById("tab-btn-settings");

    if (!tabProfile || !tabPinned || !tabSettings) return;
    if (!navProfile || !navPinned || !navSettings) return;

    tabProfile.style.display = "none";
    tabPinned.style.display = "none";
    tabSettings.style.display = "none";

    navProfile.classList.remove("active");
    navPinned.classList.remove("active");
    navSettings.classList.remove("active");

    if (which === "profile") {
      tabProfile.style.display = "block";
      navProfile.classList.add("active");
    } else if (which === "pinned") {
      tabPinned.style.display = "block";
      navPinned.classList.add("active");
    } else {
      tabSettings.style.display = "block";
      navSettings.classList.add("active");
    }
  }

  /***************************************************
   * 4) Copying logic for "Copy Selected" in Profile
   ***************************************************/
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

  /***************************************************
   * 5) Create a field row
   ***************************************************/
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
      btn.className = "sway-btn sway-btn-xs";
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

  /***************************************************
   * 6) Build pinned tab content
   ***************************************************/
  function buildPinnedTabContent() {
    const grid = document.createElement('div');
    grid.style.display = "flex";
    grid.style.flexWrap = "wrap";
    grid.style.gap = "8px";

    const items = [
      { icon: '📄', label: 'Docs', link: 'https://docs.google.com/' },
      { icon: '🔗', label: 'Website', link: 'https://www.example.com' },
      { icon: '📊', label: 'Analytics', link: 'https://analytics.google.com' },
      { icon: '🚀', label: 'Rocket', link: 'https://www.spacex.com' }
    ];

    items.forEach(function(item) {
      const card = document.createElement('div');
      card.style.width = "calc(50% - 4px)";
      card.style.backgroundColor = "#f9fafb";
      card.style.border = "1px solid #ccc";
      card.style.borderRadius = "6px";
      card.style.textAlign = "center";
      card.style.padding = "12px";
      card.style.cursor = "pointer";
      card.style.color = "#333";
      card.innerHTML = `<div style="font-size:24px;">${item.icon}</div>
                        <div style="margin-top:6px;font-weight:500;">${item.label}</div>`;
      card.addEventListener('click', function() {
        window.open(item.link, '_blank');
      });
      grid.appendChild(card);
    });
    return grid;
  }

  /***************************************************
   * 7) Populate Profile Tab
   ***************************************************/
  function populateProfileTab(container) {
    container.innerHTML = "";
    const currentTicketId = extractTicketId();
    const tIdVal = currentTicketId ? "#" + currentTicketId : "N/A";
    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]') || { value: "" }).value.trim();

    container.appendChild(createMenuItem("Ticket ID", tIdVal));
    container.appendChild(createMenuItem("Account", accountVal));
    container.appendChild(createMenuItem("Account Profile", profileVal));
    const carrRow = createMenuItem("CARR", "Fetching...", false);
    container.appendChild(carrRow);
    container.appendChild(createMenuItem("Relevant URLs", urlsVal));

    const copyAccBtn = document.createElement('button');
    copyAccBtn.textContent = "Copy Account/Profile";
    copyAccBtn.className = "sway-btn sway-btn-xs";
    copyAccBtn.style.marginTop = "8px";
    copyAccBtn.addEventListener('click', function() {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(function() {
        copyAccBtn.textContent = "Copied!";
        setTimeout(function() { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    container.appendChild(copyAccBtn);

    const hr = document.createElement('hr');
    hr.style.margin = "10px 0";
    container.appendChild(hr);

    const rHead = document.createElement('div');
    rHead.textContent = "Recent Tickets (last 7 days)";
    rHead.style.fontWeight = "600";
    rHead.style.marginBottom = "8px";
    container.appendChild(rHead);

    const recTix = getRecentTickets(currentTicketId);
    if (recTix.length > 0) {
      recTix.forEach(function(t) {
        const tDiv = document.createElement('div');
        tDiv.style.marginBottom = "8px";
        tDiv.style.paddingBottom = "8px";
        tDiv.style.borderBottom = "1px solid #ccc";

        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.style.color = "#2563eb";
        tDiv.appendChild(a);

        const cpBtn = document.createElement('button');
        cpBtn.className = "sway-btn sway-btn-xs";
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

        container.appendChild(tDiv);
      });
    } else {
      const noDiv = document.createElement('div');
      noDiv.textContent = "No tickets in the last 7 days";
      container.appendChild(noDiv);
    }

    fetchCARR(function(cVal) {
      const vEl = carrRow.querySelector('.fresh-value');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***************************************************
   * 8) Build Settings Tab
   ***************************************************/
  function buildSettingsContent() {
    const settingsDiv = document.createElement('div');

    const themeLabel = document.createElement('label');
    themeLabel.textContent = "Theme:";
    themeLabel.style.display = "block";
    themeLabel.style.marginBottom = "6px";

    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.id = "theme-icon";
    const currentTheme = loadPref("theme", "light");
    themeToggleBtn.innerHTML = (currentTheme === "dark") ? sunIconSVG : moonIconSVG;
    themeToggleBtn.className = "sway-btn sway-btn-xs";
    themeToggleBtn.style.marginLeft = "8px";
    themeToggleBtn.addEventListener('click', function() {
      toggleTheme();
      themeToggleBtn.innerHTML = (loadPref("theme","light") === "dark") ? sunIconSVG : moonIconSVG;
    });

    themeLabel.appendChild(themeToggleBtn);
    settingsDiv.appendChild(themeLabel);

    const keepOpenDiv = document.createElement('div');
    keepOpenDiv.style.marginTop = "8px";
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
    settingsDiv.appendChild(keepOpenDiv);

    return settingsDiv;
  }

  /***************************************************
   * 9) Initialize the Side Panel
   ***************************************************/
  function initTool() {
    if (!isTicketPage()) {
      console.log("[MultiTool Beast] Not a ticket page. Exiting init.");
      return;
    }
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    
    // Inject our pastel CSS styles
    injectCSS();
    initTheme();

    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";

    const pos = loadPref("boxPosition", null);
    if (pos && pos.top && pos.left) {
      wrapper.style.position = "fixed";
      wrapper.style.top = pos.top;
      wrapper.style.left = pos.left;
    } else {
      wrapper.style.position = "fixed";
      wrapper.style.bottom = "80px";
      wrapper.style.right = "20px";
    }
    wrapper.style.width = "360px";
    wrapper.style.minWidth = "200px";
    wrapper.style.minHeight = "200px";
    wrapper.style.resize = "both";
    wrapper.style.overflow = "auto";
    wrapper.style.display = loadPref("keepOpen", false) ? "block" : "none";

    if (loadPref("keepOpen", false)) {
      savePref("multitool_open", true);
    }
    const isOpen = loadPref("multitool_open", false);
    if (!isOpen) {
      wrapper.style.display = "none";
    }

    const header = document.createElement('div');
    header.className = "sway-header";

    const leftDiv = document.createElement('div');
    leftDiv.className = "sway-titlebar";
    leftDiv.innerHTML = `${personIconSVG} <span style="font-weight:600; margin-left:4px;">MultiTool Beast</span>`;
    header.appendChild(leftDiv);

    const rightDiv = document.createElement('div');
    rightDiv.className = "sway-header-buttons";

    const upBtn = document.createElement('button');
    upBtn.className = "sway-btn";
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    rightDiv.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.className = "sway-btn";
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    rightDiv.appendChild(downBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = "sway-btn sway-btn-red";
    closeBtn.textContent = "Close";
    closeBtn.title = "Close MultiTool Beast";
    closeBtn.addEventListener('click', function() {
      wrapper.style.display = "none";
      savePref("multitool_open", false);
      const openBtn = document.getElementById('sway-open-btn');
      if (openBtn) openBtn.style.display = "block";
    });
    rightDiv.appendChild(closeBtn);

    header.appendChild(rightDiv);
    wrapper.appendChild(header);

    const tabsBar = document.createElement('ul');
    tabsBar.className = "sway-tabs";

    const profileTab = document.createElement('li');
    profileTab.id = "tab-btn-profile";
    profileTab.className = "sway-tab active";
    profileTab.innerHTML = `${personIconSVG} <span style="margin-left:4px;">Profile</span>`;
    profileTab.addEventListener('click', () => showTab('profile'));
    tabsBar.appendChild(profileTab);

    const pinnedTab = document.createElement('li');
    pinnedTab.id = "tab-btn-pinned";
    pinnedTab.className = "sway-tab";
    pinnedTab.innerHTML = `${pinIconSVG} <span style="margin-left:4px;">Pinned</span>`;
    pinnedTab.addEventListener('click', () => showTab('pinned'));
    tabsBar.appendChild(pinnedTab);

    const settingsTab = document.createElement('li');
    settingsTab.id = "tab-btn-settings";
    settingsTab.className = "sway-tab";
    settingsTab.innerHTML = `${settingsIconSVG} <span style="margin-left:4px;">Settings</span>`;
    settingsTab.addEventListener('click', () => showTab('settings'));
    tabsBar.appendChild(settingsTab);

    wrapper.appendChild(tabsBar);

    const profileContent = document.createElement('div');
    profileContent.id = "tab-content-profile";
    profileContent.className = "sway-content";
    profileContent.style.display = "block";

    const copyRow = document.createElement('div');
    copyRow.style.display = "flex";
    copyRow.style.justifyContent = "space-between";
    copyRow.style.marginBottom = "8px";

    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.className = "sway-btn sway-btn-blue";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.addEventListener('click', copyAllSelected);
    copyRow.appendChild(copyAllBtn);

    const summaryDiv = document.createElement('div');
    summaryDiv.style.marginBottom = "8px";
    const sumCheck = document.createElement('input');
    sumCheck.type = "checkbox";
    sumCheck.id = "include-summary";
    sumCheck.style.marginRight = "4px";
    summaryDiv.appendChild(sumCheck);
    summaryDiv.appendChild(document.createTextNode("Include Summary"));

    profileContent.appendChild(copyRow);
    profileContent.appendChild(summaryDiv);

    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = "profile-fields-container";
    profileContent.appendChild(profileFieldsContainer);
    wrapper.appendChild(profileContent);

    const pinnedContent = document.createElement('div');
    pinnedContent.id = "tab-content-pinned";
    pinnedContent.className = "sway-content";
    pinnedContent.style.display = "none";
    pinnedContent.appendChild(buildPinnedTabContent());
    wrapper.appendChild(pinnedContent);

    const settingsContent = document.createElement('div');
    settingsContent.id = "tab-content-settings";
    settingsContent.className = "sway-content";
    settingsContent.style.display = "none";
    const setDiv = buildSettingsContent();
    settingsContent.appendChild(setDiv);
    wrapper.appendChild(settingsContent);

    populateProfileTab(profileFieldsContainer);

    const dragHandle = document.createElement('button');
    dragHandle.className = "sway-handle";
    dragHandle.textContent = "✋";
    wrapper.appendChild(dragHandle);
    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      let posX = e.clientX;
      let posY = e.clientY;
      function dragMove(e2) {
        e2.preventDefault();
        let deltaX = posX - e2.clientX;
        let deltaY = e2.clientY - posY;
        posX = e2.clientX;
        posY = e2.clientY;
        wrapper.style.top = (wrapper.offsetTop + deltaY) + "px";
        wrapper.style.left = (wrapper.offsetLeft - deltaX) + "px";
      }
      function closeDrag() {
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', closeDrag);
        savePref("boxPosition", {
          top: wrapper.style.top,
          left: wrapper.style.left
        });
      }
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', closeDrag);
    });

    showTab('profile');
    document.body.appendChild(wrapper);
    window._multitoolWrapper = wrapper;
    console.log("[MultiTool Beast] Sway panel loaded.");
  }

  /***************************************************
   * 10) Auto-update on URL change
   ***************************************************/
  let currentId = extractTicketId();
  setInterval(function() {
    const newId = extractTicketId();
    if (newId && newId !== currentId) {
      console.log("[MultiTool Beast] Ticket changed from", currentId, "to", newId);
      currentId = newId;
      const container = document.getElementById('profile-fields-container');
      if (container) {
        populateProfileTab(container);
      }
    }
  }, 3000);

  /***************************************************
   * 11) The open button (bottom-right)
   ***************************************************/
  const openBtn = document.createElement('button');
  openBtn.id = "sway-open-btn";
  openBtn.style.position = "fixed";
  openBtn.style.bottom = "0";
  openBtn.style.right = "0";
  openBtn.style.zIndex = "99999";
  openBtn.style.borderTopLeftRadius = "0";
  openBtn.style.borderTopRightRadius = "0";
  openBtn.style.borderBottomLeftRadius = "8px";
  openBtn.style.borderBottomRightRadius = "8px";
  openBtn.style.padding = "8px";
  openBtn.style.backgroundColor = "#374151";
  openBtn.style.border = "1px solid #4b5563";
  openBtn.style.boxShadow = "0 -2px 4px rgba(0,0,0,0.2)";
  openBtn.style.cursor = "pointer";
  openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=40,h=40,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png">`;

  const isOpenPref = loadPref("multitool_open", false) || loadPref("keepOpen", false);
  if (isOpenPref) {
    openBtn.style.display = "none";
  }
  openBtn.addEventListener('click', function() {
    if (window._multitoolWrapper) {
      window._multitoolWrapper.style.display = "block";
      savePref("multitool_open", true);
    }
    openBtn.style.display = "none";
    showTab('profile');
    const container = document.getElementById('profile-fields-container');
    if (container) {
      populateProfileTab(container);
    }
  });
  document.body.appendChild(openBtn);

  /***************************************************
   * 12) Initialize on DOM ready
   ***************************************************/
  if (!isTicketPage()) {
    return;
  }

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
