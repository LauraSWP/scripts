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
  
    // Enhanced helper to extract a field's value using multiple fallbacks (including Ember).
    function getFieldValue(inputElement) {
      if (!inputElement) return "";
      let val = inputElement.value;
      if (!val || val.trim() === "") {
        val = inputElement.getAttribute('value');
      }
      if (!val || val.trim() === "") {
        val = inputElement.getAttribute('placeholder');
      }
      // If still empty and Ember is available, try to look up the Ember view by id.
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
      // Fallback: check parent element's innerText.
      if (!val || val.trim() === "") {
        let parent = inputElement.parentElement;
        if (parent) {
          val = parent.innerText;
        }
      }
      return val ? val.trim() : "";
    }
  
    // Attempt to fetch email from input; if empty, fallback to mailto link and wormhole.
    function getEmailValue() {
      // First try: normal email input.
      const emailInput = document.querySelector('input[name="requester[email]"]') ||
                         document.querySelector('input[data-test-text-field="requester[email]"]');
      let emailVal = emailInput ? emailInput.value.trim() : "";
      // Second: try the mailto anchor in the visible UI.
      if (!emailVal) {
        const mailtoAnchor = document.querySelector('.contacts_cardemail--text a[href^="mailto:"]');
        if (mailtoAnchor) {
          emailVal = mailtoAnchor.href.replace(/^mailto:/, '').trim();
        }
      }
      // Third: check the wormhole element that appears on hover.
      if (!emailVal) {
        const wormhole = document.getElementById('ember-basic-dropdown-wormhole');
        if (wormhole) {
          // Dispatch a mouseover event to trigger its content.
          wormhole.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
          // Wait a bit and try to find a mailto link inside.
          const mailtoLink = wormhole.querySelector('a[href^="mailto:"]');
          if (mailtoLink) {
            emailVal = mailtoLink.href.replace(/^mailto:/, '').trim();
          }
        }
      }
      return emailVal;
    }
  
    // Function to set theme and store preference.
    function setTheme(themeName) {
      localStorage.setItem('fdTheme', themeName);
      document.documentElement.className = themeName;
    }
  
    // Toggle between theme-dark and theme-light.
    function toggleTheme() {
      if (localStorage.getItem('fdTheme') === 'theme-dark') {
        setTheme('theme-light');
      } else {
        setTheme('theme-dark');
      }
    }
  
    // On load, set the theme from localStorage.
    function initTheme() {
      const storedTheme = localStorage.getItem('fdTheme');
      if (storedTheme === 'theme-dark') {
        setTheme('theme-dark');
      } else {
        setTheme('theme-light');
      }
    }
  
    // Draggable functionality using a provided handle.
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
  
    function initTool() {
      if (document.getElementById("ticket-info-menu")) return;
      console.log("Initializing MultiTool Beast with fancy sun/moon toggle...");
  
      // Initialize theme on load.
      initTheme();
  
      // Create a wrapper to hold our tool and a separate drag handle.
      const wrapper = document.createElement('div');
      wrapper.id = "multitool-beast-wrapper";
      // Position near bottom-right (adjust as needed).
      wrapper.style.position = 'fixed';
      wrapper.style.bottom = '80px';
      wrapper.style.right = '30px';
      wrapper.style.zIndex = '9999';
      wrapper.style.width = '340px';
      wrapper.style.height = 'auto';
      wrapper.style.overflow = 'visible';
  
      // Create a separate "Drag" button (external handle).
      const dragHandleBtn = document.createElement('button');
      dragHandleBtn.id = 'multitool-drag-handle';
      dragHandleBtn.textContent = 'Drag';
      dragHandleBtn.style.position = 'absolute';
      dragHandleBtn.style.top = '-10px';
      dragHandleBtn.style.left = '-60px';
      dragHandleBtn.style.cursor = 'move';
      dragHandleBtn.style.backgroundColor = '#666';
      dragHandleBtn.style.color = '#fff';
      dragHandleBtn.style.border = '1px solid #444';
      dragHandleBtn.style.borderRadius = '3px';
      dragHandleBtn.style.padding = '4px 8px';
      dragHandleBtn.title = 'Drag me to move the MultiTool Beast';
      wrapper.appendChild(dragHandleBtn);
  
      // Create our main container (the tool box).
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
  
      // Insert CSS for dark mode overrides and fancy toggle.
      const fancyStyle = document.createElement('style');
      fancyStyle.innerHTML = `
  /* Fancy Sun/Moon Toggle Styles */
  .theme-light {
    --fill: #fff;
    --primary: black;
  }
  .theme-dark {
    --fill: #37474F;
    --primary: #fff;
  }
  body {
    background-color: var(--fill);
    transition: 0.4s all;
  }
  .switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
    margin-left: 5px;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: -3px;
    bottom: -3px;
    margin: auto 0;
    transition: 0.4s;
    background: white url('https://i.ibb.co/FxzBYR9/night.png') no-repeat center;
    border-radius: 50%;
    box-shadow: 0 0px 15px #2020203d;
  }
  input:checked + .slider {
    background-color: #2196f3;
  }
  input:checked + .slider:before {
    transform: translateX(20px);
    background: white url('https://i.ibb.co/7JfqXxB/sunny.png') no-repeat center;
    background-size: cover;
  }
  `;
      document.head.appendChild(fancyStyle);
  
      // Header: Icon + "MultiTool Beast"
      const headerDiv = document.createElement('div');
      headerDiv.style.display = 'flex';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.marginBottom = '8px';
  
      const tealiumIcon = document.createElement('img');
      tealiumIcon.src = 'https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png';
      tealiumIcon.style.width = '20px';
      tealiumIcon.style.height = '20px';
      tealiumIcon.style.marginRight = '8px';
  
      const headerText = document.createElement('span');
      headerText.textContent = 'MultiTool Beast';
      headerText.style.fontWeight = 'bold';
  
      headerDiv.appendChild(tealiumIcon);
      headerDiv.appendChild(headerText);
      container.appendChild(headerDiv);
  
      // Top row: "Copy All", arrowUp, arrowDown, and the fancy sun/moon toggle.
      const topRowDiv = document.createElement('div');
      topRowDiv.style.marginBottom = '8px';
      container.appendChild(topRowDiv);
  
      // "Copy All" button.
      const copyAllBtn = document.createElement('button');
      copyAllBtn.textContent = "Copy All";
      topRowDiv.appendChild(copyAllBtn);
  
      // Arrows.
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
  
      // Fancy sun/moon toggle.
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
  
      // Refresh checkbox state based on stored theme.
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
  
      // Variables to store custom field data for "Copy All"
      let accountVal = "";
      let profileVal = "";
      let urlsVal = "";
      let currentTicketId = "";
      let currentTicketLink = "";
      let ticketIdVal = "";
  
      // Grab current ticket ID from URL.
      const matchUrl = window.location.pathname.match(/tickets\/(\d+)/);
      if (matchUrl) {
          currentTicketId = matchUrl[1];
          currentTicketLink = window.location.origin + "/a/tickets/" + currentTicketId;
          ticketIdVal = currentTicketId;
      }
  
      // Delay reading custom fields (1.5s delay)
      setTimeout(() => {
          const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
          accountVal = getFieldValue(accountInput);
  
          const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
          profileVal = getFieldValue(profileInput);
  
          const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
          urlsVal = urlsTextarea ? urlsTextarea.value.trim() : "";
  
          const emailVal = getEmailValue();
  
          // Helper to create a menu item with a copy button.
          function createMenuItem(labelText, valueText) {
              const itemDiv = document.createElement('div');
              itemDiv.style.marginBottom = '6px';
  
              const label = document.createElement('span');
              label.textContent = labelText + ": ";
              label.style.fontWeight = 'bold';
              itemDiv.appendChild(label);
  
              // If valueText is "account" or "profile", treat as empty.
              if (valueText) {
                  const lowerVal = valueText.trim().toLowerCase();
                  if (lowerVal === 'account' || lowerVal === 'profile') {
                      valueText = "";
                  }
              }
  
              const value = document.createElement('span');
              value.textContent = valueText || "N/A";
              value.style.userSelect = 'text';
              itemDiv.appendChild(value);
  
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
  
          // Populate the UI with custom field items.
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
                                  return; // exclude current ticket
                              }
                              tickets.push({href, subject, date: ticketDate});
                          }
                      }
                  }
              });
              return tickets;
          }
  
          const recentTickets = getRecentTickets();
          const divider = document.createElement('hr');
          divider.style.margin = '10px 0';
          container.appendChild(divider);
  
          const recentHeader = document.createElement('div');
          recentHeader.textContent = "Recent Tickets (last 7 days)";
          recentHeader.style.fontWeight = 'bold';
          recentHeader.style.marginBottom = '6px';
          container.appendChild(recentHeader);
  
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
  
      // "Copy All" logic: build a formatted note for Slack/Jira.
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
  
      // Append the wrapper to the document body.
      document.body.appendChild(wrapper);
      console.log("MultiTool Beast loaded successfully!");
  
      // Make the entire wrapper draggable via the "Drag" button.
      makeDraggable(wrapper, dragHandleBtn);
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTool);
    } else {
      initTool();
    }
  })();
  