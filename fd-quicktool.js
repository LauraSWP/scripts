// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.89
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
   * 0) Inject Bootstrap 5 CSS & JS into document head
   ***********************************************/
  function injectBootstrap() {
    // Bootstrap CSS
    const link = document.createElement("link");
    link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    link.rel = "stylesheet";
    link.integrity = "sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    // Bootstrap JS bundle
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
    script.integrity = "sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz";
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }
  injectBootstrap();

  /***********************************************
   * 1) Custom Dark Mode Overrides for Bootstrap 5
   ***********************************************/
  const darkModeOverrides = `
body.dark {
  background-color: #121212 !important;
  color: #e0e0e0 !important;
}
body.dark .card {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
  color: #e0e0e0 !important;
}
body.dark .btn {
  background-color: #333 !important;
  border-color: #444 !important;
  color: #e0e0e0 !important;
}
body.dark a {
  color: #9ecfff !important;
}
`;

  function applyDarkModeCSS() {
    let style = document.getElementById("dark-mode-overrides");
    if (!style) {
      style = document.createElement("style");
      style.id = "dark-mode-overrides";
      style.textContent = darkModeOverrides;
      document.head.appendChild(style);
    }
  }
  function removeDarkModeCSS() {
    let style = document.getElementById("dark-mode-overrides");
    if (style) style.remove();
  }

  /***********************************************
   * 2) Dark Mode Toggle Functions
   ***********************************************/
  function initTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored === 'theme-dark') {
      document.body.classList.add('dark');
      applyDarkModeCSS();
    } else {
      document.body.classList.remove('dark');
      removeDarkModeCSS();
    }
  }
  function toggleTheme() {
    if (document.body.classList.contains('dark')) {
      document.body.classList.remove('dark');
      localStorage.setItem('fdTheme', 'theme-light');
      removeDarkModeCSS();
    } else {
      document.body.classList.add('dark');
      localStorage.setItem('fdTheme', 'theme-dark');
      applyDarkModeCSS();
    }
  }

  /***********************************************
   * 3) Extract Ticket ID from URL
   ***********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/(?:\/a)?\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();

  /***********************************************
   * 4) Helper Functions: getFieldValue, getSummary, getRecentTickets, fetchCARR
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
    els.forEach(function(el) {
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
            tickets.push({ href: href, subject: subject, date: dt });
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
   * 5) Slack/JIRA Toggle & "Copy Selected" Functionality
   ***********************************************/
  let formatMode = 'slack';
  function setFormat(mode) {
    formatMode = mode;
    const slackBtn = document.getElementById('format-slack-btn');
    const jiraBtn = document.getElementById('format-jira-btn');
    if (!slackBtn || !jiraBtn) return;
    if (mode === 'slack') {
      slackBtn.classList.add('btn-primary');
      slackBtn.classList.remove('btn-outline-secondary');
      jiraBtn.classList.remove('btn-primary');
      jiraBtn.classList.add('btn-outline-secondary');
    } else {
      slackBtn.classList.remove('btn-primary');
      slackBtn.classList.add('btn-outline-secondary');
      jiraBtn.classList.add('btn-primary');
      jiraBtn.classList.remove('btn-outline-secondary');
    }
  }
  function copyAllSelected() {
    let copyText = "";
    document.querySelectorAll('.fieldRow').forEach(function(row) {
      const chk = row.querySelector('.field-selector');
      if (chk && chk.checked) {
        const lblSpan = row.querySelector('span');
        const valEl = row.querySelector('.bg-light');
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
    row.className = "mb-2 pb-2 fieldRow";
    row.style.borderBottom = "1px solid #ddd";
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.className = "mr-2 field-selector";
    row.appendChild(check);
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    row.appendChild(lbl);
    const finalVal = valueText || "N/A";
    if (labelText.toLowerCase() === "relevant urls" && finalVal.startsWith("http")) {
      const link = document.createElement('a');
      link.href = finalVal;
      link.target = "_blank";
      link.textContent = finalVal;
      link.className = "ms-2 bg-light rounded";
      row.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = finalVal;
      span.className = "ms-2 bg-light rounded";
      row.appendChild(span);
    }
    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "ms-2 btn btn-xs btn-outline-secondary copy-btn";
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
   * 6) Build Pinned Tab Content (Quick Access Grid)
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
      cardBody.className = "card-body";
      cardBody.innerHTML = `<div style="font-size: 24px;">${item.icon}</div><div>${item.label}</div>`;
      btn.appendChild(cardBody);
      col.appendChild(btn);
      grid.appendChild(col);
    });
    return grid;
  }
    
  /***********************************************
   * 7) Populate Profile Tab (Ticket/Field Info)
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
    copyAccBtn.className = "mt-2 btn btn-xs btn-outline-secondary";
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
    rHead.className = "fw-bold";
    rHead.style.marginBottom = "10px";
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
        cpBtn.className = "ms-2 btn btn-xs btn-outline-secondary copy-btn";
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
   * 8) Build Entire Tool Layout Using Bootstrap 5
   ***********************************************/
  function initTool() {
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("[MultiTool Beast] Already initialized");
      return;
    }
    loadBootstrapCSS(function(bootstrapCSS) {
      console.log("[MultiTool Beast] Initializing with Bootstrap 5 CSS inline.");
      initTheme();
      const isOpen = false; // initial state closed
      
      // Create outer wrapper (Bootstrap card)
      const wrapper = document.createElement('div');
      wrapper.id = "multitool-beast-wrapper";
      wrapper.style.position = "fixed";
      wrapper.style.bottom = "80px";
      wrapper.style.right = "20px";
      wrapper.style.zIndex = "10000";
      wrapper.style.width = "360px";
      wrapper.style.minWidth = "200px";
      wrapper.style.minHeight = "200px";
      wrapper.style.resize = "both";
      wrapper.style.overflow = "auto";
      wrapper.className = "card";
      wrapper.style.display = isOpen ? "block" : "none";
      localStorage.setItem("multitool_open", isOpen ? "true" : "false");
      
      // Append Bootstrap CSS inline if not present
      let bsStyle = document.getElementById("bootstrap-inline");
      if (!bsStyle) {
        bsStyle = document.createElement("style");
        bsStyle.id = "bootstrap-inline";
        bsStyle.textContent = bootstrapCSS;
        document.head.appendChild(bsStyle);
      }
      
      // Card Header (draggable)
      const cardHeader = document.createElement('div');
      cardHeader.className = "card-header";
      cardHeader.style.cursor = "move";
      // Left side: dark mode toggle
      const headerLeft = document.createElement('div');
      headerLeft.className = "d-inline";
      const nightLabel = document.createElement('label');
      nightLabel.className = "form-check form-switch mb-0";
      const nightInput = document.createElement('input');
      nightInput.className = "form-check-input";
      nightInput.type = "checkbox";
      nightInput.id = "slider-top";
      nightLabel.appendChild(nightInput);
      nightLabel.insertAdjacentHTML('beforeend', ' Dark');
      nightInput.addEventListener('change', toggleTheme);
      headerLeft.appendChild(nightLabel);
      cardHeader.appendChild(headerLeft);
      // Right side: scroll up/down and close
      const headerRight = document.createElement('div');
      headerRight.className = "ms-auto";
      const upBtn = document.createElement('button');
      upBtn.textContent = "↑";
      upBtn.title = "Scroll to top";
      upBtn.className = "btn btn-sm btn-secondary me-1";
      upBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      headerRight.appendChild(upBtn);
      const downBtn = document.createElement('button');
      downBtn.textContent = "↓";
      downBtn.title = "Scroll to bottom";
      downBtn.className = "btn btn-sm btn-secondary me-1";
      downBtn.addEventListener('click', function() { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
      headerRight.appendChild(downBtn);
      const closeBtn = document.createElement('button');
      closeBtn.textContent = "×";
      closeBtn.title = "Close MultiTool Beast";
      closeBtn.className = "btn btn-sm btn-danger";
      closeBtn.addEventListener('click', function() {
        wrapper.style.display = "none";
        openBtn.style.display = "block";
        localStorage.setItem("multitool_open", "false");
      });
      headerRight.appendChild(closeBtn);
      cardHeader.appendChild(headerRight);
      wrapper.appendChild(cardHeader);
      
      // Card Body: Header (icon + title)
      const cardBodyHeader = document.createElement('div');
      cardBodyHeader.className = "card-body text-center";
      const headerIcon = document.createElement('img');
      headerIcon.src = "https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png";
      headerIcon.style.width = "32px";
      headerIcon.style.height = "32px";
      headerIcon.className = "me-2";
      const headerTxt = document.createElement('h5');
      headerTxt.className = "card-title mb-0";
      headerTxt.textContent = "MultiTool Beast";
      cardBodyHeader.appendChild(headerIcon);
      cardBodyHeader.appendChild(headerTxt);
      wrapper.appendChild(cardBodyHeader);
      
      // Tabs Navigation using Bootstrap Nav Tabs
      const navTabs = document.createElement('ul');
      navTabs.className = "nav nav-tabs";
      const liProfile = document.createElement('li');
      liProfile.className = "nav-item";
      const aProfile = document.createElement('a');
      aProfile.className = "nav-link active";
      aProfile.href = "#";
      aProfile.innerHTML = personIconSVG + " Profile";
      aProfile.addEventListener('click', function(e) {
        e.preventDefault();
        showTab('profile');
      });
      liProfile.appendChild(aProfile);
      navTabs.appendChild(liProfile);
      const liPinned = document.createElement('li');
      liPinned.className = "nav-item";
      const aPinned = document.createElement('a');
      aPinned.className = "nav-link";
      aPinned.href = "#";
      aPinned.innerHTML = pinIconSVG + " Pinned";
      aPinned.addEventListener('click', function(e) {
        e.preventDefault();
        showTab('pinned');
      });
      liPinned.appendChild(aPinned);
      navTabs.appendChild(liPinned);
      wrapper.appendChild(navTabs);
      
      // Tab Content: Profile
      const tabProfileContent = document.createElement('div');
      tabProfileContent.id = "tab-content-profile";
      tabProfileContent.style.display = "block";
      const profileContentDiv = document.createElement('div');
      profileContentDiv.className = "mt-2";
      // Top row: Copy Selected and Slack/JIRA toggle
      const topBodyRowProfile = document.createElement('div');
      topBodyRowProfile.className = "d-flex justify-content-between align-items-center mb-2";
      const copyAllBtn = document.createElement('button');
      copyAllBtn.id = "copy-all-selected-btn";
      copyAllBtn.textContent = "Copy Selected";
      copyAllBtn.className = "btn btn-sm btn-info";
      copyAllBtn.addEventListener('click', copyAllSelected);
      topBodyRowProfile.appendChild(copyAllBtn);
      const formatGroup = document.createElement('div');
      formatGroup.className = "btn-group";
      const slackBtn = document.createElement('button');
      slackBtn.id = "format-slack-btn";
      slackBtn.textContent = "Slack";
      slackBtn.type = "button";
      slackBtn.className = "btn btn-sm btn-outline-secondary active";
      slackBtn.addEventListener('click', function() { setFormat('slack'); });
      const jiraBtn = document.createElement('button');
      jiraBtn.id = "format-jira-btn";
      jiraBtn.textContent = "JIRA";
      jiraBtn.type = "button";
      jiraBtn.className = "btn btn-sm btn-outline-secondary";
      jiraBtn.addEventListener('click', function() { setFormat('jira'); });
      formatGroup.appendChild(slackBtn);
      formatGroup.appendChild(jiraBtn);
      topBodyRowProfile.appendChild(formatGroup);
      profileContentDiv.appendChild(topBodyRowProfile);
      // Summary checkbox
      const summaryRow = document.createElement('div');
      summaryRow.className = "form-check";
      const sumCheck = document.createElement('input');
      sumCheck.type = "checkbox";
      sumCheck.id = "include-summary";
      sumCheck.className = "form-check-input me-2";
      summaryRow.appendChild(sumCheck);
      const sumLbl = document.createElement('label');
      sumLbl.htmlFor = "include-summary";
      sumLbl.className = "form-check-label";
      sumLbl.textContent = "Include Summary";
      summaryRow.appendChild(sumLbl);
      profileContentDiv.appendChild(summaryRow);
      // Container for profile fields
      const profileFieldsContainer = document.createElement('div');
      profileFieldsContainer.id = "profile-fields-container";
      profileFieldsContainer.className = "mt-2";
      profileContentDiv.appendChild(profileFieldsContainer);
      populateProfileTab(profileFieldsContainer);
      tabProfileContent.appendChild(profileContentDiv);
      wrapper.appendChild(tabProfileContent);
      
      // Tab Content: Pinned
      const tabPinnedContent = document.createElement('div');
      tabPinnedContent.id = "tab-content-pinned";
      tabPinnedContent.style.display = "none";
      const pinnedContentDiv = document.createElement('div');
      pinnedContentDiv.className = "mt-2";
      pinnedContentDiv.innerHTML = '<strong>Quick Access Grid:</strong><br>';
      pinnedContentDiv.appendChild(buildPinnedTabContent());
      tabPinnedContent.appendChild(pinnedContentDiv);
      wrapper.appendChild(tabPinnedContent);
      
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
      console.log("[MultiTool Beast] Loaded (v1.45.0) with Bootstrap 5 CSS inline.");
      
      document.body.appendChild(wrapper);
      window._multitoolWrapper = wrapper;
    });
  }
    
  /***********************************************
   * 10) Auto-update on URL change (every 3 seconds)
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
   * 11) Initialize on DOM ready
   ***********************************************/
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initTool, 3000); });
  } else {
    setTimeout(initTool, 3000);
  }
    
})();
