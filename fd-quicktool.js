// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.76
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  /***********************************************
   * Load Tailwind CSS via CDN if not present
   ***********************************************/
  if (!document.getElementById('tailwindcss-script')) {
    const twScript = document.createElement('script');
    twScript.id = 'tailwindcss-script';
    twScript.src = 'https://cdn.tailwindcss.com';
    twScript.onload = () => {
      tailwind.config = { darkMode: 'class' };
    };
    document.head.appendChild(twScript);
  }

  /***********************************************
   * Utility: showTab function (hoisted)
   ***********************************************/
  function showTab(which) {
    const allTabs = document.querySelectorAll('.multitool-tab');
    const allContents = document.querySelectorAll('.multitool-tab-content');
    allTabs.forEach(t => t.classList.remove('active'));
    allContents.forEach(c => c.classList.remove('active'));
    if (which === 'profile') {
      const tab = document.getElementById('tab-btn-profile');
      const content = document.getElementById('tab-content-profile');
      if (tab) tab.classList.add('active');
      if (content) content.classList.add('active');
    } else {
      const tab = document.getElementById('tab-btn-pinned');
      const content = document.getElementById('tab-content-pinned');
      if (tab) tab.classList.add('active');
      if (content) content.classList.add('active');
    }
  }

  /***********************************************
   * Inline SVG icons
   ***********************************************/
  const personIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="inline-block" viewBox="0 0 16 16">
  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
  <path d="M2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"/>
</svg>`;
  const pinIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="inline-block" viewBox="0 0 16 16">
  <path d="M4.146 14.354a.5.5 0 0 0 .708 0L8 11.207l3.146 3.147a.5.5 0 0 0 .708-.708l-3.147-3.146 3.034-3.034a.5.5 0 0 0-.708-.708L8 6.793 4.966 3.76a.5.5 0 0 0-.708.708l3.034 3.034-3.146 3.146a.5.5 0 0 0 0 .708z"/>
</svg>`;
  const copyIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="inline-block" viewBox="0 0 16 16">
  <path d="M10 1.5H6a.5.5 0 0 0-.5.5v1H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5v-1a.5.5 0 0 0-.5-.5zm-4 1h4v1H6v-1z"/>
  <path d="M4 5h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
</svg>`;

  /***********************************************
   * Dark Mode via Tailwind (controlled by toggling "dark" on <html>)
   ***********************************************/
  function initTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored === 'theme-dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fdTheme', 'theme-light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fdTheme', 'theme-dark');
    }
  }

  /***********************************************
   * Extract Ticket ID (handles /a/tickets/ too)
   ***********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/(?:\/a)?\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();

  /***********************************************
   * Helper Functions: getFieldValue, getSummary, getRecentTickets, fetchCARR
   ***********************************************/
  function getFieldValue(el) {
    if (!el) return "";
    let val = el.value || el.getAttribute('value') || el.getAttribute('placeholder') || "";
    val = val.trim();
    if (!val && window.Ember && el.id) {
      try {
        let view = Ember.View.views && Ember.View.views[el.id];
        if (view) val = view.get('value');
      } catch(e){}
    }
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
    els.forEach(el => {
      const timeEl = el.querySelector('[data-test-id="timeline-activity-time"]');
      if (timeEl) {
        let dt = new Date(timeEl.textContent.trim().replace(',', ''));
        if (!isNaN(dt) && (now - dt <= threshold) && dt <= now) {
          const linkEl = el.querySelector('a.text__link-heading');
          if (linkEl) {
            const href = linkEl.href;
            const subject = linkEl.textContent.trim();
            const m = href.match(/(?:\/a)?\/tickets\/(\d+)/);
            const foundId = m ? m[1] : "";
            if (currentTicketId && parseInt(foundId,10) === parseInt(currentTicketId,10)) return;
            tickets.push({ href, subject, date: dt });
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
    iframe.style.visibility = "visible";
    iframe.src = compURL;
    iframe.onload = function() {
      setTimeout(() => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const showMore = doc.querySelector('div.contacts__sidepanel--state[data-test-toggle]');
          if (showMore) showMore.click();
          setTimeout(() => {
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

  /***********************************************
   * Slack/JIRA Toggle & "Copy Selected"
   ***********************************************/
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
    document.querySelectorAll('.fieldRow').forEach(row => {
      const chk = row.querySelector('.field-selector');
      if (chk && chk.checked) {
        const lblSpan = row.querySelector('span');
        const valEl = row.querySelector('.bg-light');
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
    navigator.clipboard.writeText(copyText).then(() => {
      if (copyBtn) {
        copyBtn.textContent = "Copied Selected!";
        setTimeout(() => { copyBtn.textContent = "Copy Selected"; }, 2000);
      }
    });
  }
  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "mb-2 pb-2 border-b border-gray-300 dark:border-gray-600 flex items-center fieldRow";
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.className = "mr-2 field-selector";
    row.appendChild(check);
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "font-bold";
    row.appendChild(lbl);
    const finalVal = valueText || "N/A";
    if (labelText.toLowerCase() === "relevant urls" && finalVal.startsWith("http")) {
      const link = document.createElement('a');
      link.href = finalVal;
      link.target = "_blank";
      link.textContent = finalVal;
      link.className = "ml-2 p-1 bg-gray-100 dark:bg-gray-700 rounded";
      row.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = finalVal;
      span.className = "ml-2 p-1 bg-gray-100 dark:bg-gray-700 rounded";
      row.appendChild(span);
    }
    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "ml-2 bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-sm copy-btn";
      btn.innerHTML = copyIconSVG;
      btn.title = "Copy";
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(finalVal).then(() => {
          btn.innerHTML = `<span class="text-green-500">&#10003;</span>`;
          setTimeout(() => { btn.innerHTML = copyIconSVG; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  /***********************************************
   * Build Pinned Tab Content
   ***********************************************/
  function buildPinnedTabContent() {
    const grid = document.createElement('div');
    grid.id = "pinned-grid";
    grid.className = "grid grid-cols-2 gap-4";
    const items = [
      { icon: '📄', label: 'Docs', link: 'https://docs.google.com/' },
      { icon: '🔗', label: 'Website', link: 'https://www.example.com' },
      { icon: '📊', label: 'Analytics', link: 'https://analytics.google.com' },
      { icon: '🚀', label: 'Rocket', link: 'https://www.spacex.com' },
    ];
    items.forEach(item => {
      const btn = document.createElement('div');
      btn.className = "p-2 bg-gray-100 dark:bg-gray-700 rounded text-center cursor-pointer border border-gray-300 dark:border-gray-600";
      btn.addEventListener('click', () => window.open(item.link, '_blank'));
      const iconSpan = document.createElement('div');
      iconSpan.className = "text-xl mb-1";
      iconSpan.textContent = item.icon;
      btn.appendChild(iconSpan);
      const labelSpan = document.createElement('div');
      labelSpan.textContent = item.label;
      btn.appendChild(labelSpan);
      grid.appendChild(btn);
    });
    return grid;
  }

  /***********************************************
   * populateProfileTab
   ***********************************************/
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
    copyAccBtn.className = "mt-2 bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-sm";
    copyAccBtn.addEventListener('click', () => {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(() => {
        copyAccBtn.textContent = "Copied!";
        setTimeout(() => { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    container.appendChild(copyAccBtn);
    
    const hr = document.createElement('hr');
    hr.className = "my-2 border-gray-300 dark:border-gray-600";
    container.appendChild(hr);
    
    const rHead = document.createElement('div');
    rHead.textContent = "Recent Tickets (last 7 days)";
    rHead.className = "font-bold mb-2";
    container.appendChild(rHead);
    
    const recTix = getRecentTickets();
    if (recTix.length > 0) {
      recTix.forEach(t => {
        const tDiv = document.createElement('div');
        tDiv.className = "mb-2 pb-2 border-b border-gray-300 dark:border-gray-600";
        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.className = "text-blue-600 dark:text-blue-400 no-underline hover:underline";
        tDiv.appendChild(a);
        const cpBtn = document.createElement('button');
        cpBtn.className = "ml-2 bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-sm";
        cpBtn.innerHTML = copyIconSVG;
        cpBtn.title = "Copy Link";
        cpBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(t.href).then(() => {
            cpBtn.innerHTML = `<span class="text-green-500">&#10003;</span>`;
            setTimeout(() => { cpBtn.innerHTML = copyIconSVG; }, 2000);
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
    
    fetchCARR(cVal => {
      const vEl = carrRow.querySelector('.bg-light');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***********************************************
   * Build Entire Tool Layout using Tailwind
   ***********************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    console.log("[MultiTool Beast] Initializing (v1.40.1) with Tailwind CSS...");
    initTheme();
    const isOpen = false;

    // Open button (fixed bottom-right)
    const openBtn = document.createElement('button');
    openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" class="w-5 h-5">`;
    openBtn.className = "fixed bottom-0 right-0 z-50 bg-blue-600 text-white border border-blue-800 rounded px-3 py-1";
    openBtn.title = "Open MultiTool Beast";
    openBtn.style.display = isOpen ? 'none' : 'block';
    openBtn.addEventListener('click', () => {
      console.log("[MultiTool Beast] Open button clicked");
      wrapper.style.display = 'block';
      openBtn.style.display = 'none';
      localStorage.setItem("multitool_open", "true");
      showTab('profile');
      if (profileFieldsContainer) {
        populateProfileTab(profileFieldsContainer);
      }
    });
    document.body.appendChild(openBtn);

    // Outer wrapper
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    const storedPos = localStorage.getItem("multitool_position");
    if (storedPos) {
      try {
        const pos = JSON.parse(storedPos);
        if (pos.top) wrapper.style.top = pos.top;
        if (pos.left) wrapper.style.left = pos.left;
      } catch(e){}
    } else {
      wrapper.className += " fixed bottom-20 right-5 z-50";
    }
    wrapper.className += " fixed z-50 w-80 min-w-[280px] min-h-[200px] resize overflow-auto bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200";
    wrapper.style.display = isOpen ? 'block' : 'none';
    localStorage.setItem("multitool_open", isOpen ? "true" : "false");

    // Top Bar
    const topBar = document.createElement('div');
    topBar.id = "multitool-topbar";
    topBar.className = "flex justify-between items-center mb-2 px-2";
    const topLeft = document.createElement('div');
    // Night mode toggle
    const nightLabel = document.createElement('label');
    nightLabel.className = "switch inline-block";
    const nightInput = document.createElement('input');
    nightInput.type = 'checkbox';
    nightInput.id = 'slider-top';
    const nightSpan = document.createElement('span');
    nightSpan.className = "slider round block";
    nightLabel.appendChild(nightInput);
    nightLabel.appendChild(nightSpan);
    topLeft.appendChild(nightLabel);
    nightInput.addEventListener('change', toggleTheme);
    topBar.appendChild(topLeft);
    const topRight = document.createElement('div');
    topRight.className = "flex space-x-2";
    const upBtn = document.createElement('button');
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.className = "border border-blue-600 rounded px-2 py-1 text-sm";
    upBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    topRight.appendChild(upBtn);
    const downBtn = document.createElement('button');
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.className = "border border-blue-600 rounded px-2 py-1 text-sm";
    downBtn.addEventListener('click', () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
    topRight.appendChild(downBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "×";
    closeBtn.title = "Close MultiTool Beast";
    closeBtn.className = "border border-red-600 rounded px-2 py-1 text-sm";
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = 'none';
      openBtn.style.display = 'block';
      localStorage.setItem("multitool_open", "false");
    });
    topRight.appendChild(closeBtn);
    topBar.appendChild(topRight);
    wrapper.appendChild(topBar);

    // Header
    const headerArea = document.createElement('div');
    headerArea.className = "flex items-center justify-center py-2 px-3";
    const headerIcon = document.createElement('img');
    headerIcon.src = 'https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png';
    headerIcon.className = "w-5 h-5 mr-2";
    const headerTxt = document.createElement('span');
    headerTxt.textContent = "MultiTool Beast";
    headerTxt.className = "font-bold";
    headerArea.appendChild(headerIcon);
    headerArea.appendChild(headerTxt);
    wrapper.appendChild(headerArea);

    // Tabs Navigation
    const tabsNav = document.createElement('div');
    tabsNav.className = "flex border-b border-gray-300 dark:border-gray-600 mb-2";
    const tabBtnProfile = document.createElement('div');
    tabBtnProfile.className = "px-3 py-1 cursor-pointer bg-gray-200 dark:bg-gray-700 text-sm rounded-t";
    tabBtnProfile.id = "tab-btn-profile";
    tabBtnProfile.innerHTML = `<span class="inline-block mr-1">${personIconSVG}</span> Profile`;
    tabBtnProfile.addEventListener('click', () => showTab('profile'));
    const tabBtnPinned = document.createElement('div');
    tabBtnPinned.className = "px-3 py-1 cursor-pointer bg-gray-200 dark:bg-gray-700 text-sm rounded-t";
    tabBtnPinned.id = "tab-btn-pinned";
    tabBtnPinned.innerHTML = `<span class="inline-block mr-1">${pinIconSVG}</span> Pinned`;
    tabBtnPinned.addEventListener('click', () => showTab('pinned'));
    tabsNav.appendChild(tabBtnProfile);
    tabsNav.appendChild(tabBtnPinned);
    wrapper.appendChild(tabsNav);

    // Profile Tab Content
    const tabProfile = document.createElement('div');
    tabProfile.className = "p-3 multitool-tab-content";
    tabProfile.id = "tab-content-profile";
    const cardBodyProfile = document.createElement('div');
    cardBodyProfile.className = "p-3";
    // Row: Copy Selected + Slack/JIRA toggle
    const topBodyRowProfile = document.createElement('div');
    topBodyRowProfile.className = "flex items-center mb-2";
    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.className = "border border-blue-600 rounded px-2 py-1 text-sm mr-2";
    copyAllBtn.addEventListener('click', copyAllSelected);
    topBodyRowProfile.appendChild(copyAllBtn);
    const formatGroup = document.createElement('div');
    formatGroup.id = "format-toggle-group";
    formatGroup.className = "flex space-x-2";
    const slackBtn = document.createElement('button');
    slackBtn.id = "format-slack-btn";
    slackBtn.textContent = "Slack";
    slackBtn.type = "button";
    slackBtn.className = "border border-blue-600 rounded px-2 py-1 text-sm active";
    slackBtn.addEventListener('click', () => setFormat('slack'));
    const jiraBtn = document.createElement('button');
    jiraBtn.id = "format-jira-btn";
    jiraBtn.textContent = "JIRA";
    jiraBtn.type = "button";
    jiraBtn.className = "border border-blue-600 rounded px-2 py-1 text-sm";
    jiraBtn.addEventListener('click', () => setFormat('jira'));
    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topBodyRowProfile.appendChild(formatGroup);
    cardBodyProfile.appendChild(topBodyRowProfile);
    // "Include Summary" row
    const summaryRow = document.createElement('div');
    summaryRow.className = "mb-2";
    const sumCheck = document.createElement('input');
    sumCheck.type = "checkbox";
    sumCheck.id = "include-summary";
    sumCheck.className = "mr-2";
    const sumLbl = document.createElement('label');
    sumLbl.textContent = "Include Summary";
    sumLbl.htmlFor = "include-summary";
    summaryRow.appendChild(sumCheck);
    summaryRow.appendChild(sumLbl);
    cardBodyProfile.appendChild(summaryRow);
    // Container for Profile fields
    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = "profile-fields-container";
    cardBodyProfile.appendChild(profileFieldsContainer);
    populateProfileTab(profileFieldsContainer);
    wrapper.appendChild(tabProfile);
    
    // Pinned Tab Content
    const tabPinned = document.createElement('div');
    tabPinned.className = "p-3 multitool-tab-content";
    tabPinned.id = "tab-content-pinned";
    const pinnedBody = document.createElement('div');
    pinnedBody.className = "p-3";
    pinnedBody.innerHTML = `<p class="mb-2 text-sm font-bold">Quick Access Grid:</p>`;
    pinnedBody.appendChild(buildPinnedTabContent());
    tabPinned.appendChild(pinnedBody);
    wrapper.appendChild(tabPinned);
    
    document.body.appendChild(wrapper);
    
    // Draggable handle
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = "✋";
    dragHandleBtn.className = "bg-gray-300 text-sm rounded px-2 py-1 absolute -top-6 left-1/2 transform -translate-x-1/2 cursor-move";
    wrapper.appendChild(dragHandleBtn);
    dragHandleBtn.onmousedown = function(e) {
      e.preventDefault();
      let posX = e.clientX;
      let posY = e.clientY;
      document.onmouseup = closeDrag;
      document.onmousemove = dragMove;
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
        document.onmouseup = null;
        document.onmousemove = null;
        localStorage.setItem("multitool_position", JSON.stringify({
          top: wrapper.style.top,
          left: wrapper.style.left
        }));
      }
    };
    
    setFormat('slack');
    showTab('profile');
    initTheme();
    console.log("[MultiTool Beast] Loaded (v1.40.1) with Tailwind CSS.");
  }

  /***********************************************
   * Auto-update on URL change
   ***********************************************/
  setInterval(() => {
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
  
  /***********************************************
   * Initialize on DOM ready
   ***********************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTool, 3000));
  } else {
    setTimeout(initTool, 3000);
  }
})();
