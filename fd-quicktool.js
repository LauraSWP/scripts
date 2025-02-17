// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.23
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // ---- DARK MODE CSS OVERRIDES (minimal) ----
  const nightModeCSS = `
/* Night Mode Overrides for Freshdesk */
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
      styleEl.parentNode.removeChild(styleEl);
    }
  }

  // ---- THEME FUNCTIONS ----
  function setTheme(themeName) {
    localStorage.setItem('fdTheme', themeName);
    document.documentElement.className = themeName;
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
      setTheme('theme-dark');
      applyNightModeCSS();
    } else {
      setTheme('theme-light');
      removeNightModeCSS();
    }
  }

  // ---- DRAGGABLE FUNCTIONALITY ----
  function makeDraggable(elmnt, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e = e || window.event;
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

  // ---- FIELD VALUE HELPERS ----
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

  function getEmailValue() {
    const emailInput = document.querySelector('input[name="requester[email]"]') ||
                       document.querySelector('input[data-test-text-field="requester[email]"]');
    let emailVal = emailInput ? emailInput.value.trim() : "";
    if (!emailVal) {
      const mailtoAnchor = document.querySelector('.contacts_cardemail--text a[href^="mailto:"]');
      if (mailtoAnchor) {
        emailVal = mailtoAnchor.href.replace(/^mailto:/, '').trim();
      }
    }
    if (!emailVal) {
      const wormhole = document.getElementById('ember-basic-dropdown-wormhole');
      if (wormhole) {
        wormhole.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
        const mailtoLink = wormhole.querySelector('a[href^="mailto:"]');
        if (mailtoLink) {
          emailVal = mailtoLink.href.replace(/^mailto:/, '').trim();
        }
      }
    }
    return emailVal;
  }

  // ---- MAIN TOOL INITIALIZATION ----
  function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("Initializing MultiTool Beast...");

    initTheme();

    // Create a wrapper to hold our tool and an external drag handle.
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    // Position near bottom-right (adjust as needed)
    wrapper.style.position = 'fixed';
    wrapper.style.bottom = '80px';
    wrapper.style.right = '30px';
    wrapper.style.zIndex = '9999';
    wrapper.style.width = '340px';
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'visible';

    // Create an external "Drag" button (accessible handle) inside the wrapper.
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.id = 'multitool-drag-handle';
    dragHandleBtn.innerHTML = '✋';
    dragHandleBtn.style.position = 'absolute';
    dragHandleBtn.style.top = '10px';
    dragHandleBtn.style.right = '-40px';
    dragHandleBtn.style.cursor = 'move';
    dragHandleBtn.style.backgroundColor = '#fff';
    dragHandleBtn.style.border = '1px solid #ccc';
    dragHandleBtn.style.borderRadius = '50%';
    dragHandleBtn.style.width = '30px';
    dragHandleBtn.style.height = '30px';
    dragHandleBtn.title = 'Drag to move MultiTool Beast';
    wrapper.appendChild(dragHandleBtn);

    // Create the main container (the tool box).
    const container = document.createElement('div');
    container.id = "ticket-info-menu";
    container.style.position = 'relative';
    container.style.backgroundColor = '#fff';
    container.style.border = '1px solid #ccc';
    container.style.padding = '10px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    container.style.fontSize = '14px';
    container.style.maxWidth = '300px';
    container.style.borderRadius = '5px';
    container.style.fontFamily = 'sans-serif';
    container.style.lineHeight = '1.4';
    container.style.cursor = 'default';
    wrapper.appendChild(container);

    // Additional CSS for our UI elements.
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      /* Night mode affects our tool too */
      #ticket-info-menu.night {
          background-color: #333 !important;
          border-color: #555 !important;
          color: #ddd !important;
      }
      #ticket-info-menu.night a {
          color: #66aaff !important;
      }
      #ticket-info-menu.night button {
          background-color: #444 !important;
          color: #ddd !important;
          border-color: #555 !important;
      }
      /* Field value styling */
      .field-value {
          background-color: #f9f9f9;
          padding: 2px 4px;
          border: 1px solid #ddd;
          border-radius: 4px;
      }
      .night .field-value {
          background-color: #555;
          border-color: #666;
      }
      /* Button styling */
      #ticket-info-menu button {
          background-color: #eee;
          border: 1px solid #ccc;
      }
    `;
    document.head.appendChild(styleTag);

    // Header area with a distinct background and bottom border.
    const headerArea = document.createElement('div');
    headerArea.style.backgroundColor = "#f0f0f0";
    headerArea.style.borderBottom = "1px solid #ccc";
    headerArea.style.padding = "8px";
    headerArea.style.fontSize = "16px";
    headerArea.style.display = "flex";
    headerArea.style.alignItems = "center";
    headerArea.style.justifyContent = "space-between";

    const headerContent = document.createElement('div');
    headerContent.style.display = "flex";
    headerContent.style.alignItems = "center";
    const tealiumIcon = document.createElement('img');
    tealiumIcon.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
    tealiumIcon.style.width = "20px";
    tealiumIcon.style.height = "20px";
    tealiumIcon.style.marginRight = "8px";
    const headerText = document.createElement('span');
    headerText.textContent = "MultiTool Beast";
    headerText.style.fontWeight = "bold";
    headerContent.appendChild(tealiumIcon);
    headerContent.appendChild(headerText);
    headerArea.appendChild(headerContent);
    container.appendChild(headerArea);

    // Top row: "Copy All", scroll arrows, and the fancy sun/moon toggle.
    const topRowDiv = document.createElement('div');
    topRowDiv.style.margin = "8px 0";
    container.appendChild(topRowDiv);

    const copyAllBtn = document.createElement('button');
    copyAllBtn.textContent = "Copy All";
    topRowDiv.appendChild(copyAllBtn);

    const arrowUpBtn = document.createElement('button');
    arrowUpBtn.textContent = "↑";
    arrowUpBtn.title = "Scroll to top";
    topRowDiv.appendChild(arrowUpBtn);

    const arrowDownBtn = document.createElement('button');
    arrowDownBtn.textContent = "↓";
    arrowDownBtn.title = "Scroll to bottom";
    topRowDiv.appendChild(arrowDownBtn);

    arrowUpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    arrowDownBtn.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    // Fancy sun/moon toggle switch.
    const themeToggleLabel = document.createElement('label');
    themeToggleLabel.className = 'switch';
    const themeToggleInput = document.createElement('input');
    themeToggleInput.type = 'checkbox';
    themeToggleInput.id = 'slider';
    const themeToggleSpan = document.createElement('span');
    themeToggleSpan.className = 'slider';
    themeToggleLabel.appendChild(themeToggleInput);
    themeToggleLabel.appendChild(themeToggleSpan);
    topRowDiv.appendChild(themeToggleLabel);

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

    // Variables for custom field data.
    let accountVal = "";
    let profileVal = "";
    let urlsVal = "";
    let currentTicketId = "";
    let currentTicketLink = "";
    let ticketIdVal = "";

    const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
    if (matchUrl) {
      currentTicketId = matchUrl[1];
      currentTicketLink = window.location.origin + "/a/tickets/" + currentTicketId;
      ticketIdVal = currentTicketId;
    }

    // Delay reading custom fields to allow Ember to render.
    setTimeout(() => {
      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      accountVal = getFieldValue(accountInput);

      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      profileVal = getFieldValue(profileInput);

      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      urlsVal = urlsTextarea ? urlsTextarea.value.trim() : "";

      const emailVal = getEmailValue();

      function createMenuItem(labelText, valueText) {
        const itemDiv = document.createElement('div');
        itemDiv.style.marginBottom = '6px';

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
        // For Relevant URLs, render as a link if it starts with "http" or "www"
        if (labelText.toLowerCase() === "relevant urls" && valueText && (valueText.startsWith("http") || valueText.startsWith("www"))) {
          valueEl = document.createElement('a');
          valueEl.href = valueText;
          valueEl.target = "_blank";
          valueEl.textContent = valueText;
        } else {
          valueEl = document.createElement('span');
          valueEl.textContent = valueText || "N/A";
        }
        valueEl.className = "field-value";
        itemDiv.appendChild(valueEl);

        const copyBtn = document.createElement('button');
        copyBtn.textContent = "Copy";
        copyBtn.style.marginLeft = '5px';
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

      // Populate UI with custom field items.
      container.appendChild(createMenuItem("Ticket ID", ticketIdVal));
      container.appendChild(createMenuItem("Account", accountVal));
      container.appendChild(createMenuItem("Account Profile", profileVal));
      container.appendChild(createMenuItem("Sender Email", emailVal));
      container.appendChild(createMenuItem("Relevant URLs", urlsVal));

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
                if (foundTicketId && foundTicketId === currentTicketId) {
                  return;
                }
                tickets.push({href, subject, date: ticketDate});
              }
            }
          }
        });
        return tickets;
      }

      const divider = document.createElement('hr');
      divider.style.margin = '10px 0';
      container.appendChild(divider);

      const recentHeader = document.createElement('div');
      recentHeader.textContent = "Recent Tickets (last 7 days)";
      recentHeader.style.fontWeight = 'bold';
      recentHeader.style.marginBottom = '6px';
      container.appendChild(recentHeader);

      const recentTickets = getRecentTickets();
      if (recentTickets.length) {
        recentTickets.forEach(ticket => {
          const ticketDiv = document.createElement('div');
          ticketDiv.style.marginBottom = '6px';

          const ticketLink = document.createElement('a');
          ticketLink.href = ticket.href;
          ticketLink.textContent = ticket.subject;
          ticketLink.target = '_blank';
          ticketLink.style.color = '#007bff';
          ticketLink.style.textDecoration = 'none';
          ticketLink.style.marginRight = '5px';
          ticketLink.addEventListener('mouseover', () => {
            ticketLink.style.textDecoration = 'underline';
          });
          ticketLink.addEventListener('mouseout', () => {
            ticketLink.style.textDecoration = 'none';
          });
          ticketDiv.appendChild(ticketLink);

          const copyTicketBtn = document.createElement('button');
          copyTicketBtn.textContent = "Copy Link";
          copyTicketBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(ticket.href).then(() => {
              copyTicketBtn.textContent = "Copied!";
              setTimeout(() => { copyTicketBtn.textContent = "Copy Link"; }, 2000);
            }).catch(err => {
              console.error("Copy failed:", err);
            });
          });
          ticketDiv.appendChild(copyTicketBtn);

          container.appendChild(ticketDiv);
        });
      } else {
        const noTicketsDiv = document.createElement('div');
        noTicketsDiv.textContent = "No tickets in the last 7 days";
        container.appendChild(noTicketsDiv);
      }
    }, 1500);

    // "Copy All" button: build formatted note for Slack/Jira.
    copyAllBtn.addEventListener('click', function() {
      let acc = accountVal;
      let prof = profileVal;
      if (acc && acc.trim().toLowerCase() === "account") {
        acc = "";
      }
      if (prof && prof.trim().toLowerCase() === "profile") {
        prof = "";
      }
      let textToCopy = "";
      textToCopy += `**Ticket ID**: <${currentTicketLink}|${currentTicketId}>\n`;
      textToCopy += `**Account**: ${acc || "N/A"}\n`;
      textToCopy += `**Profile**: ${prof || "N/A"}\n`;
      textToCopy += `**Relevant URLs**: ${urlsVal || "N/A"}\n`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyAllBtn.textContent = "Copied All!";
        setTimeout(() => { copyAllBtn.textContent = "Copy All"; }, 2000);
      }).catch(err => {
        console.error("Copy All failed:", err);
      });
    });

    // Append the wrapper to document.body.
    document.body.appendChild(wrapper);
    console.log("MultiTool Beast loaded successfully!");

    // Make the wrapper draggable via the external "Drag" button.
    makeDraggable(wrapper, dragHandleBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTool);
  } else {
    initTool();
  }
})();
