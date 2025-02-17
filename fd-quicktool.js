// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.29
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // ---- 0) Only run on direct ticket pages (e.g. /a/tickets/259532) ----
  const path = window.location.pathname;
  if (!/^\/a\/tickets\/\d+$/.test(path)) {
    console.log("MultiTool Beast: Not a ticket page. Aborting.");
    return;
  }

  // ---- 1) Inject Bootstrap CSS ----
  const bootstrapLink = document.createElement('link');
  bootstrapLink.rel = 'stylesheet';
  bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css';
  document.head.appendChild(bootstrapLink);

  // ---- 2) Minimal Dark Mode CSS Overrides ----
  const nightModeCSS = `
/* Minimal Dark Mode Overrides */
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

  // ---- 3) Theme Toggle Functions ----
  function setTheme(themeName) {
    localStorage.setItem('fdTheme', themeName);
  }
  function toggleTheme() {
    if (localStorage.getItem('fdTheme') === 'theme-dark') {
      setTheme('theme-light');
      removeNightModeCSS();
    } else {
      setTheme('theme-dark');
      applyNightModeCSS();
    }
  }
  function initTheme() {
    const storedTheme = localStorage.getItem('fdTheme');
    if (storedTheme === 'theme-dark') {
      applyNightModeCSS();
    } else {
      removeNightModeCSS();
    }
  }

  // ---- 4) Draggable Function (stores position) ----
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
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
      // Save new position
      localStorage.setItem("multitool_position", JSON.stringify({
        top: elmnt.style.top,
        left: elmnt.style.left
      }));
    }
  }

  // ---- 5) Field Value Helper ----
  function getFieldValue(inputElement) {
    if (!inputElement) return "";
    let val = inputElement.value;
    if (!val || val.trim() === "") {
      val = inputElement.getAttribute('value');
    }
    if (!val || val.trim() === "") {
      val = inputElement.getAttribute('placeholder');
    }
    if ((!val || val.trim() === "") && window.Ember && inputElement.id) {
      try {
        let view = Ember.View.views && Ember.View.views[inputElement.id];
        if (view) { val = view.get('value'); }
      } catch (e) {
        console.error("Ember view lookup failed:", e);
      }
    }
    if (!val || val.trim() === "") {
      let parent = inputElement.parentElement;
      if (parent) { val = parent.innerText; }
    }
    return val ? val.trim() : "";
  }

  // ---- 6) Summary Helper ----
  function getSummary() {
    const noteDiv = document.querySelector('.ticket_note[data-note-id]');
    return noteDiv ? noteDiv.textContent.trim() : "";
  }

  // ---- 7) Main MultiTool Beast Initialization ----
  async function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("Initializing MultiTool Beast v1.33...");

    initTheme();

    // --- Open/Close State ---
    const isOpen = localStorage.getItem("multitool_open") !== "false";

    // --- Outer wrapper (resizable) ---
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    // Check stored position; if exists, use it, else use defaults.
    const storedPos = localStorage.getItem("multitool_position");
    if (storedPos) {
      const pos = JSON.parse(storedPos);
      wrapper.style.top = pos.top;
      wrapper.style.left = pos.left;
      // Clear bottom/right so we use absolute coordinates.
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

    // --- Open Tab Button ---
    const openTabBtn = document.createElement('button');
    // Use the same icon as header (tealium icon)
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
      localStorage.setItem("multitool_open", "true");
    });
    document.body.appendChild(openTabBtn);

    // --- Main Card Container using Bootstrap ---
    const container = document.createElement('div');
    container.id = "ticket-info-menu";
    container.classList.add('card', 'text-dark', 'bg-white');
    container.style.cursor = 'default';
    wrapper.appendChild(container);

    // --- Card Header ---
    const headerArea = document.createElement('div');
    headerArea.classList.add('card-header', 'd-flex', 'align-items-center', 'justify-content-between', 'py-2', 'px-3');
    container.appendChild(headerArea);

    // Left side: Tealium icon + title
    const leftHeaderDiv = document.createElement('div');
    leftHeaderDiv.classList.add('d-flex', 'align-items-center');
    const tealiumIcon = document.createElement('img');
    tealiumIcon.src = 'https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png';
    tealiumIcon.style.width = '20px';
    tealiumIcon.style.height = '20px';
    tealiumIcon.style.marginRight = '8px';
    const headerText = document.createElement('span');
    headerText.textContent = 'MultiTool Beast';
    headerText.style.fontWeight = 'bold';
    leftHeaderDiv.appendChild(tealiumIcon);
    leftHeaderDiv.appendChild(headerText);
    headerArea.appendChild(leftHeaderDiv);

    // Right side: Drag handle and Close button
    const rightHeaderDiv = document.createElement('div');
    rightHeaderDiv.classList.add('d-flex', 'align-items-center');
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = '✋';
    dragHandleBtn.classList.add('btn', 'btn-light', 'border', 'mr-2');
    dragHandleBtn.style.cursor = 'move';
    dragHandleBtn.title = 'Drag to move MultiTool Beast';
    rightHeaderDiv.appendChild(dragHandleBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger');
    closeBtn.title = 'Close MultiTool Beast';
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = 'none';
      openTabBtn.style.display = 'block';
      localStorage.setItem("multitool_open", "false");
    });
    rightHeaderDiv.appendChild(closeBtn);
    headerArea.appendChild(rightHeaderDiv);

    // --- Card Body ---
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'p-3');
    container.appendChild(cardBody);

    // Top row inside Card Body: Copy All, scroll arrows, sun/moon toggle.
    const topRowDiv = document.createElement('div');
    topRowDiv.classList.add('mb-2');
    cardBody.appendChild(topRowDiv);

    const copyAllBtn = document.createElement('button');
    copyAllBtn.textContent = "Copy All";
    copyAllBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(copyAllBtn);

    const arrowUpBtn = document.createElement('button');
    arrowUpBtn.textContent = "↑";
    arrowUpBtn.title = "Scroll to top";
    arrowUpBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(arrowUpBtn);
    arrowUpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const arrowDownBtn = document.createElement('button');
    arrowDownBtn.textContent = "↓";
    arrowDownBtn.title = "Scroll to bottom";
    arrowDownBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(arrowDownBtn);
    arrowDownBtn.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    // Fancy sun/moon toggle switch.
    const themeToggleLabel = document.createElement('label');
    themeToggleLabel.className = 'switch';
    themeToggleLabel.style.marginLeft = '5px';
    const themeToggleInput = document.createElement('input');
    themeToggleInput.type = 'checkbox';
    themeToggleInput.id = 'slider';
    const themeToggleSpan = document.createElement('span');
    themeToggleSpan.className = 'slider round';
    themeToggleLabel.appendChild(themeToggleInput);
    themeToggleLabel.appendChild(themeToggleSpan);
    topRowDiv.appendChild(themeToggleLabel);

    // Minimal slider CSS.
    const sliderStyle = document.createElement('style');
    sliderStyle.innerHTML = `
.switch {
  position: relative; display: inline-block; width: 40px; height: 20px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc; transition: .4s; border-radius: 34px;
}
.slider.round { border-radius: 34px; }
.slider:before {
  position: absolute; content: "";
  height: 26px; width: 26px;
  left: -3px; bottom: -3px;
  transition: .4s;
  background: white url('https://i.ibb.co/FxzBYR9/night.png') no-repeat center / cover;
  border-radius: 50%;
  box-shadow: 0 0px 15px #2020203d;
}
input:checked + .slider { background-color: #2196f3; }
input:checked + .slider:before {
  transform: translateX(20px);
  background: white url('https://i.ibb.co/7JfqXxB/sunny.png') no-repeat center / cover;
}
`;
    document.head.appendChild(sliderStyle);

    function refreshCheckbox() {
      const stored = localStorage.getItem('fdTheme');
      themeToggleInput.checked = stored !== 'theme-dark';
    }
    refreshCheckbox();
    themeToggleInput.addEventListener('change', () => {
      toggleTheme();
      refreshCheckbox();
    });

    // "Include Summary" checkbox.
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

    // Parse Ticket ID from URL, format as #ID.
    let currentTicketId = "";
    let currentTicketLink = "";
    let ticketIdVal = "";
    const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
    if (matchUrl) {
      currentTicketId = matchUrl[1];
      currentTicketLink = window.location.origin + "/a/tickets/" + currentTicketId;
      ticketIdVal = "#" + currentTicketId;
    }

    // After delay, populate custom field data.
    setTimeout(() => {
      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      const accountVal = getFieldValue(accountInput);
      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      const profileVal = getFieldValue(profileInput);
      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      const urlsVal = urlsTextarea ? urlsTextarea.value.trim() : "";

      // Helper to create each field row.
      function createMenuItem(labelText, valueText) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('mb-2', 'pb-2', 'border-bottom');
        const label = document.createElement('span');
        label.textContent = labelText + ": ";
        label.style.fontWeight = 'bold';
        itemDiv.appendChild(label);
        if (valueText) {
          const lowerVal = valueText.trim().toLowerCase();
          if (lowerVal === 'account' || lowerVal === 'profile') {
            valueText = "";
          }
        }
        let valueEl;
        if (labelText.toLowerCase() === "relevant urls" && valueText && (valueText.startsWith("http") || valueText.startsWith("www"))) {
          valueEl = document.createElement('a');
          valueEl.href = valueText;
          valueEl.target = "_blank";
          valueEl.textContent = valueText;
        } else {
          valueEl = document.createElement('span');
          valueEl.textContent = valueText || "N/A";
        }
        valueEl.classList.add('ml-1', 'p-1', 'bg-light', 'rounded');
        itemDiv.appendChild(valueEl);
        const copyBtn = document.createElement('button');
        copyBtn.textContent = "Copy";
        copyBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'ml-2');
        copyBtn.addEventListener('click', function() {
          if (valueText) {
            navigator.clipboard.writeText(valueText).then(() => {
              copyBtn.textContent = "Copied!";
              setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
            }).catch(err => {
              console.error("Copy failed:", err);
            });
          }
        });
        itemDiv.appendChild(copyBtn);
        return itemDiv;
      }

      cardBody.appendChild(createMenuItem("Ticket ID", ticketIdVal));
      cardBody.appendChild(createMenuItem("Account", accountVal));
      cardBody.appendChild(createMenuItem("Account Profile", profileVal));
      cardBody.appendChild(createMenuItem("Relevant URLs", urlsVal));

      // Recent Tickets (last 7 days), excluding current.
      function getRecentTickets() {
        const tickets = [];
        const ticketElements = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
        if (!ticketElements.length) return tickets;
        const now = new Date();
        const threshold = 7 * 24 * 60 * 60 * 1000;
        ticketElements.forEach(ticketEl => {
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
                if (foundTicketId && foundTicketId === currentTicketId) return;
                tickets.push({ href, subject, date: ticketDate });
              }
            }
          }
        });
        return tickets;
      }

      const divider = document.createElement('hr');
      divider.classList.add('my-2');
      cardBody.appendChild(divider);

      const recentHeader = document.createElement('div');
      recentHeader.textContent = "Recent Tickets (last 7 days)";
      recentHeader.style.fontWeight = 'bold';
      recentHeader.classList.add('mb-2');
      cardBody.appendChild(recentHeader);

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
          ticketLink.addEventListener('mouseover', () => {
            ticketLink.style.textDecoration = 'underline';
          });
          ticketLink.addEventListener('mouseout', () => {
            ticketLink.style.textDecoration = 'none';
          });
          ticketDiv.appendChild(ticketLink);
          const copyTicketBtn = document.createElement('button');
          copyTicketBtn.textContent = "Copy Link";
          copyTicketBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
          copyTicketBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(ticket.href).then(() => {
              copyTicketBtn.textContent = "Copied!";
              setTimeout(() => { copyTicketBtn.textContent = "Copy Link"; }, 2000);
            }).catch(err => {
              console.error("Copy failed:", err);
            });
          });
          ticketDiv.appendChild(copyTicketBtn);
          cardBody.appendChild(ticketDiv);
        });
      } else {
        const noTicketsDiv = document.createElement('div');
        noTicketsDiv.textContent = "No tickets in the last 7 days";
        cardBody.appendChild(noTicketsDiv);
      }
    }, 1500);

    // "Copy All" button logic – formatted snippet for Slack/Jira.
    copyAllBtn.addEventListener('click', function() {
      const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
      const currentID = matchUrl ? matchUrl[1] : "";
      const link = window.location.origin + "/a/tickets/" + currentID;
      const ticketPart = `**Ticket ID**: [#${currentID}|${link}]\n`;
      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      let acc = getFieldValue(accountInput);
      if (acc && acc.trim().toLowerCase() === "account") acc = "";
      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      let prof = getFieldValue(profileInput);
      if (prof && prof.trim().toLowerCase() === "profile") prof = "";
      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      let relUrls = urlsTextarea ? urlsTextarea.value.trim() : "";
      if (!relUrls) relUrls = "N/A";
      let textToCopy = ticketPart +
                       `**Account**: ${acc || "N/A"}\n` +
                       `**Profile**: ${prof || "N/A"}\n` +
                       `**Relevant URLs**: ${relUrls}\n`;
      const summaryChecked = document.getElementById('include-summary');
      if (summaryChecked && summaryChecked.checked) {
        const summaryText = getSummary();
        if (summaryText) {
          textToCopy += `\n**Summary**:\n${summaryText}\n`;
        }
      }
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyAllBtn.textContent = "Copied All!";
        setTimeout(() => { copyAllBtn.textContent = "Copy All"; }, 2000);
      }).catch(err => {
        console.error("Copy All failed:", err);
      });
    });

    // Append wrapper to document body and enable drag.
    document.body.appendChild(wrapper);
    makeDraggable(wrapper, dragHandleBtn);

    console.log("MultiTool Beast v1.33 loaded!");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTool);
  } else {
    initTool();
  }
})();
