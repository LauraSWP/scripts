// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      3.6
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @match        *://tealium.atlassian.net/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  /***************************************************
   * DOMAIN CHECKS
   ***************************************************/
  const isFreshdesk = window.location.hostname.includes("freshdesk.com");
  const isJira = window.location.hostname.includes("tealium.atlassian.net");

  /***************************************************
   * JIRA-SPECIFIC CODE
   * Only run if URL contains autofillJira=true and on the Create Issue page.
   ***************************************************/
  if (isJira) {
    if (window.location.search.includes("autofillJira=true") && window.location.href.includes("CreateIssue!default.jspa")) {
      console.log("[MultiTool] Jira autofill triggered.");
      function autoAdvanceThenFill() {
        const nextBtn = document.querySelector('#issue-create-submit[name="Next"]');
        if (nextBtn) {
          console.log("[MultiTool] Found 'Next' button; clicking it...");
          nextBtn.click();
          // Wait for page transition (adjust timeout if needed)
          setTimeout(fillCustomField, 3000);
        } else {
          console.log("[MultiTool] 'Next' button not found; attempting to fill field...");
          fillCustomField();
        }
      }
      function fillCustomField() {
        const field = document.getElementById("customfield_10652-field");
        if (field) {
          const storedVal = localStorage.getItem("latest_account_profile") || "";
          console.log("[MultiTool] Filling customfield_10652 with:", storedVal);
          field.value = storedVal;
          clearInterval(jiraInterval);
        } else {
          console.log("[MultiTool] customfield_10652-field not yet available.");
        }
      }
      const jiraInterval = setInterval(autoAdvanceThenFill, 1000);
    }
    return; // Exit here so Freshdesk UI isn't built on Jira.
  }

  /***************************************************
   * FRESHDESK MULTITOOL CODE
   * Runs on Freshdesk ticket pages.
   ***************************************************/
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  if (!isFreshdesk || !isTicketPage()) {
    console.log("[MultiTool] Not a Freshdesk ticket page. Exiting.");
    return;
  }

  /***************************************************
   * UTILITY FUNCTIONS & PREFERENCES
   ***************************************************/
  function savePref(key, value) {
    localStorage.setItem("mtb_" + key, JSON.stringify(value));
  }
  function loadPref(key, defaultVal) {
    const v = localStorage.getItem("mtb_" + key);
    return v ? JSON.parse(v) : defaultVal;
  }
  function getFieldValue(el) {
    if (!el) return "";
    let val = el.value || el.getAttribute("value") || el.getAttribute("placeholder") || "";
    val = val.trim();
    if (!val) {
      let p = el.parentElement;
      if (p) val = p.innerText.trim();
    }
    if (!val || ["account", "profile"].includes(val.toLowerCase())) val = "N/A";
    return val;
  }
  // Extract summary from a ticket note, if available.
  function getSummary() {
    const note = document.querySelector(".ticket_note[data-note-id]");
    return note ? note.textContent.trim() : "";
  }
  // Get recent tickets (last 7 days)
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
  // Fetch CARR value asynchronously from the company page.
  function fetchCARR(callback) {
    const compLink = document.querySelector('a[href*="/a/companies/"]');
    if (!compLink) return callback("N/A");
    const rel = compLink.getAttribute("href");
    const compURL = window.location.origin + rel;
    console.log("[CARR] Company URL:", compURL);
    const iframe = document.createElement("iframe");
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
  
  /***************************************************
   * THEME FUNCTIONS
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
   * CSS INJECTION (PLACEHOLDER)
   ***************************************************/
  function injectCSS() {
    if (document.getElementById("multitool-beast-css")) return;
    const style = document.createElement("style");
    style.id = "multitool-beast-css";
    style.innerHTML = `/* Pastel Sway Material Panel Styles */

    /* Color Variables */
    :root {
      --light-panel-bg: #fffaf5;
      --light-panel-fg: #2f2f2f;
      --light-panel-border: #d1ccc9;
      --dark-panel-bg: #1e293b;
      --dark-panel-fg: #e2e8f0;
      --dark-panel-border: #475569;
      --tab-bg: #e8f1fa;
      --tab-border: #b3d4f0;
      --tab-fg: #14425c;
      --tab-active-bg: #d3eafc;
      --tab-active-border: #91c7f3;
      --tab-active-fg: #0f2d3f;
    }
    
    /* Mode-Specific Variables */
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
    
    /* Main Panel */
    #multitool-beast-wrapper {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 380px;
      min-width: 280px;
      height: 550px;
      background-color: var(--panel-bg);
      color: var(--panel-fg);
      border: 2px solid var(--panel-border);
      border-radius: 16px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
      z-index: 999999;
      display: none;
      overflow-y: auto;
      transition: box-shadow 0.2s;
    }
    #multitool-beast-wrapper.dragging {
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 9999999;
    }
    
    /* Drag Handle */
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
      z-index: 10000;
      pointer-events: all;
    }
    
    /* Top Bar */
    .mtb-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-bottom: 1px solid var(--panel-border);
      margin-bottom: 4px;
    }
    .mtb-top-bar-left,
    .mtb-top-bar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .circle-btn {
      width: 30px;
      height: 30px;
      background-color: #f5f5f5;
      border: 1px solid #d0d0d0;
      color: #666;
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s, box-shadow 0.15s;
    }
    .circle-btn:hover {
      background-color: #e9e9e9;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .close-btn {
      background-color: #ffe5e5;
      border: 1px solid #ffaaaa;
      color: #cc0000;
    }
    .close-btn:hover {
      background-color: #ffd6d6;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    
    /* Theme Toggle */
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
    
    /* Header */
    .mtb-header {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      gap: 8px;
      position: relative;
      border-bottom: 1px solid var(--panel-border);
      margin-bottom: 4px;
      overflow: hidden;
    }
    .mtb-header::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 8px;
      background: linear-gradient(to bottom, transparent, var(--tab-border));
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
    
    /* Main Content Area */
    .mtb-content {
      padding: 8px 12px;
    }
    
    /* Tabs */
    .mtb-tabs {
      display: flex;
      gap: 8px;
      margin: 0 0 8px 0;
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
    
    /* Tab Content */
    .tab-content {
      display: none;
    }
    
    /* Section Blocks */
    .mtb-section {
      background-color: rgba(0,0,0,0.02);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
    }
    
    /* Field Rows */
    .fieldRow {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 4px;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--panel-border);
    }
    .fieldRow:last-child {
      border-bottom: none;
    }
    
    /* Fresh Value Styling */
    .fresh-value {
      background-color: rgba(0,0,0,0.05);
      padding: 2px 4px;
      border-radius: 4px;
      color: #333;
      font-weight: 500;
    }
    
    /* Button Styles */
    .sway-btn-text {
      padding: 6px 12px;
      border-radius: 12px;
      background-color: var(--tab-bg);
      color: var(--tab-fg);
      border: 1px solid var(--tab-border);
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.15s, box-shadow 0.15s;
    }
    .sway-btn-text:hover {
      background-color: #eef7ff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
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
    
    /* Recent Ticket Links */
    .recent-ticket {
      display: inline-block;
      background-color: #f0f8ff;
      color: #2563eb;
      padding: 4px 8px;
      border: 1px solid #b3d4f0;
      border-radius: 8px;
      text-decoration: none;
      transition: background-color 0.2s, box-shadow 0.2s;
    }
    .recent-ticket:hover {
      background-color: #e0f0ff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Open Button (Floating) */
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
    }`;
    document.head.appendChild(style);
  }
  
  /***************************************************
   * TAB SWITCHING
   ***************************************************/
  function showTab(which) {
    ["profile", "pinned", "settings"].forEach(id => {
      const contentEl = document.getElementById("tab-content-" + id);
      const tabEl = document.getElementById("tab-btn-" + id);
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
   * PROFILE TAB: POPULATE UI WITH ALL FEATURES
   ***************************************************/
  function populateProfileTab(container) {
    container.innerHTML = "";
    const ticketMatch = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    const ticketId = ticketMatch ? ticketMatch[1] : "N/A";
    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    localStorage.setItem("latest_account_profile", accountVal + "/" + profileVal);
    
    const sec = document.createElement("div");
    sec.className = "mtb-section";
    
    // Helper: create field row with optional copy button
    function createFieldRow(labelText, valueText, withCopy = true) {
      const row = document.createElement("div");
      row.className = "fieldRow";
      const lbl = document.createElement("span");
      lbl.textContent = labelText + ": ";
      lbl.style.fontWeight = "600";
      row.appendChild(lbl);
      const valSpan = document.createElement("span");
      valSpan.className = "fresh-value";
      valSpan.textContent = valueText || "N/A";
      row.appendChild(valSpan);
      if (withCopy) {
        const btn = document.createElement("button");
        btn.className = "sway-btn-icon";
        btn.title = "Copy";
        btn.innerHTML = "📋";
        btn.addEventListener("click", function() {
          navigator.clipboard.writeText(valueText).then(() => {
            btn.innerHTML = "<span style='color:green;'>&#10003;</span>";
            setTimeout(() => { btn.innerHTML = "📋"; }, 2000);
          });
        });
        row.appendChild(btn);
      }
      return row;
    }
    
    // Ticket ID row (no copy button)
    sec.appendChild(createFieldRow("Ticket ID", "#" + ticketId, false));
    // Account row with copy
    sec.appendChild(createFieldRow("Account", accountVal));
    // Profile row with copy
    sec.appendChild(createFieldRow("Account Profile", profileVal));
    // CARR row (will be updated asynchronously; no copy button)
    const carrRow = createFieldRow("CARR", "Fetching...", false);
    sec.appendChild(carrRow);
    // Relevant URLs row
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]') || {value:""}).value.trim();
    sec.appendChild(createFieldRow("Relevant URLs", urlsVal));
    
    // "Copy Account/Profile" button
    const copyAccBtn = document.createElement("button");
    copyAccBtn.className = "sway-btn-text";
    copyAccBtn.textContent = "Copy Account/Profile";
    copyAccBtn.addEventListener("click", function() {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(() => {
        copyAccBtn.textContent = "Copied!";
        setTimeout(() => { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    sec.appendChild(copyAccBtn);
    
    // Row for "Copy Selected" and "Include Summary" checkbox
    const copyRow = document.createElement("div");
    copyRow.style.display = "flex";
    copyRow.style.alignItems = "center";
    copyRow.style.marginTop = "8px";
    const copyAllBtn = document.createElement("button");
    copyAllBtn.className = "sway-btn-text";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.addEventListener("click", copyAllSelected);
    copyRow.appendChild(copyAllBtn);
    const summaryCheck = document.createElement("input");
    summaryCheck.type = "checkbox";
    summaryCheck.id = "include-summary";
    summaryCheck.style.marginLeft = "8px";
    copyRow.appendChild(summaryCheck);
    const summaryLabel = document.createElement("label");
    summaryLabel.htmlFor = "include-summary";
    summaryLabel.textContent = "Include Summary";
    copyRow.appendChild(summaryLabel);
    sec.appendChild(copyRow);
    
    // Recent Tickets Section
    const recentHead = document.createElement("div");
    recentHead.textContent = "Recent Tickets (last 7 days)";
    recentHead.style.fontWeight = "600";
    recentHead.style.marginTop = "12px";
    sec.appendChild(recentHead);
    const recTix = getRecentTickets(ticketId);
    if (recTix.length > 0) {
      recTix.forEach(function(t) {
        const tDiv = document.createElement("div");
        tDiv.style.marginBottom = "8px";
        tDiv.style.paddingBottom = "8px";
        tDiv.style.borderBottom = "1px solid #ccc";
        const a = document.createElement("a");
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.className = "recent-ticket";
        tDiv.appendChild(a);
        const cpBtn = document.createElement("button");
        cpBtn.className = "sway-btn-icon";
        cpBtn.title = "Copy Link";
        cpBtn.innerHTML = "📋";
        cpBtn.addEventListener("click", function() {
          navigator.clipboard.writeText(t.href).then(() => {
            cpBtn.innerHTML = "<span style='color:green;'>&#10003;</span>";
            setTimeout(() => { cpBtn.innerHTML = "📋"; }, 2000);
          });
        });
        tDiv.appendChild(cpBtn);
        sec.appendChild(tDiv);
      });
    } else {
      const noDiv = document.createElement("div");
      noDiv.textContent = "No tickets in the last 7 days";
      sec.appendChild(noDiv);
    }
    
    // Asynchronously fetch CARR value and update the CARR row
    fetchCARR(function(cVal) {
      const spans = carrRow.getElementsByClassName("fresh-value");
      if (spans.length > 0) spans[0].textContent = cVal;
    });
    
    container.appendChild(sec);
  }
  
  function copyAllSelected() {
    let copyText = "";
    document.querySelectorAll(".fieldRow").forEach(function(row) {
      const chk = row.querySelector("input.field-selector");
      if (chk && chk.checked) {
        const lbl = row.querySelector("span");
        const val = row.querySelector(".fresh-value");
        if (lbl && val) {
          copyText += lbl.textContent + " " + val.textContent + "\n";
        }
      }
    });
    const summaryCheck = document.getElementById("include-summary");
    if (summaryCheck && summaryCheck.checked) {
      const summaryText = getSummary();
      if (summaryText) {
        copyText += "\nSummary:\n" + summaryText + "\n";
      }
    }
    navigator.clipboard.writeText(copyText).then(() => {
      console.log("Copied selected fields.");
    });
  }
  
  /***************************************************
   * PINNED TAB: OPEN JIRA FORM
   ***************************************************/
  function openJiraForm() {
    const jiraCreateURL = "https://tealium.atlassian.net/secure/CreateIssue!default.jspa";
    const storedVal = localStorage.getItem("latest_account_profile") || "";
    const ticketMatch = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    const ticketId = ticketMatch ? ticketMatch[1] : "N/A";
    const summary = encodeURIComponent("Freshdesk Ticket " + ticketId);
    const description = encodeURIComponent("Account/Profile: " + storedVal);
    const finalURL = jiraCreateURL + "?autofillJira=true&summary=" + summary + "&description=" + description + "&customfield_10652=" + encodeURIComponent(storedVal);
    window.open(finalURL, "_blank");
  }
  
  /***************************************************
   * MAIN MULTITOOL INITIALIZATION (FRESHDESK)
   ***************************************************/
  function initTool() {
    injectCSS();
    initTheme();
    const wrapper = document.createElement("div");
    wrapper.id = "multitool-beast-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.bottom = "80px";
    wrapper.style.right = "20px";
    wrapper.style.width = "380px";
    wrapper.style.height = "550px";
    wrapper.style.backgroundColor = "#fffaf5";
    wrapper.style.border = "2px solid #d1ccc9";
    wrapper.style.borderRadius = "16px";
    wrapper.style.overflowY = "auto";
    wrapper.style.zIndex = "999999";
    let initFontSize = loadPref("mtb_fontSize", 14);
    wrapper.style.fontSize = initFontSize + "px";
    const pos = loadPref("boxPosition", null);
    if (pos && pos.top && pos.left) {
      wrapper.style.top = pos.top;
      wrapper.style.left = pos.left;
    } else {
      wrapper.style.top = "100px";
      wrapper.style.left = "100px";
    }
    if (loadPref("keepOpen", false)) {
      savePref("multitool_open", true);
    }
    const isOpen = loadPref("multitool_open", false);
    wrapper.style.display = isOpen ? "block" : "none";
   
    // Drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    wrapper.appendChild(dragHandle);
    dragHandle.addEventListener("mousedown", function(e) {
      e.preventDefault();
      let isDragging = true;
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
        document.removeEventListener("mousemove", dragMove);
        document.removeEventListener("mouseup", closeDrag);
        savePref("boxPosition", {
          top: wrapper.style.top,
          left: wrapper.style.left
        });
      }
      document.addEventListener("mousemove", dragMove);
      document.addEventListener("mouseup", closeDrag);
    });
   
    // Top Bar
    const topBar = document.createElement("div");
    topBar.className = "mtb-top-bar";
    const topBarLeft = document.createElement("div");
    topBarLeft.className = "mtb-top-bar-left";
    const toggleWrapper = document.createElement("div");
    toggleWrapper.className = "theme-toggle-wrapper";
    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.id = "theme-toggle";
    toggleInput.className = "theme-toggle";
    toggleInput.checked = (loadPref("theme", "light") === "dark");
    toggleInput.addEventListener("change", () => {
      toggleTheme(toggleInput.checked ? "dark" : "light");
    });
    const toggleLabel = document.createElement("label");
    toggleLabel.htmlFor = "theme-toggle";
    const moonSpan = document.createElement("span");
    moonSpan.className = "toggle-icon toggle-icon--moon";
    moonSpan.innerHTML = moonIconSVG;
    const sunSpan = document.createElement("span");
    sunSpan.className = "toggle-icon toggle-icon--sun";
    sunSpan.innerHTML = sunIconSVG;
    toggleLabel.appendChild(moonSpan);
    toggleLabel.appendChild(sunSpan);
    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleLabel);
    topBarLeft.appendChild(toggleWrapper);
   
    const topBarRight = document.createElement("div");
    topBarRight.className = "mtb-top-bar-right";
    const upBtn = document.createElement("button");
    upBtn.className = "circle-btn";
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    const downBtn = document.createElement("button");
    downBtn.className = "circle-btn";
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.addEventListener("click", () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
    const closeBtn = document.createElement("button");
    closeBtn.className = "circle-btn close-btn";
    closeBtn.textContent = "×";
    closeBtn.title = "Close Panel";
    closeBtn.addEventListener("click", () => {
      wrapper.style.display = "none";
      savePref("multitool_open", false);
      const openBtn = document.getElementById("sway-open-btn");
      if (openBtn) openBtn.style.display = "block";
    });
    topBarRight.appendChild(upBtn);
    topBarRight.appendChild(downBtn);
    topBarRight.appendChild(closeBtn);
    topBar.appendChild(topBarLeft);
    topBar.appendChild(topBarRight);
    wrapper.appendChild(topBar);
   
    // Header
    const header = document.createElement("div");
    header.className = "mtb-header";
    const tealiumLogo = document.createElement("img");
    tealiumLogo.className = "mtb-logo";
    tealiumLogo.src = "https://www.tealium.com/wp-content/uploads/2021/07/cropped-Tealium-logo-2021-32x32.png";
    const headerTitle = document.createElement("h3");
    headerTitle.className = "mtb-title";
    headerTitle.textContent = "MultiTool Beast";
    header.appendChild(tealiumLogo);
    header.appendChild(headerTitle);
    wrapper.appendChild(header);
   
    // Content with Tabs
    const content = document.createElement("div");
    content.className = "mtb-content";
    const tabsUL = document.createElement("ul");
    tabsUL.className = "mtb-tabs";
    const profileTab = document.createElement("li");
    profileTab.id = "tab-btn-profile";
    profileTab.className = "mtb-tab active";
    profileTab.innerHTML = `${personIconSVG} <span>Profile</span>`;
    profileTab.addEventListener("click", () => showTab("profile"));
    const pinnedTab = document.createElement("li");
    pinnedTab.id = "tab-btn-pinned";
    pinnedTab.className = "mtb-tab";
    pinnedTab.innerHTML = `${pinIconSVG} <span>Pinned</span>`;
    pinnedTab.addEventListener("click", () => showTab("pinned"));
    const settingsTab = document.createElement("li");
    settingsTab.id = "tab-btn-settings";
    settingsTab.className = "mtb-tab";
    settingsTab.innerHTML = `${settingsIconSVG} <span>Settings</span>`;
    settingsTab.addEventListener("click", () => showTab("settings"));
    tabsUL.appendChild(profileTab);
    tabsUL.appendChild(pinnedTab);
    tabsUL.appendChild(settingsTab);
    content.appendChild(tabsUL);
    const profileContent = document.createElement("div");
    profileContent.id = "tab-content-profile";
    profileContent.className = "tab-content";
    profileContent.style.display = "block";
    const pinnedContent = document.createElement("div");
    pinnedContent.id = "tab-content-pinned";
    pinnedContent.className = "tab-content";
    const settingsContent = document.createElement("div");
    settingsContent.id = "tab-content-settings";
    settingsContent.className = "tab-content";
    content.appendChild(profileContent);
    content.appendChild(pinnedContent);
    content.appendChild(settingsContent);
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
   
    populateProfileTab(profileContent);
    buildPinnedTabContent(pinnedContent);
    buildSettingsContent(settingsContent);
   
    const openBtn = document.createElement("button");
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
    if (loadPref("multitool_open", false)) {
      openBtn.style.display = "none";
    }
    openBtn.addEventListener("click", function() {
      const wrapper = document.getElementById("multitool-beast-wrapper");
      if (wrapper) {
        wrapper.style.display = "block";
        savePref("multitool_open", true);
      }
      openBtn.style.display = "none";
      showTab("profile");
      populateProfileTab(profileContent);
    });
    document.body.appendChild(openBtn);
  }
   
  /***************************************************
   * TICKET CHANGE UPDATE
   ***************************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();
  setInterval(function() {
    const newTicketId = extractTicketId();
    if (newTicketId && newTicketId !== currentTicketId) {
      currentTicketId = newTicketId;
      const profileContent = document.getElementById("tab-content-profile");
      if (profileContent) {
        populateProfileTab(profileContent);
      }
    }
  }, 3000);
   
  /***************************************************
   * INITIALIZATION ON DOM READY
   ***************************************************/
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTool);
  } else {
    initTool();
  }
  
})();
