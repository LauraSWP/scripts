// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.97
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
   * 1) Inline custom "Sway"-style CSS
   ***************************************************/
  const customCSS = `
/* Root custom variables */
:root {
  --sway-bg: #f8faff;       /* Soft pastel background */
  --sway-panel-bg: #ffffff; /* White panel background */
  --sway-border: #e2e8f0;   /* Soft border color */
  --sway-primary: #3B82F6;  /* e.g. Tailwind's "blue-500" */
  --sway-secondary: #64748b;/* e.g. Tailwind's "slate-500" */
  --sway-radius: 8px;
  --sway-boxshadow: 0 4px 10px rgba(0,0,0,0.08);
  --sway-text: #111827;     /* near black */
  --sway-text-light: #6b7280;
  --sway-info: #2563eb;     /* for links */
  --sway-danger: #ef4444;
}

/* Dark mode toggles: we add a "dark" class on <body> */
body.dark {
  background-color: #111827 !important;
  color: #e0e0e0 !important;
}
body.dark a {
  color: #93c5fd !important; /* Lighter link in dark mode */
}
body.dark .sway-panel {
  background-color: #1f2937 !important;
  border-color: #374151 !important;
  color: #e0e0e0 !important;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5) !important;
}
body.dark .sway-header {
  background-color: #1f2937 !important;
}
body.dark .sway-tab.active a {
  color: #fff !important;
  background-color: var(--sway-primary) !important;
}
body.dark .sway-btn-outline {
  border-color: #555 !important;
  color: #eee !important;
}
body.dark .sway-btn-info {
  background-color: var(--sway-primary) !important;
  color: #fff !important;
}

/* The main panel */
#multitool-beast-wrapper.sway-panel {
  background-color: var(--sway-panel-bg);
  border: 1px solid var(--sway-border);
  border-radius: var(--sway-radius);
  box-shadow: var(--sway-boxshadow);
  color: var(--sway-text);
  font-family: "Inter", "Segoe UI", sans-serif;
}

/* The header bar */
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

/* Title & icon */
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

/* Right side (buttons) */
.sway-header-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Tabs */
.sway-tabs {
  display: flex;
  border-bottom: 1px solid var(--sway-border);
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
}
.sway-tab.active {
  color: var(--sway-primary);
  border-bottom-color: var(--sway-primary);
  font-weight: 600;
}
.sway-tab:hover {
  background-color: #f1f5f9;
}
.sway-tab a {
  text-decoration: none;
  color: inherit;
}

/* Content area */
.sway-content {
  padding: 12px;
  font-size: 14px;
  color: var(--sway-text);
}

/* Buttons */
.sway-btn-xs {
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
}
.sway-btn-danger {
  background-color: var(--sway-danger);
  color: #fff;
}
.sway-btn-outline {
  border: 1px solid var(--sway-border);
  background-color: transparent;
  color: var(--sway-text);
}
.sway-btn-info {
  background-color: var(--sway-primary);
  color: #fff;
}
.sway-btn:hover {
  opacity: 0.9;
}

/* Draggable handle button */
.sway-handle {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50%;
  padding: 4px 8px;
  background-color: #fff;
  box-shadow: var(--sway-boxshadow);
}

/* Field rows */
.fieldRow {
  border-bottom: 1px solid var(--sway-border);
  padding-bottom: 6px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.fieldRow .field-selector {
  margin-right: 4px;
}
.fieldRow .fw-bold {
  font-weight: 600;
}
.fieldRow .fresh-value {
  background-color: #f9fafb;
  padding: 2px 6px;
  border-radius: 4px;
}

/* The open button (tab style at bottom-right) */
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
  background-color: #fff;
  border: 1px solid var(--sway-border);
  box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
  cursor: pointer;
}
#sway-open-btn img {
  width: 32px;
  height: 32px;
}

/* Dark mode specific classes can be extended if needed */
`;

  // Insert the style into the page
  const styleEl = document.createElement("style");
  styleEl.textContent = customCSS;
  document.head.appendChild(styleEl);

  /***************************************************
   * 2) Utility Functions & Variables
   ***************************************************/
  let currentTicketId = extractTicketId();

  /***************************************************
   * 3) Dark Mode
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
   * 4) showTab (switch between Profile & Pinned)
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
   * 6) Slack/JIRA & Copy
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
   * 7) Quick Access Grid
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
      card.style.border = "1px solid #e2e8f0";
      card.style.borderRadius = "6px";
      card.style.textAlign = "center";
      card.style.padding = "12px";
      card.style.cursor = "pointer";
      card.style.flex = "0 0 auto";
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
   * 8) Populate Profile Tab
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

    // Divider
    const hr = document.createElement('hr');
    hr.style.margin = "10px 0";
    container.appendChild(hr);

    // "Recent Tickets"
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
        tDiv.style.borderBottom = "1px solid #ddd";

        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.style.color = "#2563eb";
        tDiv.appendChild(a);

        const cpBtn = document.createElement('button');
        cpBtn.className = "sway-btn-xs sway-btn-outline ms-2 copy-btn";
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

    // Fetch the CARR asynchronously
    fetchCARR(function(cVal) {
      const vEl = carrRow.querySelector('.fresh-value');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***************************************************
   * 9) Main initTool
   ***************************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    console.log("[MultiTool Beast] Initializing with Sway style.");
    initTheme();

    const isOpen = false; // initial state closed

    // Outer container
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    wrapper.className = "sway-panel";
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
    // Title
    const headerLeftDiv = document.createElement('div');
    headerLeftDiv.className = "sway-titlebar";
    // Dark mode toggle
    const nightToggle = document.createElement('input');
    nightToggle.type = "checkbox";
    nightToggle.id = "dark-toggle";
    nightToggle.style.marginRight = "8px";
    nightToggle.addEventListener('change', toggleTheme);

    // Let's place the toggle in a sub-container
    const toggleContainer = document.createElement('div');
    toggleContainer.style.display = "flex";
    toggleContainer.style.alignItems = "center";
    toggleContainer.style.gap = "4px";
    toggleContainer.appendChild(nightToggle);
    const darkLbl = document.createElement('span');
    darkLbl.textContent = "Dark";
    darkLbl.style.fontSize = "12px";
    darkLbl.style.color = "#6b7280";
    toggleContainer.appendChild(darkLbl);

    // Put the toggle on the left
    headerLeftDiv.appendChild(toggleContainer);

    // Right side: up/down/close
    const headerBtnsDiv = document.createElement('div');
    headerBtnsDiv.className = "sway-header-buttons";

    const upBtn = document.createElement('button');
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.className = "sway-btn-xs sway-btn-outline";
    upBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    headerBtnsDiv.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.className = "sway-btn-xs sway-btn-outline";
    downBtn.addEventListener('click', function() {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    headerBtnsDiv.appendChild(downBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = "×";
    closeBtn.title = "Close MultiTool Beast";
    closeBtn.className = "sway-btn-xs sway-btn-danger";
    closeBtn.addEventListener('click', function() {
      wrapper.style.display = "none";
      openBtn.style.display = "block";
      localStorage.setItem("multitool_open", "false");
    });
    headerBtnsDiv.appendChild(closeBtn);

    // Put them in the header
    header.appendChild(headerLeftDiv);
    header.appendChild(headerBtnsDiv);
    wrapper.appendChild(header);

    // Title bar section (below the toggles)
    const titleBar2 = document.createElement('div');
    titleBar2.className = "sway-titlebar";
    titleBar2.style.marginTop = "8px";
    const iconImg = document.createElement('img');
    iconImg.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
    iconImg.style.width = "28px";
    iconImg.style.height = "28px";
    iconImg.style.borderRadius = "50%";
    const titleTxt = document.createElement('span');
    titleTxt.textContent = "MultiTool Beast";
    titleTxt.style.fontWeight = "600";
    titleTxt.style.marginLeft = "8px";
    titleBar2.appendChild(iconImg);
    titleBar2.appendChild(titleTxt);
    header.appendChild(titleBar2);

    // Tabs
    const tabsUL = document.createElement('ul');
    tabsUL.className = "sway-tabs";
    // Profile
    const liProfile = document.createElement('li');
    liProfile.id = "tab-btn-profile";
    liProfile.className = "sway-tab active";
    liProfile.innerHTML = `${personIconSVG} <span style="margin-left:4px;">Profile</span>`;
    liProfile.addEventListener('click', function(e) {
      e.preventDefault();
      showTab('profile');
    });
    tabsUL.appendChild(liProfile);
    // Pinned
    const liPinned = document.createElement('li');
    liPinned.id = "tab-btn-pinned";
    liPinned.className = "sway-tab";
    liPinned.innerHTML = `${pinIconSVG} <span style="margin-left:4px;">Pinned</span>`;
    liPinned.addEventListener('click', function(e) {
      e.preventDefault();
      showTab('pinned');
    });
    tabsUL.appendChild(liPinned);
    wrapper.appendChild(tabsUL);

    // Content: Profile
    const tabProfile = document.createElement('div');
    tabProfile.id = "tab-content-profile";
    tabProfile.style.display = "block";
    tabProfile.className = "sway-content";
    const profileContainer = document.createElement('div');
    profileContainer.id = "profile-fields-container";
    tabProfile.appendChild(profileContainer);
    wrapper.appendChild(tabProfile);

    // Populate profile
    populateProfileTab(profileContainer);

    // Content: Pinned
    const tabPinned = document.createElement('div');
    tabPinned.id = "tab-content-pinned";
    tabPinned.className = "sway-content";
    tabPinned.style.display = "none";
    const pinnedGrid = buildPinnedTabContent();
    tabPinned.appendChild(pinnedGrid);
    wrapper.appendChild(tabPinned);

    // Draggable handle
    const dragHandle = document.createElement('button');
    dragHandle.className = "sway-handle sway-btn-xs sway-btn-outline";
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

    // Show "Profile" tab by default
    showTab('profile');
    initTheme();
    console.log("[MultiTool Beast] Sway style loaded.");

    document.body.appendChild(wrapper);
    window._multitoolWrapper = wrapper;
  }

  /***************************************************
   * 10) Auto-update on URL change (every 3 seconds)
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
   * 11) The open button (Sway style) fixed bottom-right
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
   * 12) Initialize on DOM ready
   ***************************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initTool, 3000);
    });
  } else {
    setTimeout(initTool, 3000);
  }

})();
