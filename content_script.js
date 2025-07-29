(function() {
  'use strict';

  // Domain checks - used for adaptive content
  const isJira = window.location.hostname.includes("tealium.atlassian.net");
  const isFreshdesk = window.location.hostname.includes("tealium.freshdesk.com") || window.location.hostname === "support.tealiumiq.com";

  console.log(`Running unified MultiTool Beast on domain: ${window.location.hostname}`);
  console.log(`Detected - Jira: ${isJira}, Freshdesk: ${isFreshdesk}`);

  // Skip if not on supported domains
  if (!isJira && !isFreshdesk) {
    console.log("Not on supported domain, skipping initialization");
    return;
  }

  /***************************************************
   * SHARED UTILITY FUNCTIONS
   ***************************************************/

  // Shared utility functions used by both Jira and Freshdesk
  function createMenuItem(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "fieldRow";
    
    const check = document.createElement('input');
    check.type = "checkbox";
    check.checked = true;
    check.className = "field-selector";
    row.appendChild(check);
    
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    row.appendChild(lbl);
    
    const finalVal = valueText || "N/A";
    const valSpan = document.createElement('span');
    valSpan.textContent = finalVal;
    valSpan.className = "fresh-value";
    row.appendChild(valSpan);
    
    if (withCopy) {
      const btn = document.createElement('button');
      btn.className = "sway-btn-icon";
      btn.style.marginLeft = "8px";
      btn.innerHTML = `📋`;
      btn.title = "Copy";
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(finalVal).then(function() {
          btn.innerHTML = `<span style="color: green;">&#10003;</span>`;
          setTimeout(function() { btn.innerHTML = `📋`; }, 2000);
        });
      });
      row.appendChild(btn);
    }
    return row;
  }
  
  function createMenuItemWithClipboard(labelText, valueText, withCopy = true) {
    const row = document.createElement('div');
    row.className = "fieldRow";
    
    const check = document.createElement('input');
    check.type = "checkbox";
    check.checked = true;
    check.className = "field-selector";
    row.appendChild(check);
    
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    row.appendChild(lbl);
    
    const finalVal = valueText || "N/A";
    const valSpan = document.createElement('span');
    valSpan.textContent = finalVal;
    valSpan.className = "fresh-value";
    row.appendChild(valSpan);
    
    if (withCopy) {
      const copyBtn = document.createElement('button');
      copyBtn.className = "sway-btn-icon";
      copyBtn.style.marginLeft = "8px";
      copyBtn.innerHTML = `📋`;
      copyBtn.title = "Copy";
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(finalVal).then(function() {
          copyBtn.innerHTML = `<span style="color: green;">&#10003;</span>`;
          setTimeout(function() { copyBtn.innerHTML = `📋`; }, 2000);
        });
      });
      row.appendChild(copyBtn);
    }

    // Add to clipboard button
    const addBtn = document.createElement('button');
    addBtn.className = "sway-btn-icon";
    addBtn.style.marginLeft = "4px";
    addBtn.style.backgroundColor = "rgba(0, 150, 0, 0.1)";
    addBtn.style.borderColor = "#00a000";
    addBtn.style.color = "#00a000";
    addBtn.innerHTML = `+`;
    addBtn.title = "Add to Clipboard";
    addBtn.addEventListener('click', function() {
      addToClipboard(labelText.replace(':', ''), finalVal);
      addBtn.innerHTML = `<span style="color: green;">&#10003;</span>`;
      setTimeout(function() { addBtn.innerHTML = `+`; }, 1500);
    });
    row.appendChild(addBtn);
    
    return row;
  }

  // Create info-only field without checkbox or buttons
  function createInfoOnlyField(labelText, valueText) {
    const row = document.createElement('div');
    row.className = "fieldRow";
    row.style.opacity = "0.8";
    row.style.fontStyle = "italic";
    
    const lbl = document.createElement('span');
    lbl.textContent = labelText + ": ";
    lbl.className = "fw-bold";
    lbl.style.color = "#666";
    row.appendChild(lbl);
    
    const finalVal = valueText || "N/A";
    const valSpan = document.createElement('span');
    valSpan.textContent = finalVal;
    valSpan.className = "fresh-value";
    valSpan.style.color = "#666";
    row.appendChild(valSpan);
    
    return row;
  }

  // Global clipboard storage - shared across domains
  let clipboardData = [];
  
  // Initialize clipboard data from Chrome storage
  function initializeClipboardData() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['mtb_clipboard_data'], (result) => {
        if (result.mtb_clipboard_data) {
          clipboardData = result.mtb_clipboard_data;
          console.log("Loaded clipboard data from Chrome storage:", clipboardData.length, "items");
          
          // Update localStorage for sync
          localStorage.setItem('mtb_clipboard_data', JSON.stringify(clipboardData));
          
          // Update UI if clipboard tab is visible
          const clipboardContainer = document.getElementById('tab-content-clipboard');
          if (clipboardContainer && clipboardContainer.style.display !== 'none') {
            populateClipboardContent();
          }
        } else {
          // Fallback to localStorage
          clipboardData = loadPref("clipboard_data", []);
        }
      });
    } else {
      // Fallback to localStorage
      clipboardData = loadPref("clipboard_data", []);
    }
  }

  function addToClipboard(label, value) {
    console.log(`📋 addToClipboard called with label: "${label}", value: "${value.substring(0, 50)}..."`);
    console.log(`📋 Current clipboardData length before add: ${clipboardData.length}`);
    
    const item = {
      id: Date.now() + Math.random(), // Unique ID
      label: label,
      value: value,
      timestamp: new Date().toISOString(),
      source: isJira ? 'Jira' : 'Freshdesk',
      domain: window.location.hostname
    };
    
    clipboardData.push(item);
    console.log(`📋 After push, clipboardData length: ${clipboardData.length}`);
    
    savePref("clipboard_data", clipboardData);
    console.log("Added to shared clipboard:", item);
    
    // Notify about the addition
    console.log(`📋 Added "${label}: ${value.substring(0, 30)}..." to shared clipboard (${clipboardData.length} total items)`);
    
    // Update clipboard tab if it's visible on ANY domain
    const clipboardContainer = document.getElementById('tab-content-clipboard');
    if (clipboardContainer) {
      console.log('📋 Clipboard container found, calling populateClipboardContent()');
      
      // Force refresh clipboard content
      setTimeout(() => {
        populateClipboardContent();
        console.log('📋 populateClipboardContent() completed');
      }, 10);
    } else {
      console.log('📋 Clipboard container not found - tab may not be visible');
      
      // Check if clipboard tab exists but isn't active
      const clipboardTab = document.querySelector('[data-tab="clipboard"]');
      if (clipboardTab) {
        console.log('📋 Clipboard tab exists but content container not visible - tab might not be active');
      } else {
        console.log('📋 Clipboard tab doesn\'t exist at all');
      }
    }
  }
  
  // Global preference storage functions - using Chrome storage for cross-domain sharing
  function savePref(key, value) {
    const storageKey = "mtb_" + key;
    
    // Use Chrome storage for cross-domain sharing
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({[storageKey]: value}, () => {
        console.log(`Saved to Chrome storage: ${storageKey}`, value);
      });
    }
    
    // Also save to localStorage as fallback
    localStorage.setItem(storageKey, JSON.stringify(value));
  }
  
  function loadPref(key, defaultVal) {
    const storageKey = "mtb_" + key;
    
    // Try localStorage first for immediate access
    const localValue = localStorage.getItem(storageKey);
    if (localValue) {
      try {
        return JSON.parse(localValue);
      } catch (e) {
        console.warn("Failed to parse localStorage value:", e);
      }
    }
    
    // If Chrome storage is available, sync from it
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([storageKey], (result) => {
        if (result[storageKey] !== undefined) {
          // Update localStorage to sync
          localStorage.setItem(storageKey, JSON.stringify(result[storageKey]));
          // Trigger update if data changed
          updateDataIfChanged(key, result[storageKey]);
        }
      });
    }
    
    return defaultVal;
  }
  
  // Helper function to update UI when data changes (optimized)
  function updateDataIfChanged(key, newValue) {
    console.log(`Optimized update for ${key}`);
    
    // Update relevant UI components based on what data changed
    if (key === 'clipboard_data') {
      clipboardData = newValue || [];
      const clipboardContainer = document.getElementById('tab-content-clipboard');
      if (clipboardContainer && clipboardContainer.style.display !== 'none') {
        console.log("Updating visible clipboard tab");
        populateClipboardContent();
      }
    } else if (key === 'latest_freshdesk_data' || key === 'latest_jira_data') {
      // Only update visible tabs to avoid unnecessary processing
      const profileContainer = document.getElementById('tab-content-profile');
      const jiraContainer = document.getElementById('tab-content-jira');
      const settingsContainer = document.getElementById('tab-content-settings');
      
      if (profileContainer && profileContainer.style.display !== 'none') {
        console.log("Updating visible profile tab");
        populateProfileContent();
      }
      
      if (jiraContainer && jiraContainer.style.display !== 'none') {
        console.log("Updating visible jira tab");
        populateJiraContent();
      }
      
      if (settingsContainer && settingsContainer.style.display !== 'none') {
        console.log("Updating visible settings tab");
        populateSettingsContent();
      }
      
      // Check if we need to add/remove tabs (less frequent)
      if (isTabSwitching) {
        refreshTabsIfNeeded();
      }
    } else if (key === 'agent_email' || key === 'reporting_region' || key === 'reporting_group') {
      // Agent settings changed - update visible tabs that show agent data
      const profileContainer = document.getElementById('tab-content-profile');
      const jiraContainer = document.getElementById('tab-content-jira');
      
      if (profileContainer && profileContainer.style.display !== 'none') {
        console.log("Updating profile tab for agent settings change");
        populateProfileContent();
      }
      
      if (jiraContainer && jiraContainer.style.display !== 'none') {
        console.log("Updating jira tab for agent settings change");
        populateJiraContent();
      }
    }
  }

  /***************************************************
   * PAGE DETECTION FUNCTIONS
   ***************************************************/
  
  function isTicketPage() {
    return /\/a\/tickets\/\d+/.test(window.location.pathname);
  }
  

  
  function isJiraIssuePage() {
    return /\/browse\/[A-Z]+-\d+/.test(window.location.pathname);
  }
  
  function extractTicketId() {
    const match = window.location.pathname.match(/\/a\/tickets\/(\d+)/);
    return match ? match[1] : null;
  }
  
  function extractJiraIssueId() {
    const matchFromUrl = window.location.pathname.match(/\/browse\/([A-Z0-9]+-[0-9]+)/);
    if (matchFromUrl) {
      return matchFromUrl[1];
    }
    
    const issueKeyElement = document.querySelector('[data-test-id="issue.views.issue-base.foundation.key.heading"]');
    if (issueKeyElement) {
      return issueKeyElement.textContent.trim();
    }
    
    return null;
  }
  
  /***************************************************
   * CSS INJECTION
   ***************************************************/
  
  function injectCSS() {
    if (document.getElementById("multitool-beast-css")) return;
    const style = document.createElement('style');
    style.id = "multitool-beast-css";
    style.innerHTML = `
      /* Unified MultiTool Beast Styles */
:root {
  --light-panel-bg: #fffaf5;  
  --light-panel-fg: #2f2f2f;
  --light-panel-border: #d1ccc9;
  
  --dark-panel-bg: #1a1a1a;
  --dark-panel-fg: #f0f0f0;
  --dark-panel-border: #404040;
  
  --tab-bg: #e8f1fa;
  --tab-border: #b3d4f0; 
  --tab-fg: #14425c;    
  --tab-active-bg: #d3eafc; 
  --tab-active-border: #91c7f3;
  --tab-active-fg: #0f2d3f;
  
  --dark-tab-bg: #2a2a2a;
  --dark-tab-border: #505050;
  --dark-tab-fg: #e0e0e0;
  --dark-tab-active-bg: #4a90e2;
  --dark-tab-active-border: #6ba3f5;
  --dark-tab-active-fg: #ffffff;
}

/* Mode-specific variables */
#multitool-beast-wrapper:not(.dark-mode) {
  --panel-bg: var(--light-panel-bg);
  --panel-fg: var(--light-panel-fg);
  --panel-border: var(--light-panel-border);
  --current-tab-bg: var(--tab-bg);
  --current-tab-border: var(--tab-border);
  --current-tab-fg: var(--tab-fg);
  --current-tab-active-bg: var(--tab-active-bg);
  --current-tab-active-border: var(--tab-active-border);
  --current-tab-active-fg: var(--tab-active-fg);
}

#multitool-beast-wrapper.dark-mode {
  --panel-bg: var(--dark-panel-bg);
  --panel-fg: var(--dark-panel-fg);
  --panel-border: var(--dark-panel-border);
  --current-tab-bg: var(--dark-tab-bg);
  --current-tab-border: var(--dark-tab-border);
  --current-tab-fg: var(--dark-tab-fg);
  --current-tab-active-bg: var(--dark-tab-active-bg);
  --current-tab-active-border: var(--dark-tab-active-border);
  --current-tab-active-fg: var(--dark-tab-active-fg);
}

      /* Main Panel - Unified ID */
#multitool-beast-wrapper {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 380px;
  height: 600px;
        min-width: 280px;
        min-height: 300px;
        max-width: 800px;
        max-height: 90vh;
        background-color: var(--panel-bg);
  color: var(--panel-fg);
        border: 1px solid var(--panel-border);
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        z-index: 2147483647;
  display: none;
  overflow-y: auto;
  transition: box-shadow 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        resize: both;
      }

/* Dark mode wrapper */
#multitool-beast-wrapper.dark-mode {
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
}

      /* Resize handle styling */
      #multitool-beast-wrapper::after {
        content: "";
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        background: linear-gradient(-45deg, transparent 0%, transparent 30%, var(--panel-border) 30%, var(--panel-border) 35%, transparent 35%, transparent 65%, var(--panel-border) 65%, var(--panel-border) 70%, transparent 70%);
        pointer-events: none;
        border-bottom-right-radius: 16px;
}

/* Dark mode resize handle */
#multitool-beast-wrapper.dark-mode::after {
  background: linear-gradient(-45deg, transparent 0%, transparent 30%, #606060 30%, #606060 35%, transparent 35%, transparent 65%, #606060 65%, #606060 70%, transparent 70%);
}

/* While dragging */
#multitool-beast-wrapper.dragging {
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  z-index: 9999999;
}

/* Dark mode dragging */
#multitool-beast-wrapper.dark-mode.dragging {
  box-shadow: 0 8px 30px rgba(0,0,0,0.8);
}

/* Drag handle */
.drag-handle {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 10px;
  background-color: var(--panel-border);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  z-index: 10000;
  pointer-events: all;
}

/* Top Bar */
.mtb-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--panel-border);
  margin-bottom: 4px;
}

.mtb-top-bar-left,
.mtb-top-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Circle buttons */
.circle-btn {
  width: 30px;
  height: 30px;
  background-color: #f5f5f5;
  border: 1px solid #d0d0d0;
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, box-shadow 0.15s;
}
.circle-btn:hover {
  background-color: #e9e9e9;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.close-btn {
  background-color: #ffe5e5;
  border: 1px solid #ffaaaa;
  color: #cc0000;
}
.close-btn:hover {
  background-color: #ffd6d6;
}

/* Dark mode circle buttons */
#multitool-beast-wrapper.dark-mode .circle-btn {
  background-color: #3a3a3a;
  border-color: #555;
  color: #e0e0e0;
}

#multitool-beast-wrapper.dark-mode .circle-btn:hover {
  background-color: #4a4a4a;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

#multitool-beast-wrapper.dark-mode .close-btn {
  background-color: #4a2626;
  border-color: #664444;
  color: #ff6b6b;
}

#multitool-beast-wrapper.dark-mode .close-btn:hover {
  background-color: #5a3030;
}

/* Theme toggle */
.theme-toggle-wrapper {
  position: relative;
  width: 44px;
  height: 22px;
}
.theme-toggle {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.theme-toggle + label {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, #f1c40f 0%, #9b59b6 100%);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.3s;
}
.theme-toggle + label:before {
  content: "";
  position: absolute;
  top: 1px;
  left: 1px;
  width: 20px;
  height: 20px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
}
.toggle-icon {
  position: absolute;
  width: 14px;
  height: 14px;
  top: 3px;
  color: #fff;
}
.toggle-icon--moon {
  left: 4px;
}
.toggle-icon--sun {
  right: 4px;
}
.theme-toggle:checked + label:before {
  transform: translateX(22px);
}

      /* Header */
.mtb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  gap: 8px;
  position: relative;
  border-bottom: 1px solid var(--panel-border);
  margin-bottom: 4px;
  overflow: hidden;
}

.mtb-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mtb-header-right {
  display: flex;
  align-items: center;
}

.mtb-search-input {
  padding: 4px 8px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: var(--panel-bg);
  color: var(--panel-fg);
  font-size: 12px;
  width: 120px;
  outline: none;
  transition: all 0.2s ease;
}

.mtb-search-input:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
  width: 150px;
}

.mtb-search-input::placeholder {
  color: #999;
}
.mtb-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 18px;
  background: linear-gradient(to bottom, transparent, #ebeff3a8);
}
.mtb-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.mtb-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--panel-fg);
}

/* Dark mode header improvements */
#multitool-beast-wrapper.dark-mode .mtb-header::after {
  background: linear-gradient(to bottom, transparent, rgba(26, 26, 26, 0.8));
}

#multitool-beast-wrapper.dark-mode .mtb-title {
  color: #f0f0f0;
}

#multitool-beast-wrapper.dark-mode .mtb-search-input {
  background: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

#multitool-beast-wrapper.dark-mode .mtb-search-input:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
}

#multitool-beast-wrapper.dark-mode .mtb-search-input::placeholder {
  color: #888;
}



/* Main content area */
.mtb-content {
  padding: 8px 12px;
}

/* Tabs row */
.mtb-tabs {
  display: flex;
  gap: 8px;
  margin: 0 0 8px 0;
  padding: 0;
  list-style: none;
  justify-content: flex-start;
}
.mtb-tab {
  padding: 6px 12px;
  border-radius: 12px;
  background-color: var(--current-tab-bg);
  color: var(--current-tab-fg);
  border: 1px solid var(--current-tab-border);
  cursor: pointer;
  transition: background-color 0.15s, box-shadow 0.15s;
        display: flex;
        align-items: center;
        gap: 6px;
}
.mtb-tab:hover {
  background-color: #eef7ff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.mtb-tab.active {
  background-color: var(--current-tab-active-bg);
  border-color: var(--current-tab-active-border);
  color: var(--current-tab-active-fg);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* Dark mode tab hover */
#multitool-beast-wrapper.dark-mode .mtb-tab:hover {
  background-color: #3a3a3a;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

#multitool-beast-wrapper.dark-mode .mtb-tab.active {
  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}

/* Hide tab content */
.tab-content {
  display: none;
        padding: 10px;
        border-radius: 4px;
}

/* Section blocks */
.mtb-section {
  background-color: rgba(0,0,0,0.02);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}

/* Dark mode section improvements */
#multitool-beast-wrapper.dark-mode .mtb-section {
  background-color: rgba(255,255,255,0.03);
  border-color: #505050;
}

/* Dark mode section color overrides */
#multitool-beast-wrapper.dark-mode .mtb-section[style*="rgba(150, 0, 150, 0.1)"] {
  background-color: rgba(147, 112, 219, 0.15) !important;
  border-color: #8a7ca8 !important;
}

#multitool-beast-wrapper.dark-mode .mtb-section[style*="rgba(100, 150, 200, 0.1)"] {
  background-color: rgba(100, 150, 200, 0.15) !important;
  border-color: #6495ed !important;
}

#multitool-beast-wrapper.dark-mode .mtb-section[style*="rgba(0, 200, 0, 0.1)"] {
  background-color: rgba(46, 125, 50, 0.2) !important;
  border-color: #4caf50 !important;
}

#multitool-beast-wrapper.dark-mode .mtb-section[style*="rgba(255, 165, 0, 0.1)"] {
  background-color: rgba(255, 152, 0, 0.15) !important;
  border-color: #ff9800 !important;
}

#multitool-beast-wrapper.dark-mode .mtb-section[style*="rgba(0, 100, 200, 0.1)"] {
  background-color: rgba(33, 150, 243, 0.15) !important;
  border-color: #2196f3 !important;
}

/* Field rows */
.fieldRow {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--panel-border);
  color: var(--panel-fg);
}
.fieldRow:last-child {
  border-bottom: none;
}

/* Dark mode field rows */
#multitool-beast-wrapper.dark-mode .fieldRow {
  color: #f0f0f0;
}

/* Dark mode text improvements */
#multitool-beast-wrapper.dark-mode .fw-bold,
#multitool-beast-wrapper.dark-mode span,
#multitool-beast-wrapper.dark-mode div {
  color: inherit;
}

#multitool-beast-wrapper.dark-mode h3,
#multitool-beast-wrapper.dark-mode h4,
#multitool-beast-wrapper.dark-mode .sidebar__title_text,
#multitool-beast-wrapper.dark-mode .text--xsmall {
  color: #f0f0f0 !important;
}

      /* Value styling */
.fresh-value {
  background-color: rgba(0,0,0,0.05);
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 500;
  color: var(--panel-fg);
}
/* Dark mode value styling */
#multitool-beast-wrapper.dark-mode .fresh-value {
  background-color: rgba(255,255,255,0.08);
  color: #f0f0f0;
}

      /* Button styles */
.sway-btn-text {
  padding: 6px 12px;
  border-radius: 12px;
  background-color: var(--current-tab-bg);
  color: var(--current-tab-fg);
  border: 1px solid var(--current-tab-border);
  cursor: pointer;
  transition: background-color 0.15s, box-shadow 0.15s;
  font-size: 14px;
}
.sway-btn-text:hover {
  background-color: #eef7ff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* Dark mode button styling */
#multitool-beast-wrapper.dark-mode .sway-btn-text {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border-color: #505050;
}

#multitool-beast-wrapper.dark-mode .sway-btn-text:hover {
  background-color: #3a3a3a;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.sway-btn-icon {
  background-color: transparent;
  border: 1px solid var(--current-tab-border);
  color: var(--panel-fg);
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.15s, box-shadow 0.15s;
}
.sway-btn-icon:hover {
  background-color: rgba(0,0,0,0.05);
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* Dark mode icon button styling */
#multitool-beast-wrapper.dark-mode .sway-btn-icon {
  border-color: #505050;
  color: #e0e0e0;
}

#multitool-beast-wrapper.dark-mode .sway-btn-icon:hover {
  background-color: rgba(255,255,255,0.08);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

/* Dark mode special button styling */
#multitool-beast-wrapper.dark-mode .sway-btn-icon[style*="background-color: rgba(0, 150, 0"] {
  background-color: rgba(76, 175, 80, 0.2) !important;
  border-color: #4caf50 !important;
  color: #81c784 !important;
}

#multitool-beast-wrapper.dark-mode .sway-btn-icon[style*="background-color: rgba(255, 0, 0"] {
  background-color: rgba(244, 67, 54, 0.2) !important;
  border-color: #f44336 !important;
  color: #e57373 !important;
}

/* Dark mode text color overrides */
#multitool-beast-wrapper.dark-mode [style*="color: #666"] {
  color: #b0b0b0 !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #999"] {
  color: #b0b0b0 !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #9600aa"] {
  color: #c679d1 !important;
}

/* Dark mode button background overrides */
#multitool-beast-wrapper.dark-mode button[style*="background-color: #f5f5f5"],
#multitool-beast-wrapper.dark-mode button[style*="background-color: #f0f0f0"] {
  background-color: #3a3a3a !important;
  color: #e0e0e0 !important;
  border-color: #505050 !important;
}

#multitool-beast-wrapper.dark-mode button[style*="background-color: #ffe5e5"],
#multitool-beast-wrapper.dark-mode button[style*="background-color: #f0e6e6"] {
  background-color: #4a2626 !important;
  color: #ff9999 !important;
  border-color: #664444 !important;
}

#multitool-beast-wrapper.dark-mode button[style*="background-color: #fff2e6"] {
  background-color: #4a3a26 !important;
  color: #ffcc99 !important;
  border-color: #664d33 !important;
}

#multitool-beast-wrapper.dark-mode button[style*="background-color: #e6f3ff"] {
  background-color: #264a5a !important;
  color: #99ccff !important;
  border-color: #335566 !important;
}

/* Dark mode general button styling */
#multitool-beast-wrapper.dark-mode button {
  color: #e0e0e0;
  border-color: #505050;
}

#multitool-beast-wrapper.dark-mode button:not([style*="background-color"]) {
  background-color: #3a3a3a !important;
}

#multitool-beast-wrapper.dark-mode button:hover {
  background-color: #4a4a4a !important;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
}

/* Dark mode specific button color overrides */
#multitool-beast-wrapper.dark-mode button[style*="background-color: #e6ffe6"] {
  background-color: #2a4a2a !important;
  color: #80cc80 !important;
}

#multitool-beast-wrapper.dark-mode button[style*="background-color: #ddf4ff"] {
  background-color: #2a3a4a !important;
  color: #80b3ff !important;
  border-color: #4a90e2 !important;
}

/* Font size button selected state (more specific) */
#multitool-beast-wrapper.dark-mode button[style*="background-color: #ddf4ff"][style*="border-color: #0366d6"] {
  background-color: #2a3a4a !important;
  color: #80b3ff !important;
  border-color: #4a90e2 !important;
}

/* Extra specific rule for sway-btn-text with selected state */
#multitool-beast-wrapper.dark-mode .sway-btn-text[style*="background-color: #ddf4ff"] {
  background-color: #2a3a4a !important;
  color: #80b3ff !important;
  border-color: #4a90e2 !important;
}

/* Maximum specificity for font size buttons */
#multitool-beast-wrapper.dark-mode .sway-btn-text[style*="background-color: #ddf4ff"][style*="border-color: #0366d6"] {
  background-color: #2a3a4a !important;
  color: #80b3ff !important;
  border-color: #4a90e2 !important;
}

#multitool-beast-wrapper.dark-mode button[style*="background-color: #4caf50"] {
  background-color: #2e7d32 !important;
  color: #e8f5e8 !important;
}

/* Dark mode header text colors */
#multitool-beast-wrapper.dark-mode [style*="color: #4a90e2"] {
  color: #6bb3ff !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #00aa00"],
#multitool-beast-wrapper.dark-mode [style*="color: #006600"],
#multitool-beast-wrapper.dark-mode [style*="color: #00a000"] {
  color: #66cc66 !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #cc7700"] {
  color: #ffb366 !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #cc0000"] {
  color: #ff6666 !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #0066cc"] {
  color: #6699ff !important;
}

/* Dark mode background color overrides for sections */
#multitool-beast-wrapper.dark-mode [style*="background-color: rgba(0,0,0,0.03)"] {
  background-color: rgba(255,255,255,0.05) !important;
}

#multitool-beast-wrapper.dark-mode [style*="background-color: rgba(0,0,0,0.1)"] {
  background-color: rgba(255,255,255,0.08) !important;
}

/* Dark mode span styling */
#multitool-beast-wrapper.dark-mode span[style*="background-color: rgba(0,0,0,0.1)"] {
  background-color: rgba(255,255,255,0.1) !important;
  color: #c0c0c0 !important;
}

/* Dark mode comprehensive text overrides */
#multitool-beast-wrapper.dark-mode .mtb-content,
#multitool-beast-wrapper.dark-mode .tab-content,
#multitool-beast-wrapper.dark-mode p,
#multitool-beast-wrapper.dark-mode div,
#multitool-beast-wrapper.dark-mode span:not(.toggle-icon) {
  color: #e0e0e0;
}

/* Dark mode input and select styling */
#multitool-beast-wrapper.dark-mode input,
#multitool-beast-wrapper.dark-mode select {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #505050 !important;
}

#multitool-beast-wrapper.dark-mode input:focus,
#multitool-beast-wrapper.dark-mode select:focus {
  background-color: #3a3a3a !important;
  border-color: #6bb3ff !important;
}

/* Dark mode headers and emphasized text */
#multitool-beast-wrapper.dark-mode h1,
#multitool-beast-wrapper.dark-mode h2,
#multitool-beast-wrapper.dark-mode h3,
#multitool-beast-wrapper.dark-mode h4,
#multitool-beast-wrapper.dark-mode h5,
#multitool-beast-wrapper.dark-mode h6 {
  color: #f0f0f0 !important;
}

#multitool-beast-wrapper.dark-mode strong,
#multitool-beast-wrapper.dark-mode b {
  color: #f0f0f0 !important;
}

/* Dark mode link styling */
#multitool-beast-wrapper.dark-mode a {
  color: #6bb3ff !important;
}

#multitool-beast-wrapper.dark-mode a:hover {
  color: #8cc8ff !important;
}

/* Dark mode specific button text patterns */
#multitool-beast-wrapper.dark-mode button:contains("Clear All"),
#multitool-beast-wrapper.dark-mode button:contains("Copy Selected"),
#multitool-beast-wrapper.dark-mode button:contains("Auto-Populate") {
  background-color: #3a3a3a !important;
  color: #e0e0e0 !important;
  border-color: #505050 !important;
}

/* Dark mode for clipboard item styling */
#multitool-beast-wrapper.dark-mode .clipboard-item {
  background-color: #2a2a2a !important;
  border-color: #505050 !important;
  color: #e0e0e0 !important;
}

/* Dark mode warning and info text */
#multitool-beast-wrapper.dark-mode [style*="font-style: italic"] {
  color: #b0b0b0 !important;
}

/* Dark mode catch-all for any missed text elements */
#multitool-beast-wrapper.dark-mode * {
  /* Ensure no text is invisible in dark mode */
  color: inherit;
}

/* Override any remaining light text that might be hard to read */
#multitool-beast-wrapper.dark-mode [style*="color: black"],
#multitool-beast-wrapper.dark-mode [style*="color: #000"],
#multitool-beast-wrapper.dark-mode [style*="color: #333"] {
  color: #e0e0e0 !important;
}

#multitool-beast-wrapper.dark-mode [style*="color: #555"],
#multitool-beast-wrapper.dark-mode [style*="color: #777"],
#multitool-beast-wrapper.dark-mode [style*="color: #888"] {
  color: #c0c0c0 !important;
}

/* Ensure all text in sections is visible */
#multitool-beast-wrapper.dark-mode .mtb-section * {
  color: #e0e0e0;
}

      /* Open button style */
#sway-open-btn {
  position: fixed;
        bottom: 0;
        right: 20px;
        z-index: 999999;
  width: 60px;
  height: 40px;
        background-color: #ffffff;
        border: 2px solid #d1ccc9;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.2s ease;
        display: none;
}

#sway-open-btn:hover {
  transform: translateY(-5px);
}
      #sway-open-btn img {
        width: 40px; 
        height: 40px; 
        object-fit: contain;
      }

      /* Force open button (backup) */
      #sway-force-open-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483646;
        width: 40px;
        height: 40px;
        border-radius: 20px;
        background-color: #ffffff;
        border: 2px solid #0073cf;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        cursor: pointer;
        padding: 5px;
        display: none;
        align-items: center;
        justify-content: center;
      }

      /* Hidden sections for domain-specific content */
      .jira-only {
        display: ${isJira ? 'block' : 'none'};
      }
      
      .freshdesk-only {
        display: ${isFreshdesk ? 'block' : 'none'};
      }

      /* Clipboard description styling */
      .clipboard-description {
        color: #666;
      }

      #multitool-beast-wrapper.dark-mode .clipboard-description {
        color: #e0e0e0 !important;
      }

      /* Field Selection styling */
      .mtb-field-selection-container {
        border: 1px solid #ddd;
        background-color: rgba(0, 123, 255, 0.05);
      }

      #multitool-beast-wrapper.dark-mode .mtb-field-selection-container {
        border: 1px solid #555 !important;
        background-color: rgba(70, 130, 200, 0.15) !important;
      }

      .mtb-field-selection-header {
        color: #0366d6;
      }

      #multitool-beast-wrapper.dark-mode .mtb-field-selection-header {
        color: #80b3ff !important;
      }

      .mtb-field-selection-description {
        color: #666;
      }

      #multitool-beast-wrapper.dark-mode .mtb-field-selection-description {
        color: #e0e0e0 !important;
      }

      /* Field labels in dark mode */
      #multitool-beast-wrapper.dark-mode .mtb-field-selection-container label {
        color: #e0e0e0 !important;
      }

      /* General bold labels in settings for dark mode */
      #multitool-beast-wrapper.dark-mode div[style*="font-weight: bold"], 
      #multitool-beast-wrapper.dark-mode .mtb-field-selection-container h5 {
        color: #e0e0e0 !important;
      }

      /* Agent Settings header */
      .mtb-agent-header {
        color: #4a90e2;
      }

      #multitool-beast-wrapper.dark-mode .mtb-agent-header {
        color: #80b3ff !important;
      }

      /* Text Selection description */
      .mtb-text-selection-description {
        color: #666;
      }

      #multitool-beast-wrapper.dark-mode .mtb-text-selection-description {
        color: #e0e0e0 !important;
      }

      /* Time Tracker Checker container styling */
      .mtb-time-tracker-container {
        background-color: #f8f9fa;
        border: 1px solid #d3d3d3;
      }

      #multitool-beast-wrapper.dark-mode .mtb-time-tracker-container {
        background-color: #2a2a2a !important;
        border: 1px solid #505050 !important;
      }

      .mtb-time-tracker-description {
        color: #666;
      }

      #multitool-beast-wrapper.dark-mode .mtb-time-tracker-description {
        color: #e0e0e0 !important;
      }

      /* Time Tracker Notification Styles */
      .mtb-time-tracker-notification {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #ff6b6b;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        z-index: 2147483648;
        min-width: 400px;
        max-width: 500px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: mtbNotificationSlideIn 0.3s ease-out;
      }

      @keyframes mtbNotificationSlideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -60%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }

      .mtb-time-tracker-notification-header {
        background: #ff6b6b;
        color: white;
        padding: 16px 20px;
        border-radius: 10px 10px 0 0;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .mtb-time-tracker-notification-icon {
        width: 24px;
        height: 24px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ff6b6b;
        font-weight: bold;
        font-size: 14px;
      }

      .mtb-time-tracker-notification-body {
        padding: 20px;
      }

      .mtb-time-tracker-notification-message {
        color: #333;
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 20px;
      }

      .mtb-time-tracker-notification-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .mtb-time-tracker-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .mtb-time-tracker-btn-primary {
        background: #4a90e2;
        color: white;
      }

      .mtb-time-tracker-btn-primary:hover {
        background: #357abd;
        transform: translateY(-1px);
      }

      .mtb-time-tracker-btn-secondary {
        background: #f8f9fa;
        color: #666;
        border: 1px solid #ddd;
      }

      .mtb-time-tracker-btn-secondary:hover {
        background: #e9ecef;
        color: #495057;
      }

      /* Dark mode support for notification */
      @media (prefers-color-scheme: dark) {
        .mtb-time-tracker-notification {
          background: #2a2a2a;
          border-color: #ff6b6b;
        }
        
        .mtb-time-tracker-notification-message {
          color: #e0e0e0;
        }
        
        .mtb-time-tracker-btn-secondary {
          background: #404040;
          color: #e0e0e0;
          border-color: #606060;
        }
        
        .mtb-time-tracker-btn-secondary:hover {
          background: #505050;
        }
      }

      `;
      document.head.appendChild(style);
    }

    /***************************************************
   * THEME FUNCTIONS
     ***************************************************/
  
    function applyTheme(theme) {
      const wrapper = document.getElementById("multitool-beast-wrapper");
      if (wrapper) {
        console.log(`🎨 Applying theme: ${theme}`);
        if (theme === "dark") {
          wrapper.classList.add("dark-mode");
        } else {
          wrapper.classList.remove("dark-mode");
        }
        
        // Update toggle checkbox to match current theme
        const themeToggle = document.getElementById("theme-toggle");
        if (themeToggle) {
          themeToggle.checked = (theme === "dark");
        }

        // Update font size button colors after theme change
        updateFontSizeButtonColors();
      } else {
        console.log(`⚠️ Could not apply theme ${theme} - wrapper not found`);
      }
    }

    // Function to update font size button colors when theme changes
    function updateFontSizeButtonColors() {
      // Find the currently selected font size button and update its colors
      const fontSizeButtons = document.querySelectorAll('#multitool-beast-wrapper .sway-btn-text');
      const currentFontSize = loadPref("mtb_fontSize", 14);
      
      fontSizeButtons.forEach(btn => {
        if (btn.textContent === currentFontSize + 'px') {
          // This is the selected button, apply theme-aware colors
          applySelectedFontSizeStateGlobal(btn);
        }
      });
    }

    // Global version of the font size color helper functions for theme updates
    function getSelectedFontSizeColorsGlobal() {
      const wrapper = document.getElementById("multitool-beast-wrapper");
      const isDarkMode = wrapper && wrapper.classList.contains("dark-mode");
      
      if (isDarkMode) {
        return {
          backgroundColor: '#2a3a4a',
          borderColor: '#4a90e2',
          color: '#80b3ff'
        };
      } else {
        return {
          backgroundColor: '#ddf4ff',
          borderColor: '#0366d6',
          color: ''
        };
      }
    }

    function applySelectedFontSizeStateGlobal(button) {
      const colors = getSelectedFontSizeColorsGlobal();
      button.style.backgroundColor = colors.backgroundColor;
      button.style.borderColor = colors.borderColor;
      if (colors.color) {
        button.style.color = colors.color;
      } else {
        button.style.color = '';
      }
    }
  
    function initTheme() {
      const storedTheme = loadPref("theme", "light");
      console.log(`🎨 Initializing theme: ${storedTheme}`);
      applyTheme(storedTheme);
    }
  
    function toggleTheme(force) {
      let current = loadPref("theme", "light");
      let newTheme = force ? force : (current === "dark" ? "light" : "dark");
      console.log(`🎨 Toggling theme: ${current} → ${newTheme}`);
      savePref("theme", newTheme);
      applyTheme(newTheme);
    }

    /***************************************************
   * TAB SWITCHING
     ***************************************************/
  
    function showTab(which) {
    console.log(`Switching to tab: ${which}`);
    isTabSwitching = true;
    
    const availableTabs = getAvailableTabs();
    
    availableTabs.forEach(id => {
        const contentEl = document.getElementById("tab-content-" + id);
        const tabEl = document.getElementById("tab-btn-" + id);
        if (!contentEl || !tabEl) return;
      
        if (id === which) {
          contentEl.style.display = "block";
          tabEl.classList.add("active");
        } else {
          contentEl.style.display = "none";
          tabEl.classList.remove("active");
        }
      });
    
    // Populate content when switching tabs (only when actively switching)
    if (which === 'profile') {
      populateProfileContent();
    } else if (which === 'jira') {
      populateJiraContent();
      // Start monitoring for modal fields when Jira tab is active
      if (isJira) {
        startModalMonitoring();
      }
    } else if (which === 'clipboard') {
      populateClipboardContent();
    } else if (which === 'settings') {
      populateSettingsContent();
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isTabSwitching = false;
    }, 100);
  }

  function getAvailableTabs() {
    // Return tabs based on current domain and page type
    let tabs = ['settings']; // Settings always available
    
    // Always add clipboard tab as second to last (before settings)
    tabs.splice(-1, 0, 'clipboard');
    
    // Show profile tab for Freshdesk data only (live or stored)
    const shouldShowProfile = (isFreshdesk && isTicketPage()) || 
                             (isJira && hasStoredFreshdeskData());
    
    if (shouldShowProfile) {
      tabs.unshift('profile'); // Add profile as first tab
      console.log("Profile tab added - Freshdesk ticket:", isFreshdesk && isTicketPage(), 
                 "Stored Freshdesk data:", hasStoredFreshdeskData());
    }
    
    // Jira tab is always available but content varies by domain
    tabs.splice(-2, 0, 'jira'); // Add jira tab before clipboard and settings
    
    console.log("Available tabs:", tabs);
    return tabs;
  }

  function hasStoredFreshdeskData() {
    // Check if we have recent Freshdesk data stored
    const storedData = loadPref("latest_freshdesk_data", null);
    console.log("DEBUG: Checking stored Freshdesk data:", storedData);
    
    if (!storedData) {
      console.log("DEBUG: No stored Freshdesk data found");
      return false;
    }
    
    if (!storedData.timestamp) {
      console.log("DEBUG: No timestamp in stored data");
      return false;
    }
    
    // Consider data fresh for 24 hours
    const now = new Date().getTime();
    const dataAge = now - new Date(storedData.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    const isFresh = dataAge < maxAge;
    console.log(`DEBUG: Freshdesk data age: ${Math.floor(dataAge / (60 * 1000))} minutes, fresh: ${isFresh}`);
    console.log(`DEBUG: Data contains: ticketId=${storedData.ticketId}, account=${storedData.account}`);
    return isFresh;
  }

  function hasStoredJiraData() {
    // Check if we have recent Jira data stored
    const storedData = loadPref("latest_jira_data", null);
    console.log("Checking stored Jira data:", storedData);
    if (!storedData || !storedData.timestamp) {
      console.log("No stored Jira data or timestamp");
      return false;
    }
    
    // Consider data fresh for 24 hours
    const now = new Date().getTime();
    const dataAge = now - new Date(storedData.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    const isFresh = dataAge < maxAge;
    console.log(`Jira data age: ${Math.floor(dataAge / (60 * 1000))} minutes, fresh: ${isFresh}`);
    return isFresh;
  }

  /***************************************************
   * SVG ICONS
   ***************************************************/
  
  const moonIconSVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9 9 0 1 0 20.354 15.354z"></path>
  </svg>`;
  
  const sunIconSVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5"></circle>
    <path d="M12 1v2"></path>
    <path d="M12 21v2"></path>
    <path d="M4.22 4.22l1.42 1.42"></path>
    <path d="M18.36 18.36l1.42 1.42"></path>
    <path d="M1 12h2"></path>
    <path d="M21 12h2"></path>
    <path d="M4.22 19.78l1.42-1.42"></path>
    <path d="M18.36 5.64l1.42-1.42"></path>
  </svg>`;
  
  const personIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path d="M2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"/>
  </svg>`;
  
  const jiraIconSVG = `
  <svg viewBox="0 0 16 16" width="16" height="16" style="fill:currentColor;vertical-align:text-top">
    <path d="M11.87 8L8 11.87 4.13 8 8 4.13 11.87 8z"></path>
    <path d="M14.67 8L8 14.67 1.33 8 8 1.33 14.67 8zM8 16c-0.3 0-0.59-0.11-0.81-0.33l-6.86-6.86c-0.44-0.44-0.44-1.17 0-1.61l6.86-6.86c0.44-0.44 1.17-0.44 1.61 0l6.86 6.86c0.44 0.44 0.44 1.17 0 1.61l-6.86 6.86c-0.22 0.22-0.51 0.33-0.81 0.33z"></path>
  </svg>`;
  
  const settingsIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255-.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
  </svg>`;

  const clipboardIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
  </svg>`;

  /***************************************************
   * AGENT SETTINGS FUNCTIONS
   ***************************************************/
   
  function createAgentSettingsSection() {
    const agentEmail = loadPref('agent_email', '');
    const reportingGroup = loadPref('reporting_group', '');
    
    // Only create section if at least one setting is configured
    if (!agentEmail && !reportingGroup) {
      return null;
    }
    
    const agentSection = document.createElement('div');
    agentSection.className = "mtb-section";
    agentSection.style.backgroundColor = "rgba(100, 150, 200, 0.1)";
    agentSection.style.borderColor = "#4a90e2";
    
    const agentHeader = document.createElement('h3');
    agentHeader.style.fontSize = "16px";
    agentHeader.style.marginBottom = "12px";
    agentHeader.className = "mtb-agent-header";
    agentHeader.innerHTML = `👤 Agent Settings`;
    agentSection.appendChild(agentHeader);
    
    if (agentEmail) {
      agentSection.appendChild(createMenuItemWithClipboard("Agent Email", agentEmail));
    }
    
    if (reportingGroup) {
      agentSection.appendChild(createMenuItemWithClipboard("Reporting Group", reportingGroup));
    }
    
    return agentSection;
  }

  /***************************************************
   * CONTENT POPULATION FUNCTIONS
   ***************************************************/
  
  function populateProfileContent() {
    const container = document.getElementById('tab-content-profile');
    if (!container) {
      console.log("DEBUG: Profile container not found");
      return;
    }
    
    console.log(`DEBUG: Populating Profile content - URL: ${location.href}`);
    container.innerHTML = "";
    
    // Determine what data to show - Profile tab is for Freshdesk data only
    const isLiveFreshdesk = isFreshdesk && isTicketPage();
    const hasStoredFreshdesk = hasStoredFreshdeskData();
    
    console.log(`DEBUG: isLiveFreshdesk: ${isLiveFreshdesk}, hasStoredFreshdesk: ${hasStoredFreshdesk}, isJira: ${isJira}`);
    
    if (isLiveFreshdesk) {
      // Live Freshdesk data - extract from current page
      console.log("DEBUG: Showing live Freshdesk data");
      populateLiveFreshdeskData(container);
    } else if (hasStoredFreshdesk && isJira) {
      // Stored Freshdesk data - load from storage for Jira viewing
      console.log("DEBUG: Showing stored Freshdesk data on Jira");
      populateStoredFreshdeskData(container);
    } else {
      console.log("DEBUG: No data to show in Profile tab");
    }
  }
  
  let carrFetched = false; // Prevent multiple CARR fetches
  let lastTicketId = null; // Track ticket changes

  // Variables to track navigation and time tracking state
  let currentTicketUrl = null;
  let timeTrackerNotificationVisible = false;
  let previousTicketUrl = null;
  let previousTicketHadMissingTime = false;
  
  // Function to handle URL changes and check for missing time tracking
  function handleUrlChange() {
    if (!isFreshdesk || !loadPref('mtb_timeTrackerEnabled', true)) return;
    
    const currentUrl = window.location.href;
    console.log('⏰ URL Change detected:', {
      from: currentTicketUrl,
      to: currentUrl,
      wasOnTicket: !!currentTicketUrl,
      isOnTicketNow: isTicketPage(),
      previousHadMissingTime: previousTicketHadMissingTime,
      notificationVisible: timeTrackerNotificationVisible
    });
    
    // If we're navigating away from a ticket page
    if (currentTicketUrl && currentTicketUrl !== currentUrl) {
      console.log('⏰ Navigating away from ticket:', currentTicketUrl, 'to:', currentUrl);
      
      // Show notification if the previous ticket had missing time tracking AND no notification is already visible
      if (previousTicketHadMissingTime && !timeTrackerNotificationVisible) {
        console.log('⏰ Previous ticket had missing time tracking, showing notification');
        previousTicketUrl = currentTicketUrl;
        setTimeout(() => {
          showTimeTrackerNavigationNotice(currentTicketUrl);
        }, 500); // Small delay to ensure new page loads
      } else if (timeTrackerNotificationVisible) {
        console.log('⏰ Notification already visible, not showing another');
      } else {
        console.log('⏰ Previous ticket had time tracking, no notification needed');
      }
    }
    
    // Update current URL tracking and check time tracking status
    if (isTicketPage()) {
      // If entering a new ticket page, clear any existing notification for a fresh start
      if (currentTicketUrl !== currentUrl && timeTrackerNotificationVisible) {
        console.log('⏰ Entering new ticket, clearing existing notification');
        hideTimeTrackerNotification();
      }
      
      currentTicketUrl = currentUrl;
      console.log('⏰ Now tracking ticket:', currentTicketUrl);
      
      // Reset state for new ticket and check time tracking status
      setTimeout(() => {
        previousTicketHadMissingTime = isTimeTrackingMissing();
        console.log('⏰ Time tracking status for current ticket:', previousTicketHadMissingTime ? 'missing' : 'present');
      }, 1000); // Wait for page to load
    } else {
      currentTicketUrl = null;
      previousTicketHadMissingTime = false;
      console.log('⏰ Not on ticket page, cleared tracking');
    }
  }
  
  // Test function to manually trigger notification (for debugging)
  function testTimeTrackerNotification() {
    console.log('⏰ Testing time tracker notification');
    previousTicketUrl = 'https://test.com/ticket/123';
    showTimeTrackerNavigationNotice(previousTicketUrl);
  }
  // Make test function global for debugging
  window.testTimeTrackerNotification = testTimeTrackerNotification;
  
  // Additional debug functions
  window.debugTimeTracker = function() {
    console.log('=== Time Tracker Debug Info ===');
    console.log('Feature enabled:', loadPref('mtb_timeTrackerEnabled', true));
    console.log('Is Freshdesk:', isFreshdesk);
    console.log('Is ticket page:', isTicketPage());
    console.log('Current ticket URL:', currentTicketUrl);
    console.log('Previous ticket URL:', previousTicketUrl);
    console.log('Previous had missing time:', previousTicketHadMissingTime);
    console.log('Time tracking missing now:', isTimeTrackingMissing());
    console.log('Current URL:', window.location.href);
    console.log('==============================');
  };
  
  window.checkTimeTracking = function() {
    const missing = isTimeTrackingMissing();
    console.log('⏰ Time tracking check result:', missing ? 'MISSING' : 'PRESENT');
    return missing;
  };
  
  window.simulateNavigation = function() {
    console.log('⏰ Simulating navigation from ticket with missing time tracking');
    currentTicketUrl = window.location.href;
    previousTicketHadMissingTime = true;
    previousTicketUrl = currentTicketUrl;
    setTimeout(() => {
      showTimeTrackerNavigationNotice(currentTicketUrl);
    }, 100);
  };
  
  // Test multiple notifications
  window.testMultipleNotifications = function() {
    console.log('⏰ Testing multiple notifications');
    
    // Simulate first notification
    testTimeTrackerNotification();
    
    setTimeout(() => {
      console.log('⏰ Hiding first notification and testing second');
      hideTimeTrackerNotification();
      
      setTimeout(() => {
        console.log('⏰ Showing second notification');
        testTimeTrackerNotification();
      }, 1000);
    }, 3000);
  };
  
  // Reset all state function
  window.resetTimeTrackerState = function() {
    console.log('⏰ Manually resetting all time tracker state');
    timeTrackerNotificationVisible = false;
    currentTicketUrl = null;
    previousTicketUrl = null;
    previousTicketHadMissingTime = false;
    hideTimeTrackerNotification();
    console.log('⏰ State reset complete');
  };
  
  // SPA-specific: Force state refresh
  window.refreshTimeTrackerForSPA = function() {
    console.log('⏰ SPA-specific state refresh');
    
    // Force reset all state
    resetTimeTrackerState();
    
    // Re-initialize based on current page
    setTimeout(() => {
      if (isTicketPage()) {
        currentTicketUrl = window.location.href;
        previousTicketHadMissingTime = isTimeTrackingMissing();
        console.log('⏰ Re-initialized for ticket:', currentTicketUrl, 'Time missing:', previousTicketHadMissingTime);
      }
    }, 500);
  };
  
  // Enhanced test for SPA navigation simulation
  window.testSPANavigation = function() {
    console.log('⏰ Testing SPA navigation simulation');
    
    // Reset state first
    resetTimeTrackerState();
    
    setTimeout(() => {
      // Simulate being on a ticket with missing time
      console.log('⏰ Step 1: Simulating ticket with missing time');
      currentTicketUrl = window.location.href;
      previousTicketHadMissingTime = true;
      
      setTimeout(() => {
        // Simulate navigation away
        console.log('⏰ Step 2: Simulating navigation away from ticket');
        const fakeNewUrl = window.location.href.replace(/\/\d+$/, '/999999');
        
        // Manually trigger the logic that should show notification
        if (previousTicketHadMissingTime && !timeTrackerNotificationVisible) {
          previousTicketUrl = currentTicketUrl;
          showTimeTrackerNavigationNotice(currentTicketUrl);
        }
      }, 1000);
    }, 500);
  };
  function populateLiveFreshdeskData(container) {
    const currentTicketId = extractTicketId();
    const tIdVal = currentTicketId ? "#" + currentTicketId : "N/A";
    
    // Reset CARR fetch flag if ticket changed
    if (lastTicketId !== currentTicketId) {
      carrFetched = false;
      lastTicketId = currentTicketId;
      console.log(`🔄 Ticket changed from ${lastTicketId} to ${currentTicketId}, resetting CARR fetch flag`);
    }
    
    // Enhanced field extraction with multiple selectors
    function getFieldValue(el) {
      if (!el) return "";
      let val = el.value || el.getAttribute('value') || el.getAttribute('placeholder') || "";
      val = val.trim();
      if (!val && el.parentElement) {
        val = el.parentElement.innerText.trim();
      }
      if (!val || ["account", "profile"].includes(val.toLowerCase())) {
        val = "N/A";
      }
      return val;
    }
    
    // Try multiple methods to get account name
    let accountVal = "N/A";
    const accountSelectors = [
      'input[data-test-text-field="customFields.cf_tealium_account"]',
      'input[name*="tealium_account"]',
      'input[id*="tealium_account"]'
    ];
    
    for (let selector of accountSelectors) {
      console.log(`🔍 Trying account selector: ${selector}`);
      const el = document.querySelector(selector);
      if (el) {
        accountVal = getFieldValue(el);
        console.log(`📋 Account from ${selector}: "${accountVal}"`);
        if (accountVal && accountVal !== "N/A") {
          break;
        }
      }
    }
    
    // Don't use company name as account - account should come from custom fields only
    console.log(`📋 Account extraction complete. Company is separate from account.`);
    
    // Try multiple methods to get profile
    let profileVal = "N/A";
    const profileSelectors = [
      'input[data-test-text-field="customFields.cf_iq_profile"]',
      'input[name*="iq_profile"]',
      'input[id*="iq_profile"]'
    ];
    
    for (let selector of profileSelectors) {
      console.log(`🔍 Trying profile selector: ${selector}`);
      const el = document.querySelector(selector);
      if (el) {
        profileVal = getFieldValue(el);
        console.log(`📋 Profile from ${selector}: "${profileVal}"`);
        if (profileVal && profileVal !== "N/A") {
          break;
        }
      }
    }
    
    // Extract CARR directly from the contact details panel
    let carrVal = "N/A";
    console.log(`🔍 Extracting CARR from contact details...`);
    
    // Try multiple selectors for CARR in the contact details panel
    const carrSelectors = [
      '[data-test-id="requester-info-company-carr_usd"] .info-details-content',
      '[data-test-id="requester-info-company-carr_usd"] .text__content',
      'div:contains("CARR") + div',
      'div:contains("CARR (converted)") + div'
    ];
    
    for (let selector of carrSelectors) {
      console.log(`🔍 Trying CARR selector: ${selector}`);
      let carrElem = null;
      
      if (selector.includes('contains')) {
        // Handle :contains pseudo-selector manually
        const allDivs = document.querySelectorAll('div');
        for (let div of allDivs) {
          if (div.textContent.toLowerCase().includes('carr')) {
            const nextDiv = div.nextElementSibling;
            if (nextDiv && nextDiv.textContent.match(/^\d+$/)) {
              carrElem = nextDiv;
              break;
            }
            // Also check for value in same div structure
            const valueDiv = div.querySelector('.info-details-content, .text__content');
            if (valueDiv && valueDiv.textContent.match(/^\d+$/)) {
              carrElem = valueDiv;
              break;
            }
          }
        }
      } else {
        carrElem = document.querySelector(selector);
      }
      
      if (carrElem) {
        const rawValue = carrElem.textContent.trim();
        console.log(`📋 Found CARR element with value: "${rawValue}"`);
        
        if (rawValue && rawValue.match(/^\d+$/)) {
          const numericValue = parseInt(rawValue, 10);
          carrVal = numericValue.toLocaleString() + "$";
          console.log(`✅ Formatted CARR: ${carrVal} (from ${rawValue})`);
          break;
        }
      }
    }
    
    if (carrVal === "N/A") {
      console.log(`⚠️ Could not extract CARR from contact details`);
    }
    
    console.log(`✅ Final extracted values - Account: "${accountVal}", Profile: "${profileVal}", CARR: "${carrVal}"`);
    const urlsVal = (document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]') || { value: "" }).value.trim();
    
    // Store this data for cross-domain access
    const freshdeskData = {
      ticketId: currentTicketId,
      account: accountVal,
      profile: profileVal,
      accountProfile: accountVal + "/" + profileVal,
      urls: urlsVal,
      carr: carrVal, // Use directly extracted CARR
      timestamp: new Date().toISOString(),
      sourceUrl: window.location.href
    };
    
    // Save to both localStorage and chrome.storage for cross-domain access
    savePref("latest_freshdesk_data", freshdeskData);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ 
      action: "setProfileData", 
        profileData: freshdeskData.accountProfile 
    }, (response) => {
        console.log("Stored profile data for cross-domain use", response);
    });
    }
    
    // Remove live data header as requested by user
    
    // Create main profile section
    const secProfile = document.createElement('div');
    secProfile.className = "mtb-section";
    secProfile.appendChild(createMenuItemWithClipboard("Ticket ID", tIdVal));
    secProfile.appendChild(createMenuItemWithClipboard("Account", accountVal));
    secProfile.appendChild(createMenuItemWithClipboard("Account Profile", profileVal));
    
    const carrRow = createMenuItemWithClipboard("CARR", carrVal, false);
    secProfile.appendChild(carrRow);
    secProfile.appendChild(createMenuItemWithClipboard("Relevant URLs", urlsVal));
    
    // Copy buttons
    const copyRow = document.createElement('div');
    copyRow.style.display = "flex";
    copyRow.style.gap = "8px";
    copyRow.style.marginTop = "8px";
    
    const copyAccBtn = document.createElement('button');
    copyAccBtn.textContent = "Copy Account/Profile";
    copyAccBtn.className = "sway-btn-text copy-account";
    copyAccBtn.addEventListener('click', function() {
      const txt = accountVal + "/" + profileVal;
      navigator.clipboard.writeText(txt).then(function() {
          copyAccBtn.textContent = "Copied!";
          setTimeout(function() { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    
    const copyAllBtn = document.createElement('button');
    copyAllBtn.id = "copy-all-selected-btn";
    copyAllBtn.className = "sway-btn-text";
    copyAllBtn.textContent = "Copy Selected";
    copyAllBtn.addEventListener('click', copyAllSelected);
    
    copyRow.appendChild(copyAccBtn);
    copyRow.appendChild(copyAllBtn);
    secProfile.appendChild(copyRow);
    
    container.appendChild(secProfile);
    
    

    
    // CARR is now extracted directly above, no need for separate fetching
    console.log(`✅ CARR extracted and stored: "${carrVal}" for ticket ${currentTicketId}`);
  }
  function populateStoredFreshdeskData(container) {
    const storedData = loadPref("latest_freshdesk_data", null);
    if (!storedData) return;
    
    // Calculate data age
    const dataAge = new Date().getTime() - new Date(storedData.timestamp).getTime();
    const ageHours = Math.floor(dataAge / (60 * 60 * 1000));
    const ageMinutes = Math.floor((dataAge % (60 * 60 * 1000)) / (60 * 1000));
    
    let ageText = "";
    if (ageHours > 0) {
      ageText = `${ageHours}h ${ageMinutes}m ago`;
    } else {
      ageText = `${ageMinutes}m ago`;
    }
    
    // Show stored data header with freshness info
    const headerDiv = document.createElement('div');
    headerDiv.className = "mtb-section";
    headerDiv.style.backgroundColor = "rgba(0, 100, 200, 0.1)";
    headerDiv.style.borderColor = "#0066cc";
    headerDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #0066cc; font-size: 16px;">💾</span>
          <strong>Stored Freshdesk Data</strong>
        </div>
        <div style="font-size: 12px; color: #666;">
          <div>Last updated: ${ageText}</div>
          <div style="font-size: 10px; margin-top: 2px;">Ticket: #${storedData.ticketId}</div>
        </div>
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        From: <a href="${storedData.sourceUrl}" target="_blank" style="color: #0066cc;">${storedData.sourceUrl}</a>
      </div>
    `;
    
    // Add refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = "sway-btn-text";
    refreshBtn.style.fontSize = "12px";
    refreshBtn.style.padding = "4px 8px";
    refreshBtn.textContent = "🔄 Refresh from Freshdesk";
    refreshBtn.addEventListener('click', function() {
      if (confirm("This will open the Freshdesk ticket to refresh the data. Continue?")) {
        window.open(storedData.sourceUrl, '_blank');
      }
    });
    headerDiv.appendChild(refreshBtn);
    container.appendChild(headerDiv);
    
    // Create main profile section with stored data
    const secProfile = document.createElement('div');
    secProfile.className = "mtb-section";
    secProfile.appendChild(createMenuItemWithClipboard("Ticket ID", "#" + storedData.ticketId));
    secProfile.appendChild(createMenuItemWithClipboard("Account", storedData.account));
    secProfile.appendChild(createMenuItemWithClipboard("Account Profile", storedData.profile));
    secProfile.appendChild(createMenuItemWithClipboard("CARR", storedData.carr));
    secProfile.appendChild(createMenuItemWithClipboard("Relevant URLs", storedData.urls));
    
    // Copy buttons for stored data
    const copyRow = document.createElement('div');
    copyRow.style.display = "flex";
    copyRow.style.gap = "8px";
    copyRow.style.marginTop = "8px";
    
    const copyAccBtn = document.createElement('button');
    copyAccBtn.textContent = "Copy Account/Profile";
    copyAccBtn.className = "sway-btn-text copy-account";
    copyAccBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(storedData.accountProfile).then(function() {
        copyAccBtn.textContent = "Copied!";
        setTimeout(function() { copyAccBtn.textContent = "Copy Account/Profile"; }, 2000);
      });
    });
    
    const copyAllBtn = document.createElement('button');
    copyAllBtn.className = "sway-btn-text";
    copyAllBtn.textContent = "Copy All Fields";
    copyAllBtn.addEventListener('click', function() {
      const allData = `**Ticket ID**: #${storedData.ticketId}
**Account**: ${storedData.account}
**Account Profile**: ${storedData.profile}
**CARR**: ${storedData.carr}
**Relevant URLs**: ${storedData.urls}
**Summary**: ${storedData.summary || 'N/A'}
Source: ${storedData.sourceUrl}`;
      
      navigator.clipboard.writeText(allData).then(function() {
        copyAllBtn.textContent = "Copied All!";
        setTimeout(function() { copyAllBtn.textContent = "Copy All Fields"; }, 2000);
      });
    });
    
    copyRow.appendChild(copyAccBtn);
    copyRow.appendChild(copyAllBtn);
    secProfile.appendChild(copyRow);
    
    container.appendChild(secProfile);
    
    

  }

  function populateStoredJiraData(container) {
    const storedData = loadPref("latest_jira_data", null);
    if (!storedData) return;
    
    // Calculate data age
    const dataAge = new Date().getTime() - new Date(storedData.timestamp).getTime();
    const ageHours = Math.floor(dataAge / (60 * 60 * 1000));
    const ageMinutes = Math.floor((dataAge % (60 * 60 * 1000)) / (60 * 1000));
    
    let ageText = "";
    if (ageHours > 0) {
      ageText = `${ageHours}h ${ageMinutes}m ago`;
    } else {
      ageText = `${ageMinutes}m ago`;
    }
    
    // Show stored Jira data header with freshness info
    const headerDiv = document.createElement('div');
    headerDiv.className = "mtb-section";
    headerDiv.style.backgroundColor = "rgba(0, 100, 200, 0.1)";
    headerDiv.style.borderColor = "#0066cc";
    headerDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #0066cc; font-size: 16px;">💾</span>
          <strong>Stored Jira Data</strong>
        </div>
        <div style="font-size: 12px; color: #666;">
          <div>Last updated: ${ageText}</div>
          <div style="font-size: 10px; margin-top: 2px;">Issue: ${storedData.issueId}</div>
        </div>
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        From: <a href="${storedData.sourceUrl}" target="_blank" style="color: #0066cc;">${storedData.sourceUrl}</a>
      </div>
    `;
    
    // Add refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = "sway-btn-text";
    refreshBtn.style.fontSize = "12px";
    refreshBtn.style.padding = "4px 8px";
    refreshBtn.textContent = "🔄 Refresh from Jira";
    refreshBtn.addEventListener('click', function() {
      if (confirm("This will open the Jira issue to refresh the data. Continue?")) {
        window.open(storedData.sourceUrl, '_blank');
      }
    });
    headerDiv.appendChild(refreshBtn);
    container.appendChild(headerDiv);
    
    // Create issue timeline notice header for stored data
    if (storedData.created && storedData.updated && storedData.resolved) {
      const timelineHeader = document.createElement('div');
      timelineHeader.className = "mtb-section";
      timelineHeader.style.backgroundColor = "rgba(0, 100, 200, 0.1)";
      timelineHeader.style.borderColor = "#0066cc";
      timelineHeader.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #0066cc; font-size: 16px;">📅</span>
            <strong>Issue Timeline</strong>
          </div>
          <div style="font-size: 12px; color: #666;">
            <div style="font-size: 10px; margin-top: 2px;">Issue: ${storedData.issueId}</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
          <div style="margin-bottom: 2px;"><strong>Created:</strong> ${storedData.created}</div>
          <div style="margin-bottom: 2px;"><strong>Updated:</strong> ${storedData.updated}</div>
          <div><strong>Resolved:</strong> ${storedData.resolved}</div>
        </div>
      `;
      container.appendChild(timelineHeader);
    }
    
    // Create main Jira section with stored data
    const secJira = document.createElement('div');
    secJira.className = "mtb-section";
    
    const jiraHeader = document.createElement('h3');
    jiraHeader.style.fontSize = "16px";
    jiraHeader.style.marginBottom = "12px";
    jiraHeader.textContent = "Jira Issue Details";
    secJira.appendChild(jiraHeader);
    
    secJira.appendChild(createMenuItemWithClipboard("Issue ID", storedData.issueId));
    secJira.appendChild(createMenuItemWithClipboard("Priority", storedData.priority));
    secJira.appendChild(createMenuItemWithClipboard("Status", storedData.status));
    secJira.appendChild(createMenuItemWithClipboard("Assignee", storedData.assignee));
    
    // Copy buttons for stored Jira data
    const copyRow = document.createElement('div');
    copyRow.style.display = "flex";
    copyRow.style.gap = "8px";
    copyRow.style.marginTop = "8px";
    
    const copyIssueBtn = document.createElement('button');
    copyIssueBtn.textContent = "Copy Issue ID";
    copyIssueBtn.className = "sway-btn-text";
    copyIssueBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(storedData.issueId).then(function() {
        copyIssueBtn.textContent = "Copied!";
        setTimeout(function() { copyIssueBtn.textContent = "Copy Issue ID"; }, 2000);
          });
        });
    
    const copyAllBtn = document.createElement('button');
    copyAllBtn.className = "sway-btn-text";
    copyAllBtn.textContent = "Copy All Jira Data";
    copyAllBtn.addEventListener('click', function() {
      const allData = `**Issue ID**: ${storedData.issueId}
**Priority**: ${storedData.priority}
**Status**: ${storedData.status}
**Assignee**: ${storedData.assignee}
**Created**: ${storedData.created}
**Updated**: ${storedData.updated}
**Resolved**: ${storedData.resolved}

Source: ${storedData.sourceUrl}`;
      
      navigator.clipboard.writeText(allData).then(function() {
        copyAllBtn.textContent = "Copied All!";
        setTimeout(function() { copyAllBtn.textContent = "Copy All Jira Data"; }, 2000);
      });
    });
    
    copyRow.appendChild(copyIssueBtn);
    copyRow.appendChild(copyAllBtn);
    secJira.appendChild(copyRow);
    
    container.appendChild(secJira);
  }
  


    function populateJiraContent() {
    const container = document.getElementById('tab-content-jira');
    if (!container) return;
    
    container.innerHTML = "";
    
    // Creation buttons at the top for easy access - icon-only design
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = "mtb-section";
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.flexDirection = "row";
    buttonsDiv.style.gap = "6px";
    buttonsDiv.style.padding = "10px";
    buttonsDiv.style.justifyContent = "center";
    
    // Bug Button (Bug Icon)
    const bugBtn = document.createElement('button');
    bugBtn.className = "sway-btn-text";
    bugBtn.title = "Create New Bug Report";
    bugBtn.style.padding = "8px";
    bugBtn.style.width = "32px";
    bugBtn.style.height = "32px";
    bugBtn.style.borderRadius = "6px";
    bugBtn.style.display = "flex";
    bugBtn.style.alignItems = "center";
    bugBtn.style.justifyContent = "center";
    bugBtn.style.backgroundColor = "rgba(220, 50, 50, 0.1)";
    bugBtn.style.borderColor = "#dc3232";
    bugBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc3232" stroke-width="2">
        <path d="M8 2v4l-2 2v2h12v-2l-2-2V2z"/>
        <path d="M8 10v6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6"/>
        <circle cx="10" cy="16" r="1"/>
        <circle cx="14" cy="16" r="1"/>
        <path d="M9 4h6"/>
      </svg>`;
    
    // Add hover effects
    bugBtn.addEventListener('mouseenter', function() {
      this.style.backgroundColor = "rgba(220, 50, 50, 0.2)";
      this.style.transform = "scale(1.05)";
      this.style.transition = "all 0.2s ease";
    });
    bugBtn.addEventListener('mouseleave', function() {
      this.style.backgroundColor = "rgba(220, 50, 50, 0.1)";
      this.style.transform = "scale(1)";
    });
    
    bugBtn.addEventListener('click', function() {
      console.log(`🐛 Creating new Bug issue...`);
      triggerIssueCreation('Bug');
    });
    buttonsDiv.appendChild(bugBtn);
    
    // Enhancement Button (Green Up Arrow)
    const enhancementBtn = document.createElement('button');
    enhancementBtn.className = "sway-btn-text";
    enhancementBtn.title = "Create New Enhancement Request";
    enhancementBtn.style.padding = "8px";
    enhancementBtn.style.width = "32px";
    enhancementBtn.style.height = "32px";
    enhancementBtn.style.borderRadius = "6px";
    enhancementBtn.style.display = "flex";
    enhancementBtn.style.alignItems = "center";
    enhancementBtn.style.justifyContent = "center";
    enhancementBtn.style.backgroundColor = "rgba(50, 200, 50, 0.1)";
    enhancementBtn.style.borderColor = "#22c55e";
    enhancementBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
        <path d="M12 19V5"/>
        <path d="m5 12 7-7 7 7"/>
      </svg>`;
    
    // Add hover effects
    enhancementBtn.addEventListener('mouseenter', function() {
      this.style.backgroundColor = "rgba(50, 200, 50, 0.2)";
      this.style.transform = "scale(1.05)";
      this.style.transition = "all 0.2s ease";
    });
    enhancementBtn.addEventListener('mouseleave', function() {
      this.style.backgroundColor = "rgba(50, 200, 50, 0.1)";
      this.style.transform = "scale(1)";
    });
    
    enhancementBtn.addEventListener('click', function() {
      console.log(`⚡ Creating new Enhancement issue...`);
      triggerIssueCreation('Enhancement');
    });
    buttonsDiv.appendChild(enhancementBtn);
    
    // Request Permission Button (Lock Icon)
    const permissionBtn = document.createElement('button');
    permissionBtn.className = "sway-btn-text";
    permissionBtn.title = "Request Account Permissions";
    permissionBtn.style.padding = "8px";
    permissionBtn.style.width = "32px";
    permissionBtn.style.height = "32px";
    permissionBtn.style.borderRadius = "6px";
    permissionBtn.style.display = "flex";
    permissionBtn.style.alignItems = "center";
    permissionBtn.style.justifyContent = "center";
    permissionBtn.style.backgroundColor = "rgba(150, 100, 200, 0.1)";
    permissionBtn.style.borderColor = "#8e44ad";
    permissionBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e44ad" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <circle cx="12" cy="7" r="4"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>`;
    
    // Add hover effects
    permissionBtn.addEventListener('mouseenter', function() {
      this.style.backgroundColor = "rgba(150, 100, 200, 0.2)";
      this.style.transform = "scale(1.05)";
      this.style.transition = "all 0.2s ease";
    });
    permissionBtn.addEventListener('mouseleave', function() {
      this.style.backgroundColor = "rgba(150, 100, 200, 0.1)";
      this.style.transform = "scale(1)";
    });
    
    permissionBtn.addEventListener('click', function() {
      console.log(`🔐 Opening permission request form...`);
      triggerPermissionRequest();
    });
    buttonsDiv.appendChild(permissionBtn);
    
    container.appendChild(buttonsDiv);
    
    // Show live Jira issue details if on Jira issue page
    if (isJira && isJiraIssuePage()) {
      const currentJiraIssueId = extractJiraIssueId();
      if (currentJiraIssueId) {
        // Extract issue details from page
        const priorityEl = document.querySelector('div[data-testid="issue-field-priority-readview-full.ui.priority.wrapper"] span');
        const priorityText = priorityEl ? priorityEl.textContent.trim() : "N/A";
        
        const statusEl = document.querySelector('button[data-testid="issue-field-status.ui.status-view.status-button.status-button"] span');
        const statusText = statusEl ? statusEl.textContent.trim() : "N/A";
        
        // Get assignee name more specifically to avoid duplication
        const assigneeContainer = document.querySelector('[data-testid="issue.views.field.user.assignee"]');
        let assigneeText = "N/A";
        if (assigneeContainer) {
          // Try multiple strategies to get the assignee name without duplication
          
          // Strategy 1: Look for the deepest span with the name (usually the most specific)
          const allSpans = assigneeContainer.querySelectorAll('span');
          const nameSpans = [];
          
          for (let span of allSpans) {
            const text = span.textContent.trim();
            // Check if this looks like a person's name (has space, reasonable length, not system text)
            if (text && text.includes(' ') && text.length > 3 && text.length < 50 && 
                !text.includes('More information') && !text.includes('edit') && 
                !text.includes('Assign') && !text.includes('data-testid')) {
              nameSpans.push({span: span, text: text, hasChildren: span.children.length > 0});
            }
          }
          
          if (nameSpans.length > 0) {
            // Prefer spans without children (leaf nodes) as they're more likely to have clean text
            const leafSpans = nameSpans.filter(item => !item.hasChildren);
            if (leafSpans.length > 0) {
              assigneeText = leafSpans[0].text;
            } else {
              assigneeText = nameSpans[0].text;
            }
            
            // Clean up any duplicated names in the text
            const words = assigneeText.split(/\s+/);
            if (words.length >= 2) {
              // Check if the name is duplicated (like "Sam ConranSam Conran")
              const midpoint = Math.floor(words.length / 2);
              const firstHalf = words.slice(0, midpoint).join(' ');
              const secondHalf = words.slice(midpoint).join(' ');
              
              if (firstHalf === secondHalf && firstHalf.length > 0) {
                assigneeText = firstHalf; // Use only the first half if duplicated
              }
            }
          }
        }
        
        // Extract ticket status dates from footnote section
        const createdEl = document.querySelector('[data-testid="created-date.ui.read.meta-date"] span');
        const createdText = createdEl ? createdEl.textContent.trim() : "N/A";
        
        const updatedEl = document.querySelector('[data-testid="updated-date.ui.read.meta-date"] span');
        const updatedText = updatedEl ? updatedEl.textContent.trim() : "N/A";
        
        const resolvedEl = document.querySelector('[data-testid="resolved-date.ui.read.meta-date"] span');
        const resolvedText = resolvedEl ? resolvedEl.textContent.trim() : "N/A";
        
        // Store this Jira data for cross-domain access
        const jiraData = {
          issueId: currentJiraIssueId,
          priority: priorityText,
          status: statusText,
          assignee: assigneeText,
          created: createdText,
          updated: updatedText,
          resolved: resolvedText,
          timestamp: new Date().toISOString(),
          sourceUrl: window.location.href
        };
        
        // Save Jira data for Freshdesk access
        savePref("latest_jira_data", jiraData);
        console.log("Stored Jira data for cross-domain access:", jiraData);
        
        // Create issue timeline notice header
        const timelineHeader = document.createElement('div');
        timelineHeader.className = "mtb-section";
        timelineHeader.style.backgroundColor = "rgba(0, 100, 200, 0.1)";
        timelineHeader.style.borderColor = "#0066cc";
        timelineHeader.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #0066cc; font-size: 16px;">📅</span>
              <strong>Issue Timeline</strong>
            </div>
            <div style="font-size: 12px; color: #666;">
              <div style="font-size: 10px; margin-top: 2px;">Issue: ${currentJiraIssueId}</div>
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <div style="margin-bottom: 2px;"><strong>Created:</strong> ${createdText}</div>
            <div style="margin-bottom: 2px;"><strong>Updated:</strong> ${updatedText}</div>
            <div><strong>Resolved:</strong> ${resolvedText}</div>
          </div>
        `;
        container.appendChild(timelineHeader);
        
        const secJiraFields = document.createElement('div');
        secJiraFields.className = "mtb-section";
        
        const detailsHeader = document.createElement('h3');
        detailsHeader.style.fontSize = "16px";
        detailsHeader.style.marginBottom = "12px";
        detailsHeader.textContent = "Current Jira Issue";
        secJiraFields.appendChild(detailsHeader);
        
        secJiraFields.appendChild(createMenuItemWithClipboard("Issue ID", currentJiraIssueId));
        secJiraFields.appendChild(createMenuItemWithClipboard("Priority", priorityText));
        secJiraFields.appendChild(createMenuItemWithClipboard("Status", statusText));
        secJiraFields.appendChild(createMenuItemWithClipboard("Assignee", assigneeText));
        
        // Copy all button for Jira data
        const copyAllJiraBtn = document.createElement('button');
        copyAllJiraBtn.className = "sway-btn-text";
        copyAllJiraBtn.textContent = "Copy All Jira Details";
        copyAllJiraBtn.style.marginTop = "10px";
        copyAllJiraBtn.addEventListener('click', function() {
          const allData = `**Issue ID**: ${currentJiraIssueId}
**Priority**: ${priorityText}
**Status**: ${statusText}
**Assignee**: ${assigneeText}
**Created**: ${createdText}
**Updated**: ${updatedText}
**Resolved**: ${resolvedText}

Source: ${window.location.href}`;
          
          navigator.clipboard.writeText(allData).then(function() {
            copyAllJiraBtn.textContent = "Copied All!";
            setTimeout(function() { copyAllJiraBtn.textContent = "Copy All Jira Details"; }, 2000);
          });
        });
        secJiraFields.appendChild(copyAllJiraBtn);
        
        container.appendChild(secJiraFields);
      }
    }
    
    // Show stored Jira data if on Freshdesk and we have stored data
    if (isFreshdesk && hasStoredJiraData()) {
      console.log("Showing stored Jira data in Freshdesk Jira tab");
      const storedData = loadPref("latest_jira_data", null);
      if (storedData) {
        // Calculate data age
        const dataAge = new Date().getTime() - new Date(storedData.timestamp).getTime();
        const ageHours = Math.floor(dataAge / (60 * 60 * 1000));
        const ageMinutes = Math.floor((dataAge % (60 * 60 * 1000)) / (60 * 1000));
        
        let ageText = "";
        if (ageHours > 0) {
          ageText = `${ageHours}h ${ageMinutes}m ago`;
        } else {
          ageText = `${ageMinutes}m ago`;
        }
        
        // Show stored Jira data header
        const headerDiv = document.createElement('div');
        headerDiv.className = "mtb-section";
        headerDiv.style.backgroundColor = "rgba(0, 100, 200, 0.1)";
        headerDiv.style.borderColor = "#0066cc";
        headerDiv.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #0066cc; font-size: 16px;">💾</span>
              <strong>Last Visited Jira Issue</strong>
            </div>
            <div style="font-size: 12px; color: #666;">
              <div>Last updated: ${ageText}</div>
              <div style="font-size: 10px; margin-top: 2px;">Issue: ${storedData.issueId}</div>
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            From: <a href="${storedData.sourceUrl}" target="_blank" style="color: #0066cc;">${storedData.sourceUrl}</a>
          </div>
        `;
        
        // Add refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = "sway-btn-text";
        refreshBtn.style.fontSize = "12px";
        refreshBtn.style.padding = "4px 8px";
        refreshBtn.textContent = "🔄 Open in Jira";
        refreshBtn.addEventListener('click', function() {
          window.open(storedData.sourceUrl, '_blank');
        });
        headerDiv.appendChild(refreshBtn);
        container.appendChild(headerDiv);
        
        // Create issue timeline notice header for stored data
        if (storedData.created && storedData.updated && storedData.resolved) {
          const timelineHeader = document.createElement('div');
          timelineHeader.className = "mtb-section";
          timelineHeader.style.backgroundColor = "rgba(0, 100, 200, 0.1)";
          timelineHeader.style.borderColor = "#0066cc";
          timelineHeader.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #0066cc; font-size: 16px;">📅</span>
                <strong>Issue Timeline</strong>
              </div>
              <div style="font-size: 12px; color: #666;">
                <div style="font-size: 10px; margin-top: 2px;">Issue: ${storedData.issueId}</div>
              </div>
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              <div style="margin-bottom: 2px;"><strong>Created:</strong> ${storedData.created}</div>
              <div style="margin-bottom: 2px;"><strong>Updated:</strong> ${storedData.updated}</div>
              <div><strong>Resolved:</strong> ${storedData.resolved}</div>
            </div>
          `;
          container.appendChild(timelineHeader);
        }
        
        // Create Jira data section
        const secStoredJira = document.createElement('div');
        secStoredJira.className = "mtb-section";
        
        const jiraHeader = document.createElement('h3');
        jiraHeader.style.fontSize = "16px";
        jiraHeader.style.marginBottom = "12px";
        jiraHeader.textContent = "Jira Issue Details";
        secStoredJira.appendChild(jiraHeader);
        
        secStoredJira.appendChild(createMenuItemWithClipboard("Issue ID", storedData.issueId));
        secStoredJira.appendChild(createMenuItemWithClipboard("Priority", storedData.priority));
        secStoredJira.appendChild(createMenuItemWithClipboard("Status", storedData.status));
        secStoredJira.appendChild(createMenuItemWithClipboard("Assignee", storedData.assignee));
        
        // Copy buttons for stored Jira data
        const copyRow = document.createElement('div');
        copyRow.style.display = "flex";
        copyRow.style.gap = "8px";
        copyRow.style.marginTop = "8px";
        
        const copyIssueBtn = document.createElement('button');
        copyIssueBtn.textContent = "Copy Issue ID";
        copyIssueBtn.className = "sway-btn-text";
        copyIssueBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(storedData.issueId).then(function() {
            copyIssueBtn.textContent = "Copied!";
            setTimeout(function() { copyIssueBtn.textContent = "Copy Issue ID"; }, 2000);
          });
        });
        
        const copyAllBtn = document.createElement('button');
        copyAllBtn.className = "sway-btn-text";
        copyAllBtn.textContent = "Copy All Jira Data";
        copyAllBtn.addEventListener('click', function() {
          const allData = `**Issue ID**: ${storedData.issueId}
**Priority**: ${storedData.priority}
**Status**: ${storedData.status}
**Assignee**: ${storedData.assignee}
**Created**: ${storedData.created}
**Updated**: ${storedData.updated}
**Resolved**: ${storedData.resolved}
Source: ${storedData.sourceUrl}`;
          
          navigator.clipboard.writeText(allData).then(function() {
            copyAllBtn.textContent = "Copied All!";
            setTimeout(function() { copyAllBtn.textContent = "Copy All Jira Data"; }, 2000);
          });
        });
        
        copyRow.appendChild(copyIssueBtn);
        copyRow.appendChild(copyAllBtn);
        secStoredJira.appendChild(copyRow);
        
        container.appendChild(secStoredJira);
      }
    }
    

    
    // Enhanced detection for modals - focus on DOM elements
    const hasCreateFormElements = document.querySelector('#customfield_10744-container, #customfield_10702-container, #customfield_10652-container, #customfield_10599-container, #customfield_11724-container, #customfield_10843-container, #customfield_10689-container');
    const hasCreateModal = document.querySelector('[data-testid*="issue-create"], [data-testid*="create-form"], .issue-create-modal');
    const hasCreateButtons = document.querySelector('button[form*="create"], button[data-testid*="create"]');
    
    const isCreateIssuePage = isJira && (
      window.location.href.includes("/secure/CreateIssue.jspa") ||
      window.location.href.includes("selectedIssueType") ||
      window.location.href.includes("create") ||
      window.location.hash.includes("create") ||
      hasCreateFormElements ||
      hasCreateModal ||
      hasCreateButtons
    );
    
    console.log("🔍 Create issue detection (modal-friendly):", {
      url: window.location.href,
      isJira,
      hasCreateFormElements: !!hasCreateFormElements,
      hasCreateModal: !!hasCreateModal,
      hasCreateButtons: !!hasCreateButtons,
      isCreateIssuePage
    });
    
    if (isCreateIssuePage) {
      const populateSection = document.createElement('div');
      populateSection.className = "mtb-section";
      populateSection.style.backgroundColor = "rgba(0, 200, 0, 0.1)";
      populateSection.style.borderColor = "#00cc00";
      
      const populateHeader = document.createElement('h3');
      populateHeader.style.fontSize = "16px";
      populateHeader.style.marginBottom = "12px";
      populateHeader.style.color = "#00aa00";
      populateHeader.innerHTML = `🚀 Auto-Populate Jira Form`;
      populateSection.appendChild(populateHeader);
      
      // Create populate button directly
      const populateBtn = document.createElement('button');
      populateBtn.className = "sway-btn-text";
      populateBtn.style.backgroundColor = "#e6ffe6";
      populateBtn.style.borderColor = "#00cc00";
      populateBtn.style.color = "#006600";
      populateBtn.style.padding = "10px 16px";
      populateBtn.style.fontSize = "14px";
      populateBtn.style.fontWeight = "600";
      populateBtn.innerHTML = `🔧 Populate Form Fields`;
      populateBtn.addEventListener('click', populateJiraFormFields);
      
      const buttonDiv = document.createElement('div');
      buttonDiv.style.textAlign = 'center';
      buttonDiv.appendChild(populateBtn);
      populateSection.appendChild(buttonDiv);
      
      container.appendChild(populateSection);
    } else if (isJira && document.querySelector('#customfield_10744-container, #customfield_10702-container, #customfield_10652-container, #customfield_10599-container, #customfield_11724-container, #customfield_10843-container, #customfield_10689-container')) {
      // Fallback: Show populate section if we detect any of the target fields, regardless of URL
      const fallbackSection = document.createElement('div');
      fallbackSection.className = "mtb-section";
      fallbackSection.style.backgroundColor = "rgba(255, 165, 0, 0.1)";
      fallbackSection.style.borderColor = "#ff9900";
      
      const fallbackHeader = document.createElement('h3');
      fallbackHeader.style.fontSize = "16px";
      fallbackHeader.style.marginBottom = "12px";
      fallbackHeader.style.color = "#cc7700";
      fallbackHeader.innerHTML = `⚠️ Jira Form Fields Detected`;
      fallbackSection.appendChild(fallbackHeader);
      
      const detectedFields = [];
      if (document.querySelector('#customfield_10744-container')) detectedFields.push('Reporting Region');
      if (document.querySelector('#customfield_10702-container')) detectedFields.push('Reporting Group');
      if (document.querySelector('#customfield_10652-container')) detectedFields.push('Account/Profile');
      if (document.querySelector('#customfield_10599-container')) detectedFields.push('Total Revenue Impact');
      if (document.querySelector('#customfield_11724-container')) detectedFields.push('Affected Clients');
      if (document.querySelector('#customfield_10843-container')) detectedFields.push('Environment');
      if (document.querySelector('#customfield_10689-container')) detectedFields.push('Region(s) Impacted');
      
      const infoDiv = document.createElement('div');
      infoDiv.style.fontSize = "12px";
      infoDiv.style.marginBottom = "12px";
      infoDiv.innerHTML = `
        <div style="margin-bottom: 8px;">Detected fields that can be auto-populated:</div>
        ${detectedFields.map(field => `<div>• ${field}</div>`).join('')}
      `;
      fallbackSection.appendChild(infoDiv);
      
      const fallbackBtn = document.createElement('button');
      fallbackBtn.className = "sway-btn-text";
      fallbackBtn.style.backgroundColor = "#fff2e6";
      fallbackBtn.style.borderColor = "#ff9900";
      fallbackBtn.style.color = "#cc7700";
      fallbackBtn.style.padding = "10px 16px";
      fallbackBtn.style.fontSize = "14px";
      fallbackBtn.style.fontWeight = "600";
      fallbackBtn.innerHTML = `🔧 Populate Detected Fields`;
      fallbackBtn.addEventListener('click', populateJiraFormFields);
      
      const fallbackButtonDiv = document.createElement('div');
      fallbackButtonDiv.style.textAlign = 'center';
      fallbackButtonDiv.appendChild(fallbackBtn);
      fallbackSection.appendChild(fallbackButtonDiv);
      
      container.appendChild(fallbackSection);
    }
  }
  
  function populateClipboardContent() {
    const container = document.getElementById('tab-content-clipboard');
    if (!container) return;
    
    container.innerHTML = "";
    
    // Reload clipboard data from Chrome storage for latest updates
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['mtb_clipboard_data'], (result) => {
        if (result.mtb_clipboard_data) {
          clipboardData = result.mtb_clipboard_data;
          renderClipboardContent(container);
        } else {
          // Fallback to current data
          renderClipboardContent(container);
        }
      });
    } else {
      // Fallback to localStorage
      clipboardData = loadPref("clipboard_data", []);
      renderClipboardContent(container);
    }
  }
  
  function renderClipboardContent(container) {
    
    // Header section
    const headerDiv = document.createElement('div');
    headerDiv.className = "mtb-section";
    headerDiv.style.backgroundColor = "rgba(150, 0, 150, 0.1)";
    headerDiv.style.borderColor = "#9600aa";
    
    const headerContent = document.createElement('div');
    headerContent.style.display = "flex";
    headerContent.style.justifyContent = "space-between";
    headerContent.style.alignItems = "center";
    headerContent.style.marginBottom = "8px";
    
    const headerLeft = document.createElement('div');
    headerLeft.style.display = "flex";
    headerLeft.style.alignItems = "center";
    headerLeft.style.gap = "8px";
    headerLeft.innerHTML = `
      <span style="color: #9600aa; font-size: 16px;">📋</span>
      <strong>Shared Clipboard</strong>
    `;
    
    const headerRight = document.createElement('div');
    headerRight.style.display = "flex";
    headerRight.style.gap = "8px";
    
    // Clear all button
    const clearBtn = document.createElement('button');
    clearBtn.className = "sway-btn-text";
    clearBtn.style.fontSize = "12px";
    clearBtn.style.padding = "4px 8px";
    clearBtn.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
    clearBtn.style.borderColor = "#ff4444";
    clearBtn.style.color = "#cc0000";
    clearBtn.textContent = "Clear All";
    clearBtn.addEventListener('click', function() {
      clipboardData = [];
      savePref("clipboard_data", clipboardData);
      populateClipboardContent();
      
      // Brief visual feedback
      clearBtn.textContent = "Cleared!";
      setTimeout(function() { 
        clearBtn.textContent = "Clear All"; 
      }, 1500);
    });
    
    // Copy selected button
    const copySelectedBtn = document.createElement('button');
    copySelectedBtn.className = "sway-btn-text";
    copySelectedBtn.style.fontSize = "12px";
    copySelectedBtn.style.padding = "4px 8px";
    copySelectedBtn.textContent = "Copy Selected";
    copySelectedBtn.addEventListener('click', copySelectedClipboardItems);
    
    headerRight.appendChild(clearBtn);
    headerRight.appendChild(copySelectedBtn);
    
    headerContent.appendChild(headerLeft);
    headerContent.appendChild(headerRight);
    headerDiv.appendChild(headerContent);
    
    const description = document.createElement('div');
    description.style.fontSize = "12px";
    description.className = "clipboard-description";
    description.textContent = "Shared across Jira & Freshdesk! Use + buttons throughout the app to collect data here. Updates live across all domains.";
    headerDiv.appendChild(description);
    
    container.appendChild(headerDiv);
    
    // Clipboard items
    if (clipboardData.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = "mtb-section";
      emptyDiv.style.textAlign = "center";
      emptyDiv.style.color = "#666";
      emptyDiv.innerHTML = `
        <div style="padding: 20px;">
          <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
          <div>No items in shared clipboard yet</div>
          <div style="font-size: 12px; margin-top: 4px;">Click + buttons next to data to add items</div>
          <div style="font-size: 10px; margin-top: 2px; color: #999;">Data is shared live between Jira and Freshdesk</div>
        </div>
      `;
      container.appendChild(emptyDiv);
    } else {
      // Group items by source
      const groupedData = clipboardData.reduce((acc, item) => {
        if (!acc[item.source]) acc[item.source] = [];
        acc[item.source].push(item);
        return acc;
      }, {});
      
      Object.keys(groupedData).forEach(source => {
        const sourceSection = document.createElement('div');
        sourceSection.className = "mtb-section";
        
        const sourceHeader = document.createElement('h4');
        sourceHeader.style.fontSize = "14px";
        sourceHeader.style.marginBottom = "8px";
        sourceHeader.style.color = source === 'Jira' ? '#0066cc' : '#00a000';
        sourceHeader.innerHTML = `${source} Data <span style="font-size: 10px; color: #999;">(${groupedData[source].length} items)</span>`;
        sourceSection.appendChild(sourceHeader);
        
        groupedData[source].forEach(item => {
          const itemRow = document.createElement('div');
          itemRow.className = "fieldRow";
          itemRow.style.position = "relative";
          
          const check = document.createElement('input');
          check.type = "checkbox";
          check.checked = true;
          check.className = "clipboard-selector";
          check.dataset.itemId = item.id;
          itemRow.appendChild(check);
          
          const label = document.createElement('span');
          label.textContent = item.label + ": ";
          label.className = "fw-bold";
          itemRow.appendChild(label);
          
          const value = document.createElement('span');
          value.textContent = item.value;
          value.className = "fresh-value";
          itemRow.appendChild(value);
          
          // Domain indicator if different from current
          if (item.domain && item.domain !== window.location.hostname) {
            const domainSpan = document.createElement('span');
            domainSpan.style.fontSize = "9px";
            domainSpan.style.color = "#666";
            domainSpan.style.marginLeft = "4px";
            domainSpan.style.backgroundColor = "rgba(0,0,0,0.1)";
            domainSpan.style.padding = "1px 3px";
            domainSpan.style.borderRadius = "2px";
            domainSpan.textContent = item.domain.split('.')[0];
            itemRow.appendChild(domainSpan);
          }
          
          // Age indicator
          const age = new Date().getTime() - new Date(item.timestamp).getTime();
          const ageMinutes = Math.floor(age / (60 * 1000));
          const ageText = ageMinutes < 60 ? `${ageMinutes}m` : `${Math.floor(ageMinutes / 60)}h`;
          
          const ageSpan = document.createElement('span');
          ageSpan.style.fontSize = "10px";
          ageSpan.style.color = "#999";
          ageSpan.style.marginLeft = "8px";
          ageSpan.textContent = ageText;
          itemRow.appendChild(ageSpan);
          
          // Remove button
          const removeBtn = document.createElement('button');
          removeBtn.className = "sway-btn-icon";
          removeBtn.style.marginLeft = "8px";
          removeBtn.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
          removeBtn.style.borderColor = "#ff4444";
          removeBtn.style.color = "#cc0000";
          removeBtn.innerHTML = "×";
          removeBtn.title = "Remove from shared clipboard";
          removeBtn.addEventListener('click', function() {
            clipboardData = clipboardData.filter(d => d.id !== item.id);
            savePref("clipboard_data", clipboardData);
            populateClipboardContent();
          });
          itemRow.appendChild(removeBtn);
          
          sourceSection.appendChild(itemRow);
        });
        
        container.appendChild(sourceSection);
      });
    }
  }

  function copySelectedClipboardItems() {
    const selectedItems = [];
    document.querySelectorAll('.clipboard-selector:checked').forEach(checkbox => {
      const itemId = parseFloat(checkbox.dataset.itemId);
      const item = clipboardData.find(d => d.id === itemId);
      if (item) {
        selectedItems.push(item);
      }
    });
    
    if (selectedItems.length === 0) {
      alert("No items selected to copy");
    return;
  }
  
    // Group by source for organized output
    const groupedItems = selectedItems.reduce((acc, item) => {
      if (!acc[item.source]) acc[item.source] = [];
      acc[item.source].push(item);
      return acc;
    }, {});
    
    let copyText = "";
    Object.keys(groupedItems).forEach(source => {
      if (copyText) copyText += "\n";
      copyText += `**${source} Data:**\n`;
      groupedItems[source].forEach(item => {
        copyText += `**${item.label}**: ${item.value}\n`;
      });
    });
    
    navigator.clipboard.writeText(copyText).then(() => {
      const copyBtn = document.querySelector('#tab-content-clipboard .sway-btn-text');
      if (copyBtn && copyBtn.textContent === "Copy Selected") {
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy Selected"; }, 2000);
      }
    });
  }
  function populateSettingsContent() {
    const container = document.getElementById('tab-content-settings');
    if (!container) return;
    
    container.innerHTML = "";
    
    const sec = document.createElement('div');
    sec.className = "mtb-section";
    
    const header = document.createElement('h3');
    header.style.fontSize = "16px";
    header.style.marginBottom = "12px";
    header.textContent = "Extension Settings";
    sec.appendChild(header);
    
    // Font size control
    const fontSizeDiv = document.createElement('div');
    fontSizeDiv.style.marginBottom = '15px';
    
    const fontSizeLabel = document.createElement('div');
    fontSizeLabel.textContent = 'Font Size:';
    fontSizeLabel.style.marginBottom = '5px';
    fontSizeDiv.appendChild(fontSizeLabel);
    
    const fontSizeBtnContainer = document.createElement('div');
    fontSizeBtnContainer.style.display = 'flex';
    fontSizeBtnContainer.style.gap = '10px';
    
    const initFontSize = loadPref("mtb_fontSize", 14);
    
    // Helper function to get theme-aware colors for selected font size button
    function getSelectedFontSizeColors() {
      const wrapper = document.getElementById("multitool-beast-wrapper");
      const isDarkMode = wrapper && wrapper.classList.contains("dark-mode");
      
      if (isDarkMode) {
        return {
          backgroundColor: '#2a3a4a',
          borderColor: '#4a90e2',
          color: '#80b3ff'
        };
      } else {
        return {
          backgroundColor: '#ddf4ff',
          borderColor: '#0366d6',
          color: ''
        };
      }
    }

    // Helper function to apply selected state to font size button
    function applySelectedFontSizeState(button) {
      const colors = getSelectedFontSizeColors();
      button.style.backgroundColor = colors.backgroundColor;
      button.style.borderColor = colors.borderColor;
      if (colors.color) {
        button.style.color = colors.color;
      }
    }

    // Helper function to clear font size button state
    function clearFontSizeButtonState(button) {
      button.style.backgroundColor = '';
      button.style.borderColor = '';
      button.style.color = '';
    }

    [12, 14, 16, 18].forEach(size => {
      const btn = document.createElement('button');
      btn.className = 'sway-btn-text';
      btn.textContent = size + 'px';
      btn.style.flex = '1';
      if (initFontSize === size) {
        applySelectedFontSizeState(btn);
      }
      btn.addEventListener('click', () => {
        savePref("mtb_fontSize", size);
        const wrapper = document.getElementById("multitool-beast-wrapper");
        if (wrapper) {
          wrapper.style.fontSize = size + 'px';
        }
        // Update button styles
        fontSizeBtnContainer.querySelectorAll('button').forEach(b => {
          clearFontSizeButtonState(b);
        });
        applySelectedFontSizeState(btn);
      });
      fontSizeBtnContainer.appendChild(btn);
    });
    
    fontSizeDiv.appendChild(fontSizeBtnContainer);
    sec.appendChild(fontSizeDiv);
    
    // Text Selection to Clipboard Toggle
    const textSelectionDiv = document.createElement('div');
    textSelectionDiv.style.marginBottom = '15px';
    
    const textSelectionLabel = document.createElement('div');
    textSelectionLabel.textContent = 'Text Selection to Clipboard:';
    textSelectionLabel.style.marginBottom = '5px';
    textSelectionLabel.style.fontWeight = 'bold';
    textSelectionDiv.appendChild(textSelectionLabel);
    
    const textSelectionDescription = document.createElement('div');
    textSelectionDescription.textContent = 'Enable floating + icon when selecting text to add to clipboard';
    textSelectionDescription.style.fontSize = '12px';
    textSelectionDescription.style.marginBottom = '8px';
    textSelectionDescription.className = 'mtb-text-selection-description';
    textSelectionDiv.appendChild(textSelectionDescription);
    
    const textSelectionToggleContainer = document.createElement('div');
    textSelectionToggleContainer.style.display = 'flex';
    textSelectionToggleContainer.style.gap = '10px';
    textSelectionToggleContainer.style.alignItems = 'center';
    
    const textSelectionEnabled = loadPref('mtb_textSelectionEnabled', true);
    
    const enableBtn = document.createElement('button');
    enableBtn.className = 'sway-btn-text';
    enableBtn.textContent = 'Enabled';
    enableBtn.style.flex = '1';
    
    const disableBtn = document.createElement('button');
    disableBtn.className = 'sway-btn-text';
    disableBtn.textContent = 'Disabled';
    disableBtn.style.flex = '1';
    
    // Helper function to apply selected state to text selection buttons
    function applyTextSelectionSelectedState(button) {
      const colors = getSelectedFontSizeColors(); // Reuse the theme-aware colors
      button.style.backgroundColor = colors.backgroundColor;
      button.style.borderColor = colors.borderColor;
      if (colors.color) {
        button.style.color = colors.color;
      }
    }
    
    // Helper function to clear text selection button state
    function clearTextSelectionButtonState(button) {
      button.style.backgroundColor = '';
      button.style.borderColor = '';
      button.style.color = '';
    }
    
    // Set initial button states
    if (textSelectionEnabled) {
      applyTextSelectionSelectedState(enableBtn);
    } else {
      applyTextSelectionSelectedState(disableBtn);
    }
    
    enableBtn.addEventListener('click', () => {
      savePref('mtb_textSelectionEnabled', true);
      applyTextSelectionSelectedState(enableBtn);
      clearTextSelectionButtonState(disableBtn);
      enableTextSelectionFeature();
      console.log('Text selection feature enabled');
    });
    
    disableBtn.addEventListener('click', () => {
      savePref('mtb_textSelectionEnabled', false);
      applyTextSelectionSelectedState(disableBtn);
      clearTextSelectionButtonState(enableBtn);
      disableTextSelectionFeature();
      console.log('Text selection feature disabled');
    });
    
    textSelectionToggleContainer.appendChild(enableBtn);
    textSelectionToggleContainer.appendChild(disableBtn);
    textSelectionDiv.appendChild(textSelectionToggleContainer);
    sec.appendChild(textSelectionDiv);

    // Agent Settings
    const agentSettingsDiv = document.createElement('div');
    agentSettingsDiv.style.marginTop = '15px';
    
    // Email field
    const emailDiv = document.createElement('div');
    emailDiv.style.marginBottom = '15px';
    
    const emailLabel = document.createElement('div');
    emailLabel.textContent = 'Agent Email:';
    emailLabel.style.marginBottom = '5px';
    emailLabel.style.fontWeight = 'bold';
    emailDiv.appendChild(emailLabel);
    
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'your.email@tealium.com';
    emailInput.className = 'sway-btn-text';
    emailInput.style.width = '100%';
    emailInput.style.padding = '8px';
    emailInput.style.fontSize = '14px';
    emailInput.value = loadPref('agent_email', '');
    emailInput.addEventListener('input', function() {
      savePref('agent_email', emailInput.value);
      console.log('Agent email saved:', emailInput.value);
    });
    emailDiv.appendChild(emailInput);
    
    agentSettingsDiv.appendChild(emailDiv);
    
    // Reporting Region field  
    const regionDiv = document.createElement('div');
    regionDiv.style.marginBottom = '15px';
    
    const regionLabel = document.createElement('div');
    regionLabel.textContent = 'Reporting Region:';
    regionLabel.style.marginBottom = '5px';
    regionLabel.style.fontWeight = 'bold';
    regionDiv.appendChild(regionLabel);
    
    const regionSelect = document.createElement('select');
    regionSelect.className = 'sway-btn-text';
    regionSelect.style.width = '100%';
    regionSelect.style.padding = '8px';
    regionSelect.style.fontSize = '14px';
    
    const regions = ['', 'EMEA', 'US', 'APJ', 'Global'];
    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region;
      option.textContent = region || 'Select Region...';
      regionSelect.appendChild(option);
    });
    
    regionSelect.value = loadPref('reporting_region', '');
    regionSelect.addEventListener('change', function() {
      savePref('reporting_region', regionSelect.value);
      console.log('Reporting region saved:', regionSelect.value);
    });
    regionDiv.appendChild(regionSelect);
    
    agentSettingsDiv.appendChild(regionDiv);
    
    // Reporting Group field
    const groupDiv = document.createElement('div');
    groupDiv.style.marginBottom = '15px';
    
    const groupLabel = document.createElement('div');
    groupLabel.textContent = 'Default Reporting Group (for Jira):';
    groupLabel.style.marginBottom = '5px';
    groupLabel.style.fontWeight = 'bold';
    groupDiv.appendChild(groupLabel);
    
    const groupSelect = document.createElement('select');
    groupSelect.className = 'sway-btn-text';
    groupSelect.style.width = '100%';
    groupSelect.style.padding = '8px';
    groupSelect.style.fontSize = '14px';
    
    const groups = [
      '', 
      'Customer Success', 
      'Sales', 
      'Marketing', 
      'Engineering', 
      'Product', 
      'Support',
      'Operations',
      'Professional Services',
      'Implementation',
      'Solutions Engineering',
      'Technical Account Management',
      'Business Development',
      'Finance',
      'Legal',
      'IT',
      'Quality Assurance',
      'Data & Analytics',
      'Security',
      'Compliance'
    ];
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group || 'Select Group...';
      groupSelect.appendChild(option);
    });
    
    groupSelect.value = loadPref('reporting_group', 'Customer Success');
    groupSelect.addEventListener('change', function() {
      savePref('reporting_group', groupSelect.value);
      console.log('Reporting group saved:', groupSelect.value);
    });
    groupDiv.appendChild(groupSelect);
    
    agentSettingsDiv.appendChild(groupDiv);
    
    // Default Permission Reason field
    const permissionReasonDiv = document.createElement('div');
    permissionReasonDiv.style.marginBottom = '15px';
    
    const permissionReasonLabel = document.createElement('div');
    permissionReasonLabel.textContent = 'Default Permission Reason:';
    permissionReasonLabel.style.marginBottom = '5px';
    permissionReasonLabel.style.fontWeight = 'bold';
    permissionReasonDiv.appendChild(permissionReasonLabel);
    
    const permissionReasonInput = document.createElement('input');
    permissionReasonInput.type = 'text';
    permissionReasonInput.placeholder = 'Permission required to investigate an issue';
    permissionReasonInput.className = 'sway-btn-text';
    permissionReasonInput.style.width = '100%';
    permissionReasonInput.style.padding = '8px';
    permissionReasonInput.style.fontSize = '14px';
    permissionReasonInput.value = loadPref('default_permission_reason', 'Permission required to investigate an issue');
    permissionReasonInput.addEventListener('input', function() {
      savePref('default_permission_reason', permissionReasonInput.value);
      console.log('Default permission reason saved:', permissionReasonInput.value);
    });
    permissionReasonDiv.appendChild(permissionReasonInput);
    
    agentSettingsDiv.appendChild(permissionReasonDiv);
    sec.appendChild(agentSettingsDiv);
    
    // Time Tracker Checker Toggle
    const timeTrackerDiv = document.createElement('div');
    timeTrackerDiv.style.marginBottom = '15px';
    timeTrackerDiv.style.marginTop = '20px';
    timeTrackerDiv.style.padding = '15px';
    timeTrackerDiv.style.borderRadius = '8px';
    timeTrackerDiv.className = 'mtb-time-tracker-container';
    
    const timeTrackerLabel = document.createElement('div');
    timeTrackerLabel.textContent = 'Time Tracker Checker:';
    timeTrackerLabel.style.marginBottom = '5px';
    timeTrackerLabel.style.fontWeight = 'bold';
    timeTrackerDiv.appendChild(timeTrackerLabel);
    
    const timeTrackerDescription = document.createElement('div');
    timeTrackerDescription.textContent = 'Prevents navigation away from tickets when you forgot to track your time after sending a reply';
    timeTrackerDescription.style.fontSize = '12px';
    timeTrackerDescription.style.marginBottom = '8px';
    timeTrackerDescription.className = 'mtb-time-tracker-description';
    timeTrackerDiv.appendChild(timeTrackerDescription);
    
    const timeTrackerToggleContainer = document.createElement('div');
    timeTrackerToggleContainer.style.display = 'flex';
    timeTrackerToggleContainer.style.gap = '10px';
    timeTrackerToggleContainer.style.alignItems = 'center';
    
    const timeTrackerEnabled = loadPref('mtb_timeTrackerEnabled', true);
    
    const timeTrackerEnableBtn = document.createElement('button');
    timeTrackerEnableBtn.className = 'sway-btn-text';
    timeTrackerEnableBtn.textContent = 'Enabled';
    timeTrackerEnableBtn.style.flex = '1';
    
    const timeTrackerDisableBtn = document.createElement('button');
    timeTrackerDisableBtn.className = 'sway-btn-text';
    timeTrackerDisableBtn.textContent = 'Disabled';
    timeTrackerDisableBtn.style.flex = '1';
    
    // Set initial button states
    if (timeTrackerEnabled) {
      applyTextSelectionSelectedState(timeTrackerEnableBtn);
    } else {
      applyTextSelectionSelectedState(timeTrackerDisableBtn);
    }
    
    timeTrackerEnableBtn.addEventListener('click', () => {
      savePref('mtb_timeTrackerEnabled', true);
      applyTextSelectionSelectedState(timeTrackerEnableBtn);
      clearTextSelectionButtonState(timeTrackerDisableBtn);
      console.log('Time Tracker Checker enabled');
    });
    
    timeTrackerDisableBtn.addEventListener('click', () => {
      savePref('mtb_timeTrackerEnabled', false);
      applyTextSelectionSelectedState(timeTrackerDisableBtn);
      clearTextSelectionButtonState(timeTrackerEnableBtn);
      console.log('Time Tracker Checker disabled');
    });
    
    timeTrackerToggleContainer.appendChild(timeTrackerEnableBtn);
    timeTrackerToggleContainer.appendChild(timeTrackerDisableBtn);
    timeTrackerDiv.appendChild(timeTrackerToggleContainer);
    sec.appendChild(timeTrackerDiv);
    
    // Field Selection Settings
    const fieldSelectionDiv = document.createElement('div');
    fieldSelectionDiv.style.marginTop = '20px';
    fieldSelectionDiv.style.padding = '15px';
    fieldSelectionDiv.style.borderRadius = '8px';
    fieldSelectionDiv.className = 'mtb-field-selection-container';
    
    const fieldSelectionHeader = document.createElement('h4');
    fieldSelectionHeader.textContent = 'Auto-Population Field Selection';
    fieldSelectionHeader.style.marginBottom = '15px';
    fieldSelectionHeader.style.fontSize = '15px';
    fieldSelectionHeader.className = 'mtb-field-selection-header';
    fieldSelectionDiv.appendChild(fieldSelectionHeader);
    
    const fieldDescription = document.createElement('p');
    fieldDescription.textContent = 'Choose which fields to auto-populate when using the Populate button in forms:';
    fieldDescription.style.marginBottom = '15px';
    fieldDescription.style.fontSize = '13px';
    fieldDescription.className = 'mtb-field-selection-description';
    fieldSelectionDiv.appendChild(fieldDescription);
    
    // Jira Fields Section
    const jiraFieldsDiv = document.createElement('div');
    jiraFieldsDiv.style.marginBottom = '20px';
    
    const jiraFieldsHeader = document.createElement('h5');
    jiraFieldsHeader.textContent = 'Jira Issue Forms:';
    jiraFieldsHeader.style.marginBottom = '10px';
    jiraFieldsHeader.style.fontWeight = 'bold';
    jiraFieldsHeader.style.fontSize = '14px';
    jiraFieldsDiv.appendChild(jiraFieldsHeader);
    
    const jiraFields = [
      { key: 'jira_reporting_region', label: 'Reporting Region', default: true },
      { key: 'jira_reporting_group', label: 'Reporting Group', default: true },
      { key: 'jira_environment', label: 'Environment', default: true },
      { key: 'jira_regions_impacted', label: 'Region(s) Impacted', default: true },
      { key: 'jira_account_profile', label: 'Account / Profile', default: true },
      { key: 'jira_affected_clients', label: 'Affected Clients', default: true },
      { key: 'jira_carr_range', label: 'Total Revenue Impact (CARR Range)', default: true }
    ];
    
    jiraFields.forEach(field => {
      const fieldDiv = document.createElement('div');
      fieldDiv.style.display = 'flex';
      fieldDiv.style.alignItems = 'center';
      fieldDiv.style.marginBottom = '8px';
      fieldDiv.style.paddingLeft = '10px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `field_${field.key}`;
      checkbox.checked = loadPref(`mtb_populate_${field.key}`, field.default);
      checkbox.style.marginRight = '8px';
      checkbox.addEventListener('change', function() {
        savePref(`mtb_populate_${field.key}`, checkbox.checked);
        console.log(`Field preference saved: ${field.key} = ${checkbox.checked}`);
      });
      
      const label = document.createElement('label');
      label.htmlFor = `field_${field.key}`;
      label.textContent = field.label;
      label.style.fontSize = '13px';
      label.style.cursor = 'pointer';
      
      fieldDiv.appendChild(checkbox);
      fieldDiv.appendChild(label);
      jiraFieldsDiv.appendChild(fieldDiv);
    });
    
    fieldSelectionDiv.appendChild(jiraFieldsDiv);
    
    // Permission Request Fields Section
    const permissionFieldsDiv = document.createElement('div');
    
    const permissionFieldsHeader = document.createElement('h5');
    permissionFieldsHeader.textContent = 'Permission Request Forms:';
    permissionFieldsHeader.style.marginBottom = '10px';
    permissionFieldsHeader.style.fontWeight = 'bold';
    permissionFieldsHeader.style.fontSize = '14px';
    permissionFieldsDiv.appendChild(permissionFieldsHeader);
    
    const permissionFields = [
      { key: 'perm_reason', label: 'Reason for Desired Permission', default: true },
      { key: 'perm_reporting_group', label: 'Reporting Group', default: true },
      { key: 'perm_reporting_region', label: 'Reporting Region', default: true },
      { key: 'perm_accounts', label: 'Account(s) / Profile(s)', default: true },
      { key: 'perm_internal_users', label: 'Internal User(s)', default: true },
      { key: 'perm_platform_part', label: 'Part of Tealium Platform', default: true },
      { key: 'perm_permission_level', label: 'Desired Permission Level', default: true }
    ];
    
    permissionFields.forEach(field => {
      const fieldDiv = document.createElement('div');
      fieldDiv.style.display = 'flex';
      fieldDiv.style.alignItems = 'center';
      fieldDiv.style.marginBottom = '8px';
      fieldDiv.style.paddingLeft = '10px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `field_${field.key}`;
      checkbox.checked = loadPref(`mtb_populate_${field.key}`, field.default);
      checkbox.style.marginRight = '8px';
      checkbox.addEventListener('change', function() {
        savePref(`mtb_populate_${field.key}`, checkbox.checked);
        console.log(`Field preference saved: ${field.key} = ${checkbox.checked}`);
      });
      
      const label = document.createElement('label');
      label.htmlFor = `field_${field.key}`;
      label.textContent = field.label;
      label.style.fontSize = '13px';
      label.style.cursor = 'pointer';
      
      fieldDiv.appendChild(checkbox);
      fieldDiv.appendChild(label);
      permissionFieldsDiv.appendChild(fieldDiv);
    });
    
    fieldSelectionDiv.appendChild(permissionFieldsDiv);
    
    // Bulk actions
    const bulkActionsDiv = document.createElement('div');
    bulkActionsDiv.style.marginTop = '15px';
    bulkActionsDiv.style.display = 'flex';
    bulkActionsDiv.style.gap = '10px';
    
    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'sway-btn-text';
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.style.fontSize = '12px';
    selectAllBtn.style.padding = '6px 12px';
    selectAllBtn.addEventListener('click', function() {
      document.querySelectorAll('#tab-content-settings input[type="checkbox"][id^="field_"]').forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      });
    });
    
    const selectNoneBtn = document.createElement('button');
    selectNoneBtn.className = 'sway-btn-text';
    selectNoneBtn.textContent = 'Select None';
    selectNoneBtn.style.fontSize = '12px';
    selectNoneBtn.style.padding = '6px 12px';
    selectNoneBtn.addEventListener('click', function() {
      document.querySelectorAll('#tab-content-settings input[type="checkbox"][id^="field_"]').forEach(cb => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
      });
    });
    
    bulkActionsDiv.appendChild(selectAllBtn);
    bulkActionsDiv.appendChild(selectNoneBtn);
    fieldSelectionDiv.appendChild(bulkActionsDiv);
    
    sec.appendChild(fieldSelectionDiv);
    
    container.appendChild(sec);
  }

  /***************************************************
   * FRESHDESK-SPECIFIC FUNCTIONS
   ***************************************************/
  
  
  
  function fetchCARR(callback) {
    console.log(`🔍 Starting CARR fetch...`);
    
    // Try multiple selectors for CARR in order of specificity
    const carrSelectors = [
      '[data-test-id="requester-info-company-carr_usd"] .info-details-content',
      '[data-test-id="requester-info-company-carr_usd"] .text__content',
      '[data-test-id="requester-info-company-carr_usd"] div[data-heap-redact-text="true"]'
    ];
    
    let carrElem = null;
    let usedSelector = '';
    
    for (let selector of carrSelectors) {
      console.log(`🔍 Trying selector: ${selector}`);
      carrElem = document.querySelector(selector);
      if (carrElem) {
        usedSelector = selector;
        console.log(`✅ Found element with selector: ${selector}`);
        console.log(`📋 Element content: "${carrElem.textContent.trim()}"`);
        console.log(`📋 Element HTML: ${carrElem.outerHTML}`);
        break;
      } else {
        console.log(`❌ No element found with selector: ${selector}`);
      }
    }
    
    if (carrElem) {
      let cVal = carrElem.textContent.trim();
      console.log(`🔍 Raw CARR value extracted: "${cVal}"`);
      
      // Clean and validate the value
      const cleanValue = cVal.replace(/[^0-9]/g, ''); // Remove everything except numbers
      console.log(`🔍 Cleaned CARR value: "${cleanValue}"`);
      
      if (cleanValue && !isNaN(cleanValue)) {
        // Format as currency with $ sign
        const numericValue = parseInt(cleanValue, 10);
        cVal = numericValue.toLocaleString() + "$";
        console.log(`✅ Final formatted CARR: ${cVal} (numeric: ${numericValue})`);
      } else {
        console.log(`⚠️ Invalid CARR value after cleaning: "${cleanValue}"`);
        cVal = "N/A";
      }
      callback(cVal);
      return;
    }
    
    // Fallback: search all elements containing "carr" text
    console.log(`🔍 Fallback: searching all elements with CARR text...`);
    const allElements = document.querySelectorAll('*');
    for (let elem of allElements) {
      const elemText = elem.textContent?.toLowerCase() || '';
      if (elemText.includes('carr') && elem.children.length === 0) { // leaf element
        const parentContainer = elem.closest('[data-test-id*="carr"]');
        if (parentContainer) {
          const valueElem = parentContainer.querySelector('[data-heap-redact-text="true"], .info-details-content, .text__content');
          if (valueElem && valueElem !== elem) {
            const val = valueElem.textContent.trim();
            console.log(`🎯 Fallback found CARR value: "${val}"`);
            const cleanValue = val.replace(/[^0-9]/g, '');
            if (cleanValue && !isNaN(cleanValue)) {
              const numericValue = parseInt(cleanValue, 10);
              const formattedVal = numericValue.toLocaleString() + "$";
              console.log(`✅ Fallback formatted CARR: ${formattedVal}`);
              callback(formattedVal);
              return;
            }
          }
        }
      }
    }
    
    console.log(`❌ CARR element not found with any method`);
    callback("N/A");
  }
  
  /***************************************************
   * TIME TRACKER CHECKER FUNCTIONS
   ***************************************************/
  
  // Function to show the time tracker navigation notice
  function showTimeTrackerNavigationNotice(previousUrl) {
    console.log('⏰ showTimeTrackerNavigationNotice called:', {
      previousUrl: previousUrl,
      currentlyVisible: timeTrackerNotificationVisible,
      existingNotification: !!document.getElementById('mtb-time-tracker-notification')
    });
    
    // Force remove any existing notification first (SPA safety)
    const existingNotification = document.getElementById('mtb-time-tracker-notification');
    if (existingNotification) {
      console.log('⏰ Removing existing notification for fresh start');
      existingNotification.remove();
    }
    
    // Reset state for fresh start
    timeTrackerNotificationVisible = false;
    
    console.log('⏰ Creating new time tracker navigation notice');
    timeTrackerNotificationVisible = true;
    
    const notification = document.createElement('div');
    notification.className = 'mtb-time-tracker-notification';
    notification.id = 'mtb-time-tracker-notification';
    
    notification.innerHTML = `
      <div class="mtb-time-tracker-notification-header">
        <div class="mtb-time-tracker-notification-icon">⏰</div>
        <div>Time Tracking Reminder</div>
      </div>
      <div class="mtb-time-tracker-notification-body">
        <div class="mtb-time-tracker-notification-message">
          You navigated away from a ticket without tracking your time. Would you like to return to add your time entry?
        </div>
        <div class="mtb-time-tracker-notification-actions">
          <button class="mtb-time-tracker-btn mtb-time-tracker-btn-secondary" id="mtb-ignore-btn">
            IGNORE
          </button>
          <button class="mtb-time-tracker-btn mtb-time-tracker-btn-primary" id="mtb-return-btn">
            RETURN TO TICKET
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    console.log('⏰ Notification element added to DOM');
    
    // Add event listeners after the element is in the DOM
    const ignoreBtn = document.getElementById('mtb-ignore-btn');
    const returnBtn = document.getElementById('mtb-return-btn');
    
    if (ignoreBtn) {
      ignoreBtn.addEventListener('click', function() {
        console.log('⏰ Ignore button clicked');
        hideTimeTrackerNotification();
      });
      console.log('⏰ Ignore button event listener added');
    }
    
    if (returnBtn) {
      returnBtn.addEventListener('click', function() {
        console.log('⏰ Return button clicked');
        returnToPreviousTicket();
      });
      console.log('⏰ Return button event listener added');
    }
    
    console.log('⏰ Notification setup complete, should be visible now');
  }
  
  // Function to hide the time tracker notification
  function hideTimeTrackerNotification() {
    console.log('⏰ Hiding time tracker notification');
    const notification = document.getElementById('mtb-time-tracker-notification');
    if (notification) {
      notification.remove();
    }
    timeTrackerNotificationVisible = false;
    // Reset notification-related state to allow future notifications
    console.log('⏰ Notification state reset - ready for future notifications');
  }
  
  // Function to return to previous ticket
  function returnToPreviousTicket() {
    console.log('⏰ Returning to previous ticket');
    if (previousTicketUrl) {
      window.location.href = previousTicketUrl;
    }
    hideTimeTrackerNotification();
  }
  
  // Function to check if time tracking is missing
  function isTimeTrackingMissing() {
    const timeEntriesContent = document.querySelector('[data-test-id="time-entries_content"]');
    if (!timeEntriesContent) {
      console.log('⏰ Time entries content not found');
      return false;
    }
    
    // Check if the content is empty or only contains whitespace
    const isEmpty = timeEntriesContent.innerHTML.trim() === '' || 
                   timeEntriesContent.textContent.trim() === '';
    
    console.log('⏰ Time tracking missing:', isEmpty);
    return isEmpty;
  }
  
  // Function to check if current page is a ticket page
  function isTicketPage() {
    return window.location.pathname.includes('/a/tickets/') && 
           window.location.pathname.match(/\/a\/tickets\/\d+/);
  }
  // Function to set up URL change monitoring
  function setupTimeTrackerMonitoring() {
    if (!isFreshdesk) return;
    
    console.log('⏰ Setting up time tracker URL monitoring for SPA');
    
    // Initialize current URL if on ticket page
    if (isTicketPage()) {
      currentTicketUrl = window.location.href;
      console.log('⏰ Initial ticket URL:', currentTicketUrl);
      
      // Start checking time tracking status immediately
      setTimeout(() => {
        previousTicketHadMissingTime = isTimeTrackingMissing();
        console.log('⏰ Initial time tracking status:', previousTicketHadMissingTime ? 'missing' : 'present');
      }, 1000);
    }
    
    // Monitor for URL changes using popstate (back/forward)
    window.addEventListener('popstate', handleUrlChange);
    
    // Monitor for URL changes using pushstate override (programmatic navigation)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleUrlChange, 100);
    };
    
    // Monitor for URL changes using replaceState override
    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleUrlChange, 100);
    };
    
    // SPA-specific: Monitor for clicks that might change URL
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      if (target && target.href && target.href !== window.location.href) {
        console.log('⏰ Link clicked, will check for URL change');
        setTimeout(handleUrlChange, 500); // Give more time for navigation
      }
    });
    
    // SPA-specific: Interval-based URL checking for SPAs that don't trigger events
    let lastCheckedUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastCheckedUrl) {
        console.log('⏰ URL change detected via polling:', lastCheckedUrl, '→', currentUrl);
        lastCheckedUrl = currentUrl;
        handleUrlChange();
      }
    }, 1000); // Check every second
    
    // SPA-specific: Monitor DOM changes that indicate page transitions
    const bodyObserver = new MutationObserver((mutations) => {
      let significantChange = false;
      
      mutations.forEach((mutation) => {
        // Look for significant DOM changes that indicate navigation
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for main content containers that indicate page change
              if (node.classList && (
                node.classList.contains('main-content') ||
                node.classList.contains('ticket-content') ||
                node.classList.contains('page-content') ||
                node.id === 'main' ||
                node.tagName === 'MAIN'
              )) {
                significantChange = true;
              }
            }
          });
        }
      });
      
      if (significantChange) {
        console.log('⏰ Significant DOM change detected, checking URL');
        setTimeout(handleUrlChange, 200);
      }
    });
    
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Periodically check time tracking status while on a ticket page
    let timeTrackerCheckTimer = null;
    
    function startTimeTrackerCheck() {
      stopTimeTrackerCheck(); // Clear any existing timer
      
      if (isTicketPage()) {
        console.log('⏰ Starting periodic time tracking checks');
        timeTrackerCheckTimer = setInterval(() => {
          const isMissing = isTimeTrackingMissing();
          previousTicketHadMissingTime = isMissing;
          console.log('⏰ Periodic check - Time tracking status:', isMissing ? 'missing' : 'present');
        }, 5000); // Check every 5 seconds for more responsiveness
      }
    }
    
    function stopTimeTrackerCheck() {
      if (timeTrackerCheckTimer) {
        clearInterval(timeTrackerCheckTimer);
        timeTrackerCheckTimer = null;
        console.log('⏰ Stopped periodic time tracking checks');
      }
    }
    
    // Start checking immediately if on a ticket page
    if (isTicketPage()) {
      startTimeTrackerCheck();
    }
    
    // Override handleUrlChange to include timer management
    const originalHandleUrlChange = handleUrlChange;
    handleUrlChange = function() {
      const wasOnTicketPage = !!currentTicketUrl;
      const currentUrl = window.location.href;
      
      // Call original URL change logic
      originalHandleUrlChange();
      
      // Manage timer based on page type
      if (isTicketPage()) {
        if (!wasOnTicketPage) {
          console.log('⏰ Entered ticket page, starting monitoring');
          startTimeTrackerCheck();
        }
      } else {
        if (wasOnTicketPage) {
          console.log('⏰ Left ticket page, stopping monitoring');
          stopTimeTrackerCheck();
        }
      }
    };
  }
  // Make functions global so they can be called from notification buttons
  window.hideTimeTrackerNotification = hideTimeTrackerNotification;
  window.returnToPreviousTicket = returnToPreviousTicket;
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
            labelText = `**${labelText}**`;
            valueText = `[#${numericId}](${link})`;
          } else {
            labelText = `**${labelText}**`;
          }
          copyText += `${labelText}: ${valueText}\n`;
        }
      }
    });
    
    navigator.clipboard.writeText(copyText).then(function() {
      const copyBtn = document.getElementById('copy-all-selected-btn');
      if (copyBtn) {
        copyBtn.textContent = "Copied Selected!";
        setTimeout(function() { copyBtn.textContent = "Copy Selected"; }, 2000);
      }
    });
  }

  /***************************************************
   * JIRA-SPECIFIC FUNCTIONS
   ***************************************************/
  // Monitor for Jira modal form fields appearing
  let modalCheckInterval = null;
  
  function startModalMonitoring() {
    if (!isJira || modalCheckInterval) return;
    
    console.log("🔍 Starting Jira modal monitoring");
    modalCheckInterval = setInterval(() => {
      const hasFormFields = document.querySelector('#customfield_10744-container, #customfield_10702-container, #customfield_10652-container, #customfield_10599-container, #customfield_11724-container, #customfield_10843-container, #customfield_10689-container');
      const jiraTab = document.getElementById('tab-content-jira');
      const existingPopulateSection = jiraTab?.querySelector('[style*="rgba(0, 200, 0, 0.1)"], [style*="rgba(255, 165, 0, 0.1)"]');
      
      if (hasFormFields && jiraTab && !existingPopulateSection) {
        console.log("🎯 Jira form fields detected in modal - refreshing tab");
        populateJiraContent();
      }
      
      // Also inject button into modal footer if detected
      injectModalFooterButton();
    }, 2000); // Check every 2 seconds
  }
  
  // Inject populate button into modal footer
  function injectModalFooterButton() {
    const modalFooter = document.querySelector('[data-testid="issue-create.ui.modal.modal-wrapper.modal--footer"]');
    const hasFormFields = document.querySelector('#customfield_10744-container, #customfield_10702-container, #customfield_10652-container, #customfield_10599-container, #customfield_11724-container, #customfield_10843-container, #customfield_10689-container');
    const existingButton = document.getElementById('mtb-modal-populate-btn');
    
    if (modalFooter && hasFormFields && !existingButton) {
      console.log("🎯 Injecting populate button into modal footer");
      
      // Create the populate button
      const populateBtn = document.createElement('button');
      populateBtn.id = 'mtb-modal-populate-btn';
      populateBtn.className = 'css-1i2jkn6'; // Same style as Create button
      populateBtn.type = 'button';
      populateBtn.tabIndex = 0;
      populateBtn.style.marginRight = '8px';
      populateBtn.style.backgroundColor = '#4caf50';
      populateBtn.style.borderColor = '#4caf50';
      
      const buttonSpan = document.createElement('span');
      buttonSpan.className = 'css-178ag6o';
      buttonSpan.textContent = '🔧 Auto-Fill';
      populateBtn.appendChild(buttonSpan);
      
      // Add click handler
      populateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 Modal footer populate button clicked");
        populateJiraFormFields();
      });
      
      // Insert before the Create button
      const createButton = modalFooter.querySelector('[data-testid="issue-create.common.ui.footer.create-button"]');
      if (createButton) {
        modalFooter.insertBefore(populateBtn, createButton);
        console.log("✅ Populate button injected into modal footer");
      }
    } else if (!hasFormFields && existingButton) {
      // Remove button if form fields are no longer present
      existingButton.remove();
      console.log("🧹 Removed populate button from modal footer");
    }
  }
  
  function stopModalMonitoring() {
    if (modalCheckInterval) {
      clearInterval(modalCheckInterval);
      modalCheckInterval = null;
      console.log("🛑 Stopped Jira modal monitoring");
    }
  }
async function selectWorkType(workType) {
  console.log(`🎯 SELECTING WORK TYPE: ${workType}`);
  
  // Wait for modal to fully load
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Enhanced work type selection with detailed debugging
  function findAndSelectWorkType() {
    console.log(`🔍 Looking for work type field...`);
    
    // Updated selectors based on current Jira interface HTML structure
    const selectors = [
      '#issue-create\\.ui\\.modal\\.create-form\\.type-picker\\.issue-type-select input',
      'div[id="issue-create.ui.modal.create-form.type-picker.issue-type-select"] input',
      '[id*="type-picker"] input[role="combobox"]',
      'input[role="combobox"][aria-required="true"]',
      'input[autocomplete="off"][role="combobox"]',
      '[data-testid="ui-modifications-view-gic.ui.field-decorator.enabled-field-decorator.visibility-wrapper.issuetype"] input',
      'div[class*="-container"] input[role="combobox"]',
      '[id*="react-select"] input'
    ];
    
    let workTypeInput = null;
    let selectorUsed = '';
    
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        workTypeInput = document.querySelector(selector);
        if (workTypeInput && workTypeInput.offsetParent !== null) { // Check if visible
          selectorUsed = selector;
          console.log(`✅ Found visible work type input with selector ${i + 1}: "${selector}"`);
          break;
        } else if (workTypeInput) {
          console.log(`⚠️ Found work type input but not visible with selector ${i + 1}: "${selector}"`);
        } else {
          console.log(`❌ Selector ${i + 1} failed: "${selector}"`);
        }
      } catch (e) {
        console.log(`❌ Selector ${i + 1} error: "${selector}" - ${e.message}`);
      }
    }
    
    if (!workTypeInput) {
      console.log(`❌ Work type input not found. Debugging...`);
      
      // Debug: log modal content
      const modal = document.querySelector('[role="dialog"], [data-testid*="modal"], [aria-modal="true"]');
      if (modal) {
        console.log(`📋 Modal found, searching for inputs...`);
        const allInputs = modal.querySelectorAll('input');
        console.log(`📝 All inputs in modal (${allInputs.length}):`, 
          Array.from(allInputs).map((inp, idx) => ({
            index: idx,
            id: inp.id,
            role: inp.getAttribute('role'),
            placeholder: inp.placeholder,
            ariaLabel: inp.getAttribute('aria-label'),
            type: inp.type,
            required: inp.required || inp.getAttribute('aria-required')
          }))
        );
        
        // Try to find any combobox
        const comboboxes = modal.querySelectorAll('[role="combobox"]');
        if (comboboxes.length > 0) {
          workTypeInput = comboboxes[0];
          console.log(`🎯 Using first combobox found:`, workTypeInput);
        }
      } else {
        console.log(`❌ No modal found at all`);
      }
    }
    
    if (workTypeInput) {
      console.log(`🔘 Work type input details:`, {
        id: workTypeInput.id,
        role: workTypeInput.getAttribute('role'),
        value: workTypeInput.value,
        placeholder: workTypeInput.placeholder,
        isVisible: workTypeInput.offsetParent !== null,
        isEnabled: !workTypeInput.disabled
      });
      
      // Open the dropdown with enhanced reliability
      console.log(`🔽 Opening work type dropdown...`);
      
      // Scroll to input and focus
      workTypeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      workTypeInput.focus();
      
      setTimeout(() => {
        // Multiple click approaches for dropdown opening
        workTypeInput.click();
        
        // Find and click the container (updated selector for current UI)
        const container = workTypeInput.closest('.-container, [class*="control"], div[id*="type-picker"]');
        if (container) {
          console.log(`📦 Found container, clicking...`);
          container.click();
          
          // Find and click dropdown indicator with updated selectors
          const indicatorSelectors = [
            '[aria-label="open"]',
            '[role="img"][aria-label="open"]',
            'span:has(svg)',
            '[class*="indicator"]', 
            '[class*="dropdown"]',
            'div[class*="-IndicatorsContainer"]'
          ];
          
          let indicator = null;
          for (const sel of indicatorSelectors) {
            indicator = container.querySelector(sel);
            if (indicator) {
              console.log(`🔽 Found dropdown indicator with selector: ${sel}`);
              break;
            }
          }
          
          if (indicator) {
            console.log(`🔽 Clicking dropdown indicator...`);
            indicator.click();
            indicator.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
        
        // Keyboard approach as backup
        workTypeInput.dispatchEvent(new KeyboardEvent('keydown', { 
          key: 'ArrowDown', 
          bubbles: true, 
          cancelable: true 
        }));
        
      }, 200);
      
              // Wait for dropdown options to appear and select the right one
        setTimeout(() => {
          console.log(`🔍 Looking for dropdown options...`);
          
          // Enhanced option detection with updated selectors
          const optionSelectors = [
            '[role="option"]',
            '[data-testid*="option"]', 
            'div[class*="option"]',
            '[id*="option"]',
            '[aria-selected]',
            'div[data-testid*="format-option-label"]',
            'div:has([data-testid*="format-option-label"])'
          ];
          
          let allOptions = [];
          optionSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
              console.log(`📋 Found ${found.length} options with selector: ${selector}`);
              allOptions = [...allOptions, ...Array.from(found)];
            }
          });
          
          // Remove duplicates and filter for visible options only
          allOptions = [...new Set(allOptions)].filter(option => option.offsetParent !== null);
          
          console.log(`📋 Total visible unique options found: ${allOptions.length}`);
          allOptions.forEach((option, idx) => {
            console.log(`   Option ${idx}: "${option.textContent?.trim()}" (${option.tagName})`);
          });
          
          // Find the target option by text content match (more flexible)
          console.log(`🎯 Looking for match for: "${workType}"`);
          
          let targetOption = null;
          
          // Try different matching strategies
          for (let i = 0; i < allOptions.length; i++) {
            const option = allOptions[i];
            const optionText = option.textContent?.trim().toLowerCase();
            const targetText = workType.toLowerCase();
            
            console.log(`   Checking option ${i}: "${optionText}" against "${targetText}"`);
            
            // Exact match
            if (optionText === targetText) {
              targetOption = option;
              console.log(`✅ Found exact match at index ${i}: "${optionText}"`);
              break;
            }
            
            // Contains match (for partial text)
            if (optionText.includes(targetText) || targetText.includes(optionText)) {
              targetOption = option;
              console.log(`✅ Found partial match at index ${i}: "${optionText}"`);
              break;
            }
          }
          
          // If no text match, try position-based selection with fallback
          if (!targetOption && allOptions.length > 0) {
            console.log(`⚠️ No text match found, trying position-based selection...`);
            
            let targetIndex = -1;
            if (workType.toLowerCase().includes('bug')) {
              // Look for Bug - usually appears early in list
              targetIndex = Math.min(1, allOptions.length - 1);
            } else if (workType.toLowerCase().includes('enhancement')) {
              // Look for Enhancement - usually appears later
              targetIndex = Math.min(2, allOptions.length - 1);
            }
            
            if (targetIndex >= 0 && targetIndex < allOptions.length) {
              targetOption = allOptions[targetIndex];
              console.log(`🎯 Using position-based selection: index ${targetIndex} = "${targetOption.textContent?.trim()}"`);
            }
          }
        
                  if (targetOption) {
            console.log(`✅ Found target option: "${targetOption.textContent?.trim()}"`);
            
            // Enhanced option selection with multiple methods and verification
            console.log(`🖱️ Attempting to select option with enhanced sequence...`);
            
            // Method 1: Ensure option is visible and focused
            targetOption.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
              // Focus the option
              targetOption.focus();
              
              // Method 2: Standard click
              targetOption.click();
              
              // Method 3: Enhanced mouse event sequence with proper timing
              const mouseEvents = ['mousedown', 'mouseup', 'click'];
              let eventIndex = 0;
              
              const dispatchNextEvent = () => {
                if (eventIndex < mouseEvents.length) {
                  const eventType = mouseEvents[eventIndex];
                  targetOption.dispatchEvent(new MouseEvent(eventType, { 
                    bubbles: true, 
                    cancelable: true,
                    view: window,
                    detail: 1,
                    clientX: targetOption.getBoundingClientRect().left + 10,
                    clientY: targetOption.getBoundingClientRect().top + 10
                  }));
                  console.log(`   Dispatched ${eventType} event`);
                  eventIndex++;
                  setTimeout(dispatchNextEvent, 75); // Slightly longer delay
                } else {
                  // Continue with other methods after mouse events are done
                  completeSelection();
                }
              };
              
              const completeSelection = () => {
                // Method 4: Try clicking parent elements that might be clickable
                const clickableParent = targetOption.closest('[role="option"], [data-testid*="option"], div[class*="option"]');
                if (clickableParent && clickableParent !== targetOption) {
                  console.log(`🎯 Also clicking parent option element...`);
                  clickableParent.click();
                  clickableParent.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                }
                
                // Method 5: Keyboard selection as backup
                targetOption.dispatchEvent(new KeyboardEvent('keydown', { 
                  key: 'Enter', 
                  bubbles: true, 
                  cancelable: true 
                }));
                
                // Method 6: Pointer events for modern React components
                if (window.PointerEvent) {
                  targetOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                  targetOption.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
                }
                
                console.log(`🎯 Work type "${workType}" selection attempted with all methods!`);
                
                // Verify selection after a delay
                setTimeout(() => {
                  const currentValue = workTypeInput.value || workTypeInput.getAttribute('aria-describedby');
                  const selectedText = document.querySelector('[id*="single-value"]')?.textContent?.trim();
                  console.log(`🔍 Verification - Input value: "${currentValue}", Selected text: "${selectedText}"`);
                  
                  if (selectedText && selectedText.toLowerCase().includes(workType.toLowerCase())) {
                    console.log(`✅ Selection verified: "${workType}" is now selected!`);
                  } else {
                    console.log(`⚠️ Selection may not have worked, current selection: "${selectedText}"`);
                  }
                }, 500);
              };
            
            dispatchNextEvent();
          }, 100);
        } else {
          console.log(`❌ Target option for "${workType}" not found`);
          console.log(`💡 Available options:`, allOptions.map(o => o.textContent?.trim()));
          
          // Fallback: use keyboard navigation if we know the index
          console.log(`⌨️ Trying keyboard navigation fallback...`);
          const targetIndex = workType === 'Bug' ? 1 : workType === 'Enhancement' ? 3 : -1;
          
          if (targetIndex >= 0) {
            let currentIndex = 0;
            const navigateToTarget = () => {
              if (currentIndex < targetIndex) {
                workTypeInput.dispatchEvent(new KeyboardEvent('keydown', { 
                  key: 'ArrowDown', 
                  bubbles: true, 
                  cancelable: true 
                }));
                currentIndex++;
                setTimeout(navigateToTarget, 150);
              } else {
                setTimeout(() => {
                  workTypeInput.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'Enter', 
                    bubbles: true, 
                    cancelable: true 
                  }));
                  console.log(`⌨️ Pressed Enter to select option ${targetIndex}`);
                }, 200);
              }
            };
            navigateToTarget();
          }
        }
        
      }, 1500); // Wait longer for options to load
      
    } else {
      console.log(`❌ Could not find work type input field at all`);
    }
  }
  
  // Start the selection process
  findAndSelectWorkType();
}
  function populateJiraFormFields() {
    console.log("🚀 Starting form population...");
    
    // Check for permission request form first
    if (window.location.href.includes('/servicedesk/customer/portal/7/group/33/create/348') || 
        document.querySelector('[data-test-id="request-field-description"]')) {
      console.log("🔐 Detected permission request form");
      populatePermissionRequestForm();
      return;
    }
    
    if (!isJira) return;
    
    console.log("🚀 Starting Jira issue form population...");
    
    // First check if any of our target fields are visible
    const targetFields = [
      '#customfield_10744-container', // Reporting Region
      '#customfield_10702-container', // Reporting Group  
      '#customfield_10652-container', // Account/Profile
      '#customfield_10599-container', // Total Revenue Impact
      '#customfield_11724-container', // Affected Clients
      '#customfield_10843-container', // Environment
      '#customfield_10689-container'  // Region(s) Impacted
    ];
    
    const availableFields = targetFields.filter(selector => document.querySelector(selector));
    console.log("🎯 Available target fields:", availableFields.map(f => f.replace('#customfield_', '').replace('-container', '')));
    
    if (availableFields.length === 0) {
      console.warn("⚠️ No Jira form fields detected! This usually means the create issue modal isn't open, fields haven't loaded yet, or you're on a different form.");
      return;
    }
    
    // Get stored data
    const reportingRegion = loadPref('reporting_region', '');
    const reportingGroup = loadPref('reporting_group', 'Customer Success');
    const agentEmail = loadPref('agent_email', '');
    const freshdeskData = loadPref('latest_freshdesk_data', null);
    
    let populatedFields = [];
    let errors = [];
    
    // Helper function to set text input value
    function setTextInput(fieldId, value, fieldName) {
      const input = document.querySelector(`#${fieldId}`);
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        populatedFields.push(`${fieldName}: ${value}`);
        console.log(`✅ Set ${fieldName} to: ${value}`);
      } else if (!input) {
        errors.push(`❌ Field not found: ${fieldName} (${fieldId})`);
      } else {
        console.log(`⚠️ No data for ${fieldName}`);
      }
    }
    
    // Helper function to set checkbox field
    function setCheckboxField(checkboxId, fieldName) {
      console.log(`🎯 Looking for checkbox: ${fieldName} with ID: ${checkboxId}`);
      
      // Try multiple selectors for better reliability
      let checkbox = null;
      const selectors = [
        `#${checkboxId}`, // Original ID (escaped)
        `input[name="customfield_10689"][value="12065"]`, // All Regions value
        `input[type="checkbox"][value="12065"]`, // By value
        `input[aria-labelledby*="customfield_10689"][value="12065"]` // By aria-labelledby
      ];
      
      for (let selector of selectors) {
        console.log(`🔍 Trying selector: ${selector}`);
        try {
          checkbox = document.querySelector(selector);
          if (checkbox) {
            console.log(`✅ Found checkbox with selector: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Invalid selector: ${selector} - ${error.message}`);
        }
      }
      
      if (checkbox) {
        try {
          console.log(`✅ Found checkbox element:`, checkbox);
          console.log(`📋 Checkbox checked state: ${checkbox.checked}`);
          console.log(`📋 Checkbox HTML: ${checkbox.outerHTML}`);
          
          if (!checkbox.checked) {
            console.log(`🎯 Attempting to check checkbox...`);
            
            // Try multiple methods to check the checkbox
            checkbox.click();
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            checkbox.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Verify it worked
            setTimeout(() => {
              console.log(`🔍 After click - checkbox checked state: ${checkbox.checked}`);
              if (checkbox.checked) {
                populatedFields.push(`${fieldName}: Successfully checked`);
                console.log(`✅ Successfully checked ${fieldName}`);
              } else {
                populatedFields.push(`${fieldName}: Attempted to check`);
                console.log(`⚠️ Attempted to check ${fieldName} but state unclear`);
              }
            }, 100);
            
          } else {
            console.log(`ℹ️ ${fieldName} already checked`);
            populatedFields.push(`${fieldName}: Already selected`);
          }
          
          return Promise.resolve();
        } catch (error) {
          console.error(`❌ Error setting checkbox ${fieldName}:`, error);
          errors.push(`❌ Error setting checkbox ${fieldName}: ${error.message}`);
          return Promise.resolve();
        }
      } else {
        console.log(`❌ Checkbox not found: ${fieldName} (tried multiple selectors)`);
        errors.push(`❌ Checkbox not found: ${fieldName} (tried multiple selectors)`);
        return Promise.resolve();
      }
    }

    // Helper function to set Affected Clients field (only if existing client found)
    function setAffectedClients(fieldId, accountName, fieldName) {
      const input = document.querySelector(`#${fieldId}`);
      if (input && accountName) {
        return new Promise((resolve) => {
          try {
            console.log(`🔍 === AFFECTED CLIENTS DEBUG START ===`);
            console.log(`🔍 Account name: "${accountName}"`);
            console.log(`🔍 Field ID: "${fieldId}"`);
            console.log(`🔍 Input element:`, input);
            
            // First check if the client is already selected
            const container = input.closest('[class*="control"]');
            console.log(`🔍 Container element:`, container);
            
            const existingSelections = container?.querySelectorAll('[class*="multi-value"] [class*="MultiValueLabel"]');
            console.log(`🔍 Existing selections found: ${existingSelections?.length || 0}`);
            
            if (existingSelections && existingSelections.length > 0) {
              for (let selection of existingSelections) {
                const selectionText = selection.textContent.trim();
                console.log(`🔍 Checking existing selection: "${selectionText}"`);
                if (selectionText.toLowerCase().includes(accountName.toLowerCase())) {
                  console.log(`✅ Client "${selectionText}" already selected for ${accountName}`);
                  populatedFields.push(`${fieldName}: ${selectionText} (already selected)`);
                  resolve();
                  return;
                }
              }
            }
            
            console.log(`🔍 No existing selection found, starting search...`);
            
            // Focus and clear the input
            input.focus();
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`🔍 Input cleared and focused`);
            
            // Type the account name character by character
            let i = 0;
            const typeInterval = setInterval(() => {
              if (i < accountName.length) {
                input.value += accountName[i];
                input.dispatchEvent(new Event('input', { bubbles: true }));
                console.log(`🔍 Typed: "${input.value}"`);
                i++;
              } else {
                clearInterval(typeInterval);
                console.log(`🔍 Finished typing "${accountName}", waiting for options...`);
                
                // Wait for options to appear
                let attempts = 0;
                const maxAttempts = 10;
                
                const checkForOptions = () => {
                  attempts++;
                  console.log(`🔍 === ATTEMPT ${attempts}/${maxAttempts} ===`);
                  
                  // Get all dropdown options
                  const options = document.querySelectorAll([
                    '[class*="option"]:not([class*="placeholder"]):not([class*="group"])',
                    '[role="option"]'
                  ].join(', '));
                  
                  console.log(`🔍 Found ${options.length} total options`);
                  
                  let selectedOption = null;
                  
                  if (options.length > 0) {
                    Array.from(options).forEach((option, index) => {
                      const optionText = option.textContent.trim();
                      console.log(`🔍 Option ${index + 1}: "${optionText}"`);
                      
                      // Look for any option that contains the account name
                      // Be more permissive - just find the account name, don't worry about "1-0" for now
                      if (optionText.toLowerCase().includes(accountName.toLowerCase())) {
                        console.log(`🎯 Found matching option: "${optionText}"`);
                        selectedOption = option;
                      }
                    });
                  }
                  
                  if (selectedOption) {
                    console.log(`🎯 Attempting to select option: "${selectedOption.textContent.trim()}"`);
                    
                    // Try to click the option
                    try {
                      // Scroll option into view
                      selectedOption.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      
                      // Create a proper mouse click event
                      const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                      });
                      
                      selectedOption.dispatchEvent(clickEvent);
                      console.log(`📌 Dispatched click event`);
                      
                      // Also try direct click
                      selectedOption.click();
                      console.log(`📌 Called click() method`);
                      
                    } catch (error) {
                      console.log(`⚠️ Click failed: ${error.message}`);
                    }
                    
                    // Verify selection after delay
                    setTimeout(() => {
                      const newSelections = container?.querySelectorAll('[class*="multi-value"] [class*="MultiValueLabel"]');
                      console.log(`🔍 Checking for new selections: ${newSelections?.length || 0}`);
                      
                      let found = false;
                      if (newSelections && newSelections.length > 0) {
                        Array.from(newSelections).forEach(selection => {
                          const text = selection.textContent.trim();
                          console.log(`🔍 New selection: "${text}"`);
                          if (text.toLowerCase().includes(accountName.toLowerCase())) {
                            populatedFields.push(`${fieldName}: ${text}`);
                            console.log(`✅ Successfully selected: ${text}`);
                            found = true;
                          }
                        });
                      }
                      
                      if (!found) {
                        console.log(`⚠️ Selection not confirmed, clearing input`);
                        input.value = '';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        populatedFields.push(`${fieldName}: Searched but no valid selection made`);
                      }
                      
                      console.log(`🔍 === AFFECTED CLIENTS DEBUG END ===`);
                      resolve();
                    }, 1000);
                    
                  } else if (attempts < maxAttempts) {
                    console.log(`⏳ No matching options yet, retrying in 500ms...`);
                    setTimeout(checkForOptions, 500);
                  } else {
                    console.log(`❌ No matching options found after ${maxAttempts} attempts`);
                    // Clear input to prevent accidental creation
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log(`🧹 Cleared input to prevent new client creation`);
                    console.log(`🔍 === AFFECTED CLIENTS DEBUG END ===`);
                    resolve();
                  }
                };
                
                // Start checking after initial delay
                setTimeout(checkForOptions, 1200);
              }
            }, 100); // Slower typing for better reliability
            
          } catch (error) {
            console.error(`❌ Error in setAffectedClients:`, error);
            errors.push(`❌ Error searching for client ${accountName}: ${error.message}`);
            resolve();
          }
        });
        
      } else if (!input) {
        errors.push(`❌ Field not found: ${fieldName} (${fieldId})`);
        return Promise.resolve();
      } else {
        console.log(`⚠️ No account name for ${fieldName}`);
        return Promise.resolve();
      }
    }

    // Helper function to set React Select dropdown value
    function setReactSelect(fieldId, value, fieldName) {
      const input = document.querySelector(`#${fieldId}`);
      if (input && value) {
        return new Promise((resolve) => {
          try {
            console.log(`🎯 Setting ${fieldName} to: ${value}`);
            
            // Step 1: Focus and clear the input
            input.focus();
            input.value = '';
            
            // Step 2: Type the value character by character to trigger filtering
            let i = 0;
            const typeInterval = setInterval(() => {
              if (i < value.length) {
                input.value += value[i];
                
                // Trigger input event for React
                const inputEvent = new Event('input', { bubbles: true });
                Object.defineProperty(inputEvent, 'target', { value: input });
                input.dispatchEvent(inputEvent);
                
                i++;
              } else {
                clearInterval(typeInterval);
                
                // Step 3: Wait for dropdown options to appear
                setTimeout(() => {
                  // Step 4: Look for and click the matching option
                  const options = document.querySelectorAll('[class*="option"]:not([class*="placeholder"]):not([class*="group"])');
                  let optionSelected = false;
                  
                  for (let option of options) {
                    const optionText = option.textContent.trim();
                    console.log(`🔍 Checking option: "${optionText}" against "${value}"`);
                    
                    if (optionText.toLowerCase().includes(value.toLowerCase()) || 
                        value.toLowerCase().includes(optionText.toLowerCase()) ||
                        optionText.toLowerCase() === value.toLowerCase()) {
                      
                      console.log(`✅ Clicking option: ${optionText}`);
                      option.click();
                      optionSelected = true;
                      populatedFields.push(`${fieldName}: ${optionText}`);
                      break;
                    }
                  }
                  
                  if (!optionSelected) {
                    // Step 5: If no option clicked, try pressing Enter to confirm typed value
                    console.log(`🔄 No option found, trying Enter key for ${fieldName}`);
                    const enterEvent = new KeyboardEvent('keydown', {
                      key: 'Enter',
                      keyCode: 13,
                      bubbles: true
                    });
                    input.dispatchEvent(enterEvent);
                    
                    // Check if the value stuck
                    setTimeout(() => {
                      const container = input.closest('[class*="control"]');
                      const selectedValue = container?.querySelector('[class*="single-value"]')?.textContent?.trim();
                      if (selectedValue && selectedValue !== '') {
                        populatedFields.push(`${fieldName}: ${selectedValue}`);
                        console.log(`✅ Enter key worked for ${fieldName}: ${selectedValue}`);
                      } else {
                        console.log(`⚠️ Failed to populate ${fieldName} with value: ${value}`);
                        errors.push(`❌ Could not select "${value}" for ${fieldName}`);
                      }
                      resolve();
                    }, 200);
                  } else {
                    resolve();
                  }
                }, 500); // Wait for options to load
              }
            }, 50); // Type each character with 50ms delay
            
          } catch (error) {
            console.error(`❌ Error setting ${fieldName}:`, error);
            errors.push(`❌ Error setting ${fieldName}: ${error.message}`);
            resolve();
          }
        });
        
      } else if (!input) {
        errors.push(`❌ Field not found: ${fieldName} (${fieldId})`);
        return Promise.resolve();
      } else {
        console.log(`⚠️ No data for ${fieldName}`);
        return Promise.resolve();
      }
    }
    
    // Helper function to map CARR value to dropdown option (matches Jira dropdown exactly)
    function getCarrRange(carrValue) {
      console.log(`🔍 getCarrRange called with: "${carrValue}" (type: ${typeof carrValue})`);
      
      if (!carrValue || carrValue === 'N/A' || carrValue === null || carrValue === undefined) {
        console.log(`❌ Invalid CARR value, returning null: ${carrValue}`);
        return null;
      }
      
      // Extract numeric value from CARR (remove $ and commas)
      const cleanValue = carrValue.replace(/[^0-9]/g, '');
      const numericCarr = parseInt(cleanValue);
      
      console.log(`🔍 Original: "${carrValue}" → Cleaned: "${cleanValue}" → Numeric: ${numericCarr}`);
      
      if (isNaN(numericCarr)) {
        console.log(`❌ CARR value is not a valid number: ${cleanValue}`);
        return null;
      }
      
      let selectedRange;
      if (numericCarr < 100000) {
        selectedRange = '$0 - $100,000';
      } else if (numericCarr < 200000) {
        selectedRange = '$100,000 - $200,000';
      } else if (numericCarr < 400000) {
        selectedRange = '$200,000 - $400,000';
      } else if (numericCarr < 800000) {
        selectedRange = '$400,000 - $800,000';
      } else if (numericCarr < 1500000) {
        selectedRange = '$800,000 - $1,500,000';
      } else if (numericCarr < 3000000) {
        selectedRange = '$1,500,000 - $3,000,000';
      } else {
        selectedRange = '$3,000,000 +';
      }
      
      console.log(`✅ CARR ${numericCarr} mapped to range: "${selectedRange}"`);
      return selectedRange;
    }
    
        async function populateFieldsSequentially() {
      try {
        console.log("🚀 Starting sequential field population...");
        
        // Check field preferences before populating
        const fieldPrefs = {
          reporting_region: loadPref('mtb_populate_jira_reporting_region', true),
          reporting_group: loadPref('mtb_populate_jira_reporting_group', true),
          environment: loadPref('mtb_populate_jira_environment', true),
          regions_impacted: loadPref('mtb_populate_jira_regions_impacted', true),
          account_profile: loadPref('mtb_populate_jira_account_profile', true),
          affected_clients: loadPref('mtb_populate_jira_affected_clients', true),
          carr_range: loadPref('mtb_populate_jira_carr_range', true)
        };
        
        console.log("🎛️ Field preferences:", fieldPrefs);
        
        // 1. Populate Reporting Region (customfield_10744)
        if (fieldPrefs.reporting_region && reportingRegion) {
          console.log("✅ Populating Reporting Region (enabled in settings)");
          await setReactSelect('customfield_10744-field', reportingRegion, 'Reporting Region');
        } else if (!fieldPrefs.reporting_region) {
          console.log("⏭️ Skipping Reporting Region (disabled in settings)");
        } else if (!reportingRegion) {
          console.log("⚠️ No Reporting Region data available (set in Settings)");
        }
        
        // 2. Populate Reporting Group (customfield_10702)
        if (fieldPrefs.reporting_group && reportingGroup) {
          console.log("✅ Populating Reporting Group (enabled in settings)");
          await setReactSelect('customfield_10702-field', reportingGroup, 'Reporting Group');
        } else if (!fieldPrefs.reporting_group) {
          console.log("⏭️ Skipping Reporting Group (disabled in settings)");
        } else if (!reportingGroup) {
          console.log("⚠️ No Reporting Group data available (set in Settings)");
        }
        
        // 3. Populate Environment (customfield_10843) - Default to "GA Production"
        if (fieldPrefs.environment) {
          console.log("✅ Populating Environment (enabled in settings)");
        await setReactSelect('customfield_10843-field', 'GA Production', 'Environment');
        } else {
          console.log("⏭️ Skipping Environment (disabled in settings)");
        }
        
        // 4. Populate Region(s) Impacted (customfield_10689) - Default to "All Regions"
        if (fieldPrefs.regions_impacted) {
          console.log("✅ Populating Region(s) Impacted (enabled in settings)");
          setCheckboxField('customfield_10689-12065', 'Region(s) Impacted (All Regions)');
        } else {
          console.log("⏭️ Skipping Region(s) Impacted (disabled in settings)");
        }
        
        // 5. Populate Account/Profile (customfield_10652)
        if (fieldPrefs.account_profile && freshdeskData && freshdeskData.accountProfile) {
          console.log("✅ Populating Account/Profile (enabled in settings)");
          setTextInput('customfield_10652-field', freshdeskData.accountProfile, 'Account / Profile');
        } else if (!fieldPrefs.account_profile) {
          console.log("⏭️ Skipping Account/Profile (disabled in settings)");
        } else if (!freshdeskData || !freshdeskData.accountProfile) {
          console.log("⚠️ No Account/Profile data available (visit Freshdesk ticket)");
        }
        
        // 6. Populate Affected Clients (customfield_11724) - only if existing client found
        if (fieldPrefs.affected_clients && freshdeskData && freshdeskData.account) {
          console.log("✅ Populating Affected Clients (enabled in settings)");
          await setAffectedClients('customfield_11724-field', freshdeskData.account, 'Affected Clients');
        } else if (!fieldPrefs.affected_clients) {
          console.log("⏭️ Skipping Affected Clients (disabled in settings)");
        } else if (!freshdeskData || !freshdeskData.account) {
          console.log("⚠️ No Affected Clients data available (visit Freshdesk ticket)");
        }
        
        // 7. Populate Total Revenue Impact (customfield_10599) based on CARR
        if (fieldPrefs.carr_range) {
          console.log(`🔍 Total Revenue Impact population (enabled in settings)`);
        console.log(`📊 Freshdesk data available:`, !!freshdeskData);
        console.log(`📊 CARR value from freshdesk data:`, freshdeskData?.carr);
        
        if (freshdeskData && freshdeskData.carr) {
          console.log(`🎯 Calling getCarrRange with: "${freshdeskData.carr}"`);
          const carrRange = getCarrRange(freshdeskData.carr);
          console.log(`🎯 getCarrRange returned: "${carrRange}"`);
          
          if (carrRange) {
            console.log(`✅ Proceeding to populate Total Revenue Impact with: "${carrRange}"`);
            await setReactSelect('customfield_10599-field', carrRange, 'Total Revenue Impact');
          } else {
            console.log(`⚠️ carrRange is null/undefined, skipping Total Revenue Impact population`);
          }
        } else {
          console.log(`⚠️ No CARR data available for Total Revenue Impact population`);
          console.log(`   - freshdeskData exists: ${!!freshdeskData}`);
          console.log(`   - freshdeskData.carr: ${freshdeskData?.carr}`);
          }
        } else {
          console.log("⏭️ Skipping Total Revenue Impact/CARR Range (disabled in settings)");
        }
        
        // Show summary of populated fields in console
        console.log("📋 Population complete! Results:");
        
        if (populatedFields.length > 0) {
          console.log("✅ Successfully populated:");
          populatedFields.forEach(field => console.log(`  • ${field}`));
        }
        
        if (errors.length > 0) {
          console.log("❌ Issues encountered:");
          errors.forEach(error => console.log(`  • ${error}`));
        }
        
        // Log data sources
        console.log("📊 Data Sources:");
        if (reportingRegion) console.log(`  • Reporting Region: Agent Settings`);
        if (reportingGroup) console.log(`  • Reporting Group: Agent Settings`);
        if (freshdeskData) {
          console.log(`  • Account/Profile & CARR: Freshdesk Ticket #${freshdeskData.ticketId}`);
        }
        
        // Log if no data was available for population
        if (populatedFields.length === 0 && errors.length === 0) {
          console.warn("⚠️ No data available to populate Jira form fields. Please ensure you have set Reporting Region in Settings and visited a Freshdesk ticket to collect Account/Profile data.");
        }
        
        // Scroll to summary field after population
        setTimeout(() => {
          const summaryField = document.querySelector('#summary-field, [name="summary"]');
          if (summaryField) {
            summaryField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            summaryField.focus();
            console.log("📜 Scrolled to summary field");
          } else {
            // Fallback to modal top
            const modal = document.querySelector('[data-testid*="modal-wrapper"], [role="dialog"], .modal');
            if (modal) {
              modal.scrollTo({ top: 0, behavior: 'smooth' });
              console.log("📜 Scrolled modal to top (summary field not found)");
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              console.log("📜 Scrolled window to top (modal not found)");
            }
          }
        }, 500);
        
      } catch (error) {
        console.error("❌ Error in sequential population:", error);
      }
    }
    
    // Start the sequential population
    populateFieldsSequentially();
  }

  /***************************************************
   * CHROME STORAGE LISTENERS (OPTIMIZED)
   ***************************************************/
  
  let updateDebounceTimer = null;
  let isTabSwitching = false;
  
  // Listen for storage changes across domains (with debouncing)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        console.log("Chrome storage changed:", changes);
        
        // Clear existing timer
        if (updateDebounceTimer) {
          clearTimeout(updateDebounceTimer);
        }
        
        // Debounce updates to avoid excessive UI refreshes
        updateDebounceTimer = setTimeout(() => {
          // Update data for any MTB-related changes
          Object.keys(changes).forEach(key => {
            if (key.startsWith('mtb_')) {
              const mtbKey = key.replace('mtb_', '');
              const newValue = changes[key].newValue;
              console.log(`Debounced update for ${mtbKey}`);
              
              // Update localStorage to keep in sync
              if (newValue !== undefined) {
                localStorage.setItem(key, JSON.stringify(newValue));
              } else {
                localStorage.removeItem(key);
              }
              
              // Only update UI if we're actively using the extension or switching tabs
              if (isTabSwitching || isExtensionVisible()) {
                updateDataIfChanged(mtbKey, newValue);
              }
            }
          });
        }, 500); // 500ms debounce
      }
    });
  }
  
  function isExtensionVisible() {
    const panel = document.getElementById("multitool-beast-wrapper");
    return panel && panel.style.display !== "none";
  }

  /***************************************************
   * PANEL REFRESH FUNCTIONS
   ***************************************************/
  
  function refreshTabsIfNeeded() {
    const existingPanel = document.getElementById("multitool-beast-wrapper");
    if (!existingPanel) return;
    
    const currentAvailableTabs = getAvailableTabs();
    const hasProfileTab = existingPanel.querySelector('#tab-btn-profile') !== null;
    const shouldHaveProfileTab = currentAvailableTabs.includes('profile');
    
    console.log(`Tab check - Has profile: ${hasProfileTab}, Should have: ${shouldHaveProfileTab}`);
    
    if (hasProfileTab !== shouldHaveProfileTab) {
      console.log("Profile tab availability changed, refreshing panel");
      refreshPanelTabs();
    }
  }
  
  function refreshPanelTabs() {
    console.log("Refreshing panel tabs...");
    const existingPanel = document.getElementById("multitool-beast-wrapper");
    if (existingPanel) {
      console.log("Removing existing panel for refresh");
      existingPanel.remove();
      const openBtn = document.getElementById("sway-open-btn");
      if (openBtn) openBtn.remove();
      const forceBtn = document.getElementById("sway-force-open-btn");
      if (forceBtn) forceBtn.remove();
    }
    
    // Recreate the panel with updated tabs
    setTimeout(() => {
      createUnifiedPanel();
      
      // Make sure the panel is visible
      const newPanel = document.getElementById("multitool-beast-wrapper");
      if (newPanel) {
        newPanel.style.display = "block";
        savePref("multitool_open", true);
        
        // Show appropriate default tab
        const availableTabs = getAvailableTabs();
        const defaultTab = availableTabs[0] || 'jira';
        showTab(defaultTab);
      }
    }, 100);
    }
  /***************************************************
   * PERMISSION REQUEST FORM FUNCTIONS
   ***************************************************/

  function populatePermissionRequestForm() {
    console.log("🔐 Starting permission request form population...");
    
    // Add autofill button to the form if not already present
    addPermissionFormAutoFillButton();
    
    // Check if permission request is pending
    let isPendingRequest = sessionStorage.getItem('mtb_pending_permission_request') || 
                          localStorage.getItem('mtb_pending_permission_request');
    
    if (!isPendingRequest) {
      console.log("ℹ️ No pending permission request detected, but form detected. Populating anyway...");
    } else {
      // Clear flags after use
      sessionStorage.removeItem('mtb_pending_permission_request');
      localStorage.removeItem('mtb_pending_permission_request');
      localStorage.removeItem('mtb_permission_request_timestamp');
    }
    
    // Get settings data
    const reportingRegion = loadPref('reporting_region', '');
    const reportingGroup = loadPref('reporting_group', 'Customer Success');
    const agentEmail = loadPref('agent_email', '');
    const defaultReason = loadPref('default_permission_reason', 'Permission required to investigate an issue');
    const freshdeskData = loadPref('latest_freshdesk_data', null);
    
    let populatedFields = [];
    let errors = [];
    
    console.log("📋 Using data:", {
      reportingRegion,
      reportingGroup,
      agentEmail,
      defaultReason,
      hasFreshdeskData: !!freshdeskData
    });
    
    // Check field preferences before populating
    const fieldPrefs = {
      reason: loadPref('mtb_populate_perm_reason', true),
      reporting_group: loadPref('mtb_populate_perm_reporting_group', true),
      reporting_region: loadPref('mtb_populate_perm_reporting_region', true),
      accounts: loadPref('mtb_populate_perm_accounts', true),
      internal_users: loadPref('mtb_populate_perm_internal_users', true),
      platform_part: loadPref('mtb_populate_perm_platform_part', true),
      permission_level: loadPref('mtb_populate_perm_permission_level', true)
    };
    
    console.log("🎛️ Permission form field preferences:", fieldPrefs);
    
    // Wait for form to be ready
    setTimeout(() => {
      try {
        // 1. Populate "Reason for Desired Permission" (rich text editor)
        if (fieldPrefs.reason) {
          const descriptionField = document.querySelector('[data-test-id="request-field-description"] .ProseMirror');
          if (descriptionField && defaultReason) {
            console.log("✅ Populating permission reason (enabled in settings)");
            descriptionField.innerHTML = `<p>${defaultReason}</p>`;
            descriptionField.dispatchEvent(new Event('input', { bubbles: true }));
            populatedFields.push(`Reason: ${defaultReason}`);
            console.log("✅ Set permission reason");
          } else {
            errors.push("❌ Could not find reason field");
          }
        } else {
          console.log("⏭️ Skipping permission reason (disabled in settings)");
        }
        
        // 2. Populate "Reporting Group" dropdown
        if (fieldPrefs.reporting_group && reportingGroup) {
          setTimeout(() => {
            console.log(`✅ Populating Reporting Group (enabled in settings): "${reportingGroup}"`);
            setReactSelectField('customfield_10702', reportingGroup, 'Reporting Group');
          }, 1500);
        } else if (!fieldPrefs.reporting_group) {
          console.log("⏭️ Skipping Reporting Group (disabled in settings)");
        } else {
          console.log(`⚠️ No reporting group configured in settings`);
        }
        
        // 3. Populate "Reporting Region" dropdown  
        if (fieldPrefs.reporting_region && reportingRegion) {
          setTimeout(() => {
            console.log(`✅ Populating Reporting Region (enabled in settings): "${reportingRegion}"`);
            setReactSelectField('customfield_10744', reportingRegion, 'Reporting Region');
          }, 3000);
        } else if (!fieldPrefs.reporting_region) {
          console.log("⏭️ Skipping Reporting Region (disabled in settings)");
        } else {
          console.log(`⚠️ No reporting region configured in settings`);
        }
        
        // 4. Populate "Account(s) / Profile(s)" textarea
        if (fieldPrefs.accounts && freshdeskData && (freshdeskData.account || freshdeskData.accountProfile)) {
          console.log("✅ Populating Account/Profile (enabled in settings)");
          const accountField = document.querySelector('#customfield_11117');
          if (accountField) {
            const accountText = freshdeskData.accountProfile || `${freshdeskData.account}/${freshdeskData.profile}`;
            accountField.value = accountText;
            accountField.dispatchEvent(new Event('input', { bubbles: true }));
            populatedFields.push(`Account/Profile: ${accountText}`);
            console.log("✅ Set account/profile");
          }
        } else if (!fieldPrefs.accounts) {
          console.log("⏭️ Skipping Account(s) / Profile(s) (disabled in settings)");
        }
        
        // 5. Populate "Internal User(s)" textarea with agent email
        if (fieldPrefs.internal_users && agentEmail) {
          console.log("✅ Populating Internal Users (enabled in settings)");
          const internalUsersField = document.querySelector('#customfield_11118');
          if (internalUsersField) {
            internalUsersField.value = agentEmail;
            internalUsersField.dispatchEvent(new Event('input', { bubbles: true }));
            populatedFields.push(`Internal Users: ${agentEmail}`);
            console.log("✅ Set internal users");
          }
        } else if (!fieldPrefs.internal_users) {
          console.log("⏭️ Skipping Internal User(s) (disabled in settings)");
        }
        
        // 6. Set "Part of Tealium Platform" - try multiple possible values
        if (fieldPrefs.platform_part) {
          setTimeout(() => {
            console.log(`✅ Populating Part of Tealium Platform (enabled in settings)...`);
            // Try different possible values that might be in the dropdown
            const platformOptions = ['Full Platform', 'Full', 'Complete Platform', 'Both', 'All'];
            setReactSelectFieldWithOptions('customfield_11597', platformOptions, 'Part of Tealium Platform');
          }, 4500);
        } else {
          console.log("⏭️ Skipping Part of Tealium Platform (disabled in settings)");
        }
        
        // 7. Set "Desired Permission Level" to full
        if (fieldPrefs.permission_level) {
          setTimeout(() => {
            console.log(`✅ Populating Desired Permission Level (enabled in settings)...`);
            const permissionOptions = ['Full', 'Full Access', 'Complete', 'Administrator'];
            setReactSelectFieldWithOptions('customfield_11598', permissionOptions, 'Desired Permission Level');
          }, 6000);
        } else {
          console.log("⏭️ Skipping Desired Permission Level (disabled in settings)");
        }
        
        // Show results
        setTimeout(() => {
          if (populatedFields.length > 0) {
            console.log("🎉 Permission form populated successfully!");
            console.log("Populated fields:", populatedFields);
          }
          
          if (errors.length > 0) {
            console.warn("⚠️ Some fields could not be populated:", errors);
          }
        }, 7000); // Increased delay to account for React Select interactions
        
      } catch (error) {
        console.error("❌ Error populating permission form:", error);
      }
    }, 1000);
    
    // Enhanced helper function for React Select fields
    function setReactSelectField(fieldId, value, fieldName) {
      console.log(`🎯 Setting React Select field: ${fieldName} = ${value}`);
      
      const input = document.querySelector(`#${fieldId}`);
      if (!input) {
        console.log(`❌ Field not found: ${fieldName} (${fieldId})`);
        return;
      }
      
      // Get the container for better interaction
      const container = input.closest('.css-1o7nse5-container') || input.closest('[class*="container"]');
      if (!container) {
        console.log(`❌ Container not found for: ${fieldName}`);
        return;
      }
      
      console.log(`📍 Found container for ${fieldName}, attempting interaction...`);
      
      // Enhanced interaction sequence
      setTimeout(() => {
        console.log(`🎯 Starting React Select interaction for ${fieldName}...`);
        
        // Clear any existing value first
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`🧹 Cleared existing value for ${fieldName}`);
        
        // Focus the input
        input.focus();
        input.click();
        console.log(`👆 Focused and clicked ${fieldName} input`);
        
        // Type the value character by character to trigger React
        const typeValue = (text, index = 0) => {
          if (index < text.length) {
            const currentValue = text.substring(0, index + 1);
            input.value = currentValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            if (index === 0 || index === text.length - 1) {
              console.log(`⌨️ Typing ${fieldName}: "${currentValue}"`);
            }
            setTimeout(() => typeValue(text, index + 1), 100);
          } else {
            console.log(`✅ Finished typing ${fieldName}: "${text}", waiting for dropdown...`);
            // After typing complete, wait longer for dropdown and select option
            setTimeout(() => {
              selectFromDropdown(fieldName, value);
            }, 800);
          }
        };
        
        typeValue(value);
        
      }, 100);
      
      function selectFromDropdown(fieldName, value) {
        console.log(`🔍 Looking for dropdown options for ${fieldName} with value "${value}"...`);
        
        // Multiple ways to find dropdown options
        const optionSelectors = [
          '[id*="react-select"][id*="option"]',
          '[role="option"]',
          '[class*="option"]',
          'div[id*="option"]'
        ];
        
        let options = [];
        for (const selector of optionSelectors) {
          const found = document.querySelectorAll(selector);
          console.log(`🔍 Trying selector "${selector}": found ${found.length} elements`);
          if (found.length > 0) {
            options = Array.from(found);
            console.log(`📋 Using ${options.length} options from selector: ${selector}`);
            break;
          }
        }
        
        if (options.length === 0) {
          console.log(`⚠️ No dropdown options found for ${fieldName}`);
          // Try pressing Enter to accept typed value
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          populatedFields.push(`${fieldName}: ${value} (typed)`);
          return;
        }
        
        // Look for exact or partial match
        let matchFound = false;
        const searchTerms = [value, value.toLowerCase(), value.toUpperCase()];
        
        for (const option of options) {
          const optionText = option.textContent?.trim() || '';
          console.log(`🔍 Checking option: "${optionText}"`);
          
          for (const term of searchTerms) {
            if (optionText === term || 
                optionText.toLowerCase().includes(term.toLowerCase()) ||
                term.toLowerCase().includes(optionText.toLowerCase())) {
              console.log(`✅ Match found! Clicking option: "${optionText}"`);
              option.click();
              populatedFields.push(`${fieldName}: ${optionText}`);
              matchFound = true;
              break;
            }
          }
          if (matchFound) break;
        }
        
        if (!matchFound) {
          console.log(`⚠️ No exact match found in dropdown for ${fieldName}: ${value}`);
          console.log(`Available options:`, options.map(o => o.textContent?.trim()));
          
          // Try pressing Enter to accept typed value
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          populatedFields.push(`${fieldName}: ${value} (manual entry)`);
        }
      }
    }
    
    // Helper function to try multiple possible values for a React Select field
    function setReactSelectFieldWithOptions(fieldId, possibleValues, fieldName) {
      console.log(`🎯 Setting React Select field with multiple options: ${fieldName}`);
      console.log(`📋 Trying values: ${possibleValues.join(', ')}`);
      
      const input = document.querySelector(`#${fieldId}`);
      if (!input) {
        console.log(`❌ Field not found: ${fieldName} (${fieldId})`);
        return;
      }
      
      // Focus and click to open dropdown first
      input.focus();
      input.click();
      
      setTimeout(() => {
        // Get available options
        const optionSelectors = [
          '[id*="react-select"][id*="option"]',
          '[role="option"]',
          '[class*="option"]',
          'div[id*="option"]'
        ];
        
        let options = [];
        for (const selector of optionSelectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            options = Array.from(found);
            console.log(`📋 Found ${options.length} options for ${fieldName}`);
            break;
          }
        }
        
        if (options.length === 0) {
          console.log(`⚠️ No dropdown options found for ${fieldName}, trying manual input`);
          // Try first value manually
          input.value = possibleValues[0];
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          populatedFields.push(`${fieldName}: ${possibleValues[0]} (manual)`);
          return;
        }
        
        console.log(`📋 Available options for ${fieldName}:`, options.map(o => `"${o.textContent?.trim()}"`));
        
        // Try each possible value
        let matched = false;
        for (const value of possibleValues) {
          for (const option of options) {
            const optionText = option.textContent?.trim() || '';
            if (optionText.toLowerCase().includes(value.toLowerCase()) || 
                value.toLowerCase().includes(optionText.toLowerCase()) ||
                optionText === value) {
              console.log(`✅ Match found! "${value}" matches option: "${optionText}"`);
              option.click();
              populatedFields.push(`${fieldName}: ${optionText}`);
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
        
        if (!matched) {
          console.log(`❌ No matches found for ${fieldName} with values: ${possibleValues.join(', ')}`);
          console.log(`💡 Available options were:`, options.map(o => o.textContent?.trim()));
          // Try first option as fallback
          if (options.length > 0) {
            console.log(`🔄 Selecting first available option as fallback`);
            options[0].click();
            populatedFields.push(`${fieldName}: ${options[0].textContent?.trim()} (fallback)`);
          }
        }
      }, 500);
    }
  }
  
  // Function to add auto-fill button directly to permission request form
  function addPermissionFormAutoFillButton() {
    // Check if we're on the permission request form and button doesn't already exist
    if (!window.location.href.includes('/servicedesk/customer/portal/7/group/33/create/348') || 
        document.querySelector('#mtb-permission-autofill-btn')) {
      return;
    }
    
    console.log("🔧 Adding auto-fill button to permission request form...");
    
    // Find the main form container for better alignment
    const formContainer = document.querySelector('form[novalidate], .sc-cugefK, [data-testid="disable-view-until-mount"]');
    const headerSection = document.querySelector('.sc-bEjcJn.eMdHbB, .sc-bGbJRg.duvOaS, h1');
    
    if (!formContainer && !headerSection) {
      console.log("❌ Could not find permission form container to add button");
      return;
    }
    
    // Get settings data to show availability
    const reportingRegion = loadPref('reporting_region', '');
    const reportingGroup = loadPref('reporting_group', 'Customer Success');
    const agentEmail = loadPref('agent_email', '');
    const defaultReason = loadPref('default_permission_reason', '');
    const freshdeskData = loadPref('latest_freshdesk_data', null);
    
    // Create button container with proper alignment
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.margin = '16px 0';
    buttonContainer.style.padding = '12px';
    buttonContainer.style.backgroundColor = '#f8f9fa';
    buttonContainer.style.border = '1px solid #e1e5e9';
    buttonContainer.style.borderRadius = '8px';
    buttonContainer.style.maxWidth = '100%';
    
    // Create auto-fill button with green styling
    const autoFillBtn = document.createElement('button');
    autoFillBtn.id = 'mtb-permission-autofill-btn';
    autoFillBtn.style.backgroundColor = '#00875a';
    autoFillBtn.style.border = '1px solid #00875a';
    autoFillBtn.style.borderRadius = '6px';
    autoFillBtn.style.color = 'white';
    autoFillBtn.style.padding = '10px 16px';
    autoFillBtn.style.fontSize = '14px';
    autoFillBtn.style.fontWeight = '600';
    autoFillBtn.style.cursor = 'pointer';
    autoFillBtn.style.transition = 'all 0.2s ease';
    autoFillBtn.style.display = 'flex';
    autoFillBtn.style.alignItems = 'center';
    autoFillBtn.style.justifyContent = 'center';
    autoFillBtn.style.gap = '6px';
    autoFillBtn.style.width = 'fit-content';
    autoFillBtn.style.alignSelf = 'flex-start';
    autoFillBtn.innerHTML = '🔧 Auto-Fill Form';
    
    // Add hover effects with green theme
    autoFillBtn.addEventListener('mouseenter', function() {
      this.style.backgroundColor = '#00a86b';
      this.style.borderColor = '#00a86b';
      this.style.transform = 'translateY(-1px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 135, 90, 0.2)';
    });
    autoFillBtn.addEventListener('mouseleave', function() {
      this.style.backgroundColor = '#00875a';
      this.style.borderColor = '#00875a';
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
    
    autoFillBtn.addEventListener('click', function() {
      console.log("🔧 Auto-fill button clicked from permission form");
      populatePermissionRequestForm();
    });
    
    // Create data availability display with better formatting
    const dataDisplay = document.createElement('div');
    dataDisplay.style.fontSize = '13px';
    dataDisplay.style.color = '#5e6c84';
    dataDisplay.style.lineHeight = '1.4';
    
    let availableCount = 0;
    let totalFields = 5; // Core permission fields
    
    if (reportingRegion) availableCount++;
    if (reportingGroup) availableCount++;
    if (agentEmail) availableCount++;
    if (defaultReason) availableCount++;
    if (freshdeskData && freshdeskData.account) availableCount++;
    
    const dataDetails = [
      reportingRegion ? '✅ Region' : '❌ Region',
      reportingGroup ? '✅ Group' : '❌ Group', 
      agentEmail ? '✅ Email' : '❌ Email',
      defaultReason ? '✅ Reason' : '❌ Reason',
      (freshdeskData && freshdeskData.account) ? '✅ Account' : '❌ Account'
    ];
    
    // Create a more readable data display
    const dataHeader = document.createElement('div');
    dataHeader.style.fontWeight = '600';
    dataHeader.style.marginBottom = '4px';
    dataHeader.style.color = '#172b4d';
    dataHeader.textContent = `Available Data (${availableCount}/${totalFields}):`;
    
    const dataItems = document.createElement('div');
    dataItems.style.display = 'flex';
    dataItems.style.flexWrap = 'wrap';
    dataItems.style.gap = '8px';
    dataItems.style.fontSize = '12px';
    
    dataDetails.forEach(detail => {
      const item = document.createElement('span');
      item.style.padding = '2px 6px';
      item.style.borderRadius = '3px';
      item.style.backgroundColor = detail.startsWith('✅') ? '#e3fcef' : '#ffebe6';
      item.style.color = detail.startsWith('✅') ? '#00875a' : '#de350b';
      item.style.border = `1px solid ${detail.startsWith('✅') ? '#c1e9d6' : '#ffbdad'}`;
      item.textContent = detail;
      dataItems.appendChild(item);
    });
    
    dataDisplay.appendChild(dataHeader);
    dataDisplay.appendChild(dataItems);
    
    buttonContainer.appendChild(autoFillBtn);
    buttonContainer.appendChild(dataDisplay);
    
    // Insert the button container at the right location
    const targetElement = formContainer || headerSection;
    if (formContainer) {
      // Insert at the beginning of the form
      formContainer.insertBefore(buttonContainer, formContainer.firstChild);
    } else if (headerSection) {
      // Insert after the header as fallback
      headerSection.parentNode.insertBefore(buttonContainer, headerSection.nextSibling);
    }
    
    console.log("✅ Auto-fill button added to permission request form");
    }

  /***************************************************
   * JIRA AUTO-CREATE FUNCTIONS
   ***************************************************/

  // Utility function to wait for Jira elements to be ready
  function waitForJiraElements(selectors, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let attempts = 0;
      
      const checkElements = () => {
        attempts++;
        console.log(`🔍 Waiting for Jira elements - attempt ${attempts} (${Date.now() - startTime}ms elapsed)`);
        
        // Check if any of the selectors find a visible element
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              console.log(`✅ Jira element ready: ${selector}`);
              resolve(element);
              return;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        // Check timeout
        if (Date.now() - startTime > timeout) {
          console.log(`❌ Timeout waiting for Jira elements after ${timeout}ms`);
          reject(new Error(`Timeout waiting for Jira elements`));
          return;
        }
        
        // Continue checking
        setTimeout(checkElements, 500);
      };
      
      checkElements();
    });
  }

  // Utility function to wait for DOM and Jira navigation to be ready
  async function waitForJiraReady() {
    console.log(`⏰ Waiting for Jira to be fully ready...`);
    
    // First ensure DOM is ready
    if (document.readyState !== 'complete') {
      console.log(`📄 Waiting for DOM to complete...`);
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          const handler = () => {
            if (document.readyState === 'complete') {
              document.removeEventListener('readystatechange', handler);
              resolve();
            }
          };
          document.addEventListener('readystatechange', handler);
        }
      });
      console.log(`✅ DOM ready`);
    }
    
    // Then wait for Jira navigation elements
    const jiraNavigationSelectors = [
      '[data-testid="atlassian-navigation"]',
      'header nav',
      '[data-testid="atlassian-navigation--create-button"]',
      'button[aria-label="Create"]',
      '.css-b2msvw', // Common Jira button class
      '[role="banner"]' // Header banner
    ];
    
    try {
      await waitForJiraElements(jiraNavigationSelectors, 20000);
      console.log(`✅ Jira navigation ready`);
      
      // Additional short delay for React components to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`✅ Jira fully ready for interaction`);
      
      return true;
    } catch (error) {
      console.log(`⚠️ Jira navigation not fully ready, but proceeding anyway: ${error.message}`);
      return false;
    }
  }

  function triggerIssueCreation(workType) {
    console.log(`🚀 Triggering immediate issue creation for ${workType}`);
    
    // Set fresh work type in storage
    sessionStorage.setItem('mtb_pending_work_type', workType);
    localStorage.setItem('mtb_pending_work_type', workType);
    localStorage.setItem('mtb_pending_work_type_timestamp', Date.now().toString());
    console.log(`💾 Set fresh work type: ${workType}`);
    
    // If we're on Jira, immediately trigger the create process
    if (isJira) {
      console.log(`🎯 On Jira domain, triggering create process immediately`);
      
      // Small delay to ensure storage is set
      setTimeout(() => {
        handleJiraBoardAutoCreate();
      }, 100);
    } else {
      // Navigate to Jira with URL parameters for better cross-tab communication
      console.log(`🔗 Opening Jira in new tab from Freshdesk with work type: ${workType}`);
      const jiraUrl = `https://tealium.atlassian.net/jira?mtb_create=${encodeURIComponent(workType)}&mtb_timestamp=${Date.now()}`;
      console.log(`🌐 Opening URL: ${jiraUrl}`);
      
      const a = document.createElement('a');
      a.href = jiraUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log(`💡 New tab should auto-detect work type from URL parameters and localStorage`);
    }
  }

  function triggerPermissionRequest() {
    console.log(`🔐 Triggering permission request form`);
    
    // Store permission request flag for auto-population
    sessionStorage.setItem('mtb_pending_permission_request', 'true');
    localStorage.setItem('mtb_pending_permission_request', 'true');
    localStorage.setItem('mtb_permission_request_timestamp', Date.now().toString());
    console.log(`💾 Set permission request flag`);
    
    // Open permission request form
    const permissionUrl = 'https://tealium.atlassian.net/servicedesk/customer/portal/7/group/33/create/348';
    console.log(`🌐 Opening permission request URL: ${permissionUrl}`);
    
    const a = document.createElement('a');
    a.href = permissionUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log(`💡 New tab should auto-detect permission request form and populate fields`);
  }

  function openCreateIssuePage(workType) {
    console.log(`🚀 Opening create issue page for ${workType}`);
    
    // Store the work type for after navigation
    sessionStorage.setItem('mtb_pending_work_type', workType);
    localStorage.setItem('mtb_pending_work_type', workType);
    localStorage.setItem('mtb_pending_work_type_timestamp', Date.now().toString());
    console.log(`💾 Stored pending work type: ${workType}`);
    
    // If we're already on Jira, try to click Create button directly
    if (isJira) {
      const currentUrl = window.location.href;
      console.log(`🌐 Already on Jira, current URL: ${currentUrl}`);
      
      // Check if we're on any Jira page that has the Create button
      if (currentUrl.includes('tealium.atlassian.net')) {
        console.log(`📍 On Jira domain, attempting to click Create button directly`);
        
        // Small delay to ensure page is loaded
        setTimeout(() => {
          handleJiraBoardAutoCreate();
        }, 1000);
      } else {
        // Navigate to the main Jira page
        console.log(`🔄 Navigating to Jira main page`);
        window.location.href = 'https://tealium.atlassian.net/jira';
      }
    } else {
      // Open Jira in new tab if we're on Freshdesk with URL parameters
      console.log(`🔗 Opening Jira in new tab from Freshdesk with work type: ${workType}`);
      const jiraUrl = `https://tealium.atlassian.net/jira?mtb_create=${encodeURIComponent(workType)}&mtb_timestamp=${Date.now()}`;
      console.log(`🌐 Opening URL: ${jiraUrl}`);
      
      const a = document.createElement('a');
      a.href = jiraUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log(`💡 New tab should auto-detect work type from URL parameters and localStorage`);
    }
  }
  function handleJiraBoardAutoCreate() {
    console.log(`🎯 handleJiraBoardAutoCreate called`);
    
    // Check for pending work type from multiple sources
    let pendingWorkType = sessionStorage.getItem('mtb_pending_work_type');
    let source = 'sessionStorage';
    
    // If not in sessionStorage, check localStorage (for cross-tab from Freshdesk)
    if (!pendingWorkType) {
      pendingWorkType = localStorage.getItem('mtb_pending_work_type');
      source = 'localStorage';
      
      // Check timestamp to avoid stale requests (only within last 10 minutes)
      const timestamp = localStorage.getItem('mtb_pending_work_type_timestamp');
      if (pendingWorkType && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age > 600000) { // 10 minutes
          console.log(`⏰ localStorage work type too old (${age}ms), ignoring`);
          pendingWorkType = null;
        }
      }
    }
    
    // If still not found, check URL parameters with timestamp validation
    if (!pendingWorkType) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlWorkType = urlParams.get('mtb_create');
      const urlTimestamp = urlParams.get('mtb_timestamp');
      
      if (urlWorkType) {
        // Validate URL timestamp (within last 10 minutes)
        if (urlTimestamp) {
          const age = Date.now() - parseInt(urlTimestamp);
          if (age <= 600000) { // 10 minutes
            pendingWorkType = urlWorkType;
      source = 'URL parameters';
            console.log(`✅ Valid URL work type found: ${urlWorkType} (age: ${Math.round(age/1000)}s)`);
          } else {
            console.log(`⏰ URL work type too old (${age}ms), ignoring`);
          }
        } else {
          // Accept URL work type even without timestamp (fallback)
          pendingWorkType = urlWorkType;
          source = 'URL parameters (no timestamp)';
          console.log(`⚠️ URL work type found without timestamp: ${urlWorkType}`);
        }
      }
    }
    
    console.log(`🔍 Pending work type: ${pendingWorkType} (from ${source})`);
    
    if (!pendingWorkType) {
      console.log(`❌ No pending work type found, exiting`);
      return;
    }
    
    // Clear the pending work type to avoid repeat actions
    sessionStorage.removeItem('mtb_pending_work_type');
    localStorage.removeItem('mtb_pending_work_type');
    localStorage.removeItem('mtb_pending_work_type_timestamp');
    console.log(`🧹 Cleared work type from storage`);
    
    console.log(`🎯 Auto-creating ${pendingWorkType} issue on Jira board`);
    
        // Look for the Create button and click it (enhanced for DOM readiness)
    const maxAttempts = 25;
    let attempts = 0;
    
    function findAndClickCreateButton() {
      attempts++;
      console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Looking for Create button (DOM: ${document.readyState})`);
      
      // If DOM isn't ready, wait a bit more
      if (document.readyState !== 'complete') {
        console.log(`📄 DOM not complete, waiting 2 more seconds...`);
        setTimeout(findAndClickCreateButton, 2000);
        return;
      }
      
      const selectors = [
        // Primary modern selectors
        'button[data-testid="atlassian-navigation--create-button"]',
        '[data-testid="atlassian-navigation--create-button"]',
        'button[aria-label="Create"]',
        'button[data-label="Create"]',
        
        // Navigation header selectors  
        'nav button[aria-label="Create"]',
        'header button[aria-label="Create"]',
        '[data-testid="atlassian-navigation"] button[aria-label="Create"]',
        
        // Spotlight/tour selectors
        'span[data-test-id="ak-spotlight-target-global-create-spotlight"] button',
        '[data-test-id="ak-spotlight-target-global-create-spotlight"] button',
        
        // Generic Create button selectors with various structures
        'button[title*="Create"]',
        'button[aria-describedby*="create"]',
        'button[data-text="Create"]',
        'button[data-content="Create"]',
        
        // Class-based and structure selectors
        '.css-b2msvw[aria-label="Create"]',
        'button.css-b2msvw',
        '[data-testid*="create"] button',
        '[class*="CreateButton"] button',
        '[class*="create-button"]'
      ];
      
      let createButton = null;
      
      for (const selector of selectors) {
        try {
          createButton = document.querySelector(selector);
          if (createButton && createButton.offsetParent !== null) { // Check if visible
            console.log(`✅ Found visible Create button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Some selectors might fail, continue to next
          console.log(`⚠️ Selector failed: ${selector}`);
        }
      }
      
      // Enhanced fallback: look for any button containing "Create" text with priority areas
      if (!createButton) {
        console.log(`🔍 Fallback: searching for Create button by text content...`);
        
        // Priority areas to search first (header, nav, main UI areas)
        const priorityContainers = [
          'header',
          'nav', 
          '[role="banner"]',
          '[data-testid="atlassian-navigation"]',
          '[class*="Navigation"]',
          '[class*="Header"]'
        ];
        
        // Search priority areas first
        for (const containerSelector of priorityContainers) {
          const container = document.querySelector(containerSelector);
          if (container) {
            const buttons = container.querySelectorAll('button');
            for (const button of buttons) {
              const text = button.textContent?.trim().toLowerCase();
              const ariaLabel = button.getAttribute('aria-label')?.toLowerCase();
              const title = button.getAttribute('title')?.toLowerCase();
              
              if ((text === 'create' || text?.includes('create') ||
                   ariaLabel === 'create' || ariaLabel?.includes('create') ||
                   title === 'create' || title?.includes('create')) &&
                  button.offsetParent !== null && !button.disabled) {
                createButton = button;
                console.log(`✅ Found Create button in ${containerSelector} by text: "${button.textContent}"`);
                break;
              }
            }
            if (createButton) break;
          }
        }
        
        // If still not found, search entire document
        if (!createButton) {
          console.log(`🔍 Searching entire document for Create button...`);
        const allButtons = document.querySelectorAll('button');
        for (const button of allButtons) {
            const text = button.textContent?.trim().toLowerCase();
            const ariaLabel = button.getAttribute('aria-label')?.toLowerCase();
            
            if ((text === 'create' || ariaLabel === 'create') && 
                button.offsetParent !== null && !button.disabled) {
            createButton = button;
              console.log(`✅ Found Create button by exact text match: "${button.textContent}"`);
            break;
            }
          }
        }
      }
      
      if (createButton) {
        console.log(`🖱️ Clicking Create button to open modal`);
        console.log(`📍 Create button details:`, {
          tagName: createButton.tagName,
          className: createButton.className,
          textContent: createButton.textContent,
          isVisible: createButton.offsetParent !== null,
          isEnabled: !createButton.disabled
        });
        
        // Enhanced click sequence for better reliability
        createButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
          // Focus and multiple click methods
          createButton.focus();
          
          // Standard click
          createButton.click();
          
          // Mouse event sequence
          createButton.dispatchEvent(new MouseEvent('mousedown', { 
            bubbles: true, 
            cancelable: true,
            view: window,
            detail: 1
          }));
          
          createButton.dispatchEvent(new MouseEvent('mouseup', { 
            bubbles: true, 
            cancelable: true,
            view: window,
            detail: 1
          }));
          
          createButton.dispatchEvent(new MouseEvent('click', { 
            bubbles: true, 
            cancelable: true,
            view: window,
            detail: 1
          }));
          
          // Pointer events for modern React components
          if (window.PointerEvent) {
            createButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            createButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
          }
          
          console.log(`✅ Create button clicked with enhanced sequence`);
          
          // Wait for modal to open with better detection, then select work type
          console.log(`⏰ Waiting for modal to open...`);
          
          // Enhanced modal detection with multiple checks
          let modalCheckAttempts = 0;
          const maxModalChecks = 20; // 10 seconds total
          
          const checkForModal = () => {
            modalCheckAttempts++;
            console.log(`🔍 Modal check attempt ${modalCheckAttempts}/${maxModalChecks}`);
            
            // Multiple modal detection selectors
            const modalSelectors = [
              '[role="dialog"]',
              '[aria-modal="true"]', 
              '[data-testid*="modal"]',
              '[data-testid*="create"]',
              '#create-issue-dialog',
              '.jira-dialog',
              '.aui-dialog2',
              '.css-1vslnu6', // Common modal wrapper class
              '.css-k008qs', // Another modal class
              '[data-component-name*="Modal"]'
            ];
            
            let modal = null;
            for (const selector of modalSelectors) {
              modal = document.querySelector(selector);
              if (modal && modal.offsetParent !== null) {
                console.log(`✅ Modal detected with selector: ${selector}`);
                break;
              }
            }
            
            // Also check for modal content indicators
            if (!modal) {
              const modalContentIndicators = [
                'input[role="combobox"]', // Issue type selector
                'label[for*="type"]', // Type labels
                '[id*="issue-create"]', // Create form elements
                'input[placeholder*="Summary"]' // Summary field
              ];
              
              for (const indicator of modalContentIndicators) {
                if (document.querySelector(indicator)) {
                  modal = document.body; // Use body as modal reference
                  console.log(`✅ Modal content detected with indicator: ${indicator}`);
                  break;
                }
              }
            }
            
            if (modal) {
              console.log(`🎯 Modal is open! Selecting work type: ${pendingWorkType}`);
              setTimeout(() => selectWorkType(pendingWorkType), 500);
            } else if (modalCheckAttempts < maxModalChecks) {
              console.log(`⏰ Modal not ready yet, checking again in 500ms...`);
              setTimeout(checkForModal, 500);
            } else {
              console.log(`❌ Modal failed to open after ${maxModalChecks} attempts`);
              console.log(`💡 Troubleshooting suggestions:`);
              console.log(`   1. Check if Create button was actually clicked`);
              console.log(`   2. Try running selectWorkType('${pendingWorkType}') manually`);
              console.log(`   3. Check console for any JavaScript errors`);
              console.log(`   4. Try refreshing the page`);
              
              // Try one more time manually
              console.log(`🔄 Attempting manual work type selection...`);
            selectWorkType(pendingWorkType);
            }
          };
          
          // Start checking for modal after a short delay
          setTimeout(checkForModal, 1000);
          
        }, 300); // Small delay after scroll
        
      } else if (attempts < maxAttempts) {
        console.log(`❌ Create button not found, retrying in 1 second... (attempt ${attempts}/${maxAttempts})`);
        setTimeout(findAndClickCreateButton, 1000);
      } else {
        console.log(`❌ Failed to find Create button after ${maxAttempts} attempts`);
        console.log(`💡 Manual options:`);
        console.log(`   1. Try manually clicking the Create button`);
        console.log(`   2. Run: triggerCreateButtonClick() in console`);
        console.log(`   3. Refresh page and try again`);
      }
    }
    
    // Start looking for Create button with enhanced timing
    findAndClickCreateButton();
  }
  
  // Enhanced global function for manual triggering from console
  window.triggerCreateButtonClick = function() {
    console.log(`🔧 Manual trigger: Looking for Create button...`);
    
    const selectors = [
      // Updated 2024 selectors
      'button[data-testid="atlassian-navigation--create-button"]',
      '[data-testid="atlassian-navigation--create-button"]',
      'button[aria-label="Create"]',
      'nav button[aria-label="Create"]',
      'header button[aria-label="Create"]',
      '[data-testid="atlassian-navigation"] button[aria-label="Create"]',
      'span[data-test-id="ak-spotlight-target-global-create-spotlight"] button',
      '[data-test-id="ak-spotlight-target-global-create-spotlight"] button',
      '.css-b2msvw[aria-label="Create"]',
      'button.css-b2msvw'
    ];
    
    let createButton = null;
    let foundSelector = '';
    
    for (const selector of selectors) {
      try {
      createButton = document.querySelector(selector);
        if (createButton && createButton.offsetParent !== null && !createButton.disabled) {
          foundSelector = selector;
          console.log(`✅ Found Create button manually with: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`⚠️ Selector failed: ${selector}`);
      }
    }
    
    // Fallback search by text
    if (!createButton) {
      console.log(`🔍 Fallback: searching by text content...`);
      const allButtons = document.querySelectorAll('button');
      for (const button of allButtons) {
        const text = button.textContent?.trim().toLowerCase();
        const ariaLabel = button.getAttribute('aria-label')?.toLowerCase();
        
        if ((text === 'create' || ariaLabel === 'create') && 
            button.offsetParent !== null && !button.disabled) {
          createButton = button;
          foundSelector = 'text-based search';
          console.log(`✅ Found Create button by text: "${button.textContent}"`);
          break;
        }
      }
    }
    
    if (createButton) {
      console.log(`🖱️ Clicking Create button found with: ${foundSelector}`);
      createButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        createButton.focus();
        createButton.click();
        console.log(`✅ Create button clicked successfully`);
      }, 200);
    } else {
    console.log(`❌ Could not find Create button manually`);
      console.log(`💡 Debug info:`);
      console.log(`   - Current URL: ${window.location.href}`);
      console.log(`   - Page title: ${document.title}`);
      console.log(`   - Total buttons on page: ${document.querySelectorAll('button').length}`);

      // Show all buttons that might be the Create button
      const possibleButtons = [];
      document.querySelectorAll('button').forEach((btn, idx) => {
        const text = btn.textContent?.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        if (text?.toLowerCase().includes('create') || ariaLabel?.toLowerCase().includes('create')) {
          possibleButtons.push({
            index: idx,
            text: text,
            ariaLabel: ariaLabel,
            visible: btn.offsetParent !== null,
            enabled: !btn.disabled
          });
        }
      });
      console.log(`   - Possible Create buttons found:`, possibleButtons);
    }
  };

  // Enhanced global function for debugging work type status
  window.debugWorkTypeStatus = function() {
    console.log(`🔍 === COMPREHENSIVE DEBUG STATUS ===`);
    console.log(`\n📱 ENVIRONMENT:`);
    console.log(`   Current domain: ${window.location.hostname}`);
    console.log(`   Current URL: ${window.location.href}`);
    console.log(`   Page title: ${document.title}`);
    console.log(`   Is Jira: ${isJira}`);
    console.log(`   User agent: ${navigator.userAgent}`);
    
    console.log(`\n⚙️ SETTINGS:`);
    console.log(`   Text Selection Feature: ${loadPref('mtb_textSelectionEnabled', true) ? 'Enabled' : 'Disabled'}`);
    console.log(`   Font Size: ${loadPref('mtb_fontSize', 14)}px`);
    console.log(`   Agent Email: ${loadPref('agent_email', '') || 'Not set'}`);
    console.log(`   Reporting Region: ${loadPref('reporting_region', '') || 'Not set'}`);
    console.log(`   Reporting Group: ${loadPref('reporting_group', 'Customer Success')}`);
    console.log(`   Default Permission Reason: ${loadPref('default_permission_reason', 'Permission required to investigate an issue')}`);
    
    console.log(`\n💾 STORAGE STATUS:`);
    console.log(`   Session storage work type: ${sessionStorage.getItem('mtb_pending_work_type')}`);
    console.log(`   Local storage work type: ${localStorage.getItem('mtb_pending_work_type')}`);
    console.log(`   Local storage timestamp: ${localStorage.getItem('mtb_pending_work_type_timestamp')}`);
    
    const timestamp = localStorage.getItem('mtb_pending_work_type_timestamp');
    if (timestamp) {
      const age = Date.now() - parseInt(timestamp);
      console.log(`   Work type age: ${age}ms (${Math.round(age/1000)}s)`);
      console.log(`   Max age allowed: 600000ms (10min)`);
      console.log(`   Is valid age: ${age <= 600000}`);
    }
    
    console.log(`\n🔗 URL PARAMETERS:`);
    const urlParams = new URLSearchParams(window.location.search);
    const urlWorkType = urlParams.get('mtb_create');
    const urlTimestamp = urlParams.get('mtb_timestamp');
    console.log(`   URL work type: ${urlWorkType}`);
    console.log(`   URL timestamp: ${urlTimestamp}`);
    if (urlTimestamp) {
      const urlAge = Date.now() - parseInt(urlTimestamp);
      console.log(`   URL work type age: ${urlAge}ms (${Math.round(urlAge/1000)}s)`);
      console.log(`   URL is valid age: ${urlAge <= 600000}`);
    }
    
    console.log(`\n🔘 CREATE BUTTON ANALYSIS:`);
    
    // Test all selectors
    const testSelectors = [
      'button[data-testid="atlassian-navigation--create-button"]',
      '[data-testid="atlassian-navigation--create-button"]',
      'button[aria-label="Create"]',
      'nav button[aria-label="Create"]',
      'header button[aria-label="Create"]',
      '[data-testid="atlassian-navigation"] button[aria-label="Create"]',
      '.css-b2msvw[aria-label="Create"]',
      'button.css-b2msvw'
    ];
    
    let foundButtons = [];
    testSelectors.forEach((selector, idx) => {
      try {
        const button = document.querySelector(selector);
        if (button) {
          foundButtons.push({
            selector: selector,
            visible: button.offsetParent !== null,
            enabled: !button.disabled,
            text: button.textContent?.trim(),
            ariaLabel: button.getAttribute('aria-label')
          });
        }
      } catch (e) {
        console.log(`   ⚠️ Selector ${idx + 1} failed: ${selector}`);
      }
    });
    
    console.log(`   Buttons found with selectors:`, foundButtons);
    
    // Check text-based search
    const textButtons = [];
    document.querySelectorAll('button').forEach((btn, idx) => {
      const text = btn.textContent?.trim().toLowerCase();
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase();
      if (text?.includes('create') || ariaLabel?.includes('create')) {
        textButtons.push({
          index: idx,
          text: btn.textContent?.trim(),
          ariaLabel: btn.getAttribute('aria-label'),
          visible: btn.offsetParent !== null,
          enabled: !btn.disabled,
          className: btn.className
        });
      }
    });
    console.log(`   Buttons found by text search:`, textButtons);
    
    console.log(`\n🔍 MODAL DETECTION:`);
    const modalSelectors = [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '[data-testid*="modal"]',
      '[data-testid*="create"]',
      '#create-issue-dialog',
      '.jira-dialog',
      '.aui-dialog2'
    ];
    
    const foundModals = [];
    modalSelectors.forEach(selector => {
      const modal = document.querySelector(selector);
      if (modal) {
        foundModals.push({
          selector: selector,
          visible: modal.offsetParent !== null
        });
      }
    });
    console.log(`   Modals found:`, foundModals);
    
    console.log(`\n🛠️ MANUAL COMMANDS:`);
    console.log(`   triggerIssueCreation('Bug')     - Create bug issue`);
    console.log(`   triggerIssueCreation('Enhancement') - Create enhancement`);
    console.log(`   triggerPermissionRequest()      - Open permission request form`);
    console.log(`   triggerCreateButtonClick()      - Manual button click`);
    console.log(`   selectWorkType('Bug')          - Skip to work type selection`);
    console.log(`   populateJiraFormFields()       - Auto-populate forms`);
    console.log(`   populatePermissionRequestForm() - Auto-populate permission form`);
    console.log(`   addPermissionFormAutoFillButton() - Add button to permission form`);
    console.log(`   testClipboardFunction()        - Test clipboard functionality`);
    console.log(`   enableTextSelectionFeature()   - Enable text selection to clipboard`);
    console.log(`   disableTextSelectionFeature()  - Disable text selection feature`);
    console.log(`   setupFreshdeskAutoSync()       - Enable auto-sync for Freshdesk data`);
    console.log(`   setupStoredDataMonitoring()    - Enable cross-tab data monitoring (Jira)`);
    console.log(`   checkStoredDataChanges()       - Check for stored data changes`);
    console.log(`   forceStoredDataSync()          - Force check and sync stored data changes`);
    console.log(`   debugStoredDataSync()          - Debug stored data monitoring system`);
    console.log(`   resetFreshdeskAutoSync()       - Reset auto-sync monitoring`);
    console.log(`   refreshProfileIfChanged()      - Manually check for data changes`);
    
    console.log(`\n🎯 RECOMMENDED ACTIONS:`);
    
    // Check for cross-tab scenario
    const hasUrlWorkType = urlParams.get('mtb_create');
    const hasLocalWorkType = localStorage.getItem('mtb_pending_work_type');
    const isFromFreshdesk = hasUrlWorkType || hasLocalWorkType;
    
    if (isFromFreshdesk) {
      console.log(`🔄 CROSS-TAB SCENARIO DETECTED (opened from Freshdesk)`);
      if (foundButtons.some(b => b.visible && b.enabled)) {
        console.log(`   ✅ Create button available - auto-create should work`);
        console.log(`   💡 If modal doesn't open automatically, try: triggerIssueCreation('${hasUrlWorkType || hasLocalWorkType}')`);
      } else {
        console.log(`   ❌ Create button not available - may need to wait for page to load`);
        console.log(`   💡 Try refreshing page or manual: triggerCreateButtonClick()`);
      }
    } else {
      console.log(`📱 LOCAL SCENARIO (direct Jira usage)`);
      if (foundButtons.length === 0 && textButtons.length === 0) {
        console.log(`   ❌ No Create button found - check if you're logged into Jira`);
      } else if (foundButtons.some(b => b.visible && b.enabled)) {
        console.log(`   ✅ Create button available - try triggerIssueCreation('Bug')`);
      } else if (textButtons.some(b => b.visible && b.enabled)) {
        console.log(`   ⚠️ Create button found but not with primary selectors`);
        console.log(`   💡 Try: triggerCreateButtonClick()`);
      } else {
        console.log(`   ⚠️ Create button found but not visible/enabled`);
        console.log(`   💡 Check page state and try refreshing`);
      }
    }
  };

  // Expose triggerIssueCreation globally for manual use
  window.triggerIssueCreation = triggerIssueCreation;
  window.triggerPermissionRequest = triggerPermissionRequest;
  window.populatePermissionRequestForm = populatePermissionRequestForm;
  window.addPermissionFormAutoFillButton = addPermissionFormAutoFillButton;
  
  // Expose text selection functions globally for debugging
  window.enableTextSelectionFeature = enableTextSelectionFeature;
  window.disableTextSelectionFeature = disableTextSelectionFeature;
  
  // Expose auto-sync functions globally for debugging
  window.setupFreshdeskAutoSync = setupFreshdeskAutoSync;
  window.resetFreshdeskAutoSync = resetFreshdeskAutoSync;
  window.refreshProfileIfChanged = refreshProfileIfChanged;

  // Global function for testing clipboard functionality
  window.testClipboardFunction = function(testText = "Test clipboard item") {
    console.log(`🧪 Testing clipboard functionality with text: "${testText}"`);
    
    // Test the addToClipboard function directly
    try {
      addToClipboard("Test Item", testText);
      console.log(`✅ addToClipboard completed successfully`);
      
      // Check if clipboard data was updated
      const currentData = loadPref("clipboard_data", []);
      console.log(`📋 Current clipboard data length: ${currentData.length}`);
      console.log(`📋 Latest item:`, currentData[currentData.length - 1]);
      
      // Try to refresh the clipboard tab
      const clipboardContainer = document.getElementById('tab-content-clipboard');
      if (clipboardContainer) {
        console.log(`📋 Refreshing clipboard tab...`);
        populateClipboardContent();
        console.log(`📋 Clipboard tab refresh completed`);
      } else {
        console.log(`⚠️ Clipboard tab not visible - try switching to Clipboard tab first`);
      }
      
    } catch (error) {
      console.error(`❌ Clipboard test failed:`, error);
    }
  };
  /***************************************************
   * MAIN PANEL CREATION
   ***************************************************/
  
  function createUnifiedPanel() {
    // Check if panel already exists
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("Panel already exists");
      return;
    }
    
    console.log("Creating unified MultiTool Beast panel");
    
    // Inject CSS first
    injectCSS();
    
    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.id = "multitool-beast-wrapper";
    
    // Apply saved font size
    const initFontSize = loadPref("mtb_fontSize", 14);
    wrapper.style.fontSize = initFontSize + "px";
    
    // Apply saved position
    const pos = loadPref("boxPosition", null);
    if (pos && pos.top && pos.left) {
      wrapper.style.top = pos.top;
      wrapper.style.left = pos.left;
    }
    
    // Initial visibility
    const isOpen = loadPref("multitool_open", false);
    wrapper.style.display = isOpen ? "block" : "none";
    
    // Create open button
    const openBtn = document.createElement('button');
    openBtn.id = "sway-open-btn";
    openBtn.innerHTML = `<img src="https://github.com/LauraSWP/scripts/blob/main/assets/tealiumlogo.png?raw=true" alt="Open Panel">`;
    openBtn.style.display = isOpen ? "none" : "block";
    openBtn.addEventListener('click', function() {
      wrapper.style.display = "block";
      openBtn.style.display = "none";
      savePref("multitool_open", true);
      
      // Show appropriate default tab
      const availableTabs = getAvailableTabs();
      const defaultTab = availableTabs[0] || 'jira';
      showTab(defaultTab);
    });
    document.body.appendChild(openBtn);
    
    // Create force open button (backup)
    const forceOpenBtn = document.createElement("button");
    forceOpenBtn.id = "sway-force-open-btn";
    forceOpenBtn.innerHTML = `<img src="https://github.com/LauraSWP/scripts/blob/main/assets/tealiumlogo.png?raw=true" alt="Open Panel" style="width:24px;height:24px;">`;
    forceOpenBtn.style.display = "none";
    forceOpenBtn.addEventListener("click", function() {
      wrapper.style.display = "block";
      forceOpenBtn.style.display = "none";
      openBtn.style.display = "none";
      savePref("multitool_open", true);
    });
    document.body.appendChild(forceOpenBtn);
    
    // Drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    wrapper.appendChild(dragHandle);
    
    // Top bar
    const topBar = document.createElement('div');
    topBar.className = "mtb-top-bar";
    
    const topBarLeft = document.createElement('div');
    topBarLeft.className = "mtb-top-bar-left";
    
    // Theme toggle
    const toggleWrapper = document.createElement('div');
    toggleWrapper.className = "theme-toggle-wrapper";
    const toggleInput = document.createElement('input');
    toggleInput.type = "checkbox";
    toggleInput.id = "theme-toggle";
    toggleInput.className = "theme-toggle";
    toggleInput.checked = (loadPref("theme", "light") === "dark");
    toggleInput.addEventListener('change', () => {
      toggleTheme(toggleInput.checked ? "dark" : "light");
    });
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = "theme-toggle";
    const moonSpan = document.createElement('span');
    moonSpan.className = "toggle-icon toggle-icon--moon";
    moonSpan.innerHTML = moonIconSVG;
    const sunSpan = document.createElement('span');
    sunSpan.className = "toggle-icon toggle-icon--sun";
    sunSpan.innerHTML = sunIconSVG;
    toggleLabel.appendChild(moonSpan);
    toggleLabel.appendChild(sunSpan);
    toggleWrapper.appendChild(toggleInput);
    toggleWrapper.appendChild(toggleLabel);
    topBarLeft.appendChild(toggleWrapper);
    
    const topBarRight = document.createElement('div');
    topBarRight.className = "mtb-top-bar-right";
    
    // Navigation buttons
    const upBtn = document.createElement('button');
    upBtn.className = "circle-btn";
    upBtn.textContent = "↑";
    upBtn.title = "Scroll to top";
    upBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    
    const downBtn = document.createElement('button');
    downBtn.className = "circle-btn";
    downBtn.textContent = "↓";
    downBtn.title = "Scroll to bottom";
    downBtn.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    
    const docsBtn = document.createElement('button');
    docsBtn.className = "circle-btn";
    docsBtn.innerHTML = `<img src="https://github.com/LauraSWP/scripts/blob/main/assets/tealiumlogo.png?raw=true" alt="Tealium Docs" style="width:20px;height:20px;border-radius:50%;">`;
    docsBtn.title = "Tealium Docs";
    docsBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'https://docs.tealium.com/';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    
    const supportBtn = document.createElement('button');
    supportBtn.className = "circle-btn";
    supportBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
      <path d="M2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z"></path>
    </svg>`; // Person icon that adapts to theme
    supportBtn.title = "Customer Portal";
    supportBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'https://support.tealiumiq.com/en/support/home';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    
    const slackBtn = document.createElement('button');
    slackBtn.className = "circle-btn";
    slackBtn.innerHTML = "#"; // Hashtag icon for Slack channel
    slackBtn.title = "Technical Help Channel";
    slackBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'https://tealium.slack.com/archives/C04GDSPE98D';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    
    const snippetBtn = document.createElement('button');
    snippetBtn.className = "circle-btn";
    snippetBtn.innerHTML = "&lt;/&gt;"; // Code angle brackets icon
    snippetBtn.title = "Snippet Box";
    snippetBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'https://solutions.tealium.net/snippets/';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    
    const gleanBtn = document.createElement('button');
    gleanBtn.className = "circle-btn";
    gleanBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
    </svg>`; // Chat bubble icon
    gleanBtn.title = "Glean Chat";
    gleanBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = 'https://app.glean.com/chat';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.className = "circle-btn close-btn";
    closeBtn.textContent = "×";
    closeBtn.title = "Close Panel";
    closeBtn.addEventListener('click', () => {
      wrapper.style.display = "none";
      savePref("multitool_open", false);
      openBtn.style.display = "block";
    });
    
    topBarRight.appendChild(docsBtn);
    topBarRight.appendChild(supportBtn);
    topBarRight.appendChild(slackBtn);
    topBarRight.appendChild(snippetBtn);
    topBarRight.appendChild(gleanBtn);
    topBarRight.appendChild(upBtn);
    topBarRight.appendChild(downBtn);
    topBarRight.appendChild(closeBtn);
    
    topBar.appendChild(topBarLeft);
    topBar.appendChild(topBarRight);
    wrapper.appendChild(topBar);
    
    // Header
    const header = document.createElement('div');
    header.className = "mtb-header";
    
    // Left side: Logo and title
    const headerLeft = document.createElement('div');
    headerLeft.className = "mtb-header-left";
    
    const tealiumLogo = document.createElement('img');
    tealiumLogo.className = "mtb-logo";
    tealiumLogo.src = "https://github.com/LauraSWP/scripts/blob/main/assets/tealiumlogo.png?raw=true";
    
    const h3El = document.createElement('h3');
    h3El.className = "mtb-title";
    h3El.textContent = "MultiTool Beast";
    
    headerLeft.appendChild(tealiumLogo);
    headerLeft.appendChild(h3El);
    
    // Right side: Search bar
    const headerRight = document.createElement('div');
    headerRight.className = "mtb-header-right";
    
    const searchInput = document.createElement('input');
    searchInput.type = "text";
    searchInput.placeholder = "Find on page...";
    searchInput.className = "mtb-search-input";
    
    // Modern page search functionality that excludes the extension panel
    let currentSearchResults = [];
    let currentSearchIndex = -1;
    let searchHighlightClass = 'mtb-search-highlight';
    
    // Add search highlight styles
    function addSearchStyles() {
      if (document.getElementById('mtb-search-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'mtb-search-styles';
      style.innerHTML = `
        .mtb-search-highlight {
          background-color: #ffff00 !important;
          color: #000000 !important;
          border-radius: 2px;
          padding: 1px 2px;
          box-shadow: 0 0 3px rgba(255, 255, 0, 0.8);
        }
        .mtb-search-highlight.current {
          background-color: #ff8c00 !important;
          color: #ffffff !important;
          box-shadow: 0 0 5px rgba(255, 140, 0, 0.8);
        }
      `;
      document.head.appendChild(style);
    }
    
    function clearSearchHighlights() {
      // Remove all existing highlights
      document.querySelectorAll(`.${searchHighlightClass}`).forEach(element => {
        const parent = element.parentNode;
        parent.replaceChild(document.createTextNode(element.textContent), element);
        parent.normalize(); // Merge adjacent text nodes
      });
      currentSearchResults = [];
      currentSearchIndex = -1;
    }
    
    function highlightSearchTerm(searchTerm, targetElement = document.body) {
      // Skip the extension panel itself
      if (targetElement.closest('#multitool-beast-wrapper, #sway-open-btn, #sway-force-open-btn')) {
        return;
      }
      
      const walker = document.createTreeWalker(
        targetElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip text nodes inside the extension panel
            if (node.parentElement && node.parentElement.closest('#multitool-beast-wrapper, #sway-open-btn, #sway-force-open-btn')) {
              return NodeFilter.FILTER_REJECT;
            }
            // Skip script and style elements
            if (node.parentElement && (
              node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE' ||
              node.parentElement.tagName === 'NOSCRIPT'
            )) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const matches = [...text.matchAll(regex)];
        
        if (matches.length > 0) {
          const parent = textNode.parentNode;
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          
          matches.forEach(match => {
            // Add text before the match
            if (match.index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            
            // Add highlighted match
            const highlight = document.createElement('span');
            highlight.className = searchHighlightClass;
            highlight.textContent = match[0];
            fragment.appendChild(highlight);
            currentSearchResults.push(highlight);
            
            lastIndex = match.index + match[0].length;
          });
          
          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          
          parent.replaceChild(fragment, textNode);
        }
      });
    }
    
    function scrollToCurrentResult() {
      if (currentSearchIndex >= 0 && currentSearchIndex < currentSearchResults.length) {
        const currentElement = currentSearchResults[currentSearchIndex];
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Update highlight classes
        currentSearchResults.forEach((el, index) => {
          if (index === currentSearchIndex) {
            el.classList.add('current');
          } else {
            el.classList.remove('current');
          }
        });
        
        // Update search input to show progress
        const searchInput = document.querySelector('#multitool-beast-wrapper .mtb-search-input');
        if (searchInput && currentSearchResults.length > 0) {
          searchInput.title = `${currentSearchIndex + 1} of ${currentSearchResults.length} results`;
        }
      }
    }
    
    function performSearch(searchTerm) {
      // Clear previous search
      clearSearchHighlights();
      
      if (!searchTerm.trim()) {
        const searchInput = document.querySelector('#multitool-beast-wrapper .mtb-search-input');
        if (searchInput) {
          searchInput.title = '';
        }
        return false;
      }
      
      // Add search styles if not present
      addSearchStyles();
      
      // Highlight all matches on the page (excluding extension panel)
      highlightSearchTerm(searchTerm);
      
      if (currentSearchResults.length > 0) {
        currentSearchIndex = 0;
        scrollToCurrentResult();
        return true;
      }
      
      // No results found
      const searchInput = document.querySelector('#multitool-beast-wrapper .mtb-search-input');
      if (searchInput) {
        searchInput.title = 'No results found';
      }
      return false;
    }
    
    function findNext(searchTerm) {
      if (!searchTerm.trim() || currentSearchResults.length === 0) return false;
      
      currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
      scrollToCurrentResult();
      return true;
    }
    
    function findPrevious(searchTerm) {
      if (!searchTerm.trim() || currentSearchResults.length === 0) return false;
      
      currentSearchIndex = currentSearchIndex <= 0 ? currentSearchResults.length - 1 : currentSearchIndex - 1;
      scrollToCurrentResult();
      return true;
    }
    
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value;
      performSearch(searchTerm);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const searchTerm = searchInput.value;
        
        if (searchTerm.trim()) {
          if (e.shiftKey) {
            // Previous result
            findPrevious(searchTerm);
          } else {
            // Next result (or start search if no results yet)
            if (currentSearchResults.length === 0) {
              performSearch(searchTerm);
            } else {
              findNext(searchTerm);
            }
          }
        }
      } else if (e.key === 'Escape') {
        // Clear search
        clearSearchHighlights();
        searchInput.value = '';
        searchInput.title = '';
        searchInput.blur();
      }
    });
    
    // Clear search when input loses focus and is empty
    searchInput.addEventListener('blur', (e) => {
      if (!e.target.value.trim()) {
        clearSearchHighlights();
        searchInput.title = '';
      }
    });
    
    headerRight.appendChild(searchInput);
    
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    wrapper.appendChild(header);
    
    // Content area
    const content = document.createElement('div');
    content.className = "mtb-content";
    
    // Create tabs
    const tabsUL = document.createElement('ul');
    tabsUL.className = "mtb-tabs";
    
    const availableTabs = getAvailableTabs();
    
    // Profile tab (Freshdesk tickets only)
    if (availableTabs.includes('profile')) {
      const profileTab = document.createElement('li');
      profileTab.id = "tab-btn-profile";
      profileTab.className = "mtb-tab active";
      profileTab.innerHTML = `${personIconSVG} <span>Profile</span>`;
      profileTab.addEventListener('click', () => showTab('profile'));
      tabsUL.appendChild(profileTab);
    }
    
    // Jira tab (always available)
    if (availableTabs.includes('jira')) {
      const jiraTab = document.createElement('li');
      jiraTab.id = "tab-btn-jira";
      jiraTab.className = "mtb-tab" + (availableTabs.includes('profile') ? '' : ' active');
      jiraTab.innerHTML = `${jiraIconSVG} <span>Jira</span>`;
      jiraTab.addEventListener('click', () => showTab('jira'));
      tabsUL.appendChild(jiraTab);
    }

    // Clipboard tab (always available)
    if (availableTabs.includes('clipboard')) {
      const clipboardTab = document.createElement('li');
      clipboardTab.id = "tab-btn-clipboard";
      clipboardTab.className = "mtb-tab";
      clipboardTab.innerHTML = `${clipboardIconSVG} <span>Clip</span>`;
      clipboardTab.addEventListener('click', () => showTab('clipboard'));
      tabsUL.appendChild(clipboardTab);
    }
    
    const settingsTab = document.createElement('li');
    settingsTab.id = "tab-btn-settings";
    settingsTab.className = "mtb-tab";
    settingsTab.innerHTML = `${settingsIconSVG} <span>Settings</span>`;
    settingsTab.addEventListener('click', () => showTab('settings'));
    tabsUL.appendChild(settingsTab);
    
    content.appendChild(tabsUL);
    
    // Create tab content containers
    if (availableTabs.includes('profile')) {
      const profileContent = document.createElement('div');
      profileContent.id = "tab-content-profile";
      profileContent.className = "tab-content";
      profileContent.style.display = "block";
      content.appendChild(profileContent);
    }
    
    if (availableTabs.includes('jira')) {
      const jiraContent = document.createElement('div');
      jiraContent.id = "tab-content-jira";
      jiraContent.className = "tab-content";
      jiraContent.style.display = availableTabs.includes('profile') ? "none" : "block";
      content.appendChild(jiraContent);
    }

    if (availableTabs.includes('clipboard')) {
      const clipboardContent = document.createElement('div');
      clipboardContent.id = "tab-content-clipboard";
      clipboardContent.className = "tab-content";
      content.appendChild(clipboardContent);
    }
    
    const settingsContent = document.createElement('div');
    settingsContent.id = "tab-content-settings";
    settingsContent.className = "tab-content";
    content.appendChild(settingsContent);
    
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
    
    // Apply saved theme after wrapper is added to DOM
    initTheme();
    
    // Populate content only for the initially visible tab to improve performance
    const defaultTab = availableTabs[0] || 'jira';
    if (defaultTab === 'profile') {
      populateProfileContent();
    } else if (defaultTab === 'jira') {
      populateJiraContent();
    } else if (defaultTab === 'clipboard') {
      populateClipboardContent();
    } else if (defaultTab === 'settings') {
      populateSettingsContent();
    }
    

    
    // Make draggable
    let isDragging = false;
    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      isDragging = true;
      wrapper.classList.add("dragging");
      let posX = e.clientX;
      let posY = e.clientY;
      
      function dragMove(e2) {
        if (!isDragging) return;
        e2.preventDefault();
        let deltaX = posX - e2.clientX;
        let deltaY = e2.clientY - posY;
        posX = e2.clientX;
        posY = e2.clientY;
        wrapper.style.top = (wrapper.offsetTop + deltaY) + "px";
        wrapper.style.left = (wrapper.offsetLeft - deltaX) + "px";
      }
      
      function closeDrag() {
        isDragging = false;
        wrapper.classList.remove("dragging");
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', closeDrag);
        savePref("boxPosition", {
          top: wrapper.style.top,
          left: wrapper.style.left
        });
      }
      
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('mouseup', closeDrag);
    });
    
    console.log("Unified panel created successfully");
  }
  /***************************************************
   * TEXT SELECTION TO CLIPBOARD FUNCTIONALITY
   ***************************************************/
   
   let selectionPlusIcon = null;
   let selectionHideTimeout = null;
   
   function createSelectionPlusIcon() {
     if (selectionPlusIcon) return selectionPlusIcon;
     
     const icon = document.createElement('button');
     icon.id = 'mtb-selection-plus-icon';
     icon.className = 'sway-btn-icon';
     icon.innerHTML = '+';
     icon.title = 'Add to Clipboard';
     icon.style.cssText = `
       position: fixed;
       width: 32px;
       height: 32px;
       background: rgba(0, 150, 0, 0.1);
       color: #00a000;
       border: 2px solid #00a000;
       border-radius: 6px;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 16px;
       font-weight: bold;
       cursor: pointer;
       box-shadow: 0 2px 8px rgba(0,0,0,0.3);
       z-index: 2147483646;
       opacity: 0;
       transform: scale(0.8);
       transition: all 0.2s ease;
       pointer-events: none;
       font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
       text-align: center;
       line-height: 1;
       min-width: 32px;
       min-height: 32px;
       padding: 0;
       margin: 0;
     `;
     
     icon.addEventListener('mouseenter', () => {
       icon.style.transform = 'scale(1.1)';
       icon.style.background = 'rgba(0, 150, 0, 0.2)';
       icon.style.boxShadow = '0 4px 12px rgba(0,150,0,0.4)';
       icon.style.borderColor = '#00d000';
     });
     
     icon.addEventListener('mouseleave', () => {
       icon.style.transform = 'scale(1)';
       icon.style.background = 'rgba(0, 150, 0, 0.1)';
       icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
       icon.style.borderColor = '#00a000';
     });
     
     icon.addEventListener('click', (e) => {
       e.preventDefault();
       e.stopPropagation();
       addSelectedTextToClipboard();
     });
     
     document.body.appendChild(icon);
     selectionPlusIcon = icon;
     return icon;
   }
   
   function showSelectionPlusIcon(x, y) {
     const icon = createSelectionPlusIcon();
     
     // Clear any existing hide timeout
     if (selectionHideTimeout) {
       clearTimeout(selectionHideTimeout);
       selectionHideTimeout = null;
     }
     
     // Position the icon near the selection
     const padding = 10;
     const iconSize = 32;
     
     // Ensure icon stays within viewport
     const maxX = window.innerWidth - iconSize - padding;
     const maxY = window.innerHeight - iconSize - padding;
     
     const finalX = Math.min(Math.max(padding, x + padding), maxX);
     const finalY = Math.min(Math.max(padding, y - iconSize - padding), maxY);
     
     icon.style.left = finalX + 'px';
     icon.style.top = finalY + 'px';
     icon.style.opacity = '1';
     icon.style.transform = 'scale(1)';
     icon.style.pointerEvents = 'auto';
   }
   
   function hideSelectionPlusIcon() {
     if (selectionPlusIcon) {
       selectionPlusIcon.style.opacity = '0';
       selectionPlusIcon.style.transform = 'scale(0.8)';
       selectionPlusIcon.style.pointerEvents = 'none';
     }
   }
   
   function addSelectedTextToClipboard() {
     const selection = window.getSelection();
     const selectedText = selection.toString().trim();
     
     if (!selectedText) {
       console.log('No text selected');
       return;
     }
     
     // Create a meaningful label based on the selection
     let label = 'Selected Text';
     
     // Try to get context from the parent element
     const range = selection.getRangeAt(0);
     const container = range.commonAncestorContainer;
     const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
     
     // Look for meaningful context
     if (parentElement) {
       // Check for nearby labels, headers, or other contextual elements
       const contextElement = parentElement.closest('[data-field-name], [aria-label], h1, h2, h3, h4, h5, h6, label, .field-label, .form-label');
       
       if (contextElement) {
         const contextText = contextElement.getAttribute('data-field-name') || 
                           contextElement.getAttribute('aria-label') ||
                           contextElement.textContent?.trim();
         
         if (contextText && contextText !== selectedText) {
           label = contextText.substring(0, 30); // Limit label length
           if (contextText.length > 30) label += '...';
         }
       }
       
       // If no context found, use element type
       if (label === 'Selected Text') {
         const tagName = parentElement.tagName.toLowerCase();
         switch (tagName) {
           case 'h1':
           case 'h2':
           case 'h3':
           case 'h4':
           case 'h5':
           case 'h6':
             label = 'Header';
             break;
           case 'p':
             label = 'Paragraph';
             break;
           case 'span':
           case 'div':
             // Try to get class or id for context
             const className = parentElement.className;
             const id = parentElement.id;
             if (className && className.includes('title')) label = 'Title';
             else if (className && className.includes('description')) label = 'Description';
             else if (id) label = 'Text from ' + id.substring(0, 15);
             break;
           default:
             label = 'Selected Text';
         }
       }
     }
     
     // Add to clipboard with enhanced feedback
     console.log(`📋 Adding selected text to clipboard - Label: "${label}", Text: "${selectedText.substring(0, 100)}..."`);
     
     try {
       addToClipboard(label, selectedText);
       console.log(`📋 addToClipboard call completed successfully`);
       
       // Show success feedback
       if (selectionPlusIcon) {
         const originalContent = selectionPlusIcon.innerHTML;
         const originalBackground = selectionPlusIcon.style.background;
         const originalBorderColor = selectionPlusIcon.style.borderColor;
         
         selectionPlusIcon.innerHTML = '✓';
         selectionPlusIcon.style.background = 'rgba(0, 200, 0, 0.3)';
         selectionPlusIcon.style.borderColor = '#00d000';
         selectionPlusIcon.style.transform = 'scale(1.2)';
         selectionPlusIcon.style.color = '#00d000';
         
         // Force update the clipboard tab immediately
         setTimeout(() => {
           console.log(`📋 Forcing clipboard tab update after text selection`);
           
           // Reload clipboard data from storage to ensure we have latest
           const storedData = loadPref("clipboard_data", []);
           clipboardData = storedData;
           console.log(`📋 Reloaded clipboard data, length: ${clipboardData.length}`);
           
           // Update clipboard tab if it exists
           const clipboardContainer = document.getElementById('tab-content-clipboard');
           if (clipboardContainer) {
             console.log('📋 Found clipboard container, refreshing content');
             populateClipboardContent();
           } else {
             console.log('📋 No clipboard container found - tab may not be visible');
           }
         }, 50);
         
         // Reset icon after success animation
         setTimeout(() => {
           selectionPlusIcon.innerHTML = originalContent;
           selectionPlusIcon.style.background = originalBackground;
           selectionPlusIcon.style.borderColor = originalBorderColor;
           selectionPlusIcon.style.transform = 'scale(1)';
           selectionPlusIcon.style.color = '#00a000';
           hideSelectionPlusIcon();
         }, 1500);
       }
     } catch (error) {
       console.error('📋 Error adding selected text to clipboard:', error);
       
       // Show error feedback
       if (selectionPlusIcon) {
         const originalContent = selectionPlusIcon.innerHTML;
         const originalBackground = selectionPlusIcon.style.background;
         
         selectionPlusIcon.innerHTML = '✗';
         selectionPlusIcon.style.background = 'rgba(200, 0, 0, 0.3)';
         selectionPlusIcon.style.color = '#d00000';
         
         setTimeout(() => {
           selectionPlusIcon.innerHTML = originalContent;
           selectionPlusIcon.style.background = originalBackground;
           selectionPlusIcon.style.color = '#00a000';
           hideSelectionPlusIcon();
         }, 1500);
       }
     }
     
     // Clear selection
     window.getSelection().removeAllRanges();
     
     console.log(`📋 Selected text processing completed`);
   }
   
   function handleTextSelection() {
     const selection = window.getSelection();
     const selectedText = selection.toString().trim();
     
     if (selectedText && selectedText.length > 2) {
       // Get selection position
       const range = selection.getRangeAt(0);
       const rect = range.getBoundingClientRect();
       
       // Don't show icon if selection is within the extension panel
       const extensionPanel = document.getElementById('multitool-beast-wrapper');
       if (extensionPanel && extensionPanel.contains(range.commonAncestorContainer)) {
         hideSelectionPlusIcon();
         return;
       }
       
       // Show plus icon near the end of selection
       showSelectionPlusIcon(rect.right, rect.top);
       
       // Hide icon after delay if no interaction
       selectionHideTimeout = setTimeout(() => {
         hideSelectionPlusIcon();
       }, 5000);
       
     } else {
       hideSelectionPlusIcon();
     }
   }
   
   // Track text selection event listeners for cleanup
   let textSelectionListeners = {};
   
   function initializeTextSelectionFeature() {
     // Check if feature is enabled
     const isEnabled = loadPref('mtb_textSelectionEnabled', true);
     if (!isEnabled) {
       console.log('📋 Text selection feature disabled via settings');
       return;
     }
     
     // Add selection event listeners
     textSelectionListeners.mouseup = (e) => {
       // Small delay to ensure selection is complete
       setTimeout(handleTextSelection, 100);
     };
     
     textSelectionListeners.keyup = (e) => {
       // Handle keyboard selection (Shift+Arrow keys, Ctrl+A, etc.)
       if (e.shiftKey || e.ctrlKey || e.metaKey) {
         setTimeout(handleTextSelection, 100);
       }
     };
     
     textSelectionListeners.mousedown = (e) => {
       if (selectionPlusIcon && !selectionPlusIcon.contains(e.target)) {
         // Small delay to allow for selection completion
         setTimeout(() => {
           const selection = window.getSelection();
           if (!selection.toString().trim()) {
             hideSelectionPlusIcon();
           }
         }, 100);
       }
     };
     
     textSelectionListeners.scroll = () => {
       hideSelectionPlusIcon();
     };
     
     // Add event listeners
     document.addEventListener('mouseup', textSelectionListeners.mouseup);
     document.addEventListener('keyup', textSelectionListeners.keyup);
     document.addEventListener('mousedown', textSelectionListeners.mousedown);
     document.addEventListener('scroll', textSelectionListeners.scroll, { passive: true });
     
     console.log('📋 Text selection to clipboard feature initialized');
   }
   
   function enableTextSelectionFeature() {
     // Remove existing listeners first (if any)
     disableTextSelectionFeature();
     
     // Re-initialize the feature
     initializeTextSelectionFeature();
     console.log('📋 Text selection feature enabled');
   }
   
   function disableTextSelectionFeature() {
     // Remove all event listeners
     if (textSelectionListeners.mouseup) {
       document.removeEventListener('mouseup', textSelectionListeners.mouseup);
     }
     if (textSelectionListeners.keyup) {
       document.removeEventListener('keyup', textSelectionListeners.keyup);
     }
     if (textSelectionListeners.mousedown) {
       document.removeEventListener('mousedown', textSelectionListeners.mousedown);
     }
     if (textSelectionListeners.scroll) {
       document.removeEventListener('scroll', textSelectionListeners.scroll);
     }
     
     // Clear listeners object
     textSelectionListeners = {};
     
     // Hide any existing selection icon
     hideSelectionPlusIcon();
     
     console.log('📋 Text selection feature disabled');
   }

  /***************************************************
   * CROSS-DOMAIN DATA LOADING
   ***************************************************/
   
  function loadLatestCrossDomainData() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['mtb_latest_freshdesk_data', 'mtb_latest_jira_data'], (result) => {
        console.log("Loading cross-domain data:", result);
        
        // Update localStorage to sync
        if (result.mtb_latest_freshdesk_data) {
          localStorage.setItem('mtb_latest_freshdesk_data', JSON.stringify(result.mtb_latest_freshdesk_data));
          console.log("📊 Loaded Freshdesk data from Chrome storage");
        }
        
        if (result.mtb_latest_jira_data) {
          localStorage.setItem('mtb_latest_jira_data', JSON.stringify(result.mtb_latest_jira_data));
          console.log("📊 Loaded Jira data from Chrome storage");
        }
      });
    }
  }

  /***************************************************
   * INITIALIZATION LOGIC
   ***************************************************/
  
  function shouldInitializePanel() {
    if (isJira) {
      // On Jira, show panel on all pages but with different content
      return true;
    }
    
    if (isFreshdesk) {
      // On Freshdesk, only show on ticket pages
      return isTicketPage();
    }
    
    return false;
  }
  
    function initializeTool() {
    if (!shouldInitializePanel()) {
      console.log("Not on a supported page type, skipping panel creation");
      return;
    }
    
    // Ensure we don't double-initialize
    if (document.getElementById("multitool-beast-wrapper")) {
      console.log("Panel already exists, skipping initialization");
      return;
    }
    
    console.log("Initializing unified MultiTool Beast with shared data");
    
    // Initialize shared clipboard data first
    initializeClipboardData();
    
    // Load latest cross-domain data
    loadLatestCrossDomainData();
    
    // Initialize text selection to clipboard feature
    initializeTextSelectionFeature();
    
    createUnifiedPanel();
    
    // Set up auto-sync monitoring
    if (isFreshdesk && isTicketPage()) {
      setTimeout(() => {
        setupFreshdeskAutoSync();
        setupTimeTrackerMonitoring(); // Add time tracker monitoring
      }, 2000); // Wait for page to fully load
    } else if (isJira) {
      setTimeout(() => {
        setupStoredDataMonitoring();
      }, 2000); // Wait for page to fully load
    }
    
    // Add auto-fill button to permission request form if detected
    if (isJira && window.location.href.includes('/servicedesk/customer/portal/7/group/33/create/348')) {
      console.log("🔐 Permission request form detected, adding auto-fill button...");
      setTimeout(() => {
        addPermissionFormAutoFillButton();
      }, 2000); // Wait for form to load
    }
    
    // Start modal monitoring for Jira
    if (isJira) {
      startModalMonitoring();
      
      // Check if we need to auto-create issue on any Jira page
      const currentUrl = window.location.href;
      if (currentUrl.includes('tealium.atlassian.net')) {
        console.log(`🔍 Jira page detected, checking for auto-create requirements...`);
        
                 // Check for pending work type and wait for DOM readiness
         const urlParams = new URLSearchParams(window.location.search);
         const urlWorkType = urlParams.get('mtb_create');
         const localWorkType = localStorage.getItem('mtb_pending_work_type');
         const sessionWorkType = sessionStorage.getItem('mtb_pending_work_type');
         
         console.log(`📋 Work type sources:`, {
           urlParams: urlWorkType,
           localStorage: localWorkType,
           sessionStorage: sessionWorkType,
           domState: document.readyState
         });
         
         if (urlWorkType || localWorkType || sessionWorkType) {
           console.log(`✅ Work type found, ensuring DOM and Jira are ready...`);
           
           // Enhanced timing with DOM readiness check
           const ensureReadyAndCreate = () => {
             console.log(`🔍 Checking readiness - DOM: ${document.readyState}`);
             
             if (document.readyState !== 'complete') {
               console.log(`📄 DOM not complete, waiting...`);
               setTimeout(ensureReadyAndCreate, 1500);
               return;
             }
             
             // Check for basic Jira elements
             const hasJiraNav = !!(document.querySelector('[data-testid="atlassian-navigation"]') ||
                                 document.querySelector('header nav') ||
                                 document.querySelector('[role="banner"]'));
             
             if (!hasJiraNav) {
               console.log(`⏰ Jira navigation not ready, waiting...`);
               setTimeout(ensureReadyAndCreate, 2000);
               return;
             }
             
             console.log(`🚀 DOM and Jira ready, triggering auto-create in 2 seconds...`);
        setTimeout(() => {
          handleJiraBoardAutoCreate();
        }, 2000);
           };
           
           // Start checking after initial delay
           setTimeout(ensureReadyAndCreate, 3000);
         } else {
           console.log(`❌ No work type found, skipping auto-create`);
         }
      }
    }
    
    // Set up Jira messaging if available
    if (isJira && typeof chrome !== 'undefined' && chrome.runtime) {
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "freshdeskNavigated") {
          console.log("Received notification of Freshdesk navigation");
          // Refresh profile data if panel is open
          const panel = document.getElementById("multitool-beast-wrapper");
          if (panel && panel.style.display !== "none") {
            populateProfileContent();
          }
          sendResponse({ status: "acknowledged" });
        }
        return true;
      });
    }
  }
  
  /***************************************************
   * SPA NAVIGATION HANDLING
   ***************************************************/
  
  // Handle SPA navigation
  let lastUrl = location.href;
  let lastJiraIssueId = null;
  
  // Auto-sync variables
  let freshdeskSyncTimer = null;
  let lastFreshdeskData = null;
  let freshdeskFieldObserver = null;
  let storedDataSyncTimer = null;
  let lastStoredDataTimestamp = null;
  
  // Function to reset auto-sync tracking
  function resetFreshdeskAutoSync() {
    if (freshdeskSyncTimer) {
      clearInterval(freshdeskSyncTimer);
      freshdeskSyncTimer = null;
    }
    if (freshdeskFieldObserver) {
      freshdeskFieldObserver.disconnect();
      freshdeskFieldObserver = null;
    }
    if (storedDataSyncTimer) {
      clearInterval(storedDataSyncTimer);
      storedDataSyncTimer = null;
    }
    lastFreshdeskData = null;
    lastStoredDataTimestamp = null;
    console.log("🔄 Freshdesk auto-sync reset");
  }
  
  // Function to compare Freshdesk data for changes
  function getFreshdeskDataHash() {
    if (!isFreshdesk || !isTicketPage()) return null;
    
    const accountField = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
    const profileField = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
    const carrField = document.querySelector('[data-test-id="requester-info-company-carr_usd"] .info-details-content, [data-test-id="requester-info-company-carr_usd"] .text__content');
    
    const account = accountField ? accountField.value : '';
    const profile = profileField ? profileField.value : '';
    const carr = carrField ? carrField.textContent : '';
    
    return `${account}|${profile}|${carr}|${window.location.href}`;
  }
  
  // Function to auto-refresh Profile tab when data changes
  function refreshProfileIfChanged() {
    const currentHash = getFreshdeskDataHash();
    if (currentHash && currentHash !== lastFreshdeskData) {
      console.log("🔄 Freshdesk data changed, auto-refreshing Profile tab...");
      console.log("Previous:", lastFreshdeskData);
      console.log("Current:", currentHash);
      
      lastFreshdeskData = currentHash;
      
      // Only refresh if Profile tab exists and contains live data
      const existingPanel = document.getElementById("multitool-beast-wrapper");
      const profileTab = existingPanel ? existingPanel.querySelector('#tab-content-profile') : null;
      
      if (profileTab && isFreshdesk && isTicketPage()) {
        console.log("✅ Auto-refreshing Profile tab content");
        populateProfileContent();
        
        // Show visual feedback if Profile tab is currently active
        const profileTabBtn = existingPanel.querySelector('#tab-btn-profile');
        if (profileTabBtn && profileTabBtn.classList.contains('active')) {
          // Flash the tab to indicate refresh
          profileTabBtn.style.backgroundColor = '#e3fcef';
          setTimeout(() => {
            profileTabBtn.style.backgroundColor = '';
          }, 1000);
        }
      }
    }
  }
  
  // Function to set up Freshdesk field monitoring
  function setupFreshdeskAutoSync() {
    if (!isFreshdesk || !isTicketPage()) return;
    
    console.log("🔄 Setting up Freshdesk auto-sync monitoring...");
    
    // Initialize baseline data
    lastFreshdeskData = getFreshdeskDataHash();
    
    // Set up periodic checking (every 3 seconds)
    freshdeskSyncTimer = setInterval(() => {
      refreshProfileIfChanged();
    }, 3000);
    
    // Set up field change observers
    const fieldsToWatch = [
      'input[data-test-text-field="customFields.cf_tealium_account"]',
      'input[data-test-text-field="customFields.cf_iq_profile"]'
    ];
    
    fieldsToWatch.forEach(selector => {
      const field = document.querySelector(selector);
      if (field) {
        field.addEventListener('input', () => {
          console.log(`🔄 Field changed: ${selector}`);
          setTimeout(refreshProfileIfChanged, 500); // Small delay to ensure value is updated
        });
        field.addEventListener('change', () => {
          console.log(`🔄 Field changed (change event): ${selector}`);
          setTimeout(refreshProfileIfChanged, 500);
        });
      }
    });
    
    // Set up DOM observer for dynamic field additions
    freshdeskFieldObserver = new MutationObserver((mutations) => {
      let fieldAdded = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const hasAccountField = node.querySelector ? node.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]') : false;
            const hasProfileField = node.querySelector ? node.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]') : false;
            const hasCarrField = node.querySelector ? node.querySelector('[data-test-id="requester-info-company-carr_usd"]') : false;
            
            if (hasAccountField || hasProfileField || hasCarrField) {
              fieldAdded = true;
            }
          }
        });
      });
      
      if (fieldAdded) {
        console.log("🔄 Freshdesk fields added to DOM, checking for changes...");
        setTimeout(refreshProfileIfChanged, 1000);
      }
    });
    
    // Start observing for field additions
    freshdeskFieldObserver.observe(document, {
      childList: true,
      subtree: true
    });
    
    console.log("✅ Freshdesk auto-sync monitoring active");
  }

  // Function to detect changes in stored Freshdesk data (for cross-tab updates)
  function checkStoredDataChanges() {
    const storedData = loadPref("latest_freshdesk_data", null);
    
    console.log("🔍 Checking stored data changes...", {
      hasStoredData: !!storedData,
      hasTimestamp: storedData ? !!storedData.timestamp : false,
      currentTimestamp: storedData ? storedData.timestamp : 'none',
      lastStoredTimestamp: lastStoredDataTimestamp,
      ticketId: storedData ? storedData.ticketId : 'none'
    });
    
    if (!storedData || !storedData.timestamp) {
      console.log("❌ No stored data or timestamp found");
      return false;
    }
    
    const currentTimestamp = storedData.timestamp;
    
    // Check if this is newer than what we last saw
    if (lastStoredDataTimestamp && currentTimestamp !== lastStoredDataTimestamp) {
      console.log("🔄 Stored Freshdesk data changed from another tab/window");
      console.log(`Previous timestamp: ${lastStoredDataTimestamp}`);
      console.log(`Current timestamp: ${currentTimestamp}`);
      console.log(`Ticket changed: ${storedData.ticketId}`);
      
      lastStoredDataTimestamp = currentTimestamp;
      return true;
    } else if (!lastStoredDataTimestamp) {
      // First time checking, just record the timestamp
      lastStoredDataTimestamp = currentTimestamp;
      console.log(`📝 Initial stored data timestamp recorded: ${currentTimestamp}`);
      console.log(`📝 Initial ticket ID: ${storedData.ticketId}`);
    } else {
      // Timestamps are the same, no change
      console.log("⏸️ No timestamp change detected");
    }
    
    return false;
  }

  // Function to refresh Profile tab when stored data changes
  function refreshProfileForStoredDataChanges() {
    const hasChanges = checkStoredDataChanges();
    const existingPanel = document.getElementById("multitool-beast-wrapper");
    const profileTab = existingPanel ? existingPanel.querySelector('#tab-content-profile') : null;
    const hasStoredData = hasStoredFreshdeskData();
    
    console.log("🔄 Refresh check:", {
      hasChanges: hasChanges,
      hasPanel: !!existingPanel,
      hasProfileTab: !!profileTab,
      isJira: isJira,
      hasStoredData: hasStoredData
    });
    
         if (hasChanges || (!lastStoredDataTimestamp && hasStoredData && isJira)) {
      if (profileTab && isJira) {
        console.log("✅ Auto-refreshing Profile tab for cross-tab data changes");
        populateProfileContent();
        
        // Show visual feedback if Profile tab is currently active
        const profileTabBtn = existingPanel.querySelector('#tab-btn-profile');
        if (profileTabBtn && profileTabBtn.classList.contains('active')) {
          // Flash the tab to indicate refresh
          profileTabBtn.style.backgroundColor = '#e3fcef';
          setTimeout(() => {
            profileTabBtn.style.backgroundColor = '';
          }, 1000);
        }
        
        return true; // Indicate that refresh happened
      } else {
        console.log("❌ Cannot refresh - missing requirements:", {
          profileTab: !!profileTab,
          isJira: isJira
        });
      }
    }
    
    return false; // No refresh needed or performed
  }
  function copyAllSelected() {
    let copyText = "";
    document.querySelectorAll('.fieldRow').forEach(function(row) {
      const chk = row.querySelector('.field-selector');
      if (chk && chk.checked) {
        const label = row.querySelector('.field-label').textContent.trim();
        const value = row.querySelector('.field-value').textContent.trim();
        copyText += `${label}: ${value}\n`;
      }
    });
    
    if (copyText) {
      navigator.clipboard.writeText(copyText).then(function() {
        console.log('Copied to clipboard:', copyText);
        showNotification('Copied to clipboard', 'success');
      }, function(err) {
        console.error('Could not copy text: ', err);
        showNotification('Error copying to clipboard', 'error');
      });
    } else {
      showNotification('No fields selected', 'info');
    }
  }

  // Auto-cleanup on page unload
  window.addEventListener('beforeunload', (event) => {
    console.log('Page unloading, cleaning up');
  });
  
  /***************************************************
   * INITIAL LOAD
   ***************************************************/
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTool);
  } else {
    // DOM already loaded
    setTimeout(initializeTool, 1000);
  }
  
  // Also try after a longer delay for slow-loading SPAs
  setTimeout(initializeTool, 3000);
  
  console.log("Unified MultiTool Beast content script loaded successfully");

})();