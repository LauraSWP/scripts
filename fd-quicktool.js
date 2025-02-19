// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.70
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
   * 1) Inline SVG icons (person, pin, copy)
   ***********************************************/
  const personIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
  <path d="M2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"/>
</svg>`;

  const pinIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin" viewBox="0 0 16 16">
  <path d="M4.146 14.354a.5.5 0 0 0 .708 0L8 11.207l3.146 3.147a.5.5 0 0 0 .708-.708l-3.147-3.146 3.034-3.034a.5.5 0 0 0-.708-.708L8 6.793 4.966 3.76a.5.5 0 0 0-.708.708l3.034 3.034-3.146 3.146a.5.5 0 0 0 0 .708z"/>
</svg>`;

  const copyIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
  <path d="M10 1.5H6a.5.5 0 0 0-.5.5v1H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5v-1a.5.5 0 0 0-.5-.5zm-4 1h4v1H6v-1z"/>
  <path d="M4 5h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/>
</svg>`;

  /***********************************************
   * 2) Main CSS: Layout, tabs, and night mode toggle
   ***********************************************/
  const styleEl = document.createElement('style');
  styleEl.textContent = `
/* Wrapper styling */
#multitool-beast-wrapper {
  background: #ffffff;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cfd7df;
  color: #313131;
  font-family: sans-serif;
}

/* Top bar with night mode toggle on left, up/down and close on right */
#multitool-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  padding: 0 5px;
}
.topbar-buttons button {
  font-size: 12px;
  margin-left: 5px;
  cursor: pointer;
}
button.btn.btn-sm.btn-outline-danger {
  background: #8fa0ae;
  min-width: 10px;
  padding: 4px 15px 5px;
}

/* Copy icon buttons */
button.copy-btn {
  background: #b0b0b0;
  min-width: 10px;
  padding: 4px 8px;
  border: none;
  cursor: pointer;
  margin-left: 6px;
}
button.copy-btn:hover {
  opacity: 0.8;
}

/* Slack/JIRA toggle group */
#format-toggle-group {
  display: inline-flex;
  vertical-align: middle;
  margin-left: 8px;
}
#format-toggle-group button {
  font-size: 12px;
  margin-right: 2px;
  cursor: pointer;
}
#format-toggle-group button.active {
  background-color: #007bff;
  color: #fff;
  border-color: #007bff;
}

/* Night mode toggle switch with icons */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}
.slider.round {
  border-radius: 34px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: -3px;
  bottom: -3px;
  transition: .4s;
  background: white url('https://i.ibb.co/FxzBYR9/night.png') no-repeat center / cover;
  border-radius: 50%;
  box-shadow: 0 0px 15px #2020203d;
}
input:checked + .slider:before {
  transform: translateX(20px);
  background: white url('https://i.ibb.co/7JfqXxB/sunny.png') no-repeat center / cover;
}

/* Tabs */
.multitool-tabs {
  display: flex;
  border-bottom: 1px solid #ccc;
  margin-bottom: 10px;
}
.multitool-tab {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  margin-right: 4px;
  border-radius: 4px 4px 0 0;
  background-color: #f2f2f2;
}
.multitool-tab.active {
  background-color: #fff;
  font-weight: bold;
  color: #000;
  border: 1px solid #ccc;
  border-bottom: 1px solid #fff;
}
.multitool-tab-icon {
  margin-right: 4px;
}
.multitool-tab-content {
  display: none;
}
.multitool-tab-content.active {
  display: block;
}

/* Pinned tab quick access grid */
#pinned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.pinned-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #eee;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ddd;
  text-align: center;
}
.pinned-btn:hover {
  background: #ddd;
}
.pinned-btn-icon {
  font-size: 18px;
  margin-bottom: 4px;
}
`;
  document.head.appendChild(styleEl);

  /***********************************************
   * 3) Night Mode CSS (Dark overrides)
   ***********************************************/
  const nightModeCSS = `
body, html {
  background-color: #121212 !important;
  color: #e0e0e0 !important;
}
a, a:visited { color: #bb86fc !important; }
a:hover, a:focus { color: #9a67ea !important; }
header, .footer, .sidebar, .navbar { background-color: #1f1f1f !important; border-color: #333 !important; }
input, textarea, select, button { background-color: #1e1e1e !important; color: #e0e0e0 !important; border: 1px solid #333 !important; }
.card, .panel, .widget { background-color: #1e1e1e !important; border-color: #333 !important; }
.dropdown-menu, .modal-content, .popover { background-color: #1e1e1e !important; color: #e0e0e0 !important; border-color: #333 !important; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #121212; }
::-webkit-scrollbar-thumb { background-color: #333; border-radius: 4px; }
* { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; }
`;
  function applyNightModeCSS() {
    if (!document.getElementById("night-mode-style")) {
      const nm = document.createElement('style');
      nm.id = "night-mode-style";
      nm.innerHTML = nightModeCSS;
      document.head.appendChild(nm);
    }
  }
  function removeNightModeCSS() {
    const nm = document.getElementById("night-mode-style");
    if (nm) nm.remove();
  }
  function initTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored === 'theme-dark') applyNightModeCSS();
    else removeNightModeCSS();
  }
  function toggleTheme() {
    const st = localStorage.getItem('fdTheme');
    if (st === 'theme-dark') {
      localStorage.setItem('fdTheme', 'theme-light');
      removeNightModeCSS();
    } else {
      localStorage.setItem('fdTheme', 'theme-dark');
      applyNightModeCSS();
    }
  }

  /***********************************************
   * 4) Utility Functions
   ***********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();
  if (!currentTicketId) {
    console.log("[MultiTool Beast] Not a ticket page. Aborting.");
    return;
  }
  function getFieldValue(el) {
    if (!el) return "";
    let val = el.value || el.getAttribute('value') || el.getAttribute('placeholder') || "";
    val = val.trim();
    if (!val && window.Ember && el.id) {
      try { let view = Ember.View.views && Ember.View.views[el.id]; if (view) val = view.get('value'); } catch(e){}
    }
    if (!val) { let p = el.parentElement; if (p) val = p.innerText.trim(); }
    if (!val || ["account", "profile"].includes(val.toLowerCase())) val = "N/A";
    return val;
  }
  function getSummary() {
    const note = document.querySelector('.ticket_note[data-note-id]');
    return note ? note.textContent.trim() : "";
  }
  function formatCurrency(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "$";
  }

  /***********************************************
   * 5) Tab Functions
   ***********************************************/
  let tabContentProfile = null;
  let tabContentPinned = null;
  function showTab(which) {
    document.querySelectorAll('.multitool-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.multitool-tab-content').forEach(tc => tc.classList.remove('active'));
    if (which === 'profile') {
      document.getElementById('tab-btn-profile').classList.add('active');
      if (tabContentProfile) tabContentProfile.classList.add('active');
    } else {
      document.getElementById('tab-btn-pinned').classList.add('active');
      if (tabContentPinned) tabContentPinned.classList.add('active');
    }
  }

  /***********************************************
   * 6) Build Pinned Tab Content
   ***********************************************/
  function buildPinnedTabContent() {
    const grid = document.createElement('div');
    grid.id = "pinned-grid";
    const items = [
      { icon: '📄', label: 'Docs', link: 'https://docs.google.com/' },
      { icon: '🔗', label: 'Website', link: 'https://www.example.com' },
      { icon: '📊', label: 'Analytics', link: 'https://analytics.google.com' },
      { icon: '🚀', label: 'Rocket', link: 'https://www.spacex.com' },
    ];
    items.forEach(item => {
      const btn = document.createElement('div');
      btn.classList.add('pinned-btn');
      btn.addEventListener('click', () => window.open(item.link, '_blank'));
      const iconSpan = document.createElement('span');
      iconSpan.classList.add('pinned-btn-icon');
      iconSpan.textContent = item.icon;
      btn.appendChild(iconSpan);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label;
      btn.appendChild(labelSpan);
      grid.appendChild(btn);
    });
    return grid;
  }

  /***********************************************
   * 7) Build Profile Tab Content
   ***********************************************/
  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.classList.add('mb-2','pb-2','border-bottom','fieldRow');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = true;
    chk.classList.add('field-selector');
    chk.style.marginRight = "5px";
    row.appendChild(chk);
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.style.fontWeight = 'bold';
    row.appendChild(lbl);
    const finalValue = valueText || "N/A";
    if (labelText.toLowerCase() === "relevant urls" && finalValue.startsWith("http")) {
      const link = document.createElement('a');
      link.href = finalValue;
      link.target = "_blank";
      link.textContent = finalValue;
      link.classList.add('ml-1','p-1','bg-light','rounded');
      row.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = finalValue;
      span.classList.add('ml-1','p-1','bg-light','rounded');
      row.appendChild(span);
    }
    if (withCopy) {
      const btn = document.createElement('button');
      btn.classList.add('copy-btn');
      btn.innerHTML = copyIconSVG;
      btn.title = "Copy";
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(finalValue).then(() => {
          btn.innerHTML = `<span style="color:green;">&#10003;</span>`;
          setTimeout(() => { btn.innerHTML = copyIconSVG; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  function getRecentTickets() {
    const tickets = [];
    const elems = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
    if (!elems.length) return tickets;
    const now = new Date();
    const thresh = 7 * 24 * 60 * 60 * 1000;
    elems.forEach(el => {
      const timeEl = el.querySelector('[data-test-id="timeline-activity-time"]');
      if (timeEl) {
        let dt = new Date(timeEl.textContent.trim().replace(',', ''));
        if (!isNaN(dt) && (now - dt <= thresh) && dt <= now) {
          const linkEl = el.querySelector('a.text__link-heading');
          if (linkEl) {
            const href = linkEl.href;
            const subject = linkEl.textContent.trim();
            const m = href.match(/tickets\/(\d+)/);
            const idFound = m ? m[1] : "";
            if (parseInt(idFound, 10) === parseInt(currentTicketId, 10)) return;
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
            } catch (e) {
              console.error("[CARR] Error after showMore:", e);
              document.body.removeChild(iframe);
              callback("N/A");
            }
          }, 3000);
        } catch (e) {
          console.error("[CARR] Initial iframe error:", e);
          document.body.removeChild(iframe);
          callback("N/A");
        }
      }, 3000);
    };
    document.body.appendChild(iframe);
  }

  function populateProfileTab(container) {
    container.innerHTML = "";
    const ticketIdVal = "#" + currentTicketId;
    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]') || { value: "" }).value.trim();
    container.appendChild(createMenuItem("Ticket ID", ticketIdVal));
    container.appendChild(createMenuItem("Account", accountVal));
    container.appendChild(createMenuItem("Account Profile", profileVal));
    const carrRow = createMenuItem("CARR", "Fetching...", false);
    container.appendChild(carrRow);
    container.appendChild(createMenuItem("Relevant URLs", urlsVal));
    const copyAccBtn = document.createElement('button');
    copyAccBtn.textContent = "Copy Account/Profile";
    copyAccBtn.classList.add('btn','btn-sm','btn-outline-secondary','mb-2','copy-btn');
    copyAccBtn.addEventListener('click', () => {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(() => {
        copyAccBtn.textContent = "Copied!";
        setTimeout(() => { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    container.appendChild(copyAccBtn);
    const hr = document.createElement('hr');
    hr.classList.add('my-2');
    container.appendChild(hr);
    const rHeader = document.createElement('div');
    rHeader.textContent = "Recent Tickets (last 7 days)";
    rHeader.style.fontWeight = 'bold';
    rHeader.classList.add('mb-2');
    container.appendChild(rHeader);
    const recTix = getRecentTickets();
    if (recTix.length > 0) {
      recTix.forEach(t => {
        const tDiv = document.createElement('div');
        tDiv.classList.add('mb-2','pb-2','border-bottom');
        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.style.color = "#007bff";
        a.style.textDecoration = "none";
        a.addEventListener('mouseover', () => { a.style.textDecoration = "underline"; });
        a.addEventListener('mouseout', () => { a.style.textDecoration = "none"; });
        tDiv.appendChild(a);
        const cpBtn = document.createElement('button');
        cpBtn.classList.add('copy-btn');
        cpBtn.innerHTML = copyIconSVG;
        cpBtn.title = "Copy Link";
        cpBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(t.href).then(() => {
            cpBtn.innerHTML = `<span style="color:green;">&#10003;</span>`;
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
      const valEl = carrRow.querySelector('.bg-light');
      if (valEl) valEl.textContent = cVal;
    });
  }

  /***********************************************
   * 8) Initialize the Tool Layout
   ***********************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) return;
    console.log("[MultiTool Beast] Initializing (v1.37.4)...");
    initTheme();
    const isOpen = false;
    const openBtn = document.createElement('button');
    openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" style="width:20px;height:20px;">`;
    openBtn.style.position = 'fixed';
    openBtn.style.bottom = '0px';
    openBtn.style.right = '0px';
    openBtn.style.zIndex = '9999';
    openBtn.style.backgroundColor = '#007bff';
    openBtn.style.color = '#fff';
    openBtn.style.border = '1px solid #0056b3';
    openBtn.style.borderRadius = '4px';
    openBtn.style.padding = '6px 10px';
    openBtn.title = 'Open MultiTool Beast';
    openBtn.style.display = isOpen ? 'none' : 'block';
    openBtn.addEventListener('click', () => {
      wrapper.style.display = 'block';
      openBtn.style.display = 'none';
      showTab('profile');
      localStorage.setItem("multitool_open", "true");
      // Populate the profile tab fields
      populateProfileTab(profileFieldsContainer);
    });
    document.body.appendChild(openBtn);

    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    const storedPos = localStorage.getItem("multitool_position");
    if (storedPos) {
      const pos = JSON.parse(storedPos);
      if (pos.top) wrapper.style.top = pos.top;
      if (pos.left) wrapper.style.left = pos.left;
    } else {
      wrapper.style.bottom = '80px';
      wrapper.style.right = '20px';
    }
    wrapper.style.position = 'fixed';
    wrapper.style.zIndex = '9999';
    wrapper.style.width = '360px';
    wrapper.style.minWidth = '280px';
    wrapper.style.minHeight = '200px';
    wrapper.style.resize = 'both';
    wrapper.style.overflow = 'auto';
    wrapper.style.display = isOpen ? 'block' : 'none';
    localStorage.setItem("multitool_open", isOpen ? "true" : "false");

    // Top Bar
    const topBar = document.createElement('div');
    topBar.id = "multitool-topbar";
    const topLeft = document.createElement('div');
    const nightLabel = document.createElement('label');
    nightLabel.className = 'switch';
    const nightInput = document.createElement('input');
    nightInput.type = 'checkbox';
    nightInput.id = 'slider-top';
    const nightSpan = document.createElement('span');
    nightSpan.className = 'slider round';
    nightLabel.appendChild(nightInput);
    nightLabel.appendChild(nightSpan);
    topLeft.appendChild(nightLabel);
    nightInput.addEventListener('change', toggleTheme);
    topBar.appendChild(topLeft);
    const topRight = document.createElement('div');
    topRight.className = 'topbar-buttons';
    const upBtn = document.createElement('button');
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.classList.add('btn','btn-sm','btn-outline-secondary');
    upBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    topRight.appendChild(upBtn);
    const downBtn = document.createElement('button');
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.classList.add('btn','btn-sm','btn-outline-secondary');
    downBtn.addEventListener('click', () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
    topRight.appendChild(downBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.classList.add('btn','btn-sm','btn-outline-danger');
    closeBtn.title = 'Close MultiTool Beast';
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
    headerArea.classList.add('card-header','d-flex','align-items-center','justify-content-center','py-2','px-3');
    const headerIcon = document.createElement('img');
    headerIcon.src = 'https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png';
    headerIcon.style.width = '20px';
    headerIcon.style.height = '20px';
    headerIcon.style.marginRight = '8px';
    const headerTxt = document.createElement('span');
    headerTxt.textContent = 'MultiTool Beast';
    headerTxt.style.fontWeight = 'bold';
    headerArea.appendChild(headerIcon);
    headerArea.appendChild(headerTxt);
    wrapper.appendChild(headerArea);

    // Tabs Navigation
    const tabsNav = document.createElement('div');
    tabsNav.classList.add('multitool-tabs');
    const tabBtnProfile = document.createElement('div');
    tabBtnProfile.classList.add('multitool-tab');
    tabBtnProfile.id = 'tab-btn-profile';
    tabBtnProfile.innerHTML = `<span class="multitool-tab-icon">${personIconSVG}</span> Profile`;
    tabBtnProfile.addEventListener('click', () => { showTab('profile'); });
    const tabBtnPinned = document.createElement('div');
    tabBtnPinned.classList.add('multitool-tab');
    tabBtnPinned.id = 'tab-btn-pinned';
    tabBtnPinned.innerHTML = `<span class="multitool-tab-icon">${pinIconSVG}</span> Pinned`;
    tabBtnPinned.addEventListener('click', () => { showTab('pinned'); });
    tabsNav.appendChild(tabBtnProfile);
    tabsNav.appendChild(tabBtnPinned);
    wrapper.appendChild(tabsNav);

    // Tab Contents
    // Profile Tab
    tabContentProfile = document.createElement('div');
    tabContentProfile.classList.add('multitool-tab-content');
    tabContentProfile.id = 'tab-content-profile';
    const cardBodyProfile = document.createElement('div');
    cardBodyProfile.classList.add('p-3');
    const topBodyRowProfile = document.createElement('div');
    topBodyRowProfile.style.display = 'flex';
    topBodyRowProfile.style.alignItems = 'center';
    topBodyRowProfile.style.marginBottom = '8px';
    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = 'copy-all-selected-btn';
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.classList.add('btn','btn-sm','btn-outline-secondary','mr-1','copy-btn');
    copyAllBtn.addEventListener('click', copyAllSelected);
    topBodyRowProfile.appendChild(copyAllBtn);
    const formatGroup = document.createElement('div');
    formatGroup.id = 'format-toggle-group';
    const slackBtn = document.createElement('button');
    slackBtn.id = 'format-slack-btn';
    slackBtn.textContent = "Slack";
    slackBtn.type = "button";
    slackBtn.classList.add('btn','btn-sm','btn-outline-secondary','mr-1');
    slackBtn.classList.add('active');
    slackBtn.addEventListener('click', () => setFormat('slack'));
    const jiraBtn = document.createElement('button');
    jiraBtn.id = 'format-jira-btn';
    jiraBtn.textContent = "JIRA";
    jiraBtn.type = "button";
    jiraBtn.classList.add('btn','btn-sm','btn-outline-secondary');
    jiraBtn.addEventListener('click', () => setFormat('jira'));
    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topBodyRowProfile.appendChild(formatGroup);
    cardBodyProfile.appendChild(topBodyRowProfile);
    const summaryRow = document.createElement('div');
    summaryRow.classList.add('mb-2');
    const sumCheck = document.createElement('input');
    sumCheck.type = 'checkbox';
    sumCheck.id = 'include-summary';
    sumCheck.classList.add('mr-1');
    const sumLbl = document.createElement('label');
    sumLbl.textContent = "Include Summary";
    sumLbl.htmlFor = 'include-summary';
    summaryRow.appendChild(sumCheck);
    summaryRow.appendChild(sumLbl);
    cardBodyProfile.appendChild(summaryRow);
    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = 'profile-fields-container';
    cardBodyProfile.appendChild(profileFieldsContainer);
    populateProfileTab(profileFieldsContainer);
    tabContentProfile.appendChild(cardBodyProfile);

    // Pinned Tab
    tabContentPinned = document.createElement('div');
    tabContentPinned.classList.add('multitool-tab-content');
    tabContentPinned.id = 'tab-content-pinned';
    const pinnedBody = document.createElement('div');
    pinnedBody.classList.add('p-3');
    pinnedBody.innerHTML = `<p>Quick Access Grid:</p>`;
    pinnedBody.appendChild(buildPinnedTabContent());
    tabContentPinned.appendChild(pinnedBody);

    wrapper.appendChild(tabContentProfile);
    wrapper.appendChild(tabContentPinned);

    document.body.appendChild(wrapper);

    // Drag handle
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = "✋";
    dragHandleBtn.classList.add('btn','btn-light');
    dragHandleBtn.style.background = "#b0b0b0";
    dragHandleBtn.style.minWidth = "10px";
    dragHandleBtn.style.padding = "4px 15px 5px";
    dragHandleBtn.style.position = "absolute";
    dragHandleBtn.style.top = "-25px";
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
    console.log("[MultiTool Beast] Loaded (v1.37.4).");
  }

  /***********************************************
   * 9) MutationObserver for Live Field Updates
   ***********************************************/
  // This observer watches for attribute changes (e.g. 'value') or subtree modifications
  // on the entire document. If the account or profile fields change, we re-populate the profile tab.
  const observer = new MutationObserver((mutationsList) => {
    const accountField = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
    const profileField = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
    if (accountField || profileField) {
      const container = document.getElementById('profile-fields-container');
      if (container) {
        populateProfileTab(container);
      }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['value'] });

  /***********************************************
   * 10) Auto-update on URL change
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
   * 11) Initialize the Tool
   ***********************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTool, 3000));
  } else {
    setTimeout(initTool, 3000);
  }

})();
