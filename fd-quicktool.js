// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.63
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // ========================================================
  // Consolidated Custom CSS
  // ========================================================
  const customStyle = document.createElement('style');
  customStyle.id = "multitool-custom-styles";
  customStyle.innerHTML = `
/* Wrapper styling */
#multitool-beast-wrapper {
  background: #ffffff;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cfd7df;
  color: #313131;
}

/* Top Bar styling */
#multitool-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  padding: 0 5px;
}

/* Button group styling for up/down and close */
.topbar-buttons button {
  font-size: 12px;
  margin-left: 5px;
  cursor: pointer;
}

/* Close button styling */
button.btn.btn-sm.btn-outline-danger {
  background: #8fa0ae;
  min-width: 10px;
  padding: 4px 15px 5px;
}

/* Copy button styling */
button.copy-btn {
  background: #b0b0b0;
  min-width: 10px;
  padding: 4px 15px 5px;
}

/* Slack/JIRA button group styling */
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

/* Slider (night mode toggle) */
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
input:checked + .slider {
  background-color: #2196f3;
}
input:checked + .slider:before {
  transform: translateX(20px);
  background: white url('https://i.ibb.co/7JfqXxB/sunny.png') no-repeat center / cover;
}
`;
  document.head.appendChild(customStyle);

  // ========================================================
  // Night Mode CSS
  // ========================================================
  const nightModeCSS = `
/* Night Mode Overrides */
body, html, .page, .main-content {
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
      const styleEl = document.createElement('style');
      styleEl.id = "night-mode-style";
      styleEl.innerHTML = nightModeCSS;
      document.head.appendChild(styleEl);
    }
  }
  function removeNightModeCSS() {
    const styleEl = document.getElementById("night-mode-style");
    if (styleEl) styleEl.remove();
  }

  // ========================================================
  // initTheme and toggleTheme
  // ========================================================
  function initTheme() {
    const storedTheme = localStorage.getItem('fdTheme');
    if (storedTheme === 'theme-dark') {
      applyNightModeCSS();
    } else {
      removeNightModeCSS();
    }
  }
  function toggleTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored === 'theme-dark') {
      localStorage.setItem('fdTheme', 'theme-light');
      removeNightModeCSS();
    } else {
      localStorage.setItem('fdTheme', 'theme-dark');
      applyNightModeCSS();
    }
  }

  // ========================================================
  // Utility / Helper Functions
  // ========================================================
  function extractTicketId() {
    const match = window.location.pathname.match(/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketIdGlobal = extractTicketId();
  if (!currentTicketIdGlobal) {
    console.log("[MultiTool Beast] Not a ticket page. Aborting.");
    return;
  }

  function getFieldValue(inputElement) {
    if (!inputElement) return "";
    let val = inputElement.value;
    if (!val || val.trim() === "") { val = inputElement.getAttribute('value'); }
    if (!val || val.trim() === "") { val = inputElement.getAttribute('placeholder'); }
    if ((!val || val.trim() === "") && window.Ember && inputElement.id) {
      try {
        let view = Ember.View.views && Ember.View.views[inputElement.id];
        if (view) { val = view.get('value'); }
      } catch (e) {
        console.error("[MultiTool Beast] Ember view lookup failed:", e);
      }
    }
    if (!val || val.trim() === "") {
      let parent = inputElement.parentElement;
      if (parent) { val = parent.innerText; }
    }
    if (!val || val.trim() === "" || val.trim().toLowerCase() === "account" || val.trim().toLowerCase() === "profile") {
      val = "N/A";
    }
    return val.trim();
  }

  function getSummary() {
    const noteDiv = document.querySelector('.ticket_note[data-note-id]');
    return noteDiv ? noteDiv.textContent.trim() : "";
  }

  function formatCurrency(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "$";
  }

  // Draggable
  function makeDraggable(elmnt, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = e.clientY - pos4;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elmnt.style.top = (elmnt.offsetTop + pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      localStorage.setItem("multitool_position", JSON.stringify({
        top: elmnt.style.top,
        left: elmnt.style.left
      }));
    }
  }

  // Fetch CARR
  function fetchCARR(callback) {
    const companyElem = document.querySelector('a[href*="/a/companies/"]');
    if (companyElem) {
      const relURL = companyElem.getAttribute('href');
      const companyURL = window.location.origin + relURL;
      console.log("[CARR] Found company link. Company URL:", companyURL);
      
      const iframe = document.createElement('iframe');
      iframe.style.position = "absolute";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "1024px";
      iframe.style.height = "768px";
      iframe.style.visibility = "visible";
      iframe.src = companyURL;
      
      iframe.onload = function() {
        console.log("[CARR] Offscreen iframe loaded. Waiting 5 seconds for initial render...");
        setTimeout(() => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            const showMoreBtn = doc.querySelector('div.contacts__sidepanel--state[data-test-toggle]');
            if (showMoreBtn) {
              console.log("[CARR] Found 'show more' element. Clicking it...");
              showMoreBtn.click();
            } else {
              console.log("[CARR] 'Show more' element not found.");
            }
            console.log("[CARR] Waiting additional 5 seconds after clicking 'show more'...");
            setTimeout(() => {
              try {
                const carrElem = doc.querySelector('[data-test-id="fields-info-carr_usd"] [data-test-field-content="CARR (converted)"] .text__content');
                if (carrElem) {
                  console.log("[CARR] Found CARR element:", carrElem.outerHTML);
                } else {
                  console.log("[CARR] CARR element not found.");
                }
                let carrValue = carrElem ? carrElem.textContent.trim() : "N/A";
                console.log("[CARR] Extracted value:", carrValue);
                if (carrValue !== "N/A" && !isNaN(carrValue.replace(/[.,]/g, ""))) {
                  carrValue = formatCurrency(carrValue.replace(/[.,]/g, ""));
                  console.log("[CARR] Formatted value:", carrValue);
                } else {
                  console.log("[CARR] Value not numeric or missing => 'N/A'.");
                }
                document.body.removeChild(iframe);
                callback(carrValue);
              } catch (e) {
                console.error("[CARR] Error after clicking 'show more':", e);
                document.body.removeChild(iframe);
                callback("N/A");
              }
            }, 5000);
          } catch (e) {
            console.error("[CARR] Initial iframe processing error:", e);
            document.body.removeChild(iframe);
            callback("N/A");
          }
        }, 5000);
      };
      
      document.body.appendChild(iframe);
    } else {
      console.log("[CARR] No company link found. Returning 'N/A'.");
      callback("N/A");
    }
  }

  // ========================================================
  // populateData: Build dynamic fields container
  // ========================================================
  function populateData() {
    const dynamicContainer = document.getElementById("multitool-fields-container");
    if (!dynamicContainer) return;
    dynamicContainer.innerHTML = "";

    function createMenuItem(labelText, valueText, withCopy = true, rowId = null) {
      const itemDiv = document.createElement('div');
      itemDiv.classList.add('mb-2', 'pb-2', 'border-bottom', 'fieldRow');
      if (rowId) itemDiv.id = rowId;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.classList.add('field-selector');
      checkbox.style.marginRight = "5px";
      itemDiv.appendChild(checkbox);

      const label = document.createElement('span');
      label.textContent = labelText + ": ";
      label.style.fontWeight = 'bold';
      itemDiv.appendChild(label);

      let finalValue = valueText || "N/A";
      if (labelText.toLowerCase() === "relevant urls" && finalValue && (finalValue.startsWith("http") || finalValue.startsWith("www"))) {
        const linkEl = document.createElement('a');
        linkEl.href = finalValue;
        linkEl.target = "_blank";
        linkEl.textContent = finalValue;
        linkEl.classList.add('ml-1', 'p-1', 'bg-light', 'rounded');
        itemDiv.appendChild(linkEl);
      } else {
        const valueEl = document.createElement('span');
        valueEl.textContent = finalValue;
        valueEl.classList.add('ml-1', 'p-1', 'bg-light', 'rounded');
        itemDiv.appendChild(valueEl);
      }

      if (withCopy) {
        const copyBtn = document.createElement('button');
        copyBtn.textContent = "Copy";
        copyBtn.classList.add('copy-btn');
        copyBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(finalValue).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
          }).catch(err => {
            console.error("[MultiTool Beast] Copy failed:", err);
          });
        });
        itemDiv.appendChild(copyBtn);
      }
      return itemDiv;
    }

    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]') || { value: "" }).value.trim();
    const ticketIdVal = "#" + currentTicketIdGlobal;

    dynamicContainer.appendChild(createMenuItem("Ticket ID", ticketIdVal));
    dynamicContainer.appendChild(createMenuItem("Account", accountVal));
    dynamicContainer.appendChild(createMenuItem("Account Profile", profileVal));
    const carrRow = createMenuItem("CARR", "Fetching...", false, "carrRow");
    dynamicContainer.appendChild(carrRow);
    dynamicContainer.appendChild(createMenuItem("Relevant URLs", urlsVal));

    const copyAccProfBtn = document.createElement('button');
    copyAccProfBtn.textContent = "Copy Account/Profile";
    copyAccProfBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mb-2', 'copy-btn');
    copyAccProfBtn.addEventListener('click', function() {
      const text = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(text).then(() => {
        copyAccProfBtn.textContent = "Copied!";
        setTimeout(() => { copyAccProfBtn.textContent = "Copy Account/Profile"; }, 2000);
      }).catch(err => {
        console.error("[MultiTool Beast] Copy Account/Profile failed:", err);
      });
    });
    dynamicContainer.appendChild(copyAccProfBtn);

    // Recent Tickets: using numeric comparison to filter out current ticket
    function getRecentTickets() {
      const tickets = [];
      const ticketElements = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
      if (!ticketElements.length) return tickets;
      const now = new Date();
      const threshold = 7 * 24 * 60 * 60 * 1000;
      for (let i = 0; i < ticketElements.length; i++) {
        const ticketEl = ticketElements[i];
        const timeEl = ticketEl.querySelector('[data-test-id="timeline-activity-time"]');
        if (timeEl) {
          let dateStr = timeEl.textContent.trim().replace(',', '');
          let ticketDate = new Date(dateStr);
          if (!isNaN(ticketDate) && (now - ticketDate <= threshold) && (ticketDate <= now)) {
            const linkEl = ticketEl.querySelector('a.text__link-heading');
            if (linkEl) {
              const href = linkEl.href;
              const subject = linkEl.textContent.trim();
              const matchTicketId = href.match(/tickets\/(\d+)/);
              let foundTicketId = matchTicketId ? matchTicketId[1] : "";
              if (parseInt(foundTicketId,10) === parseInt(currentTicketIdGlobal,10)) continue;
              tickets.push({ href, subject, date: ticketDate });
            }
          }
        }
      }
      return tickets;
    }

    const divider = document.createElement('hr');
    divider.classList.add('my-2');
    dynamicContainer.appendChild(divider);

    const recentHeader = document.createElement('div');
    recentHeader.textContent = "Recent Tickets (last 7 days)";
    recentHeader.style.fontWeight = 'bold';
    recentHeader.classList.add('mb-2');
    dynamicContainer.appendChild(recentHeader);

    const recentTickets = getRecentTickets();
    if (recentTickets.length) {
      recentTickets.forEach(ticket => {
        const ticketDiv = document.createElement('div');
        ticketDiv.classList.add('mb-2', 'pb-2', 'border-bottom');

        const ticketLink = document.createElement('a');
        ticketLink.href = ticket.href;
        ticketLink.textContent = ticket.subject;
        ticketLink.target = '_blank';
        ticketLink.classList.add('mr-2');
        ticketLink.style.color = '#007bff';
        ticketLink.style.textDecoration = 'none';
        ticketLink.addEventListener('mouseover', () => { ticketLink.style.textDecoration = 'underline'; });
        ticketLink.addEventListener('mouseout', () => { ticketLink.style.textDecoration = 'none'; });
        ticketDiv.appendChild(ticketLink);

        const copyTicketBtn = document.createElement('button');
        copyTicketBtn.textContent = "Copy Link";
        copyTicketBtn.classList.add('copy-btn');
        copyTicketBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(ticket.href).then(() => {
            copyTicketBtn.textContent = "Copied!";
            setTimeout(() => { copyTicketBtn.textContent = "Copy Link"; }, 2000);
          }).catch(err => {
            console.error("[MultiTool Beast] Copy link failed:", err);
          });
        });
        ticketDiv.appendChild(copyTicketBtn);

        dynamicContainer.appendChild(ticketDiv);
      });
    } else {
      const noTicketsDiv = document.createElement('div');
      noTicketsDiv.textContent = "No tickets in the last 7 days";
      dynamicContainer.appendChild(noTicketsDiv);
    }

    // Fetch CARR
    fetchCARR(function(carrValue) {
      const carrRowEl = document.getElementById("carrRow");
      if (carrRowEl) {
        const valueEl = carrRowEl.querySelector('.bg-light');
        if (valueEl) {
          valueEl.textContent = carrValue;
        }
      }
    });
  }

  // ========================================================
  // initTool: Build the entire tool DOM with the new layout
  // ========================================================
  function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("[MultiTool Beast] Initializing (v1.36.2)...");
    initTheme();

    // Default state: closed (so open button shows)
    const isOpen = false;

    // "Open" button (bottom-right)
    const openTabBtn = document.createElement('button');
    openTabBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" style="width:20px;height:20px;">`;
    openTabBtn.style.position = 'fixed';
    openTabBtn.style.bottom = '0px';
    openTabBtn.style.right = '0px';
    openTabBtn.style.zIndex = '9999';
    openTabBtn.style.backgroundColor = '#007bff';
    openTabBtn.style.color = '#fff';
    openTabBtn.style.border = '1px solid #0056b3';
    openTabBtn.style.borderRadius = '4px';
    openTabBtn.style.padding = '6px 10px';
    openTabBtn.title = 'Open MultiTool Beast';
    openTabBtn.style.display = isOpen ? 'none' : 'block';
    openTabBtn.addEventListener('click', () => {
      wrapper.style.display = 'block';
      openTabBtn.style.display = 'none';
      populateData();
      localStorage.setItem("multitool_open", "true");
    });
    document.body.appendChild(openTabBtn);

    // Outer wrapper
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    const storedPos = localStorage.getItem("multitool_position");
    let posStyles = {};
    if (storedPos) posStyles = JSON.parse(storedPos);
    if (storedPos && storedPos !== "{}") {
      wrapper.style.top = posStyles.top;
      wrapper.style.left = posStyles.left;
      wrapper.style.bottom = "";
      wrapper.style.right = "";
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

    // Append our built layout into the wrapper.
    // 1. Top Bar with Night Mode toggle (left) and Up/Down arrows + Close button (right)
    const topBar = document.createElement('div');
    topBar.id = "multitool-topbar";
    const topLeft = document.createElement('div');
    // Night mode toggle in top bar (reuse our toggle)
    const themeToggleLabelTop = document.createElement('label');
    themeToggleLabelTop.className = 'switch';
    const themeToggleInputTop = document.createElement('input');
    themeToggleInputTop.type = 'checkbox';
    themeToggleInputTop.id = 'slider-top';
    const themeToggleSpanTop = document.createElement('span');
    themeToggleSpanTop.className = 'slider round';
    themeToggleLabelTop.appendChild(themeToggleInputTop);
    themeToggleLabelTop.appendChild(themeToggleSpanTop);
    topLeft.appendChild(themeToggleLabelTop);
    themeToggleInputTop.addEventListener('change', () => {
      toggleTheme();
    });
    topBar.appendChild(topLeft);
    const topRight = document.createElement('div');
    topRight.className = 'topbar-buttons';
    const arrowUpBtn = document.createElement('button');
    arrowUpBtn.textContent = "↑";
    arrowUpBtn.title = "Scroll to top";
    arrowUpBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
    arrowUpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    const arrowDownBtn = document.createElement('button');
    arrowDownBtn.textContent = "↓";
    arrowDownBtn.title = "Scroll to bottom";
    arrowDownBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
    arrowDownBtn.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger');
    closeBtn.title = 'Close MultiTool Beast';
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = 'none';
      openTabBtn.style.display = 'block';
      localStorage.setItem("multitool_open", "false");
    });
    topRight.appendChild(arrowUpBtn);
    topRight.appendChild(arrowDownBtn);
    topRight.appendChild(closeBtn);
    topBar.appendChild(topRight);
    wrapper.appendChild(topBar);

    // 2. Card Header: Icon + Title (centered)
    const headerArea = document.createElement('div');
    headerArea.classList.add('card-header', 'd-flex', 'align-items-center', 'justify-content-center', 'py-2', 'px-3');
    const headerIcon = document.createElement('img');
    headerIcon.src = 'https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png';
    headerIcon.style.width = '20px';
    headerIcon.style.height = '20px';
    headerIcon.style.marginRight = '8px';
    const headerText = document.createElement('span');
    headerText.textContent = 'MultiTool Beast';
    headerText.style.fontWeight = 'bold';
    headerArea.appendChild(headerIcon);
    headerArea.appendChild(headerText);
    wrapper.appendChild(headerArea);

    // 3. Card Body: First row: Copy Selected and Format Toggle; Second row: Include Summary; then dynamic fields.
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'p-3');
    wrapper.appendChild(cardBody);

    const topBodyRow = document.createElement('div');
    topBodyRow.style.display = 'flex';
    topBodyRow.style.alignItems = 'center';
    topBodyRow.style.marginBottom = '8px';
    cardBody.appendChild(topBodyRow);

    const copyAllBtn = document.createElement('button');
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1', 'copy-btn');
    topBodyRow.appendChild(copyAllBtn);

    let formatMode = 'slack'; // default to Slack
    const formatGroup = document.createElement('div');
    formatGroup.id = 'format-toggle-group';
    const slackBtn = document.createElement('button');
    slackBtn.textContent = "Slack";
    slackBtn.type = "button";
    slackBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
    slackBtn.style.marginRight = "2px";
    const jiraBtn = document.createElement('button');
    jiraBtn.textContent = "JIRA";
    jiraBtn.type = "button";
    jiraBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
    slackBtn.classList.add('active');
    function setFormat(mode) {
      formatMode = mode;
      if (mode === 'slack') {
        slackBtn.classList.add('active');
        jiraBtn.classList.remove('active');
      } else {
        slackBtn.classList.remove('active');
        jiraBtn.classList.add('active');
      }
    }
    slackBtn.addEventListener('click', () => setFormat('slack'));
    jiraBtn.addEventListener('click', () => setFormat('jira'));
    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topBodyRow.appendChild(formatGroup);

    const summaryRowDiv = document.createElement('div');
    summaryRowDiv.classList.add('mb-2');
    const summaryCheckbox = document.createElement('input');
    summaryCheckbox.type = 'checkbox';
    summaryCheckbox.id = 'include-summary';
    summaryCheckbox.classList.add('mr-1');
    const summaryLabel = document.createElement('label');
    summaryLabel.textContent = "Include Summary";
    summaryLabel.htmlFor = 'include-summary';
    summaryRowDiv.appendChild(summaryCheckbox);
    summaryRowDiv.appendChild(summaryLabel);
    cardBody.appendChild(summaryRowDiv);

    const dynamicContainer = document.createElement('div');
    dynamicContainer.id = "multitool-fields-container";
    cardBody.appendChild(dynamicContainer);

    populateData();

    copyAllBtn.addEventListener('click', function() {
      let copyText = "";
      const fieldRows = document.querySelectorAll('.fieldRow');
      fieldRows.forEach(row => {
        const checkbox = row.querySelector('.field-selector');
        if (checkbox && checkbox.checked) {
          const labelSpan = row.querySelector('span');
          const valueEl = row.querySelector('.bg-light');
          if (labelSpan && valueEl) {
            let labelText = labelSpan.textContent.replace(/:\s*$/, "");
            let valueText = valueEl.textContent.trim();
            if (labelText.toLowerCase() === "ticket id") {
              const numericId = valueText.replace("#", "");
              const link = window.location.origin + "/a/tickets/" + numericId;
              if (formatMode === 'jira') {
                labelText = `**${labelText}**`;
                valueText = `[#${numericId}](${link})`;
              } else {
                valueText = `#${numericId} - ${link}`;
              }
            } else {
              if (formatMode === 'jira') {
                labelText = `**${labelText}**`;
              }
            }
            copyText += `${labelText}: ${valueText}\n`;
          }
        }
      });
      const summaryChecked = document.getElementById('include-summary');
      if (summaryChecked && summaryChecked.checked) {
        const summaryText = getSummary();
        if (summaryText) {
          if (formatMode === 'jira') {
            copyText += `\n**Summary**:\n${summaryText}\n`;
          } else {
            copyText += `\nSummary:\n${summaryText}\n`;
          }
        }
      }
      navigator.clipboard.writeText(copyText).then(() => {
        copyAllBtn.textContent = "Copied Selected!";
        setTimeout(() => { copyAllBtn.textContent = "Copy Selected"; }, 2000);
      }).catch(err => {
        console.error("[MultiTool Beast] Copy Selected failed:", err);
      });
    });

    document.body.appendChild(wrapper);

    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = "✋";
    dragHandleBtn.classList.add('btn', 'btn-light');
    dragHandleBtn.style.background = "#b0b0b0";
    dragHandleBtn.style.minWidth = "10px";
    dragHandleBtn.style.padding = "4px 15px 5px";
    dragHandleBtn.style.position = "absolute";
    dragHandleBtn.style.top = "-25px";
    dragHandleBtn.style.left = "50%";
    dragHandleBtn.style.transform = "translateX(-50%)";
    dragHandleBtn.style.cursor = "move";
    wrapper.appendChild(dragHandleBtn);
    makeDraggable(wrapper, dragHandleBtn);

    console.log("[MultiTool Beast] Loaded (v1.36.2).");
  }

  // ========================================================
  // Delayed initialization (3s)
  // ========================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initTool, 3000);
    });
  } else {
    setTimeout(initTool, 3000);
  }

  // ========================================================
  // Auto-update on URL change
  // ========================================================
  setInterval(() => {
    const newTicketId = extractTicketId();
    if (newTicketId && parseInt(newTicketId,10) !== parseInt(currentTicketIdGlobal,10)) {
      console.log("[MultiTool Beast] Ticket changed from", currentTicketIdGlobal, "to", newTicketId, ". Updating fields...");
      currentTicketIdGlobal = newTicketId;
      populateData();
    }
  }, 3000);

})();
