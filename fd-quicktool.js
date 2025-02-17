// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.27
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  //------------------------------------------------------------------
  // 0) CHECK IF CURRENT PAGE IS A TICKET PAGE
  //------------------------------------------------------------------
  // We only show if the path matches /a/tickets/NNNN, ignoring "filters" etc.
  const path = window.location.pathname;
  // e.g. /a/tickets/259532
  if (!/^\/a\/tickets\/\d+$/.test(path)) {
    // Not a direct ticket page, do nothing
    console.log("MultiTool Beast: Not a ticket page. Aborting.");
    return;
  }

  //------------------------------------------------------------------
  // 1) INJECT BOOTSTRAP
  //------------------------------------------------------------------
  const bootstrapLink = document.createElement('link');
  bootstrapLink.rel = 'stylesheet';
  bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css';
  document.head.appendChild(bootstrapLink);

  //------------------------------------------------------------------
  // 2) MINIMAL DARK MODE CSS OVERRIDES
  //------------------------------------------------------------------
  const nightModeCSS = `
/* Minimal dark overrides */
body, html, .page, .main-content {
  background-color: #121212 !important;
  color: #e0e0e0 !important;
}
a, a:visited {
  color: #bb86fc !important;
}
a:hover, a:focus {
  color: #9a67ea !important;
}
header, .footer, .sidebar, .navbar {
  background-color: #1f1f1f !important;
  border-color: #333 !important;
}
input, textarea, select, button {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
  border: 1px solid #333 !important;
}
.card, .panel, .widget {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
}
.dropdown-menu, .modal-content, .popover {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
  border-color: #333 !important;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #121212;
}
::-webkit-scrollbar-thumb {
  background-color: #333;
  border-radius: 4px;
}
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
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
    if (styleEl) {
      styleEl.remove();
    }
  }

  //------------------------------------------------------------------
  // 3) THEME TOGGLE (LIGHT VS DARK)
  //------------------------------------------------------------------
  function setTheme(themeName) {
    localStorage.setItem('fdTheme', themeName);
  }
  function toggleTheme() {
    const current = localStorage.getItem('fdTheme');
    if (current === 'theme-dark') {
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

  //------------------------------------------------------------------
  // 4) DRAGGABLE FUNCTION
  //------------------------------------------------------------------
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
    }
  }

  //------------------------------------------------------------------
  // 5) GET FIELD VALUE HELPER
  //------------------------------------------------------------------
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
        if (view) {
          val = view.get('value');
        }
      } catch (e) {
        console.error("Ember view lookup failed:", e);
      }
    }
    if (!val || val.trim() === "") {
      let parent = inputElement.parentElement;
      if (parent) {
        val = parent.innerText;
      }
    }
    return val ? val.trim() : "";
  }

  //------------------------------------------------------------------
  // 6) SUMMARY HELPER
  //------------------------------------------------------------------
  // The summary is inside: <div class="ticket_note" data-note-id="36417254623"> ... </div>
  // We'll just grab the first one or combine them if multiple?
  // Let's just grab the first for demonstration.
  function getSummary() {
    const noteDiv = document.querySelector('.ticket_note[data-note-id]');
    if (!noteDiv) return "";
    // We'll take the textContent, or we can parse out headings. We'll do textContent for simplicity.
    return noteDiv.textContent.trim();
  }

  //------------------------------------------------------------------
  // 7) MAIN MULTITOOL
  //------------------------------------------------------------------
  function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("Initializing MultiTool Beast (v1.31)...");

    initTheme(); // sets or removes the minimal dark CSS

    // 7.1) A small tab pinned at bottom to open the tool
    const openTabBtn = document.createElement('button');
    openTabBtn.textContent = "MT Beast";
    openTabBtn.style.position = 'fixed';
    openTabBtn.style.bottom = '20px';
    openTabBtn.style.right = '20px';
    openTabBtn.style.zIndex = '9999';
    openTabBtn.style.backgroundColor = '#007bff';
    openTabBtn.style.color = '#fff';
    openTabBtn.style.border = '1px solid #0056b3';
    openTabBtn.style.borderRadius = '4px';
    openTabBtn.style.padding = '6px 10px';
    openTabBtn.title = 'Open MultiTool Beast';
    openTabBtn.addEventListener('click', () => {
      wrapper.style.display = 'block';
      openTabBtn.style.display = 'none';
    });
    document.body.appendChild(openTabBtn);

    // 7.2) Outer wrapper for the box
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    wrapper.style.position = 'fixed';
    wrapper.style.bottom = '80px';
    wrapper.style.right = '20px';
    wrapper.style.zIndex = '9999';
    wrapper.style.width = '360px';
    wrapper.style.overflow = 'visible';
    // Start as displayed, or you can start hidden if you want
    wrapper.style.display = 'block';
    // Make it resizable
    wrapper.style.resize = 'both';
    wrapper.style.overflow = 'auto';

    // The main card container
    const container = document.createElement('div');
    container.id = "ticket-info-menu";
    container.classList.add('card', 'text-dark', 'bg-white');
    container.style.cursor = 'default';
    container.style.height = '100%';
    container.style.minHeight = '200px';
    container.style.minWidth = '280px';
    wrapper.appendChild(container);

    // Card header
    const headerArea = document.createElement('div');
    headerArea.classList.add('card-header', 'd-flex', 'align-items-center', 'justify-content-between', 'py-2', 'px-3');
    container.appendChild(headerArea);

    // Left side: icon + "MultiTool Beast"
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

    // Right side: drag handle + close button
    const rightHeaderDiv = document.createElement('div');
    rightHeaderDiv.classList.add('d-flex', 'align-items-center');

    // Drag handle
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = '✋';
    dragHandleBtn.classList.add('btn', 'btn-light', 'border', 'mr-2');
    dragHandleBtn.style.cursor = 'move';
    dragHandleBtn.title = 'Drag to move MultiTool Beast';
    rightHeaderDiv.appendChild(dragHandleBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.classList.add('btn', 'btn-sm', 'btn-outline-danger');
    closeBtn.title = 'Close MultiTool Beast';
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = 'none';
      openTabBtn.style.display = 'block';
    });
    rightHeaderDiv.appendChild(closeBtn);

    headerArea.appendChild(rightHeaderDiv);

    // Card body
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'p-3');
    container.appendChild(cardBody);

    // Top row: Copy All, arrows, sun/moon
    const topRowDiv = document.createElement('div');
    topRowDiv.classList.add('mb-2');
    cardBody.appendChild(topRowDiv);

    // Copy All
    const copyAllBtn = document.createElement('button');
    copyAllBtn.textContent = "Copy All";
    copyAllBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(copyAllBtn);

    // Arrows
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

    // Sun/moon toggle
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

    // Minimal slider CSS
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
  margin: auto 0; transition: .4s;
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
    document.head.appendChild(sliderStyle);

    function refreshCheckbox() {
      const stored = localStorage.getItem('fdTheme');
      if (stored === 'theme-dark') {
        themeToggleInput.checked = false;
      } else {
        themeToggleInput.checked = true;
      }
    }
    refreshCheckbox();
    themeToggleInput.addEventListener('change', () => {
      toggleTheme();
      refreshCheckbox();
    });

    // "Include Summary" checkbox
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

    // Parse ticket ID
    let currentTicketId = "";
    let currentTicketLink = "";
    let ticketIdVal = "";
    const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
    if (matchUrl) {
      currentTicketId = matchUrl[1];
      currentTicketLink = window.location.origin + "/a/tickets/" + currentTicketId;
      ticketIdVal = "#" + currentTicketId; // #ID format
    }

    // We'll fill the data after a short delay
    setTimeout(() => {
      // Fields
      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      const accountVal = getFieldValue(accountInput);

      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      const profileVal = getFieldValue(profileInput);

      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      const urlsVal = urlsTextarea ? urlsTextarea.value.trim() : "";

      // We'll create a function for each field row
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
        // If relevant URLs => link
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

        // Copy button
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

      // Add the fields
      cardBody.appendChild(createMenuItem("Ticket ID", ticketIdVal));
      cardBody.appendChild(createMenuItem("Account", accountVal));
      cardBody.appendChild(createMenuItem("Account Profile", profileVal));
      cardBody.appendChild(createMenuItem("Relevant URLs", urlsVal));

      // Now recent tickets
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
                if (foundTicketId && foundTicketId === currentTicketId) {
                  return;
                }
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

    // Summary (from div.ticket_note[data-note-id])
    function getSummary() {
      const noteDiv = document.querySelector('.ticket_note[data-note-id]');
      if (!noteDiv) return "";
      return noteDiv.textContent.trim();
    }

    // "Copy All" logic
    copyAllBtn.addEventListener('click', function() {
      // We'll parse the fields from the DOM or store them in variables
      // We'll do a quick approach: re-check them from the DOM if needed
      // For clarity, let's store them in closures if you prefer
      const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
      const currentID = matchUrl ? matchUrl[1] : "";
      const link = window.location.origin + "/a/tickets/" + currentID;

      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      let acc = getFieldValue(accountInput);
      if (acc && acc.trim().toLowerCase() === "account") acc = "";
      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      let prof = getFieldValue(profileInput);
      if (prof && prof.trim().toLowerCase() === "profile") prof = "";

      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      let relUrls = urlsTextarea ? urlsTextarea.value.trim() : "";
      if (!relUrls) relUrls = "N/A";

      // If user checked "Include Summary"
      let summaryText = "";
      const summaryChecked = document.getElementById('include-summary');
      if (summaryChecked && summaryChecked.checked) {
        summaryText = getSummary();
      }

      // Build Slack/Jira snippet
      let textToCopy = `**Ticket ID**: <${link}|#${currentID}>\n` +
                       `**Account**: ${acc || "N/A"}\n` +
                       `**Profile**: ${prof || "N/A"}\n` +
                       `**Relevant URLs**: ${relUrls || "N/A"}\n`;
      if (summaryText) {
        textToCopy += `\n**Summary**:\n${summaryText}\n`;
      }

      navigator.clipboard.writeText(textToCopy).then(() => {
        copyAllBtn.textContent = "Copied All!";
        setTimeout(() => { copyAllBtn.textContent = "Copy All"; }, 2000);
      }).catch(err => {
        console.error("Copy All failed:", err);
      });
    });

    // Insert the wrapper and make it draggable
    document.body.appendChild(wrapper);
    makeDraggable(wrapper, dragHandleBtn);

    console.log("MultiTool Beast v1.31 loaded: box only on ticket pages, no email, summary optional, toggles closed with a tab!");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTool);
  } else {
    initTool();
  }
})();
