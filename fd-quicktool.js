// ==UserScript==
// @name         Freshdesk Ticket MultiTool for Tealium
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.69
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
   * 2) Insert main CSS (layout, tabs, etc.)
   ***********************************************/
  const styleEl = document.createElement('style');
  styleEl.textContent = `
#multitool-beast-wrapper {
  background: #ffffff;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #cfd7df;
  color: #313131;
  font-family: sans-serif;
}

/* Top bar with night mode left, up/down + close right */
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

/* Single copy icon buttons */
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

/* Slack/JIRA toggle */
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

/* Night mode toggle switch */
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
  background: white;
  border-radius: 50%;
  box-shadow: 0 0px 15px #2020203d;
}
input:checked + .slider {
  background-color: #2196f3;
}
input:checked + .slider:before {
  transform: translateX(20px);
}

/* Tabs below the header */
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

  // Night mode CSS
  const nightModeCSS = `
/* Minimal example: dark background, etc. */
body, html {
  background-color: #121212 !important;
  color: #e0e0e0 !important;
}
`;

  // Helper: apply / remove dark mode
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

  function initTheme() {
    const stored = localStorage.getItem('fdTheme');
    if (stored==='theme-dark') applyNightModeCSS();
    else removeNightModeCSS();
  }
  function toggleTheme() {
    const st = localStorage.getItem('fdTheme');
    if (st==='theme-dark') {
      localStorage.setItem('fdTheme','theme-light');
      removeNightModeCSS();
    } else {
      localStorage.setItem('fdTheme','theme-dark');
      applyNightModeCSS();
    }
  }

  /********************************************
   * 3) Extract Ticket ID
   ********************************************/
  function extractTicketId() {
    const match = window.location.pathname.match(/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  let currentTicketId = extractTicketId();
  if (!currentTicketId) {
    console.log("[MultiTool Tabs] Not a ticket page, aborting.");
    return;
  }

  /********************************************
   * 4) Our tab references
   ********************************************/
  let tabContentProfile = null;
  let tabContentPinned = null;

  function showTab(which) {
    // Deactivate all tabs
    document.querySelectorAll('.multitool-tab').forEach(btn=>btn.classList.remove('active'));
    document.querySelectorAll('.multitool-tab-content').forEach(tc=>tc.classList.remove('active'));

    if (which==='profile') {
      const tabBtnProfile = document.getElementById('tab-btn-profile');
      if (tabBtnProfile) tabBtnProfile.classList.add('active');
      if (tabContentProfile) tabContentProfile.classList.add('active');
    } else {
      const tabBtnPinned = document.getElementById('tab-btn-pinned');
      if (tabBtnPinned) tabBtnPinned.classList.add('active');
      if (tabContentPinned) tabContentPinned.classList.add('active');
    }
  }

  /********************************************
   * 5) Build pinned tab content
   ********************************************/
  function buildPinnedTabContent() {
    const pinnedContainer = document.createElement('div');
    pinnedContainer.id = "pinned-grid";
    const pinnedItems = [
      { icon:'📄', label:'Docs', link:'https://docs.google.com' },
      { icon:'🔗', label:'Website', link:'https://www.example.com' },
    ];
    pinnedItems.forEach(it=>{
      const d = document.createElement('div');
      d.classList.add('pinned-btn');
      d.addEventListener('click',()=>window.open(it.link,'_blank'));
      const iconSpan = document.createElement('span');
      iconSpan.classList.add('pinned-btn-icon');
      iconSpan.textContent = it.icon;
      d.appendChild(iconSpan);
      const lblSpan = document.createElement('span');
      lblSpan.textContent = it.label;
      d.appendChild(lblSpan);
      pinnedContainer.appendChild(d);
    });
    return pinnedContainer;
  }

  /********************************************
   * 6) Field logic for the Profile tab
   ********************************************/
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
    if (!val || ["account","profile"].includes(val.toLowerCase())) val="N/A";
    return val.trim();
  }

  let formatMode = 'slack'; // default Slack
  function setFormat(mode) {
    formatMode = mode;
    const slackBtn = document.getElementById('format-slack-btn');
    const jiraBtn = document.getElementById('format-jira-btn');
    if (mode==='slack') {
      slackBtn.classList.add('active');
      jiraBtn.classList.remove('active');
    } else {
      slackBtn.classList.remove('active');
      jiraBtn.classList.add('active');
    }
  }

  function getSummary() {
    const noteDiv = document.querySelector('.ticket_note[data-note-id]');
    return noteDiv ? noteDiv.textContent.trim() : "";
  }

  function copyAllSelected() {
    let copyText = "";
    document.querySelectorAll('.fieldRow').forEach(row=>{
      const checkbox = row.querySelector('.field-selector');
      if (checkbox && checkbox.checked) {
        const labelSpan = row.querySelector('span');
        const valueEl = row.querySelector('.bg-light');
        if (labelSpan && valueEl) {
          let labelText = labelSpan.textContent.replace(/:\s*$/,"");
          let valueText = valueEl.textContent.trim();
          if (labelText.toLowerCase()==="ticket id") {
            const numericId = valueText.replace("#","");
            const link = window.location.origin + "/a/tickets/" + numericId;
            if (formatMode==='jira') {
              labelText=`**${labelText}**`;
              valueText=`[#${numericId}](${link})`;
            } else {
              valueText = `#${numericId} - ${link}`;
            }
          } else if (formatMode==='jira') {
            labelText=`**${labelText}**`;
          }
          copyText += `${labelText}: ${valueText}\n`;
        }
      }
    });
    const summaryCheck = document.getElementById('include-summary');
    if (summaryCheck && summaryCheck.checked) {
      const s = getSummary();
      if (s) {
        if (formatMode==='jira') copyText += `\n**Summary**:\n${s}\n`;
        else copyText += `\nSummary:\n${s}\n`;
      }
    }
    const copyAllBtn = document.getElementById('copy-all-selected-btn');
    navigator.clipboard.writeText(copyText).then(()=>{
      if (copyAllBtn) {
        copyAllBtn.textContent="Copied Selected!";
        setTimeout(()=>{ copyAllBtn.textContent="Copy Selected"; },2000);
      }
    });
  }

  function createMenuItem(labelText, valueText, withCopy=true) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('mb-2','pb-2','border-bottom','fieldRow');

    const checkbox = document.createElement('input');
    checkbox.type='checkbox';
    checkbox.checked=true;
    checkbox.classList.add('field-selector');
    checkbox.style.marginRight="5px";
    itemDiv.appendChild(checkbox);

    const label = document.createElement('span');
    label.textContent = labelText + ": ";
    label.style.fontWeight='bold';
    itemDiv.appendChild(label);

    const finalVal = valueText || "N/A";
    if (labelText.toLowerCase()==="relevant urls" && finalVal.startsWith("http")) {
      const linkEl = document.createElement('a');
      linkEl.href=finalVal;
      linkEl.target="_blank";
      linkEl.textContent=finalVal;
      linkEl.classList.add('ml-1','p-1','bg-light','rounded');
      itemDiv.appendChild(linkEl);
    } else {
      const valSpan = document.createElement('span');
      valSpan.textContent=finalVal;
      valSpan.classList.add('ml-1','p-1','bg-light','rounded');
      itemDiv.appendChild(valSpan);
    }
    if (withCopy) {
      const copyBtn=document.createElement('button');
      copyBtn.classList.add('copy-btn');
      copyBtn.innerHTML=copyIconSVG;
      copyBtn.title="Copy";
      copyBtn.addEventListener('click',()=>{
        navigator.clipboard.writeText(finalVal).then(()=>{
          copyBtn.innerHTML=`<span style="color:green;">&#10003;</span>`;
          setTimeout(()=>{ copyBtn.innerHTML=copyIconSVG; },2000);
        });
      });
      itemDiv.appendChild(copyBtn);
    }
    return itemDiv;
  }

  function fetchCARR(callback) {
    const companyLink = document.querySelector('a[href*="/a/companies/"]');
    if (!companyLink) return callback("N/A");
    const relURL = companyLink.getAttribute('href');
    const companyURL = window.location.origin + relURL;
    console.log("[CARR] Link:",companyURL);
    const iframe = document.createElement('iframe');
    iframe.style.position="absolute";
    iframe.style.top="-9999px";
    iframe.style.left="-9999px";
    iframe.style.width="1024px";
    iframe.style.height="768px";
    iframe.style.visibility="visible";
    iframe.src=companyURL;
    iframe.onload=function(){
      setTimeout(()=>{
        try{
          const doc=iframe.contentDocument||iframe.contentWindow.document;
          const showMore=doc.querySelector('div.contacts__sidepanel--state[data-test-toggle]');
          if (showMore) showMore.click();
          setTimeout(()=>{
            try{
              const cElem = doc.querySelector('[data-test-id="fields-info-carr_usd"] [data-test-field-content="CARR (converted)"] .text__content');
              let cVal= cElem? cElem.textContent.trim():"N/A";
              if (cVal!=="N/A" && !isNaN(cVal.replace(/[.,]/g,""))) {
                let numeric = parseInt(cVal.replace(/[.,]/g,""),10);
                cVal = numeric.toLocaleString()+"$";
              }
              document.body.removeChild(iframe);
              callback(cVal);
            } catch(e){
              console.log("[CARR] error post showMore:",e);
              document.body.removeChild(iframe);
              callback("N/A");
            }
          },3000);
        } catch(e){
          console.log("[CARR] error initial:",e);
          document.body.removeChild(iframe);
          callback("N/A");
        }
      },3000);
    };
    document.body.appendChild(iframe);
  }

  function getRecentTickets() {
    const tickets=[];
    const ticketEls = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
    if (!ticketEls.length) return tickets;
    const now= new Date();
    const threshold=7*24*60*60*1000;
    ticketEls.forEach(el=>{
      const timeEl = el.querySelector('[data-test-id="timeline-activity-time"]');
      if (timeEl){
        let dateStr=timeEl.textContent.trim().replace(',','');
        let dt=new Date(dateStr);
        if (!isNaN(dt) && (now-dt<=threshold) && dt<=now){
          const linkEl = el.querySelector('a.text__link-heading');
          if (linkEl){
            const href=linkEl.href;
            const subject=linkEl.textContent.trim();
            const match=href.match(/tickets\/(\d+)/);
            let foundId=match? match[1]: "";
            if (parseInt(foundId,10)===parseInt(currentTicketId,10)) return;
            tickets.push({ href, subject, date: dt });
          }
        }
      }
    });
    return tickets;
  }

  // Actually populate the profile tab
  function populateProfileTab(dynamicContainer) {
    dynamicContainer.innerHTML="";

    // gather fields
    const ticketIdVal = "#"+currentTicketId;
    const accountVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
    const profileVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]')||{value:""}).value.trim();

    dynamicContainer.appendChild(createMenuItem("Ticket ID", ticketIdVal));
    dynamicContainer.appendChild(createMenuItem("Account", accountVal));
    dynamicContainer.appendChild(createMenuItem("Account Profile", profileVal));

    const carrRow = createMenuItem("CARR","Fetching...", false);
    dynamicContainer.appendChild(carrRow);

    dynamicContainer.appendChild(createMenuItem("Relevant URLs", urlsVal));

    // Copy Account/Profile
    const copyAccProfBtn = document.createElement('button');
    copyAccProfBtn.textContent="Copy Account/Profile";
    copyAccProfBtn.classList.add('btn','btn-sm','btn-outline-secondary','mb-2','copy-btn');
    copyAccProfBtn.addEventListener('click',()=>{
      const text = accountVal+"/"+profileVal;
      navigator.clipboard.writeText(text).then(()=>{
        copyAccProfBtn.textContent="Copied!";
        setTimeout(()=>{ copyAccProfBtn.textContent="Copy Account/Profile"; },2000);
      });
    });
    dynamicContainer.appendChild(copyAccProfBtn);

    // divider
    const divi=document.createElement('hr');
    divi.classList.add('my-2');
    dynamicContainer.appendChild(divi);

    const rHeader = document.createElement('div');
    rHeader.textContent="Recent Tickets (last 7 days)";
    rHeader.style.fontWeight="bold";
    rHeader.classList.add('mb-2');
    dynamicContainer.appendChild(rHeader);

    const recTix = getRecentTickets();
    if (recTix.length>0) {
      recTix.forEach(t=>{
        const td=document.createElement('div');
        td.classList.add('mb-2','pb-2','border-bottom');
        const a=document.createElement('a');
        a.href=t.href;
        a.target="_blank";
        a.textContent=t.subject;
        a.style.color="#007bff";
        a.style.textDecoration="none";
        a.addEventListener('mouseover',()=>{ a.style.textDecoration="underline";});
        a.addEventListener('mouseout',()=>{ a.style.textDecoration="none";});
        td.appendChild(a);

        const cpyBtn = document.createElement('button');
        cpyBtn.classList.add('copy-btn');
        cpyBtn.innerHTML=copyIconSVG;
        cpyBtn.title="Copy Link";
        cpyBtn.addEventListener('click',()=>{
          navigator.clipboard.writeText(t.href).then(()=>{
            cpyBtn.innerHTML=`<span style="color:green;">&#10003;</span>`;
            setTimeout(()=>{ cpyBtn.innerHTML=copyIconSVG; },2000);
          });
        });
        td.appendChild(cpyBtn);
        dynamicContainer.appendChild(td);
      });
    } else {
      const noT=document.createElement('div');
      noT.textContent="No tickets in the last 7 days";
      dynamicContainer.appendChild(noT);
    }

    // fetchCARR
    fetchCARR(cVal=>{
      const valEl = carrRow.querySelector('.bg-light');
      if (valEl) valEl.textContent=cVal;
    });
  }

  /********************************************
   * The main init function
   ********************************************/
  function initTool() {
    if (document.getElementById("ticket-info-menu")) return;
    console.log("[MultiTool Beast] Tabs + Full Profile init...");
    initTheme();

    // default to closed => open button visible
    const isOpen = false;

    // create open button
    const openBtn = document.createElement('button');
    openBtn.innerHTML = `<img src="https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png" style="width:20px;height:20px;">`;
    openBtn.style.position='fixed';
    openBtn.style.bottom='0px';
    openBtn.style.right='0px';
    openBtn.style.zIndex='9999';
    openBtn.style.backgroundColor='#007bff';
    openBtn.style.color='#fff';
    openBtn.style.border='1px solid #0056b3';
    openBtn.style.borderRadius='4px';
    openBtn.style.padding='6px 10px';
    openBtn.title='Open MultiTool Beast';
    openBtn.style.display=isOpen? 'none':'block';
    openBtn.addEventListener('click',()=>{
      wrapper.style.display='block';
      openBtn.style.display='none';
      // show the profile tab by default
      showTab('profile');
      localStorage.setItem("multitool_open","true");
      // also re-populate the profile tab
      populateProfileTab(profileFieldsContainer);
    });
    document.body.appendChild(openBtn);

    // The wrapper
    const wrapper = document.createElement('div');
    wrapper.id="multitool-beast-wrapper";
    const storedPos=localStorage.getItem("multitool_position");
    if (storedPos) {
      const posStyles=JSON.parse(storedPos);
      if (posStyles.top) wrapper.style.top=posStyles.top;
      if (posStyles.left) wrapper.style.left=posStyles.left;
    } else {
      wrapper.style.bottom='80px';
      wrapper.style.right='20px';
    }
    wrapper.style.position='fixed';
    wrapper.style.zIndex='9999';
    wrapper.style.width='360px';
    wrapper.style.minWidth='280px';
    wrapper.style.minHeight='200px';
    wrapper.style.resize='both';
    wrapper.style.overflow='auto';
    wrapper.style.display=isOpen? 'block':'none';
    localStorage.setItem("multitool_open",isOpen? "true":"false");

    // Top bar
    const topBar = document.createElement('div');
    topBar.id="multitool-topbar";
    // left: night mode
    const leftDiv = document.createElement('div');
    const nightLabel = document.createElement('label');
    nightLabel.className='switch';
    const nightInput = document.createElement('input');
    nightInput.type='checkbox';
    nightInput.id='slider-top';
    const nightSpan = document.createElement('span');
    nightSpan.className='slider round';
    nightLabel.appendChild(nightInput);
    nightLabel.appendChild(nightSpan);
    leftDiv.appendChild(nightLabel);
    nightInput.addEventListener('change',toggleTheme);
    topBar.appendChild(leftDiv);

    // right: up/down/close
    const rightDiv = document.createElement('div');
    rightDiv.className='topbar-buttons';
    const upBtn=document.createElement('button');
    upBtn.textContent="↑";
    upBtn.title="Scroll to top";
    upBtn.classList.add('btn','btn-sm','btn-outline-secondary');
    upBtn.addEventListener('click',()=>{ window.scrollTo({top:0,behavior:'smooth'});});
    rightDiv.appendChild(upBtn);

    const downBtn=document.createElement('button');
    downBtn.textContent="↓";
    downBtn.title="Scroll to bottom";
    downBtn.classList.add('btn','btn-sm','btn-outline-secondary');
    downBtn.addEventListener('click',()=>{ window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});});
    rightDiv.appendChild(downBtn);

    const closeBtn=document.createElement('button');
    closeBtn.textContent='×';
    closeBtn.classList.add('btn','btn-sm','btn-outline-danger');
    closeBtn.title='Close MultiTool Beast';
    closeBtn.addEventListener('click',()=>{
      wrapper.style.display='none';
      openBtn.style.display='block';
      localStorage.setItem("multitool_open","false");
    });
    rightDiv.appendChild(closeBtn);
    topBar.appendChild(rightDiv);

    wrapper.appendChild(topBar);

    // header
    const headerArea=document.createElement('div');
    headerArea.classList.add('card-header','d-flex','align-items-center','justify-content-center','py-2','px-3');
    const headerIcon=document.createElement('img');
    headerIcon.src='https://cdn.builtin.com/cdn-cgi/image/f=auto,fit=contain,w=200,h=200,q=100/https://builtin.com/sites/www.builtin.com/files/2022-09/2021_Tealium_icon_rgb_full-color.png';
    headerIcon.style.width='20px';
    headerIcon.style.height='20px';
    headerIcon.style.marginRight='8px';
    const headerTxt=document.createElement('span');
    headerTxt.textContent='MultiTool Beast';
    headerTxt.style.fontWeight='bold';
    headerArea.appendChild(headerIcon);
    headerArea.appendChild(headerTxt);
    wrapper.appendChild(headerArea);

    // tabs nav
    const tabsNav = document.createElement('div');
    tabsNav.classList.add('multitool-tabs');

    const tabBtnProfile=document.createElement('div');
    tabBtnProfile.classList.add('multitool-tab');
    tabBtnProfile.id='tab-btn-profile';
    tabBtnProfile.innerHTML=`<span class="multitool-tab-icon">${personIconSVG}</span> Profile`;
    tabBtnProfile.addEventListener('click',()=>showTab('profile'));

    const tabBtnPinned=document.createElement('div');
    tabBtnPinned.classList.add('multitool-tab');
    tabBtnPinned.id='tab-btn-pinned';
    tabBtnPinned.innerHTML=`<span class="multitool-tab-icon">${pinIconSVG}</span> Pinned`;
    tabBtnPinned.addEventListener('click',()=>showTab('pinned'));

    tabsNav.appendChild(tabBtnProfile);
    tabsNav.appendChild(tabBtnPinned);
    wrapper.appendChild(tabsNav);

    // tab content
    // 1) profile
    tabContentProfile = document.createElement('div');
    tabContentProfile.classList.add('multitool-tab-content');
    tabContentProfile.id='tab-content-profile';

    // We'll do a cardBody approach
    const cardBodyProfile=document.createElement('div');
    cardBodyProfile.classList.add('p-3');

    // row with "Copy Selected" & Slack/JIRA
    const topBodyRow=document.createElement('div');
    topBodyRow.style.display='flex';
    topBodyRow.style.alignItems='center';
    topBodyRow.style.marginBottom='8px';

    const copyAllBtn=document.createElement('button');
    copyAllBtn.id='copy-all-selected-btn';
    copyAllBtn.textContent="Copy Selected";
    copyAllBtn.classList.add('btn','btn-sm','btn-outline-secondary','mr-1','copy-btn');
    copyAllBtn.addEventListener('click',copyAllSelected);
    topBodyRow.appendChild(copyAllBtn);

    const formatGroup=document.createElement('div');
    formatGroup.id='format-toggle-group';

    const slackBtn=document.createElement('button');
    slackBtn.id='format-slack-btn';
    slackBtn.textContent="Slack";
    slackBtn.type='button';
    slackBtn.classList.add('btn','btn-sm','btn-outline-secondary','mr-1');
    slackBtn.classList.add('active');
    slackBtn.addEventListener('click',()=>setFormat('slack'));

    const jiraBtn=document.createElement('button');
    jiraBtn.id='format-jira-btn';
    jiraBtn.textContent="JIRA";
    jiraBtn.type='button';
    jiraBtn.classList.add('btn','btn-sm','btn-outline-secondary');
    jiraBtn.addEventListener('click',()=>setFormat('jira'));

    formatGroup.appendChild(slackBtn);
    formatGroup.appendChild(jiraBtn);
    topBodyRow.appendChild(formatGroup);

    cardBodyProfile.appendChild(topBodyRow);

    // "Include Summary"
    const summaryRow=document.createElement('div');
    summaryRow.classList.add('mb-2');
    const sumCheck=document.createElement('input');
    sumCheck.type='checkbox';
    sumCheck.id='include-summary';
    sumCheck.classList.add('mr-1');
    const sumLbl=document.createElement('label');
    sumLbl.textContent="Include Summary";
    sumLbl.htmlFor='include-summary';
    summaryRow.appendChild(sumCheck);
    summaryRow.appendChild(sumLbl);
    cardBodyProfile.appendChild(summaryRow);

    // The dynamic container
    const profileFieldsContainer=document.createElement('div');
    profileFieldsContainer.id='profile-fields-container';
    cardBodyProfile.appendChild(profileFieldsContainer);

    // We'll define a function to fill that container:
    function fillProfileFields() {
      // Clear
      profileFieldsContainer.innerHTML="";
      // Gather fields
      const tIdVal="#"+currentTicketId;
      const accVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]'));
      const profVal = getFieldValue(document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]'));
      const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]')||{value:""}).value.trim();

      profileFieldsContainer.appendChild(createMenuItem("Ticket ID", tIdVal));
      profileFieldsContainer.appendChild(createMenuItem("Account", accVal));
      profileFieldsContainer.appendChild(createMenuItem("Account Profile", profVal));

      const carrRow = createMenuItem("CARR","Fetching...", false);
      profileFieldsContainer.appendChild(carrRow);

      profileFieldsContainer.appendChild(createMenuItem("Relevant URLs", urlsVal));

      // Copy Account/Profile
      const copyAccBtn=document.createElement('button');
      copyAccBtn.textContent="Copy Account/Profile";
      copyAccBtn.classList.add('btn','btn-sm','btn-outline-secondary','mb-2','copy-btn');
      copyAccBtn.addEventListener('click',()=>{
        const text=accVal+"/"+profVal;
        navigator.clipboard.writeText(text).then(()=>{
          copyAccBtn.textContent="Copied!";
          setTimeout(()=>{ copyAccBtn.textContent="Copy Account/Profile"; },2000);
        });
      });
      profileFieldsContainer.appendChild(copyAccBtn);

      // divider
      const d=document.createElement('hr');
      d.classList.add('my-2');
      profileFieldsContainer.appendChild(d);

      const rHead=document.createElement('div');
      rHead.textContent="Recent Tickets (last 7 days)";
      rHead.style.fontWeight="bold";
      rHead.classList.add('mb-2');
      profileFieldsContainer.appendChild(rHead);

      const recTix = getRecentTickets();
      if (recTix.length>0) {
        recTix.forEach(t=>{
          const td=document.createElement('div');
          td.classList.add('mb-2','pb-2','border-bottom');
          const a=document.createElement('a');
          a.href=t.href;
          a.target="_blank";
          a.textContent=t.subject;
          a.style.color="#007bff";
          a.style.textDecoration="none";
          a.addEventListener('mouseover',()=>{ a.style.textDecoration="underline";});
          a.addEventListener('mouseout',()=>{ a.style.textDecoration="none";});
          td.appendChild(a);

          const cpyBtn=document.createElement('button');
          cpyBtn.classList.add('copy-btn');
          cpyBtn.innerHTML=copyIconSVG;
          cpyBtn.title="Copy Link";
          cpyBtn.addEventListener('click',()=>{
            navigator.clipboard.writeText(t.href).then(()=>{
              cpyBtn.innerHTML=`<span style="color:green;">&#10003;</span>`;
              setTimeout(()=>{ cpyBtn.innerHTML=copyIconSVG;},2000);
            });
          });
          td.appendChild(cpyBtn);

          profileFieldsContainer.appendChild(td);
        });
      } else {
        const noT=document.createElement('div');
        noT.textContent="No tickets in the last 7 days";
        profileFieldsContainer.appendChild(noT);
      }

      // fetch CARR
      fetchCARR(cVal=>{
        const valEl=carrRow.querySelector('.bg-light');
        if (valEl) valEl.textContent=cVal;
      });
    }

    // Actually call fillProfileFields once
    fillProfileFields();

    tabContentProfile.appendChild(cardBodyProfile);

    // 2) pinned tab
    tabContentPinned = document.createElement('div');
    tabContentPinned.classList.add('multitool-tab-content');
    tabContentPinned.id='tab-content-pinned';

    const pinnedBody=document.createElement('div');
    pinnedBody.classList.add('p-3');
    pinnedBody.innerHTML=`<p>Quick Access Grid:</p>`;
    // build pinned items
    const pinnedGrid= document.createElement('div');
    pinnedGrid.id='pinned-grid';

    const pinnedItems=[
      { icon:'📄', label:'Docs', link:'https://docs.google.com/' },
      { icon:'🔗', label:'Website', link:'https://www.example.com' },
      { icon:'📊', label:'Analytics', link:'https://analytics.google.com' },
      { icon:'🚀', label:'Rocket', link:'https://www.spacex.com' },
    ];
    pinnedItems.forEach(it=>{
      const d=document.createElement('div');
      d.classList.add('pinned-btn');
      d.addEventListener('click',()=>window.open(it.link,'_blank'));
      const iSpan=document.createElement('span');
      iSpan.classList.add('pinned-btn-icon');
      iSpan.textContent=it.icon;
      d.appendChild(iSpan);
      const lSpan=document.createElement('span');
      lSpan.textContent=it.label;
      d.appendChild(lSpan);
      pinnedGrid.appendChild(d);
    });

    pinnedBody.appendChild(pinnedGrid);
    tabContentPinned.appendChild(pinnedBody);

    // append the two tabs
    wrapper.appendChild(tabContentProfile);
    wrapper.appendChild(tabContentPinned);

    document.body.appendChild(wrapper);

    // Draggable handle
    const dragHandleBtn=document.createElement('button');
    dragHandleBtn.innerHTML="✋";
    dragHandleBtn.classList.add('btn','btn-light');
    dragHandleBtn.style.background="#b0b0b0";
    dragHandleBtn.style.minWidth="10px";
    dragHandleBtn.style.padding="4px 15px 5px";
    dragHandleBtn.style.position="absolute";
    dragHandleBtn.style.top="-25px";
    dragHandleBtn.style.left="50%";
    dragHandleBtn.style.transform="translateX(-50%)";
    dragHandleBtn.style.cursor="move";
    wrapper.appendChild(dragHandleBtn);

    dragHandleBtn.onmousedown=function(e){
      e.preventDefault();
      let pos3=e.clientX; 
      let pos4=e.clientY;
      document.onmouseup=closeDrag;
      document.onmousemove=dragMove;
      function dragMove(e2){
        e2.preventDefault();
        let pos1=pos3-e2.clientX;
        let pos2=e2.clientY-pos4;
        pos3=e2.clientX;
        pos4=e2.clientY;
        wrapper.style.top=(wrapper.offsetTop+pos2)+"px";
        wrapper.style.left=(wrapper.offsetLeft-pos1)+"px";
      }
      function closeDrag(){
        document.onmouseup=null;
        document.onmousemove=null;
        localStorage.setItem("multitool_position", JSON.stringify({
          top: wrapper.style.top,
          left: wrapper.style.left
        }));
      }
    };

    // Default format is Slack
    setFormat('slack');
    // By default, show no tabs since isOpen is false
    // We'll show them once the user clicks the open button
    console.log("[MultiTool Beast] Done building layout (v1.37.2).");
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',()=>setTimeout(initTool,3000));
  } else {
    setTimeout(initTool,3000);
  }

  // Auto-update if the user navigates to a new ticket
  setInterval(()=>{
    const newId=extractTicketId();
    if (newId && newId!==currentTicketId) {
      console.log("[MultiTool Beast] Ticket changed from", currentTicketId,"to",newId);
      currentTicketId=newId;
      // re-populate if the box is open & the profile tab is active
      const wrapper=document.getElementById("multitool-beast-wrapper");
      if (wrapper && wrapper.style.display!=='none') {
        const profContainer=document.getElementById("profile-fields-container");
        if (profContainer) {
          // re-fill
          profContainer.innerHTML="";
          // re-run fillProfileFields
          fillProfileFields();
        }
      }
    }
  },3000);

})();
