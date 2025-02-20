// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.98
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
   * 0) Check if this is a Ticket page
   ***************************************************/
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  if (!isTicketPage()) {
    console.log("[MultiTool Beast] Not a ticket page. Exiting.");
    return;
  }

  /***************************************************
   * 1) Inject Custom CSS (Pastel “Sway” Style)
   ***************************************************/
  const customCSS = `
  :root {
    --sway-bg: #f8faff;
    --sway-panel-bg: #ffffff;
    --sway-border: #e2e8f0;
    --sway-primary: #3B82F6;
    --sway-secondary: #64748b;
    --sway-radius: 8px;
    --sway-boxshadow: 0 4px 10px rgba(0,0,0,0.08);
    --sway-text: #111827;
  }
  /* Dark mode overrides */
  body.dark {
    background-color: #111827 !important;
    color: #e0e0e0 !important;
  }
  body.dark #multitool-beast-wrapper {
    background-color: #1f2937 !important;
    border-color: #374151 !important;
    color: #e0e0e0;
    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  }
  /* Main panel container */
  #multitool-beast-wrapper {
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 10000;
    width: 360px;
    min-width: 200px;
    min-height: 200px;
    resize: both;
    overflow: auto;
    background-color: var(--sway-panel-bg);
    border: 1px solid var(--sway-border);
    border-radius: var(--sway-radius);
    box-shadow: var(--sway-boxshadow);
    font-family: "Inter", "Segoe UI", sans-serif;
    color: var(--sway-text);
    display: none;
  }
  /* Header bar */
  .sway-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--sway-bg);
    padding: 8px 12px;
    border-bottom: 1px solid var(--sway-border);
    border-top-left-radius: var(--sway-radius);
    border-top-right-radius: var(--sway-radius);
    cursor: move;
  }
  /* Title area */
  .sway-titlebar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--sway-text);
  }
  .sway-titlebar img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }
  /* Header buttons */
  .sway-header-buttons {
    display: flex;
    gap: 6px;
  }
  .sway-btn {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 9999px;
    border: 1px solid var(--sway-border);
    background-color: #ffffff;
    color: var(--sway-text);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .sway-btn:hover {
    background-color: #f9fafb;
  }
  .sway-btn.btn-danger {
    background-color: #f87171;
    border-color: #f87171;
    color: #fff;
  }
  /* Tab bar */
  .sway-tabs {
    display: flex;
    border-bottom: 1px solid var(--sway-border);
    background-color: #f9fafb;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sway-tab {
    padding: 10px 16px;
    cursor: pointer;
    color: var(--sway-secondary);
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
    font-size: 13px;
  }
  .sway-tab:hover {
    background-color: #f1f5f9;
  }
  .sway-tab.active {
    color: var(--sway-primary);
    border-bottom-color: var(--sway-primary);
    font-weight: 600;
  }
  /* Content area */
  .sway-content {
    padding: 12px;
    font-size: 14px;
    color: var(--sway-text);
  }
  /* Field row styling */
  .fieldRow {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--sway-border);
    font-size: 13px;
  }
  .fieldRow .fresh-value {
    background-color: #f9fafb;
    padding: 2px 6px;
    border-radius: 4px;
  }
  /* Draggable handle */
  .sway-handle {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #e2e8f0;
    border: 1px solid #cbd5e1;
    border-radius: 16px;
    padding: 2px 6px;
    cursor: move;
    font-size: 12px;
    box-shadow: var(--sway-boxshadow);
  }
  /* Open button */
  #sway-open-btn {
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 99999;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-bottom-left-radius: var(--sway-radius);
    border-bottom-right-radius: var(--sway-radius);
    padding: 8px;
    background-color: #ffffff;
    border: 1px solid var(--sway-border);
    box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  #sway-open-btn img {
    width: 32px;
    height: 32px;
  }
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = customCSS;
  document.head.appendChild(styleEl);

  /***************************************************
   * 2) Utility Functions & Variables
   ***************************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();

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

  function getRecentTickets() {
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
            if (currentTicketId && parseInt(foundId,10) === parseInt(currentTicketId,10)) return;
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
          }, 3000);
        } catch(e) {
          console.error("[CARR] Initial iframe error:", e);
          document.body.removeChild(iframe);
          callback("N/A");
        }
      }, 3000);
    };
    document.body.appendChild(iframe);
  }

  /***************************************************
   * 3) Dark Mode Functions
   ***************************************************/
  function initTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored === 'theme-dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
  function toggleTheme() {
    if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
      localStorage.setItem('fdTheme', 'theme-light');
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('fdTheme', 'theme-dark');
    }
  }

  /***************************************************
   * 4) Tab Switching Function
   ***************************************************/
  function showTab(which) {
    const profileTab = document.getElementById('tab-content-profile');
    const pinnedTab = document.getElementById('tab-content-pinned');
    const profileNav = document.getElementById('tab-btn-profile');
    const pinnedNav = document.getElementById('tab-btn-pinned');
    if (profileTab && pinnedTab && profileNav && pinnedNav) {
      profileTab.style.display = "none";
      pinnedTab.style.display = "none";
      profileNav.classList.remove('active');
      pinnedNav.classList.remove('active');
      if (which === 'profile') {
        profileTab.style.display = "block";
        profileNav.classList.add('active');
      } else {
        pinnedTab.style.display = "block";
        pinnedNav.classList.add('active');
      }
    } else {
      console.warn("[MultiTool Beast] Tab elements missing");
    }
  }

  /***************************************************
   * 5) Inline SVG Icons
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
  const copyIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10 1.5H6a.5.5 0 0 0-.5.5v1H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5v-1a.5.5 0 0 0-.5-.5zm-4 1h4v1H6v-1z"/>
    <path d="M4 5h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
  </svg>`;

  /***************************************************
   * 6) Slack/JIRA Formatting & Copy Functions
   ***************************************************/
  let formatMode = 'slack';
  function setFormat(mode) {
    formatMode = mode;
    const slackBtn = document.getElementById('format-slack-btn');
    const jiraBtn = document.getElementById('format-jira-btn');
    if (!slackBtn || !jiraBtn) return;
    if (mode === 'slack') {
      slackBtn.classList.add('active');
      jiraBtn.classList.remove('active');
    } else {
      slackBtn.classList.remove('active');
      jiraBtn.classList.add('active');
    }
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
            if (formatMode === 'jira') {
              labelText = `**${labelText}**`;
              valueText = `[#${numericId}](${link})`;
            } else {
              valueText = `#${numericId} - ${link}`;
            }
          } else if (formatMode === 'jira') {
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
        if (formatMode === 'jira') {
          copyText += `\n**Summary**:\n${summaryText}\n`;
        } else {
          copyText += `\nSummary:\n${summaryText}\n`;
        }
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
  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "fieldRow";
    const check = document.createElement('input');
    check.type = 'checkbox';
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
      btn.className = "sway-btn-xs sway-btn-outline copy-btn";
      btn.style.marginLeft = "8px";
      btn.innerHTML = copyIconSVG;
      btn.title = "Copy";
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(finalVal).then(function() {
          btn.innerHTML = `<span style="color: green;">&#10003;</span>`;
          setTimeout(function() { btn.innerHTML = copyIconSVG; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  /***************************************************
   * 7) Build Quick Access Grid for Pinned Tab
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
      card.style.border = "1px solid var(--sway-border)";
      card.style.borderRadius = "6px";
      card.style.textAlign = "center";
      card.style.padding = "12px";
      card.style.cursor = "pointer";
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
   * 8) Populate Profile Tab (Ticket Fields)
   ***************************************************/
  function populateProfileTab(container) {
    container.innerHTML = "";
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
    copyAccBtn.className = "sway-btn-xs sway-btn-outline";
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
    const recTix = getRecentTickets();
    if (recTix.length > 0) {
      recTix.forEach(function(t) {
        const tDiv = document.createElement('div');
        tDiv.style.marginBottom = "8px";
        tDiv.style.paddingBottom = "8px";
        tDiv.style.borderBottom = "1px solid var(--sway-border)";
        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.style.color = "var(--sway-info)";
        tDiv.appendChild(a);
        const cpBtn = document.createElement('button');
        cpBtn.className = "sway-btn-xs sway-btn-outline copy-btn";
        cpBtn.style.marginLeft = "8px";
        cpBtn.innerHTML = copyIconSVG;
        cpBtn.title = "Copy Link";
        cpBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(t.href).then(function() {
            cpBtn.innerHTML = `<span style="color: green;">&#10003;</span>`;
            setTimeout(function() { cpBtn.innerHTML = copyIconSVG; }, 2000);
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
   * 9) Initialize the Side Panel Tool
   ***************************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    console.log("[MultiTool Beast] Initializing Sway-style panel.");
    initTheme();
    const isOpen = false;
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    wrapper.className = "sway-panel";
    // Set fixed position and dimensions
    wrapper.style.position = "fixed";
    wrapper.style.bottom = "80px";
    wrapper.style.right = "20px";
    wrapper.style.width = "360px";
    wrapper.style.minWidth = "200px";
    wrapper.style.minHeight = "200px";
    wrapper.style.resize = "both";
    wrapper.style.overflow = "auto";
    wrapper.style.display = isOpen ? "block" : "none";
    localStorage.setItem("multitool_open", isOpen ? "true" : "false");

    // Header
    const header = document.createElement('div');
    header.className = "sway-header";

    // Left (Dark mode toggle)
    const leftDiv = document.createElement('div');
    leftDiv.className = "sway-titlebar";
    const darkToggle = document.createElement('input');
    darkToggle.type = "checkbox";
    darkToggle.id = "dark-toggle";
    darkToggle.style.marginRight = "6px";
    darkToggle.addEventListener('change', toggleTheme);
    leftDiv.appendChild(darkToggle);
    const darkLabel = document.createElement('span');
    darkLabel.textContent = " Dark";
    darkLabel.style.fontSize = "12px";
    leftDiv.appendChild(darkLabel);
    header.appendChild(leftDiv);

    // Right (Up, Down, Close)
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
    closeBtn.className = "sway-btn sway-btn-danger";
    closeBtn.textContent = "×";
    closeBtn.title = "Close MultiTool Beast";
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = "none";
      openBtn.style.display = "block";
      localStorage.setItem("multitool_open", "false");
    });
    rightDiv.appendChild(closeBtn);
    header.appendChild(rightDiv);
    wrapper.appendChild(header);

    // Title area (below header)
    const titleBar = document.createElement('div');
    titleBar.className = "sway-titlebar";
    titleBar.style.margin = "8px 12px";
    const titleImg = document.createElement('img');
    titleImg.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
    titleImg.style.width = "28px";
    titleImg.style.height = "28px";
    const titleText = document.createElement('span');
    titleText.textContent = "MultiTool Beast";
    titleText.style.fontWeight = "600";
    titleText.style.marginLeft = "8px";
    titleBar.appendChild(titleImg);
    titleBar.appendChild(titleText);
    wrapper.appendChild(titleBar);

    // Tabs
    const tabsBar = document.createElement('ul');
    tabsBar.className = "sway-tabs";
    const profileTab = document.createElement('li');
    profileTab.id = "tab-btn-profile";
    profileTab.className = "sway-tab active";
    profileTab.innerHTML = `${personIconSVG} <span style="margin-left:4px;">Profile</span>`;
    profileTab.addEventListener('click', e => { e.preventDefault(); showTab('profile'); });
    tabsBar.appendChild(profileTab);
    const pinnedTab = document.createElement('li');
    pinnedTab.id = "tab-btn-pinned";
    pinnedTab.className = "sway-tab";
    pinnedTab.innerHTML = `${pinIconSVG} <span style="margin-left:4px;">Pinned</span>`;
    pinnedTab.addEventListener('click', e => { e.preventDefault(); showTab('pinned'); });
    tabsBar.appendChild(pinnedTab);
    wrapper.appendChild(tabsBar);

    // Tab Content: Profile
    const profileContent = document.createElement('div');
    profileContent.id = "tab-content-profile";
    profileContent.className = "sway-content";
    profileContent.style.display = "block";
    // Top row: "Copy Selected" and format toggle
    const topRow = document.createElement('div');
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";
    topRow.style.marginBottom = "8px";
    const copyBtn = document.createElement('button');
    copyBtn.id = "copy-all-selected-btn";
    copyBtn.className = "sway-btn sway-btn-info";
    copyBtn.textContent = "Copy Selected";
    copyBtn.addEventListener('click', copyAllSelected);
    topRow.appendChild(copyBtn);
    const formatGroup = document.createElement('div');
    formatGroup.style.display = "flex";
    formatGroup.style.gap = "6px";
    const slackBtn = document.createElement('button');
    slackBtn.id = "format-slack-btn";
    slackBtn.className = "sway-btn sway-btn-outline active";
    slackBtn.textContent = "Slack";
    slackBtn.addEventListener('click', () => setFormat('slack'));
    const jiraBtn = document.createElement('button');
    jiraBtn.id = "format-jira-btn";
    jiraBtn.className = "sway-btn sway-btn-outline";
    jiraBtn.textContent = "JIRA";
    jiraBtn.addEventListener('click', () => setFormat('jira'));
    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topRow.appendChild(formatGroup);
    profileContent.appendChild(topRow);

    // Summary checkbox
    const summaryDiv = document.createElement('div');
    summaryDiv.style.marginBottom = "8px";
    const sumCheck = document.createElement('input');
    sumCheck.type = "checkbox";
    sumCheck.id = "include-summary";
    sumCheck.style.marginRight = "4px";
    summaryDiv.appendChild(sumCheck);
    summaryDiv.appendChild(document.createTextNode("Include Summary"));
    profileContent.appendChild(summaryDiv);

    // Container for profile fields
    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = "profile-fields-container";
    profileContent.appendChild(profileFieldsContainer);
    wrapper.appendChild(profileContent);

    // Tab Content: Pinned
    const pinnedContent = document.createElement('div');
    pinnedContent.id = "tab-content-pinned";
    pinnedContent.className = "sway-content";
    pinnedContent.style.display = "none";
    pinnedContent.appendChild(buildPinnedTabContent());
    wrapper.appendChild(pinnedContent);

    // Populate profile tab
    populateProfileTab(profileFieldsContainer);

    // Draggable handle
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
        localStorage.setItem("multitool_position", JSON.stringify({
          top: wrapper.style.top,
          left: wrapper.style.left
        }));
      }
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', closeDrag);
    });

    // Show Profile tab by default
    showTab('profile');
    console.log("[MultiTool Beast] Sway-style panel loaded.");
    document.body.appendChild(wrapper);
    window._multitoolWrapper = wrapper;
  }

  /***************************************************
   * 10) Auto-update on URL change every 3 seconds
   ***************************************************/
  setInterval(function() {
    const newId = extractTicketId();
    if (newId && newId !== currentTicketId) {
      console.log("[MultiTool Beast] Ticket changed from", currentTicketId, "to", newId);
      currentTicketId = newId;
      const container = document.getElementById('profile-fields-container');
      if (container) {
        populateProfileTab(container);
      }
    }
  }, 3000);

  /***************************************************
   * 11) Open Button (Fixed Bottom-Right Tab)
   ***************************************************/
  const openBtn = document.createElement('button');
  openBtn.id = "sway-open-btn";
  openBtn.className = "sway-open-btn";
  openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=40,h=40,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png">`;
  openBtn.style.display = (localStorage.getItem("multitool_open") === "true") ? "none" : "block";
  openBtn.addEventListener('click', function() {
    if (window._multitoolWrapper) {
      window._multitoolWrapper.style.display = "block";
    }
    openBtn.style.display = "none";
    localStorage.setItem("multitool_open", "true");
    showTab('profile');
    const profileFieldsContainer = document.getElementById('profile-fields-container');
    if (profileFieldsContainer) {
      populateProfileTab(profileFieldsContainer);
    }
  });
  document.body.appendChild(openBtn);

  /***************************************************
   * 12) Initialize on DOM ready
   ***************************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initTool, 3000); });
  } else {
    setTimeout(initTool, 3000);
  }
  
})();
