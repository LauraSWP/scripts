// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.92
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
   * Check if current page is a ticket page
   ***********************************************/
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  if (!isTicketPage()) {
    console.log("[MultiTool Beast] Not a ticket page. Exiting.");
    return;
  }

  /***********************************************
   * Utility Functions
   ***********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();

  function getFieldValue(el) {
    if (!el) return "";
    let val = el.value || el.getAttribute('value') || el.getAttribute('placeholder') || "";
    val = val.trim();
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
    els.forEach(function(el) {
      const timeEl = el.querySelector('[data-test-id="timeline-activity-time"]');
      if (timeEl) {
        let dt = new Date(timeEl.textContent.trim().replace(',', ''));
        if (!isNaN(dt) && (now - dt <= threshold) && dt <= now) {
          const linkEl = el.querySelector('a.text__link-heading');
          if (linkEl) {
            const href = linkEl.href;
            const subject = linkEl.textContent.trim();
            const m = href.match(/\/a\/tickets\/(\d+)/);
            const foundId = m ? m[1] : "";
            if (currentTicketId && parseInt(foundId,10) === parseInt(currentTicketId,10)) return;
            tickets.push({ href: href, subject: subject, date: dt });
          }
        }
      }
    });
    return tickets;
  }

  // CARR is fetched from the company page by clicking the "show more" button.
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
    iframe.style.visibility = "hidden";
    iframe.src = compURL;
    iframe.onload = function() {
      setTimeout(function() {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const showMore = doc.querySelector('div.contacts__sidepanel--state[data-test-toggle]');
          if (showMore) showMore.click();
          setTimeout(function() {
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
   * Copy & Format Functions
   ***********************************************/
  let formatMode = 'slack';
  function setFormat(mode) {
    formatMode = mode;
    const slackBtn = document.getElementById('format-slack-btn');
    const jiraBtn = document.getElementById('format-jira-btn');
    if (!slackBtn || !jiraBtn) return;
    if (mode === 'slack') {
      slackBtn.classList.add('active');
      jiraBtn.classList.remove('active');
    } else {
      slackBtn.classList.remove('active');
      jiraBtn.classList.add('active');
    }
  }

  function copyAllSelected() {
    let copyText = "";
    document.querySelectorAll('.fieldRow').forEach(function(row) {
      const chk = row.querySelector('.field-selector');
      if (chk && chk.checked) {
        const lblSpan = row.querySelector('span');
        const valEl = row.querySelector('.fresh-value');
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
    navigator.clipboard.writeText(copyText).then(function() {
      if (copyBtn) {
        copyBtn.textContent = "Copied Selected!";
        setTimeout(function() { copyBtn.textContent = "Copy Selected"; }, 2000);
      }
    });
  }

  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "fieldRow mb-2 pb-2";
    row.style.borderBottom = "1px solid #ddd";
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.className = "field-selector me-2";
    row.appendChild(check);
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    row.appendChild(lbl);
    const finalVal = valueText || "N/A";
    const valSpan = document.createElement('span');
    valSpan.textContent = finalVal;
    valSpan.className = "fresh-value ms-2 bg-light rounded p-1";
    row.appendChild(valSpan);
    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "btn btn-xs btn-outline-secondary ms-2 copy-btn";
      btn.innerHTML = copyIconSVG;
      btn.title = "Copy";
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(finalVal).then(function() {
          btn.innerHTML = `<span style="color: green;">&#10003;</span>`;
          setTimeout(function() { btn.innerHTML = copyIconSVG; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }

  /***********************************************
   * Build Pinned Tab Content (Quick Access Grid)
   ***********************************************/
  function buildPinnedTabContent() {
    const grid = document.createElement('div');
    grid.className = "row";
    const items = [
      { icon: '📄', label: 'Docs', link: 'https://docs.google.com/' },
      { icon: '🔗', label: 'Website', link: 'https://www.example.com' },
      { icon: '📊', label: 'Analytics', link: 'https://analytics.google.com' },
      { icon: '🚀', label: 'Rocket', link: 'https://www.spacex.com' },
    ];
    items.forEach(function(item) {
      const col = document.createElement('div');
      col.className = "col-6";
      const btn = document.createElement('div');
      btn.className = "card text-center";
      btn.style.cursor = "pointer";
      btn.addEventListener('click', function() { window.open(item.link, '_blank'); });
      const cardBody = document.createElement('div');
      cardBody.className = "card-body p-2";
      cardBody.innerHTML = `<div style="font-size: 24px;">${item.icon}</div><div>${item.label}</div>`;
      btn.appendChild(cardBody);
      col.appendChild(btn);
      grid.appendChild(col);
    });
    return grid;
  }

  /***********************************************
   * Populate Profile Tab (Ticket/Field Info)
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
    copyAccBtn.className = "btn btn-xs btn-outline-secondary mt-2";
    copyAccBtn.addEventListener('click', function() {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(function() {
        copyAccBtn.textContent = "Copied!";
        setTimeout(function() { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    container.appendChild(copyAccBtn);
        
    const hr = document.createElement('hr');
    hr.style.margin = "10px 0";
    container.appendChild(hr);
        
    const rHead = document.createElement('div');
    rHead.textContent = "Recent Tickets (last 7 days)";
    rHead.className = "fw-bold mb-2";
    container.appendChild(rHead);
        
    const recTix = getRecentTickets();
    if (recTix.length > 0) {
      recTix.forEach(function(t) {
        const tDiv = document.createElement('div');
        tDiv.style.marginBottom = "10px";
        tDiv.style.paddingBottom = "10px";
        tDiv.style.borderBottom = "1px solid #ddd";
        if (document.body.classList.contains("dark")) {
          tDiv.style.borderBottom = "1px solid #444";
        }
        const a = document.createElement('a');
        a.href = t.href;
        a.target = "_blank";
        a.textContent = t.subject;
        a.className = "text-info";
        tDiv.appendChild(a);
        const cpBtn = document.createElement('button');
        cpBtn.className = "btn btn-xs btn-outline-secondary ms-2 copy-btn";
        cpBtn.innerHTML = copyIconSVG;
        cpBtn.title = "Copy Link";
        cpBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(t.href).then(function() {
            cpBtn.innerHTML = `<span style="color: green;">&#10003;</span>`;
            setTimeout(function() { cpBtn.innerHTML = copyIconSVG; }, 2000);
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
        
    fetchCARR(function(cVal) {
      const vEl = carrRow.querySelector('.bg-light');
      if (vEl) vEl.textContent = cVal;
    });
  }

  /***********************************************
   * Build Entire Tool Layout Using Freshdesk Native CSS
   ***********************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    console.log("[MultiTool Beast] Initializing with Freshdesk native CSS classes.");
    initTheme();
    const isOpen = false; // initial state closed
      
    // Create outer wrapper
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    // Fixed position: bottom 80px, right 20px; width 360px, min-width 200px
    wrapper.style.position = "fixed";
    wrapper.style.bottom = "80px";
    wrapper.style.right = "20px";
    wrapper.style.zIndex = "10000";
    wrapper.style.width = "360px";
    wrapper.style.minWidth = "200px";
    wrapper.style.minHeight = "200px";
    wrapper.style.resize = "both";
    wrapper.style.overflow = "auto";
    // Use native Freshdesk widget styling
    wrapper.className = "widget-item";
    wrapper.style.display = isOpen ? "block" : "none";
    localStorage.setItem("multitool_open", isOpen ? "true" : "false");
      
    /***** Build UI inside the widget ******/
      
    // Header Bar (using Freshdesk sidebar header style)
    const headerBar = document.createElement('div');
    headerBar.className = "sidebar__title";
    headerBar.style.cursor = "move";
    headerBar.style.position = "relative";
    headerBar.style.padding = "5px 10px";
    // Left: Dark mode toggle
    const headerLeft = document.createElement('span');
    headerLeft.className = "me-2";
    const nightToggle = document.createElement('input');
    nightToggle.type = "checkbox";
    nightToggle.id = "dark-toggle";
    nightToggle.style.marginRight = "5px";
    nightToggle.addEventListener('change', toggleTheme);
    headerLeft.appendChild(nightToggle);
    headerLeft.insertAdjacentText('beforeend', " Dark");
    headerBar.appendChild(headerLeft);
    // Right: Up, Down, Close buttons
    const headerRight = document.createElement('span');
    headerRight.style.position = "absolute";
    headerRight.style.right = "10px";
    // Up button
    const upBtn = document.createElement('button');
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.className = "btn btn-xs";
    upBtn.style.marginRight = "5px";
    upBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    headerRight.appendChild(upBtn);
    // Down button
    const downBtn = document.createElement('button');
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.className = "btn btn-xs";
    downBtn.style.marginRight = "5px";
    downBtn.addEventListener('click', function() { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
    headerRight.appendChild(downBtn);
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "×";
    closeBtn.title = "Close MultiTool Beast";
    closeBtn.className = "btn btn-xs btn-danger";
    closeBtn.addEventListener('click', function() {
      wrapper.style.display = "none";
      openBtn.style.display = "block";
      localStorage.setItem("multitool_open", "false");
    });
    headerRight.appendChild(closeBtn);
    headerBar.appendChild(headerRight);
    wrapper.appendChild(headerBar);
      
    // Title Section
    const titleSection = document.createElement('div');
    titleSection.className = "text-center p-2";
    const titleIcon = document.createElement('img');
    titleIcon.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
    titleIcon.style.width = "32px";
    titleIcon.style.height = "32px";
    titleIcon.className = "me-2";
    const titleText = document.createElement('span');
    titleText.textContent = "MultiTool Beast";
    titleText.className = "fw-bold";
    titleSection.appendChild(titleIcon);
    titleSection.appendChild(titleText);
    wrapper.appendChild(titleSection);
      
    // Tabs Navigation
    const tabsNav = document.createElement('ul');
    tabsNav.className = "nav nav-tabs";
    // Profile Tab
    const liProfile = document.createElement('li');
    liProfile.className = "multitool-tab-item active";
    liProfile.id = "tab-btn-profile";
    const aProfile = document.createElement('a');
    aProfile.href = "#";
    aProfile.innerHTML = personIconSVG + " Profile";
    aProfile.addEventListener('click', function(e) { e.preventDefault(); showTab('profile'); });
    liProfile.appendChild(aProfile);
    tabsNav.appendChild(liProfile);
    // Pinned Tab
    const liPinned = document.createElement('li');
    liPinned.className = "multitool-tab-item";
    liPinned.id = "tab-btn-pinned";
    const aPinned = document.createElement('a');
    aPinned.href = "#";
    aPinned.innerHTML = pinIconSVG + " Pinned";
    aPinned.addEventListener('click', function(e) { e.preventDefault(); showTab('pinned'); });
    liPinned.appendChild(aPinned);
    tabsNav.appendChild(liPinned);
    wrapper.appendChild(tabsNav);
      
    // Tab Content: Profile
    const tabContentProfile = document.createElement('div');
    tabContentProfile.id = "tab-content-profile";
    tabContentProfile.className = "multitool-tab-content";
    tabContentProfile.style.display = "block";
    const profileContentDiv = document.createElement('div');
    profileContentDiv.className = "p-2";
    // Top row: Copy Selected and Slack/JIRA toggle
    const topRow = document.createElement('div');
    topRow.className = "d-flex justify-content-between mb-2";
    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.className = "btn btn-xs btn-info";
    copyAllBtn.addEventListener('click', copyAllSelected);
    topRow.appendChild(copyAllBtn);
    const formatGroup = document.createElement('div');
    formatGroup.className = "btn-group";
    const slackBtn = document.createElement('button');
    slackBtn.id = "format-slack-btn";
    slackBtn.textContent = "Slack";
    slackBtn.type = "button";
    slackBtn.className = "btn btn-xs btn-outline-secondary active";
    slackBtn.addEventListener('click', function() { setFormat('slack'); });
    const jiraBtn = document.createElement('button');
    jiraBtn.id = "format-jira-btn";
    jiraBtn.textContent = "JIRA";
    jiraBtn.type = "button";
    jiraBtn.className = "btn btn-xs btn-outline-secondary";
    jiraBtn.addEventListener('click', function() { setFormat('jira'); });
    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topRow.appendChild(formatGroup);
    profileContentDiv.appendChild(topRow);
    // Summary checkbox
    const summaryDiv = document.createElement('div');
    summaryDiv.className = "form-check mb-2";
    const sumCheck = document.createElement('input');
    sumCheck.type = "checkbox";
    sumCheck.id = "include-summary";
    sumCheck.className = "form-check-input";
    const sumLbl = document.createElement('label');
    sumLbl.htmlFor = "include-summary";
    sumLbl.className = "form-check-label";
    sumLbl.textContent = " Include Summary";
    summaryDiv.appendChild(sumCheck);
    summaryDiv.appendChild(sumLbl);
    profileContentDiv.appendChild(summaryDiv);
    // Container for profile fields
    const profileFieldsContainer = document.createElement('div');
    profileFieldsContainer.id = "profile-fields-container";
    profileContentDiv.appendChild(profileFieldsContainer);
    populateProfileTab(profileFieldsContainer);
    tabContentProfile.appendChild(profileContentDiv);
    wrapper.appendChild(tabContentProfile);
      
    // Tab Content: Pinned
    const tabContentPinned = document.createElement('div');
    tabContentPinned.id = "tab-content-pinned";
    tabContentPinned.className = "multitool-tab-content";
    tabContentPinned.style.display = "none";
    const pinnedContentDiv = document.createElement('div');
    pinnedContentDiv.className = "p-2";
    pinnedContentDiv.innerHTML = '<strong>Quick Access Grid:</strong><br>';
    pinnedContentDiv.appendChild(buildPinnedTabContent());
    tabContentPinned.appendChild(pinnedContentDiv);
    wrapper.appendChild(tabContentPinned);
      
    // Draggable handle (a small button above the header)
    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.innerHTML = "✋";
    dragHandleBtn.className = "btn btn-xs btn-outline-secondary";
    dragHandleBtn.style.position = "absolute";
    dragHandleBtn.style.top = "-20px";
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
    console.log("[MultiTool Beast] Loaded with Freshdesk native CSS classes.");
      
    document.body.appendChild(wrapper);
    window._multitoolWrapper = wrapper;
  }

  /***********************************************
   * Auto-update on URL change (every 3 seconds)
   ***********************************************/
  setInterval(function() {
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
   * Open Button – a tab-style button fixed at bottom-right
   ***********************************************/
  // The open button is now styled as a small tab with only the Tealium icon.
  const openBtn = document.createElement('button');
  openBtn.style.position = "fixed";
  openBtn.style.bottom = "0";
  openBtn.style.right = "0";
  openBtn.style.zIndex = "10000";
  openBtn.style.borderTopLeftRadius = "0";
  openBtn.style.borderTopRightRadius = "0";
  openBtn.style.borderBottomLeftRadius = "4px";
  openBtn.style.borderBottomRightRadius = "4px";
  openBtn.style.padding = "5px";
  openBtn.style.backgroundColor = "#fff";
  openBtn.style.border = "1px solid #ccc";
  openBtn.style.boxShadow = "0 -2px 4px rgba(0,0,0,0.2)";
  openBtn.title = "Open MultiTool Beast";
  // Use the Tealium icon as the sole content:
  openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=40,h=40,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" style="width:32px;height:32px;">`;
  openBtn.style.display = "none";
  openBtn.addEventListener('click', function() {
    if (window._multitoolWrapper) {
      window._multitoolWrapper.style.display = "block";
    }
    openBtn.style.display = "none";
    localStorage.setItem("multitool_open", "true");
    showTab('profile');
    const profileFieldsContainer = document.getElementById('profile-fields-container');
    if (profileFieldsContainer) {
      populateProfileTab(profileFieldsContainer);
    }
  });
  // Show the open button if the widget is closed (default state)
  if (localStorage.getItem("multitool_open") !== "true") {
    openBtn.style.display = "block";
  }
  document.body.appendChild(openBtn);
    
  /***********************************************
   * Initialize on DOM ready
   ***********************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initTool, 3000); });
  } else {
    setTimeout(initTool, 3000);
  }
    
})();
