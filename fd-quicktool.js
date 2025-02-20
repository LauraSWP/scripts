// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.87
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// ==/UserScript==

(function() {
  'use strict';

  /***********************************************
   * 0) Load Bulma CSS Inline via GM_xmlhttpRequest
   ***********************************************/
  function loadBulmaCSS(callback) {
    const url = "https://cdn.jsdelivr.net/npm/bulma@1.0.2/css/bulma.min.css";
    GM_xmlhttpRequest({
      method: "GET",
      url: url,
      onload: function(response) {
        if (response.status === 200) {
          console.log("[MultiTool Beast] Bulma CSS loaded inline.");
          callback(response.responseText);
        } else {
          console.error("[MultiTool Beast] Failed to load Bulma CSS, status:", response.status);
          callback("");
        }
      }
    });
  }

  /***********************************************
   * 1) Custom Dark Mode Overrides for Bulma
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
html.dark .has-text-link {
  color: #9ecfff !important;
}
html.dark .button {
  background-color: #333 !important;
  border-color: #444 !important;
  color: #e0e0e0 !important;
}
`;

  /***********************************************
   * 2) Host Element Styles (applied via :host in shadow DOM)
   ***********************************************/
  const hostStyles = `
:host {
  display: block;
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 10000;
  width: 360px;
  min-width: 200px;
  min-height: 200px;
  resize: both;
  overflow: auto;
  /* Bulma "box" look */
  padding: 1.5rem;
  background-color: white;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
}
`;

  /***********************************************
   * 3) Utility: showTab (switch between "Profile" and "Pinned" tabs)
   ***********************************************/
  function showTab(which) {
    const shadow = window._multitoolShadow;
    if (!shadow) return;
    shadow.querySelectorAll('.multitool-tab-content').forEach(el => {
      el.classList.remove('block');
      el.classList.add('hidden');
    });
    shadow.querySelectorAll('.multitool-tab-item').forEach(el => {
      el.classList.remove('border-bottom-2','border-info');
    });
    if (which === 'profile') {
      const tab = shadow.getElementById('tab-btn-profile');
      const content = shadow.getElementById('tab-content-profile');
      if (tab) tab.classList.add('border-bottom-2','border-info');
      if (content) {
        content.classList.remove('hidden');
        content.classList.add('block');
      }
    } else {
      const tab = shadow.getElementById('tab-btn-pinned');
      const content = shadow.getElementById('tab-content-pinned');
      if (tab) tab.classList.add('border-bottom-2','border-info');
      if (content) {
        content.classList.remove('hidden');
        content.classList.add('block');
      }
    }
  }

  /***********************************************
   * 4) Inline SVG Icons (person, pin, copy)
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
   * 5) Dark Mode Toggle: via our custom switch
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
   * 6) Extract Ticket ID (from URL)
   ***********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/(?:\/a)?\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();

  /***********************************************
   * 7) Helper Functions: getFieldValue, getSummary, getRecentTickets, fetchCARR
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
   * 8) Slack/JIRA Toggle & "Copy Selected" Functionality
   ***********************************************/
  let formatMode = 'slack';
  function setFormat(mode) {
    formatMode = mode;
    const shadow = window._multitoolShadow;
    if (!shadow) return;
    const slackBtn = shadow.getElementById('format-slack-btn');
    const jiraBtn = shadow.getElementById('format-jira-btn');
    if (!slackBtn || !jiraBtn) return;
    if (mode === 'slack') {
      slackBtn.classList.add('has-background-info','has-text-white');
      slackBtn.classList.remove('has-background-transparent');
      jiraBtn.classList.remove('has-background-info','has-text-white');
      jiraBtn.classList.add('has-background-transparent');
    } else {
      slackBtn.classList.remove('has-background-info','has-text-white');
      slackBtn.classList.add('has-background-transparent');
      jiraBtn.classList.add('has-background-info','has-text-white');
      jiraBtn.classList.remove('has-background-transparent');
    }
  }
  function copyAllSelected() {
    const shadow = window._multitoolShadow;
    if (!shadow) return;
    let copyText = "";
    shadow.querySelectorAll('.fieldRow').forEach(row => {
      const chk = row.querySelector('.field-selector');
      if (chk && chk.checked) {
        const lblSpan = row.querySelector('span');
        const valEl = row.querySelector('.has-background-light');
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
    const summaryCheck = window._multitoolShadow.getElementById('include-summary');
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
    const copyBtn = window._multitoolShadow.getElementById('copy-all-selected-btn');
    navigator.clipboard.writeText(copyText).then(() => {
      if (copyBtn) {
        copyBtn.textContent = "Copied Selected!";
        setTimeout(() => { copyBtn.textContent = "Copy Selected"; }, 2000);
      }
    });
  }
  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "mb-2 pb-2 fieldRow";
    row.style.borderBottom = "1px solid #ddd";
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
      link.className = "ml-2 p-1 has-background-light rounded";
      row.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = finalVal;
      span.className = "ml-2 p-1 has-background-light rounded";
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
   * 9) Build Pinned Tab Content (Quick Access Grid)
   ***********************************************/
  function buildPinnedTabContent() {
    const grid = document.createElement('div');
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
   * 10) Populate Profile Tab (Ticket/Field Info)
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
        tDiv.className = "mb-2 pb-2";
        tDiv.style.borderBottom = "1px solid #ddd";
        if (document.documentElement.classList.contains("dark")) {
          tDiv.style.borderBottom = "1px solid #444";
        }
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
      const vEl = carrRow.querySelector('.has-background-light');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***********************************************
   * 11) Build Entire Tool Layout Using Bulma in Shadow DOM
   ***********************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    loadBulmaCSS(function(bulmaCSS) {
      console.log("[MultiTool Beast] Initializing (v1.44.5) with Bulma in Shadow DOM.");
      initTheme();
      const isOpen = false; // force initial state closed
      
      // Create outer wrapper (host element)
      const wrapper = document.createElement('div');
      wrapper.id = "multitool-beast-wrapper";
      // Host element styles will be applied via :host in the shadow DOM stylesheet
      // Attach shadow DOM to wrapper
      const shadow = wrapper.attachShadow({ mode: "open" });
      window._multitoolShadow = shadow;
      
      // Inject Bulma CSS, dark mode overrides, and host styles into shadow
      const styleEl = document.createElement('style');
      styleEl.textContent = bulmaCSS + "\n" + darkModeOverrides + "\n" + hostStyles;
      // hostStyles defined below:
      const hostStyles = `
:host {
  display: block;
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 10000;
  width: 360px;
  min-width: 200px;
  min-height: 200px;
  resize: both;
  overflow: auto;
  padding: 1.5rem;
  background-color: white;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
}
`;
      styleEl.textContent = bulmaCSS + "\n" + darkModeOverrides + "\n" + hostStyles;
      shadow.appendChild(styleEl);
      
      // Create container for UI elements inside shadow DOM
      const container = document.createElement('div');
      
      // Top Bar
      const topBar = document.createElement('div');
      topBar.id = "multitool-topbar";
      topBar.className = "level mb-2 px-2";
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
      topBar.appendChild(levelLeft);
      const levelRight = document.createElement('div');
      levelRight.className = "level-right";
      const upBtn = document.createElement('button');
      upBtn.textContent = "↑";
      upBtn.title = "Scroll to top";
      upBtn.className = "button is-small";
      upBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      levelRight.appendChild(upBtn);
      const downBtn = document.createElement('button');
      downBtn.textContent = "↓";
      downBtn.title = "Scroll to bottom";
      downBtn.className = "button is-small";
      downBtn.addEventListener('click', () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
      levelRight.appendChild(downBtn);
      const closeBtn = document.createElement('button');
      closeBtn.textContent = "×";
      closeBtn.title = "Close MultiTool Beast";
      closeBtn.className = "button is-danger is-small";
      closeBtn.addEventListener('click', () => {
        wrapper.style.display = "none";
        openBtn.style.display = "block";
        localStorage.setItem("multitool_open", "false");
      });
      levelRight.appendChild(closeBtn);
      topBar.appendChild(levelRight);
      container.appendChild(topBar);
      
      // Header
      const headerArea = document.createElement('div');
      headerArea.className = "has-text-centered mb-2";
      const headerIcon = document.createElement('img');
      headerIcon.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
      headerIcon.className = "image is-32x32 inline-block";
      const headerTxt = document.createElement('span');
      headerTxt.textContent = "MultiTool Beast";
      headerTxt.className = "title is-5";
      headerArea.appendChild(headerIcon);
      headerArea.appendChild(headerTxt);
      container.appendChild(headerArea);
      
      // Tabs Navigation
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
      container.appendChild(tabsNav);
      
      // Profile Tab Content
      const tabProfile = document.createElement('div');
      tabProfile.id = "tab-content-profile";
      tabProfile.className = "multitool-tab-content block"; // visible by default
      const profileContent = document.createElement('div');
      profileContent.className = "content";
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
      slackBtn.type = "button";
      slackBtn.className = "button is-outlined is-info is-small is-active";
      slackBtn.addEventListener('click', () => setFormat('slack'));
      const jiraBtn = document.createElement('button');
      jiraBtn.id = "format-jira-btn";
      jiraBtn.textContent = "JIRA";
      jiraBtn.type = "button";
      jiraBtn.className = "button is-outlined is-info is-small";
      jiraBtn.addEventListener('click', () => setFormat('jira'));
      formatGroup.appendChild(slackBtn);
      formatGroup.appendChild(jiraBtn);
      topBodyRowProfile.appendChild(formatGroup);
      profileContent.appendChild(topBodyRowProfile);
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
      const profileFieldsContainer = document.createElement('div');
      profileFieldsContainer.id = "profile-fields-container";
      profileContent.appendChild(profileFieldsContainer);
      populateProfileTab(profileFieldsContainer);
      tabProfile.appendChild(profileContent);
      container.appendChild(tabProfile);
      
      // Pinned Tab Content (Quick Access Grid)
      const tabPinned = document.createElement('div');
      tabPinned.id = "tab-content-pinned";
      tabPinned.className = "multitool-tab-content hidden";
      const pinnedContent = document.createElement('div');
      pinnedContent.className = "content";
      pinnedContent.innerHTML = `<p class="has-text-weight-bold mb-2 is-size-7">Quick Access Grid:</p>`;
      pinnedContent.appendChild(buildPinnedTabContent());
      tabPinned.appendChild(pinnedContent);
      container.appendChild(tabPinned);
      
      shadow.appendChild(container);
      
      // Draggable handle (a small button above the header)
      const dragHandleBtn = document.createElement('button');
      dragHandleBtn.innerHTML = "✋";
      dragHandleBtn.className = "button is-light is-small";
      dragHandleBtn.style.position = "absolute";
      dragHandleBtn.style.top = "-24px";
      dragHandleBtn.style.left = "50%";
      dragHandleBtn.style.transform = "translateX(-50%)";
      dragHandleBtn.style.cursor = "move";
      shadow.appendChild(dragHandleBtn);
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
      console.log("[MultiTool Beast] Loaded (v1.44.5) with Bulma in Shadow DOM.");
      
      document.body.appendChild(wrapper);
      window._multitoolWrapper = wrapper;
    });
  }

  /***********************************************
   * 12) Auto-update on URL change (every 3 seconds)
   ***********************************************/
  setInterval(() => {
    const newId = extractTicketId();
    if (newId && newId !== currentTicketId) {
      console.log("[MultiTool Beast] Ticket changed from", currentTicketId, "to", newId);
      currentTicketId = newId;
      if (window._multitoolWrapper && window._multitoolWrapper.shadowRoot) {
        const container = window._multitoolWrapper.shadowRoot.getElementById('profile-fields-container');
        if (container) {
          populateProfileTab(container);
        }
      }
    }
  }, 3000);
  
  /***********************************************
   * 13) Open Button (outside Shadow DOM)
   ***********************************************/
  const isOpenGlobal = false;
  const openBtn = document.createElement('button');
  openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" class="image is-32x32">`;
  openBtn.style.position = "fixed";
  openBtn.style.bottom = "20px";
  openBtn.style.right = "20px";
  openBtn.style.zIndex = "10000";
  openBtn.style.backgroundColor = "#fff";
  openBtn.style.border = "2px solid #000";
  openBtn.style.padding = "5px";
  openBtn.style.borderRadius = "4px";
  openBtn.title = "Open MultiTool Beast";
  openBtn.style.display = isOpenGlobal ? "none" : "block";
  openBtn.className = "button is-primary is-small";
  openBtn.addEventListener('click', () => {
    if (window._multitoolWrapper) {
      window._multitoolWrapper.style.display = "block";
    }
    openBtn.style.display = "none";
    localStorage.setItem("multitool_open", "true");
    showTab('profile');
    if (window._multitoolWrapper && window._multitoolWrapper.shadowRoot) {
      const profileFieldsContainer = window._multitoolWrapper.shadowRoot.getElementById('profile-fields-container');
      if (profileFieldsContainer) {
        populateProfileTab(profileFieldsContainer);
      }
    }
  });
  document.body.appendChild(openBtn);

  /***********************************************
   * 14) Initialize on DOM ready
   ***********************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTool, 3000));
  } else {
    setTimeout(initTool, 3000);
  }
  
})();
