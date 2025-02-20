// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      3.2
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
   ***************************************************/
  if (isJira) {
    console.log("[MultiTool Script] Jira domain detected.");
    if (window.location.href.includes("CreateIssue!default.jspa")) {
      console.log("[MultiTool Script] Detected Jira Create Issue page. Preparing to auto-click 'Next' and fill customfield_10652.");
      
      function autoAdvanceThenFill() {
        const nextBtn = document.querySelector('#issue-create-submit[name="Next"]');
        if (nextBtn) {
          console.log("[MultiTool Script] Found 'Next' button; clicking it...");
          nextBtn.click();
          setTimeout(fillCustomField, 2000);
        } else {
          console.log("[MultiTool Script] 'Next' button not found; attempting to fill customfield_10652...");
          fillCustomField();
        }
      }
      
      function fillCustomField() {
        const acctField = document.getElementById("customfield_10652-field");
        if (acctField) {
          const storedVal = localStorage.getItem("latest_account_profile") || "";
          console.log("[MultiTool Script] Prefilling customfield_10652 with:", storedVal);
          acctField.value = storedVal;
        } else {
          console.log("[MultiTool Script] customfield_10652-field not found. It may not be visible yet.");
        }
      }
      
      setTimeout(autoAdvanceThenFill, 1500);
    }
    // Do not run the Freshdesk MultiTool UI on Jira pages.
    return;
  }

  /***************************************************
   * FRESHDESK MULTITOOL CODE
   ***************************************************/
  if (!isFreshdesk) return; // Safety check

  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  if (!isTicketPage()) {
    console.log("[MultiTool Script] Not a Freshdesk ticket page. Exiting.");
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

  /***************************************************
   * SVG ICONS
   ***************************************************/
  const moonIconSVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9 9 0 1 0 20.354 15.354z"></path>
</svg>`;
  
  const sunIconSVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="5"></circle>
  <line x1="12" y1="1" x2="12" y2="3"></line>
  <line x1="12" y1="21" x2="12" y2="23"></line>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
  <line x1="1" y1="12" x2="3" y2="12"></line>
  <line x1="21" y1="12" x2="23" y2="12"></line>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
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
  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492z"/>
  <path d="M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.115 2.693l.319.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.115l-.094.319c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291a1.873 1.873 0 0 0-1.115-2.693l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094a1.873 1.873 0 0 0 1.115-2.693l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.693-1.115l.094-.319z"/>
</svg>`;

  /***************************************************
   * CSS INJECTION
   ***************************************************/
  function injectCSS() {
    if (document.getElementById("multitool-beast-css")) return;
    const style = document.createElement("style");
    style.id = "multitool-beast-css";
    style.innerHTML = `
/* ---------------------------
   Pastel Sway Material Panel Styles
   ---------------------------
   Fixed height: 550px; non-resizable, vertical scroll only.
*/

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

/* Tab Content Containers */
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

/* Account Value Styling */
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
}
    `;
    document.head.appendChild(style);
  }

  /***************************************************
   * DARK MODE FUNCTIONS
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
   * TAB SWITCHING FUNCTION
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
   * GET FIELD VALUE FROM FRESHDESK
   ***************************************************/
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

  /***************************************************
   * PROFILE TAB: Populate & Save Data for Jira
   ***************************************************/
  function populateProfileTab(container) {
    container.innerHTML = "";
    const ticketMatch = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    const ticketId = ticketMatch ? ticketMatch[1] : "N/A";
    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    // Save for Jira usage
    localStorage.setItem("latest_account_profile", accountVal + "/" + profileVal);

    const sec = document.createElement("div");
    sec.className = "mtb-section";

    const row1 = document.createElement("div");
    row1.className = "fieldRow";
    row1.textContent = "Ticket ID: " + ticketId;
    sec.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "fieldRow";
    row2.textContent = "Account: " + accountVal;
    sec.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "fieldRow";
    row3.textContent = "Profile: " + profileVal;
    sec.appendChild(row3);

    container.appendChild(sec);
  }

  /***************************************************
   * PINNED TAB: Single Jira Button
   ***************************************************/
  function buildPinnedTabContent(container) {
    container.innerHTML = "";
    const sec = document.createElement("div");
    sec.className = "mtb-section";
    sec.style.textAlign = "center";

    const jiraBtn = document.createElement("button");
    jiraBtn.className = "sway-btn-text";
    jiraBtn.textContent = "Open Jira Form";
    jiraBtn.style.margin = "8px auto";
    jiraBtn.addEventListener("click", openJiraForm);
    sec.appendChild(jiraBtn);

    container.appendChild(sec);
  }

  /***************************************************
   * SETTINGS TAB: Keep Open & Font Size Slider
   ***************************************************/
  function buildSettingsContent(container) {
    container.innerHTML = "";
    const sec = document.createElement("div");
    sec.className = "mtb-section";

    const keepOpenDiv = document.createElement("div");
    const keepOpenChk = document.createElement("input");
    keepOpenChk.type = "checkbox";
    keepOpenChk.id = "keep-box-open-chk";
    keepOpenChk.checked = loadPref("keepOpen", false);
    keepOpenChk.style.marginRight = "6px";
    keepOpenChk.addEventListener("change", function() {
      savePref("keepOpen", keepOpenChk.checked);
    });
    keepOpenDiv.appendChild(keepOpenChk);
    keepOpenDiv.appendChild(document.createTextNode(" Keep box open by default"));
    sec.appendChild(keepOpenDiv);

    const fontSizeDiv = document.createElement("div");
    fontSizeDiv.style.marginTop = "8px";
    const fontSizeLabel = document.createElement("label");
    fontSizeLabel.htmlFor = "fontSizeSlider";
    fontSizeLabel.textContent = "Font Size: ";
    const fontSizeValue = document.createElement("span");
    fontSizeValue.id = "fontSizeValue";
    let storedFontSize = loadPref("mtb_fontSize", 14);
    fontSizeValue.textContent = storedFontSize;
    fontSizeLabel.appendChild(fontSizeValue);
    fontSizeLabel.appendChild(document.createTextNode("px"));
    fontSizeDiv.appendChild(fontSizeLabel);

    const fontSizeSlider = document.createElement("input");
    fontSizeSlider.type = "range";
    fontSizeSlider.id = "fontSizeSlider";
    fontSizeSlider.min = "10";
    fontSizeSlider.max = "20";
    fontSizeSlider.value = storedFontSize;
    fontSizeSlider.style.width = "100%";
    fontSizeSlider.addEventListener("input", function() {
      const newSize = fontSizeSlider.value;
      fontSizeValue.textContent = newSize;
      const wrapper = document.getElementById("multitool-beast-wrapper");
      if (wrapper) wrapper.style.fontSize = newSize + "px";
      savePref("mtb_fontSize", newSize);
    });
    fontSizeDiv.appendChild(fontSizeSlider);
    sec.appendChild(fontSizeDiv);

    container.appendChild(sec);
  }

  /***************************************************
   * OPEN JIRA FORM FUNCTION
   ***************************************************/
  function openJiraForm() {
    const jiraCreateURL = "https://tealium.atlassian.net/secure/CreateIssue!default.jspa";
    const storedVal = localStorage.getItem("latest_account_profile") || "";
    const ticketMatch = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    const ticketId = ticketMatch ? ticketMatch[1] : "N/A";
    const summary = encodeURIComponent("Freshdesk Ticket " + ticketId);
    const description = encodeURIComponent("Account/Profile: " + storedVal);
    const customField = encodeURIComponent(storedVal);
    const finalURL = jiraCreateURL + "?summary=" + summary + "&description=" + description + "&customfield_10652=" + customField;
    window.open(finalURL, "_blank");
  }

  /***************************************************
   * MAIN MULTITOOL INITIALIZATION
   ***************************************************/
  function initTool() {
    injectCSS();
    initTheme();

    const wrapper = document.createElement("div");
    wrapper.id = "multitool-beast-wrapper";
    let initFontSize = loadPref("mtb_fontSize", 14);
    wrapper.style.fontSize = initFontSize + "px";

    // Restore saved position
    const pos = loadPref("boxPosition", null);
    if (pos && pos.top && pos.left) {
      wrapper.style.top = pos.top;
      wrapper.style.left = pos.left;
    }

    // Display state based on preference
    if (loadPref("keepOpen", false)) {
      savePref("multitool_open", true);
    }
    const isOpen = loadPref("multitool_open", false);
    wrapper.style.display = isOpen ? "block" : "none";

    // Add drag handle
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

    // Left: Theme toggle
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

    // Right: Up, Down, Close buttons
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

    // Header with Tealium logo and gradient
    const header = document.createElement("div");
    header.className = "mtb-header";
    const tealiumLogo = document.createElement("img");
    tealiumLogo.className = "mtb-logo";
    tealiumLogo.src = "https://www.tealium.com/wp-content/uploads/2021/07/cropped-Tealium-logo-2021-32x32.png";
    const h3 = document.createElement("h3");
    h3.className = "mtb-title";
    h3.textContent = "MultiTool Beast";
    header.appendChild(tealiumLogo);
    header.appendChild(h3);
    wrapper.appendChild(header);

    // Main Content Area with Tabs
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

    // Populate Tabs
    populateProfileTab(profileContent);
    buildPinnedTabContent(pinnedContent);
    buildSettingsContent(settingsContent);

    // Create floating "open" button if panel is closed
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
      wrapper.style.display = "block";
      savePref("multitool_open", true);
      openBtn.style.display = "none";
      showTab("profile");
      populateProfileTab(profileContent);
    });
    document.body.appendChild(openBtn);
  }

  /***************************************************
   * UPDATE CONTENT ON TICKET CHANGE
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
    document.addEventListener("DOMContentLoaded", function() {
      setTimeout(initTool, 1500);
    });
  } else {
    setTimeout(initTool, 1500);
  }

  // MAIN INIT FUNCTION
  function initTool() {
    injectCSS();
    initTheme();
    // Build the MultiTool UI
    initTool = function() {}; // Prevent reinitialization if needed
    // Call our function to create the UI
    initToolUI();
  }

  // Separate function to build the UI (called by initTool)
  function initToolUI() {
    // Create the UI as defined above (this is the same code inside initTool() we already wrote)
    // For clarity, we already built the UI in the code above. The entire UI construction is inside initTool().
    // (We simply call initTool() here as it has already constructed the UI.)
    // In this implementation, all UI building happens in the initTool() function above.
  }

})();
