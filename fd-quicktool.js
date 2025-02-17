// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.25
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
    if (localStorage.getItem('fdTheme') === 'theme-dark') {
      // Switch to light
      setTheme('theme-light');
      removeNightModeCSS();
    } else {
      // Switch to dark
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
  // 5) GET EMAIL HELPER (FORCIBLE HOVER)
  //------------------------------------------------------------------
  async function getEmailValue() {
    // Normal approach first
    let emailInput = document.querySelector('input[name="requester[email]"]') ||
                     document.querySelector('input[data-test-text-field="requester[email]"]');
    let emailVal = emailInput ? emailInput.value.trim() : "";

    // If that fails, try visible mailto anchor
    if (!emailVal) {
      const mailtoAnchor = document.querySelector('.contacts_cardemail--text a[href^="mailto:"]');
      if (mailtoAnchor) {
        emailVal = mailtoAnchor.href.replace(/^mailto:/, '').trim();
      }
    }
    // If still empty, forcibly hover to reveal the wormhole content
    if (!emailVal) {
      const wormhole = document.getElementById('ember-basic-dropdown-wormhole');
      const emailTrigger = document.querySelector('.contacts_cardemail--text');
      if (emailTrigger && wormhole) {
        // Fire mouseenter
        emailTrigger.dispatchEvent(new MouseEvent('mouseenter', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        // Wait a moment
        await new Promise(r => setTimeout(r, 600));
        // Now read the wormhole
        const link = wormhole.querySelector('a[href^="mailto:"]');
        if (link) {
          emailVal = link.href.replace(/^mailto:/, '').trim();
        }
        // Fire mouseleave to clean up
        emailTrigger.dispatchEvent(new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
    }
    return emailVal;
  }

  //------------------------------------------------------------------
  // 6) GET FIELD VALUE HELPER
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
  // 7) MAIN MULTITOOL
  //------------------------------------------------------------------
  function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("Initializing MultiTool Beast (Bootstrap version)...");

    initTheme(); // sets or removes dark CSS

    // Outer wrapper (positioned, with drag)
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    wrapper.style.position = 'fixed';
    wrapper.style.bottom = '80px';
    wrapper.style.right = '30px';
    wrapper.style.zIndex = '9999';
    wrapper.style.width = '340px';
    wrapper.style.overflow = 'visible';

    // The main card container (Bootstrap "card")
    const container = document.createElement('div');
    container.id = "ticket-info-menu";
    container.classList.add('card', 'text-dark');  // card layout
    container.style.cursor = 'default';
    wrapper.appendChild(container);

    // Card header (for the top area with the icon, title, drag button)
    const headerArea = document.createElement('div');
    headerArea.classList.add('card-header', 'd-flex', 'align-items-center', 'justify-content-between', 'py-2', 'px-3');
    container.appendChild(headerArea);

    // Left side: Tealium icon + "MultiTool Beast"
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

    // Right side: drag handle with a hand icon
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = '✋';
    dragHandleBtn.classList.add('btn', 'btn-light', 'border');
    dragHandleBtn.style.cursor = 'move';
    dragHandleBtn.title = 'Drag to move MultiTool Beast';
    headerArea.appendChild(dragHandleBtn);

    // Card body
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'p-2');
    container.appendChild(cardBody);

    // Top row (Copy All, arrows, sun/moon toggle)
    const topRowDiv = document.createElement('div');
    topRowDiv.classList.add('mb-2');
    cardBody.appendChild(topRowDiv);

    // "Copy All" button
    const copyAllBtn = document.createElement('button');
    copyAllBtn.textContent = "Copy All";
    copyAllBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(copyAllBtn);

    // Arrow Up
    const arrowUpBtn = document.createElement('button');
    arrowUpBtn.textContent = "↑";
    arrowUpBtn.title = "Scroll to top";
    arrowUpBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(arrowUpBtn);
    arrowUpBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Arrow Down
    const arrowDownBtn = document.createElement('button');
    arrowDownBtn.textContent = "↓";
    arrowDownBtn.title = "Scroll to bottom";
    arrowDownBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mr-1');
    topRowDiv.appendChild(arrowDownBtn);
    arrowDownBtn.addEventListener('click', () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    // The fancy sun/moon toggle
    // We'll define a label.switch from minimal approach
    const themeToggleLabel = document.createElement('label');
    themeToggleLabel.className = 'switch';
    themeToggleLabel.style.marginLeft = '5px';

    const themeToggleInput = document.createElement('input');
    themeToggleInput.type = 'checkbox';
    themeToggleInput.id = 'slider';

    const themeToggleSpan = document.createElement('span');
    themeToggleSpan.className = 'slider round';  // add "round" if you want a circular slider

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
.slider:before {
  position: absolute; content: "";
  height: 26px; width: 26px; left: -3px; bottom: -3px;
  margin: auto 0; transition: .4s;
  background: white url('https://i.ibb.co/FxzBYR9/night.png') no-repeat center;
  background-size: cover; border-radius: 50%;
  box-shadow: 0 0px 15px #2020203d;
}
input:checked + .slider { background-color: #2196f3; }
input:checked + .slider:before {
  transform: translateX(20px);
  background: white url('https://i.ibb.co/7JfqXxB/sunny.png') no-repeat center;
  background-size: cover;
}
`;
    document.head.appendChild(sliderStyle);

    // Toggling logic
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

    // We'll store custom field data for "Copy All"
    let ticketIdVal = "";
    let accountVal = "";
    let profileVal = "";
    let urlsVal = "";
    let currentTicketId = "";
    let currentTicketLink = "";

    // Parse ticket ID from URL
    const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
    if (matchUrl) {
      currentTicketId = matchUrl[1];
      currentTicketLink = window.location.origin + "/a/tickets/" + currentTicketId;
      ticketIdVal = currentTicketId;
    }

    // Delay to let Ember render
    setTimeout(async () => {
      // Get account, profile, relevant URLs
      const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
      accountVal = getFieldValue(accountInput);

      const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
      profileVal = getFieldValue(profileInput);

      const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
      urlsVal = urlsTextarea ? urlsTextarea.value.trim() : "";

      // Email forcibly hovered
      const emailVal = await getEmailValue();

      // Helper for each field item
      function createMenuItem(labelText, valueText) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('mb-1');

        const label = document.createElement('span');
        label.textContent = labelText + ": ";
        label.style.fontWeight = 'bold';
        itemDiv.appendChild(label);

        // If "Account"/"Profile", treat literal string as empty => "N/A"
        if (valueText) {
          const lowerVal = valueText.trim().toLowerCase();
          if (lowerVal === 'account' || lowerVal === 'profile') {
            valueText = "";
          }
        }

        let valueEl;
        // If relevant URLs, check if it starts with "http" or "www" => link
        if (labelText.toLowerCase() === "relevant urls" && valueText && (valueText.startsWith("http") || valueText.startsWith("www"))) {
          valueEl = document.createElement('a');
          valueEl.href = valueText;
          valueEl.target = "_blank";
          valueEl.textContent = valueText;
        } else {
          valueEl = document.createElement('span');
          valueEl.textContent = valueText || "N/A";
        }
        valueEl.classList.add('field-value', 'ml-1'); // add spacing
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

      // Add each field to the card body
      cardBody.appendChild(createMenuItem("Ticket ID", ticketIdVal));
      cardBody.appendChild(createMenuItem("Account", accountVal));
      cardBody.appendChild(createMenuItem("Account Profile", profileVal));
      cardBody.appendChild(createMenuItem("Sender Email", emailVal));
      cardBody.appendChild(createMenuItem("Relevant URLs", urlsVal));

      // Recent tickets
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
      recentHeader.classList.add('mb-1');
      cardBody.appendChild(recentHeader);

      const recentTickets = getRecentTickets();
      if (recentTickets.length) {
        recentTickets.forEach(ticket => {
          const ticketDiv = document.createElement('div');
          ticketDiv.classList.add('mb-1');

          const ticketLink = document.createElement('a');
          ticketLink.href = ticket.href;
          ticketLink.textContent = ticket.subject;
          ticketLink.target = '_blank';
          ticketLink.classList.add('mr-1');
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

    // "Copy All" logic
    copyAllBtn.addEventListener('click', function() {
      let acc = accountVal;
      let prof = profileVal;
      if (acc && acc.trim().toLowerCase() === "account") {
        acc = "";
      }
      if (prof && prof.trim().toLowerCase() === "profile") {
        prof = "";
      }
      let textToCopy = `**Ticket ID**: <${currentTicketLink}|${currentTicketId}>\n` +
                       `**Account**: ${acc || "N/A"}\n` +
                       `**Profile**: ${prof || "N/A"}\n` +
                       `**Relevant URLs**: ${urlsVal || "N/A"}\n`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyAllBtn.textContent = "Copied All!";
        setTimeout(() => { copyAllBtn.textContent = "Copy All"; }, 2000);
      }).catch(err => {
        console.error("Copy All failed:", err);
      });
    });

    // Finally, add to document and enable drag
    document.body.appendChild(wrapper);
    makeDraggable(wrapper, dragHandleBtn);

    console.log("MultiTool Beast (Bootstrap + inside drag handle + forced hover email) loaded!");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTool);
  } else {
    initTool();
  }
})();
