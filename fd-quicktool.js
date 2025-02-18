// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.37
// @description  Appends a sticky, draggable menu to Freshdesk pages with ticket info, copy buttons, recent tickets (last 7 days), a night mode toggle, a "Copy All" button for Slack/Jira sharing, and arrow buttons for scrolling. Treats "Account"/"Profile" as empty and shows "No tickets in the last 7 days" when appropriate. Positioned at top-left.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/a/tickets/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  //-----------------------------------------------------------
  // 0) Only run on direct ticket pages (/a/tickets/NNNN)
  //-----------------------------------------------------------
  const path = window.location.pathname;
  if (!/^\/a\/tickets\/\d+$/.test(path)) {
    console.log("[MultiTool Beast] Not a ticket page. Aborting.");
    return;
  }

  //-----------------------------------------------------------
  // 1) Inject Bootstrap
  //-----------------------------------------------------------
  const bootstrapLink = document.createElement('link');
  bootstrapLink.rel = 'stylesheet';
  bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css';
  document.head.appendChild(bootstrapLink);

  //-----------------------------------------------------------
  // 2) Minimal Dark Mode CSS
  //-----------------------------------------------------------
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

  //-----------------------------------------------------------
  // 3) Theme Toggle Functions
  //-----------------------------------------------------------
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

  //-----------------------------------------------------------
  // 4) Draggable (position persistence)
  //-----------------------------------------------------------
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
      localStorage.setItem("multitool_position", JSON.stringify({
        top: elmnt.style.top,
        left: elmnt.style.left
      }));
    }
  }

  //-----------------------------------------------------------
  // 5) Field Value Helper
  //-----------------------------------------------------------
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
    return val ? val.trim() : "";
  }

  //-----------------------------------------------------------
  // 6) Summary Helper
  //-----------------------------------------------------------
  function getSummary() {
    const noteDiv = document.querySelector('.ticket_note[data-note-id]');
    return noteDiv ? noteDiv.textContent.trim() : "";
  }

  //-----------------------------------------------------------
  // 7) Format Currency
  //-----------------------------------------------------------
  function formatCurrency(num) {
    // e.g. "300000" => "300.000$"
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "$";
  }

  //-----------------------------------------------------------
  // 8) Fetch CARR from Company Profile
  //-----------------------------------------------------------
  function fetchCARR(callback) {
    const companyElem = document.querySelector('a[href*="/a/companies/"]');
    if (companyElem) {
      const relURL = companyElem.getAttribute('href');
      const companyURL = window.location.origin + relURL;
      console.log("[CARR] Found company link on ticket page. Company URL:", companyURL);

      fetch(companyURL, { credentials: 'include' })
        .then(response => {
          console.log("[CARR] Fetch response status:", response.status, response.statusText);
          return response.text();
        })
        .then(htmlText => {
          console.log("[CARR] Company page HTML length:", htmlText.length);
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, "text/html");

          const carrParent = doc.querySelector('[data-test-field-content="CARR (converted)"]');
          if (carrParent) {
            console.log("[CARR] Found parent container =>", carrParent.outerHTML);
          } else {
            console.log("[CARR] Parent container not found for data-test-field-content='CARR (converted)'.");
          }

          const carrDiv = doc.querySelector('[data-test-field-content="CARR (converted)"] .text__content.text--small.text--semibold');
          if (carrDiv) {
            console.log("[CARR] Found final element =>", carrDiv.outerHTML);
          } else {
            console.log("[CARR] Did NOT find final text__content element.");
          }

          let carrValue = carrDiv ? carrDiv.textContent.trim() : "N/A";
          console.log("[CARR] Extracted text content:", carrValue);

          if (carrValue !== "N/A" && !isNaN(carrValue.replace(/[.,]/g, ""))) {
            carrValue = formatCurrency(carrValue.replace(/[.,]/g, ""));
            console.log("[CARR] Formatted =>", carrValue);
          } else {
            console.log("[CARR] Not numeric or missing => 'N/A'.");
          }
          callback(carrValue);
        })
        .catch(err => {
          console.error("[CARR] Fetching company data failed:", err);
          callback("N/A");
        });
    } else {
      console.log("[CARR] No company link found on the ticket page => 'N/A'.");
      callback("N/A");
    }
  }

  //-----------------------------------------------------------
  // 9) Main MultiTool Beast Initialization
  //-----------------------------------------------------------
  async function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("[MultiTool Beast] Initializing (v1.34.8)...");

    initTheme();

    // Retrieve open/close state (default open)
    const storedOpen = localStorage.getItem("multitool_open");
    const isOpen = storedOpen === null ? true : (storedOpen !== "false");

    // Retrieve stored position if available
    const storedPos = localStorage.getItem("multitool_position");
    let posStyles = {};
    if (storedPos) {
      posStyles = JSON.parse(storedPos);
    }

    // ---- Create an open tab button
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
      localStorage.setItem("multitool_open", "true");
    });
    document.body.appendChild(openTabBtn);

    // ---- Create the main wrapper (resizable)
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
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

    // ---- Create the card container
    const container = document.createElement('div');
    container.id = "ticket-info-menu";
    container.classList.add('card', 'text-dark', 'bg-white');
    container.style.cursor = 'default';
    wrapper.appendChild(container);

    // ---- Card Header
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

    // Right side: drag handle + close button
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

    // ---- Card Body
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'p-3');
    container.appendChild(cardBody);

    // ---- Top row: Copy All, Arrows, Theme Toggle
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

    // Theme toggle (sun/moon)
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
      ticketIdVal = "#" + currentTicketId;
    }

    // Wait for the DOM to load + an extra delay so the link is present
    setTimeout(() => {
      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      const accountVal = getFieldValue(accountInput);

      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      const profileVal = getFieldValue(profileInput);

      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      const urlsVal = urlsTextarea ? urlsTextarea.value.trim() : "";

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
        if (
          labelText.toLowerCase() === "relevant urls" &&
          valueText &&
          (valueText.startsWith("http") || valueText.startsWith("www"))
        ) {
          // It's a link
          valueEl = document.createElement('a');
          valueEl.href = valueText;
          valueEl.target = "_blank";
          valueEl.textContent = valueText;
        } else {
          // Just plain text
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
              console.error("[MultiTool Beast] Copy failed:", err);
            });
          }
        });
        itemDiv.appendChild(copyBtn);

        return itemDiv;
      }

      // Add fields
      cardBody.appendChild(createMenuItem("Ticket ID", ticketIdVal));
      cardBody.appendChild(createMenuItem("Account", accountVal));

      // Copy Account/Profile
      const copyAccProfBtn = document.createElement('button');
      copyAccProfBtn.textContent = "Copy Account/Profile";
      copyAccProfBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mb-2');
      copyAccProfBtn.addEventListener('click', function() {
        const text = accountVal + "/" + profileVal;
        navigator.clipboard.writeText(text).then(() => {
          copyAccProfBtn.textContent = "Copied!";
          setTimeout(() => { copyAccProfBtn.textContent = "Copy Account/Profile"; }, 2000);
        }).catch(err => {
          console.error("[MultiTool Beast] Copy Account/Profile failed:", err);
        });
      });
      cardBody.appendChild(copyAccProfBtn);

      cardBody.appendChild(createMenuItem("Account Profile", profileVal));
      cardBody.appendChild(createMenuItem("Relevant URLs", urlsVal));

      // Fetch & display CARR
      fetchCARR(function(carrValue) {
        cardBody.appendChild(createMenuItem("CARR", carrValue));
      });

      // Recent Tickets (last 7 days)
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
              console.error("[MultiTool Beast] Copy link failed:", err);
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
    }, 5000); // wait 5 seconds before fetching data

    // "Copy All" logic
    copyAllBtn.addEventListener('click', function() {
      const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
      const currentID = matchUrl ? matchUrl[1] : "";
      const link = window.location.origin + "/a/tickets/" + currentID;

      const ticketPart = `**Ticket ID**: [#${currentID}](${link})\n`;

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
        console.error("[MultiTool Beast] Copy All failed:", err);
      });
    });

    // Insert the wrapper & enable dragging
    document.body.appendChild(wrapper);
    makeDraggable(wrapper, dragHandleBtn);
    console.log("[MultiTool Beast] Loaded (v1.34.8) - waiting 5s before fetching company data...");
  }

  // If DOM not ready, wait, else init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTool);
  } else {
    initTool();
  }
})();
