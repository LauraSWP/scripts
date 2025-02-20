// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.77
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
   * 0) Load Bulma CSS (if not already present)
   ***********************************************/
  if (!document.getElementById('bulma-css')) {
    const link = document.createElement('link');
    link.id = 'bulma-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css';
    document.head.appendChild(link);
  }

  /***********************************************
   * 1) Custom Dark Mode CSS for Bulma (applied when <html> has class "dark")
   ***********************************************/
  const darkModeOverrides = `
html.dark body {
  background-color: #121212 !important;
  color: #e0e0e0 !important;
}
html.dark .box {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
  color: #e0e0e0 !important;
}
html.dark .tabs ul li a {
  color: #e0e0e0 !important;
}
html.dark .tabs ul li.is-active a {
  border-bottom-color: #1e1e1e !important;
  color: #fff !important;
}
html.dark .button {
  background-color: #333 !important;
  border-color: #444 !important;
  color: #e0e0e0 !important;
}
`;
  function applyDarkModeCSS() {
    if (!document.getElementById('dark-mode-overrides')) {
      const style = document.createElement('style');
      style.id = 'dark-mode-overrides';
      style.textContent = darkModeOverrides;
      document.head.appendChild(style);
    }
  }
  function removeDarkModeCSS() {
    const style = document.getElementById('dark-mode-overrides');
    if (style) style.remove();
  }

  /***********************************************
   * 2) Utility: showTab (switch between Profile and Pinned tabs)
   ***********************************************/
  function showTab(which) {
    document.querySelectorAll('.multitool-tab-content').forEach(el => el.classList.remove('is-active'));
    document.querySelectorAll('.multitool-tab-item').forEach(el => el.classList.remove('is-active'));
    if (which === 'profile') {
      const tab = document.getElementById('tab-btn-profile');
      const content = document.getElementById('tab-content-profile');
      if (tab) tab.classList.add('is-active');
      if (content) content.classList.add('is-active');
    } else {
      const tab = document.getElementById('tab-btn-pinned');
      const content = document.getElementById('tab-content-pinned');
      if (tab) tab.classList.add('is-active');
      if (content) content.classList.add('is-active');
    }
  }

  /***********************************************
   * 3) Inline SVG icons (person, pin, copy)
   ***********************************************/
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

  /***********************************************
   * 4) Dark Mode Toggle: switch shows sun for day (light mode) and moon for night
   *    (CSS below: unchecked displays sun icon; checked displays moon icon)
   ***********************************************/
  // We’ll use custom CSS (defined later in our UI) for the switch.
  // Dark mode is controlled by toggling the "dark" class on <html>.
  function initTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored === 'theme-dark') {
      document.documentElement.classList.add('dark');
      applyDarkModeCSS();
    } else {
      document.documentElement.classList.remove('dark');
      removeDarkModeCSS();
    }
  }
  function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fdTheme', 'theme-light');
      removeDarkModeCSS();
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fdTheme', 'theme-dark');
      applyDarkModeCSS();
    }
  }

  /***********************************************
   * 5) Extract Ticket ID (handles /a/tickets/ too)
   ***********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/(?:\/a)?\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();

  /***********************************************
   * 6) Helper Functions
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
   * 7) Slack/JIRA Toggle & "Copy Selected"
   ***********************************************/
  let formatMode = 'slack';
  function setFormat(mode) {
    formatMode = mode;
    const slackBtn = document.getElementById('format-slack-btn');
    const jiraBtn = document.getElementById('format-jira-btn');
    if (!slackBtn || !jiraBtn) return;
    if (mode === 'slack') {
      slackBtn.classList.add('is-active');
      jiraBtn.classList.remove('is-active');
    } else {
      slackBtn.classList.remove('is-active');
      jiraBtn.classList.add('is-active');
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
    lbl.className = "has-text-weight-bold";
    row.appendChild(lbl);
    const finalVal = valueText || "N/A";
    if (labelText.toLowerCase() === "relevant urls" && finalVal.startsWith("http")) {
      const link = document.createElement('a');
      link.href = finalVal;
      link.target = "_blank";
      link.textContent = finalVal;
      link.className = "ml-2 p-1 bg-light";
      row.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = finalVal;
      span.className = "ml-2 p-1 bg-light";
      row.appendChild(span);
    }
    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "ml-2 button is-small is-light copy-btn";
      btn.innerHTML = copyIconSVG;
      btn.title = "Copy";
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(finalVal).then(() => {
          btn.innerHTML = `<span class="has-text-success">&#10003;</span>`;
          setTimeout(() => { btn.innerHTML = copyIconSVG; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  /***********************************************
   * 8) Build Pinned Tab Content
   ***********************************************/
  function buildPinnedTabContent() {
    const grid = document.createElement('div');
    grid.id = "pinned-grid";
    grid.className = "columns is-multiline";
    const items = [
      { icon: '📄', label: 'Docs', link: 'https://docs.google.com/' },
      { icon: '🔗', label: 'Website', link: 'https://www.example.com' },
      { icon: '📊', label: 'Analytics', link: 'https://analytics.google.com' },
      { icon: '🚀', label: 'Rocket', link: 'https://www.spacex.com' },
    ];
    items.forEach(item => {
      const col = document.createElement('div');
      col.className = "column is-half";
      const btn = document.createElement('div');
      btn.className = "box has-text-centered is-clickable";
      btn.addEventListener('click', () => window.open(item.link, '_blank'));
      const iconSpan = document.createElement('div');
      iconSpan.className = "is-size-4 mb-1";
      iconSpan.textContent = item.icon;
      btn.appendChild(iconSpan);
      const labelSpan = document.createElement('div');
      labelSpan.textContent = item.label;
      btn.appendChild(labelSpan);
      col.appendChild(btn);
      grid.appendChild(col);
    });
    return grid;
  }

  /***********************************************
   * 9) Populate Profile Tab
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
    copyAccBtn.className = "mt-2 button is-small is-light";
    copyAccBtn.addEventListener('click', () => {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(() => {
        copyAccBtn.textContent = "Copied!";
        setTimeout(() => { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    container.appendChild(copyAccBtn);
    
    const hr = document.createElement('hr');
    hr.className = "my-2";
    container.appendChild(hr);
    
    const rHead = document.createElement('div');
    rHead.textContent = "Recent Tickets (last 7 days)";
    rHead.className = "has-text-weight-bold mb-2";
    container.appendChild(rHead);
    
    const recTix = getRecentTickets();
    if (recTix.length > 0) {
      recTix.forEach(t => {
        const tDiv = document.createElement('div');
        tDiv.className = "mb-2 pb-2 border-b";
        tDiv.classList.add("border-gray-300");
        if (document.documentElement.classList.contains("dark"))
          tDiv.classList.add("border-gray-600");
        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.className = "has-text-link";
        tDiv.appendChild(a);
        const cpBtn = document.createElement('button');
        cpBtn.className = "ml-2 button is-small is-light copy-btn";
        cpBtn.innerHTML = copyIconSVG;
        cpBtn.title = "Copy Link";
        cpBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(t.href).then(() => {
            cpBtn.innerHTML = `<span class="has-text-success">&#10003;</span>`;
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
   * 10) Build Entire Tool Layout using Bulma
   ***********************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    console.log("[MultiTool Beast] Initializing (v1.40.1) with Bulma...");
    initTheme();
    const isOpen = false;
    
    // Open button (fixed bottom-right) – same proportions as before
    const openBtn = document.createElement('button');
    openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" class="image is-32x32">`;
    openBtn.className = "button is-primary is-small";
    openBtn.style.position = "fixed";
    openBtn.style.bottom = "20px";
    openBtn.style.right = "20px";
    openBtn.style.zIndex = "10000";
    openBtn.title = "Open MultiTool Beast";
    openBtn.style.display = isOpen ? "none" : "block";
    openBtn.addEventListener('click', () => {
      console.log("[MultiTool Beast] Open button clicked");
      wrapper.style.display = "block";
      openBtn.style.display = "none";
      localStorage.setItem("multitool_open", "true");
      showTab('profile');
      if (profileFieldsContainer) {
        populateProfileTab(profileFieldsContainer);
      }
    });
    document.body.appendChild(openBtn);
    
    // Outer wrapper – use Bulma's "box" class and fixed positioning similar to Bootstrap version
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    // Restore stored position if any, otherwise default to bottom 80px, right 20px
    const storedPos = localStorage.getItem("multitool_position");
    if (storedPos) {
      try {
        const pos = JSON.parse(storedPos);
        if (pos.top) wrapper.style.top = pos.top;
        if (pos.left) wrapper.style.left = pos.left;
      } catch(e){}
    } else {
      wrapper.style.bottom = "80px";
      wrapper.style.right = "20px";
    }
    wrapper.className = "box has-background-white dark:has-background-dark p-4";
    wrapper.style.position = "fixed";
    wrapper.style.zIndex = "10000";
    wrapper.style.width = "360px";
    wrapper.style.minWidth = "280px";
    wrapper.style.minHeight = "200px";
    wrapper.style.resize = "both";
    wrapper.style.overflow = "auto";
    wrapper.style.display = isOpen ? "block" : "none";
    localStorage.setItem("multitool_open", isOpen ? "true" : "false");
    
    // Top Bar – using Bulma level
    const topBar = document.createElement('div');
    topBar.id = "multitool-topbar";
    topBar.className = "level mb-2";
    // Left part: dark mode toggle
    const levelLeft = document.createElement('div');
    levelLeft.className = "level-left";
    const nightLabel = document.createElement('label');
    nightLabel.className = "switch";
    const nightInput = document.createElement('input');
    nightInput.type = "checkbox";
    nightInput.id = "slider-top";
    const nightSpan = document.createElement('span');
    nightSpan.className = "slider round";
    nightLabel.appendChild(nightInput);
    nightLabel.appendChild(nightSpan);
    levelLeft.appendChild(nightLabel);
    nightInput.addEventListener('change', toggleTheme);
    topBar.appendChild(levelLeft);
    // Right part: up, down, close buttons
    const levelRight = document.createElement('div');
    levelRight.className = "level-right";
    const upBtn = document.createElement('button');
    upBtn.textContent = "↑";
    upBtn.className = "button is-small";
    upBtn.title = "Scroll to top";
    upBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    levelRight.appendChild(upBtn);
    const downBtn = document.createElement('button');
    downBtn.textContent = "↓";
    downBtn.className = "button is-small";
    downBtn.title = "Scroll to bottom";
    downBtn.addEventListener('click', () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
    levelRight.appendChild(downBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "×";
    closeBtn.className = "button is-danger is-small";
    closeBtn.title = "Close MultiTool Beast";
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = "none";
      openBtn.style.display = "block";
      localStorage.setItem("multitool_open", "false");
    });
    levelRight.appendChild(closeBtn);
    topBar.appendChild(levelRight);
    wrapper.appendChild(topBar);
    
    // Header – Bulma title style
    const headerArea = document.createElement('div');
    headerArea.className = "has-text-centered mb-2";
    const headerIcon = document.createElement('img');
    headerIcon.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
    headerIcon.className = "image is-32x32 is-inline-block mr-2";
    const headerTxt = document.createElement('span');
    headerTxt.textContent = "MultiTool Beast";
    headerTxt.className = "title is-5 has-text-weight-bold";
    headerArea.appendChild(headerIcon);
    headerArea.appendChild(headerTxt);
    wrapper.appendChild(headerArea);
    
    // Tabs Navigation – using Bulma tabs component
    const tabsNav = document.createElement('div');
    tabsNav.className = "tabs is-boxed is-small mb-2";
    const ul = document.createElement('ul');
    
    const liProfile = document.createElement('li');
    liProfile.id = "tab-btn-profile";
    liProfile.className = "multitool-tab-item";
    liProfile.innerHTML = `<a><span class="icon is-small">${personIconSVG}</span><span>Profile</span></a>`;
    liProfile.addEventListener('click', () => showTab('profile'));
    ul.appendChild(liProfile);
    
    const liPinned = document.createElement('li');
    liPinned.id = "tab-btn-pinned";
    liPinned.className = "multitool-tab-item";
    liPinned.innerHTML = `<a><span class="icon is-small">${pinIconSVG}</span><span>Pinned</span></a>`;
    liPinned.addEventListener('click', () => showTab('pinned'));
    ul.appendChild(liPinned);
    
    tabsNav.appendChild(ul);
    wrapper.appendChild(tabsNav);
    
    // Profile Tab Content
    const tabProfile = document.createElement('div');
    tabProfile.id = "tab-content-profile";
    tabProfile.className = "multitool-tab-content";
    // Use Bulma box content styling
    const profileContent = document.createElement('div');
    profileContent.className = "content";
    
    // Row: "Copy Selected" and Slack/JIRA toggle
    const topBodyRowProfile = document.createElement('div');
    topBodyRowProfile.className = "is-flex is-align-items-center mb-2";
    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.className = "button is-info is-small mr-2";
    copyAllBtn.addEventListener('click', copyAllSelected);
    topBodyRowProfile.appendChild(copyAllBtn);
    
    const formatGroup = document.createElement('div');
    formatGroup.id = "format-toggle-group";
    formatGroup.className = "buttons are-small";
    const slackBtn = document.createElement('button');
    slackBtn.id = "format-slack-btn";
    slackBtn.textContent = "Slack";
    slackBtn.className = "button is-outlined is-info is-small is-active";
    slackBtn.type = "button";
    slackBtn.addEventListener('click', () => setFormat('slack'));
    const jiraBtn = document.createElement('button');
    jiraBtn.id = "format-jira-btn";
    jiraBtn.textContent = "JIRA";
    jiraBtn.className = "button is-outlined is-info is-small";
    jiraBtn.type = "button";
    jiraBtn.addEventListener('click', () => setFormat('jira'));
    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topBodyRowProfile.appendChild(formatGroup);
    profileContent.appendChild(topBodyRowProfile);
    
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
    profileContent.appendChild(summaryRow);
    
    // Container for Profile fields
    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = "profile-fields-container";
    profileContent.appendChild(profileFieldsContainer);
    populateProfileTab(profileFieldsContainer);
    
    tabProfile.appendChild(profileContent);
    wrapper.appendChild(tabProfile);
    
    // Pinned Tab Content
    const tabPinned = document.createElement('div');
    tabPinned.id = "tab-content-pinned";
    tabPinned.className = "multitool-tab-content";
    const pinnedContent = document.createElement('div');
    pinnedContent.className = "content";
    pinnedContent.innerHTML = `<p class="has-text-weight-bold mb-2">Quick Access Grid:</p>`;
    pinnedContent.appendChild(buildPinnedTabContent());
    tabPinned.appendChild(pinnedContent);
    wrapper.appendChild(tabPinned);
    
    document.body.appendChild(wrapper);
    
    // Draggable handle (Bulma style – a small button above the box header)
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = "✋";
    dragHandleBtn.className = "button is-light is-small";
    dragHandleBtn.style.position = "absolute";
    dragHandleBtn.style.top = "-1.5rem";
    dragHandleBtn.style.left = "50%";
    dragHandleBtn.style.transform = "translateX(-50%)";
    dragHandleBtn.style.cursor = "move";
    wrapper.appendChild(dragHandleBtn);
    dragHandleBtn.onmousedown = function(e) {
      e.preventDefault();
      let posX = e.clientX, posY = e.clientY;
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
    console.log("[MultiTool Beast] Loaded (v1.40.1) with Bulma CSS.");
  }

  /***********************************************
   * 11) Auto-update on URL change (every 3 seconds)
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
   * 12) Initialize on DOM ready
   ***********************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTool, 3000));
  } else {
    setTimeout(initTool, 3000);
  }
  
})();
