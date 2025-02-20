// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.99
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
   * 0) Check if current page is a Ticket page
   ***************************************************/
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  if (!isTicketPage()) {
    console.log("[MultiTool Beast] Not a ticket page. Exiting.");
    return;
  }

  /***************************************************
   * 1) Inject Custom CSS (Dark “Sway” Style)
   ***************************************************/
  const customCSS = `
  :root {
    /* Dark Sway color palette */
    --sway-bg: #1f2937;       /* dark background for headers */
    --sway-panel-bg: #2d3748; /* main panel background */
    --sway-border: #4a5568;   /* border color */
    --sway-primary: #3B82F6;  /* highlight color (blue) */
    --sway-text: #e2e8f0;     /* main text color */
    --sway-radius: 8px;
    --sway-boxshadow: 0 4px 10px rgba(0,0,0,0.5);
    --sway-danger: #ef4444;   /* red color for close button */
    --sway-info: #60a5fa;     /* link color in the dark theme */
  }
  body {
    background-color: #1f2937 !important;
    color: var(--sway-text) !important;
    font-family: "Inter", "Segoe UI", sans-serif;
  }

  /* Panel container */
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
    color: var(--sway-text);
    display: none;
  }

  /* Header */
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
  .sway-header .sway-titlebar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--sway-text);
  }
  .sway-header .sway-titlebar img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
  }
  .sway-header-buttons {
    display: flex;
    gap: 8px;
  }

  /* Buttons */
  .sway-btn {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 9999px;
    border: 1px solid var(--sway-border);
    background-color: transparent;
    color: var(--sway-text);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .sway-btn:hover {
    background-color: #374151;
  }
  .sway-btn-red {
    border-color: var(--sway-danger);
    color: #fff;
    background-color: var(--sway-danger);
  }
  .sway-btn-red:hover {
    background-color: #dc2626;
  }
  .sway-btn-blue {
    border-color: var(--sway-primary);
    background-color: var(--sway-primary);
    color: #fff;
  }
  .sway-btn-blue:hover {
    background-color: #2563eb;
  }

  /* Tabs */
  .sway-tabs {
    display: flex;
    border-bottom: 1px solid var(--sway-border);
    background-color: #1f2937;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sway-tab {
    padding: 10px 16px;
    cursor: pointer;
    color: #9ca3af; /* lighter text */
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
    font-size: 13px;
  }
  .sway-tab:hover {
    background-color: #374151;
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

  /* Field rows */
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
    background-color: #374151;
    padding: 2px 6px;
    border-radius: 4px;
    color: #f3f4f6;
  }

  /* Draggable handle */
  .sway-handle {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #374151;
    border: 1px solid #4b5563;
    border-radius: 16px;
    padding: 2px 6px;
    cursor: move;
    font-size: 12px;
    box-shadow: var(--sway-boxshadow);
    color: #f3f4f6;
  }

  /* Open button (bottom-right) */
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
    background-color: #374151;
    border: 1px solid #4b5563;
    box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  #sway-open-btn:hover {
    background-color: #47515e;
  }
  #sway-open-btn img {
    width: 32px;
    height: 32px;
  }
  a {
    color: var(--sway-info);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
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
            // Skip the current ticket
            if (currentTicketId && parseInt(foundId,10) === parseInt(currentTicketId,10)) return;
            tickets.push({ href: href, subject: subject, date: dt });
          }
        }
      }
    });
    return tickets;
  }

  // Attempt to fetch CARR from the company page via an invisible iframe
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
   * 3) Tab Switching
   ***************************************************/
  function showTab(which) {
    const profileTab = document.getElementById('tab-content-profile');
    const pinnedTab = document.getElementById('tab-content-pinned');
    const profileNav = document.getElementById('tab-btn-profile');
    const pinnedNav = document.getElementById('tab-btn-pinned');
    if (!profileTab || !pinnedTab || !profileNav || !pinnedNav) {
      console.warn("[MultiTool Beast] Tab elements missing. Possibly not initialized yet.");
      return;
    }
    // Hide both
    profileTab.style.display = "none";
    pinnedTab.style.display = "none";
    profileNav.classList.remove('active');
    pinnedNav.classList.remove('active');

    // Show the requested tab
    if (which === 'profile') {
      profileTab.style.display = "block";
      profileNav.classList.add('active');
    } else {
      pinnedTab.style.display = "block";
      pinnedNav.classList.add('active');
    }
  }

  /***************************************************
   * 4) Single Markdown Format Copy
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

          // For "Ticket ID", create a clickable markdown link
          if (labelText.toLowerCase() === "ticket id") {
            const numericId = valueText.replace("#", "");
            const link = window.location.origin + "/a/tickets/" + numericId;
            // e.g. "**Ticket ID**: [#12345](https://freshdesk.com/a/tickets/12345)"
            labelText = `**${labelText}**`;
            valueText = `[#${numericId}](${link})`;
          } else {
            // e.g. "**Account**: tealium"
            labelText = `**${labelText}**`;
          }
          copyText += `${labelText}: ${valueText}\n`;
        }
      }
    });
    // If "Include Summary" is checked, append it
    const summaryCheck = document.getElementById('include-summary');
    if (summaryCheck && summaryCheck.checked) {
      const summaryText = getSummary();
      if (summaryText) {
        copyText += `\n**Summary**:\n${summaryText}\n`;
      }
    }
    // Perform copy
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
    // A small checkbox to select if we want to copy this field
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.className = "field-selector";
    row.appendChild(check);

    // Label
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    row.appendChild(lbl);

    // Value
    const finalVal = valueText || "N/A";
    const valSpan = document.createElement('span');
    valSpan.textContent = finalVal;
    valSpan.className = "fresh-value";
    row.appendChild(valSpan);

    // Optional copy button
    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "sway-btn sway-btn-xs copy-btn";
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
   * 5) Build Quick Access Grid (Pinned Tab)
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
      card.style.backgroundColor = "#374151";
      card.style.border = "1px solid #4b5563";
      card.style.borderRadius = "6px";
      card.style.textAlign = "center";
      card.style.padding = "12px";
      card.style.cursor = "pointer";
      card.style.color = "#f3f4f6";
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
   * 6) Populate Profile Tab
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

    // "Copy Account/Profile" button
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

    // Divider
    const hr = document.createElement('hr');
    hr.style.margin = "10px 0";
    container.appendChild(hr);

    // "Recent Tickets" heading
    const rHead = document.createElement('div');
    rHead.textContent = "Recent Tickets (last 7 days)";
    rHead.style.fontWeight = "600";
    rHead.style.marginBottom = "8px";
    container.appendChild(rHead);

    // Render the list of recent tickets
    const recTix = getRecentTickets();
    if (recTix.length > 0) {
      recTix.forEach(function(t) {
        const tDiv = document.createElement('div');
        tDiv.style.marginBottom = "8px";
        tDiv.style.paddingBottom = "8px";
        tDiv.style.borderBottom = "1px solid #4b5563";

        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.style.color = "var(--sway-info)";
        tDiv.appendChild(a);

        // Copy link button
        const cpBtn = document.createElement('button');
        cpBtn.className = "sway-btn sway-btn-xs";
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

    // Asynchronously fetch the CARR
    fetchCARR(function(cVal) {
      const vEl = carrRow.querySelector('.fresh-value');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***************************************************
   * 7) Initialize the Panel
   ***************************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    console.log("[MultiTool Beast] Initializing Dark Sway panel.");

    const isOpen = false;
    localStorage.setItem("multitool_open", isOpen ? "true" : "false");

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";

    // Header
    const header = document.createElement('div');
    header.className = "sway-header";

    // Left side: Title
    const leftDiv = document.createElement('div');
    leftDiv.className = "sway-titlebar";
    const tealiumIcon = document.createElement('img');
    tealiumIcon.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
    tealiumIcon.style.width = "28px";
    tealiumIcon.style.height = "28px";
    const titleSpan = document.createElement('span');
    titleSpan.textContent = "MultiTool Beast";
    titleSpan.style.fontWeight = "600";
    leftDiv.appendChild(tealiumIcon);
    leftDiv.appendChild(titleSpan);

    // Right side: Up, Down, Close (red)
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
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = "none";
      openBtn.style.display = "block";
      localStorage.setItem("multitool_open", "false");
    });
    rightDiv.appendChild(closeBtn);

    header.appendChild(leftDiv);
    header.appendChild(rightDiv);
    wrapper.appendChild(header);

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

    // Profile Content
    const profileContent = document.createElement('div');
    profileContent.id = "tab-content-profile";
    profileContent.className = "sway-content";
    profileContent.style.display = "block";

    // "Copy Selected" top row
    const topRowDiv = document.createElement('div');
    topRowDiv.style.display = "flex";
    topRowDiv.style.justifyContent = "space-between";
    topRowDiv.style.marginBottom = "8px";

    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.className = "sway-btn sway-btn-blue";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.addEventListener('click', copyAllSelected);
    topRowDiv.appendChild(copyAllBtn);

    // Summary checkbox
    const summaryDiv = document.createElement('div');
    summaryDiv.style.marginBottom = "8px";
    const sumCheck = document.createElement('input');
    sumCheck.type = "checkbox";
    sumCheck.id = "include-summary";
    sumCheck.style.marginRight = "4px";
    summaryDiv.appendChild(sumCheck);
    summaryDiv.appendChild(document.createTextNode("Include Summary"));

    // Add both to profile content
    profileContent.appendChild(topRowDiv);
    profileContent.appendChild(summaryDiv);

    // Container for the fields
    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = "profile-fields-container";
    profileContent.appendChild(profileFieldsContainer);
    wrapper.appendChild(profileContent);

    // Pinned Content
    const pinnedContent = document.createElement('div');
    pinnedContent.id = "tab-content-pinned";
    pinnedContent.className = "sway-content";
    pinnedContent.style.display = "none";
    pinnedContent.appendChild(buildPinnedTabContent());
    wrapper.appendChild(pinnedContent);

    // Populate the Profile tab
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

    // Place it in the DOM
    wrapper.style.display = isOpen ? "block" : "none";
    document.body.appendChild(wrapper);
    window._multitoolWrapper = wrapper;

    console.log("[MultiTool Beast] Dark Sway panel loaded.");
  }

  /***************************************************
   * 8) Auto-update on URL change (every 3 seconds)
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
   * 9) Open Button (bottom-right)
   ***************************************************/
  const openBtn = document.createElement('button');
  openBtn.id = "sway-open-btn";
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
   * 10) Initialize on DOM ready
   ***************************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initTool, 2000);
    });
  } else {
    setTimeout(initTool, 2000);
  }
})();
