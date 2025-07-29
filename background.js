chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "setProfileData") {
      chrome.storage.local.set({ 
        latest_profile_data: message.profileData,
        last_updated: new Date().toISOString() 
      }, () => {
        console.log("Background: Stored profile data:", message.profileData);
        sendResponse({ status: "ok", timestamp: new Date().toISOString() });
      });
      return true;
    } else if (message.action === "getProfileData") {
      chrome.storage.local.get("latest_profile_data", (result) => {
        console.log("Background: Retrieved profile data for requesting tab");
        // Return the whole stored object instead of just fullHTML if needed:
        sendResponse({ profileData: result.latest_profile_data || {} });
      });
      return true;
    } else if (message.action === "openJiraCreateModal") {
      // When a tab requests to open the Jira create modal
      console.log("Background: Received request to open Jira create modal");
      
      // We need to wait for the Jira page to load, then find it and inject our script
      chrome.tabs.onUpdated.addListener(function jiraTabListener(tabId, changeInfo, tab) {
        // Check if this is a Jira tab that just completed loading
        if (changeInfo.status === 'complete' && 
            tab.url && tab.url.includes('tealium.atlassian.net')) {
          
          console.log("Background: Jira tab loaded, preparing to click create button");
          
          // Remove this listener since we only need it once
          chrome.tabs.onUpdated.removeListener(jiraTabListener);
          
          // Wait a moment for the page to fully render
          setTimeout(() => {
            // Execute script to click the Create button
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: clickJiraCreateButton
            }).then(() => {
              console.log("Background: Injected script to click Jira create button");
              
              // Set up a polling function to check for the modal
              let modalCheckAttempts = 0;
              const maxModalCheckAttempts = 20; // 10 seconds (20 * 500ms)
              
              const modalCheckInterval = setInterval(() => {
                modalCheckAttempts++;
                
                // Check if the modal is open by checking localStorage flags
                chrome.scripting.executeScript({
                  target: { tabId: tabId },
                  function: () => {
                    return {
                      requested: localStorage.getItem('jiraCreateModalRequested'),
                      buttonClicked: localStorage.getItem('jiraCreateButtonClicked'),
                      modalOpen: !!(
                        document.querySelector('#create-issue-dialog') || 
                        document.querySelector('[role="dialog"][data-testid="create-issue-modal"]') ||
                        document.querySelector('.css-1vslnu6')
                      )
                    };
                  }
                }).then((results) => {
                  const data = results[0].result;
                  
                  if (data.modalOpen) {
                    clearInterval(modalCheckInterval);
                    console.log("Background: Modal detected, will populate fields");
                    
                    // Wait a moment for the modal fields to initialize
                    setTimeout(() => {
                      // We need to define and inject the populateJiraFormFields function in the page context
                      chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        function: () => {
                          // Define all the functions needed for field population
                          function populateJiraFormFields() {
                            console.log("Jira: Attempting to populate form fields");
                          
                            // First set text fields which are more reliable
                            const accountProfile = localStorage.getItem('jira_account_profile') || '';
                            if (accountProfile) {
                              setTextFieldValue("customfield_10652-field", accountProfile);
                            }
                            
                            // Modified approach for Atlassian's React Select dropdowns with better debugging
                            function setJiraDropdown(id, value, displayText) {
                              console.log(`Jira: Directly setting ${id} to ${displayText || value}`);
                              
                              try {
                                // Find the container using multiple methods
                                const baseId = id.replace(/-field$/, '');
                                let container = document.getElementById(`${baseId}-container`);
                                
                                // If container not found by ID, try alternative selectors
                                if (!container) {
                                  console.log(`Jira: Container not found by ID, trying alternative selectors for ${id}`);
                                  container = document.querySelector(`[id$="${baseId}-container"]`);
                                  
                                  if (!container) {
                                    // Try by label
                                    const label = document.querySelector(`label[for="${id}"]`);
                                    if (label) {
                                      container = label.closest('.field-group');
                                    }
                                  }
                                }
                                
                                if (!container) {
                                  console.warn(`Jira: Container for ${id} not found using any method`);
                                  console.log(`Jira: Available field containers:`, 
                                    Array.from(document.querySelectorAll('[id$="-container"]'))
                                      .map(el => el.id)
                                      .join(', '));
                                  return false;
                                }
                                
                                console.log(`Jira: Found container for ${id}:`, container.id || "unnamed container");
                                
                                // Get the dropdown control with multiple possible class patterns
                                const controlSelectors = [
                                  `.select-${baseId}__control`,
                                  `[data-select-id="${baseId}"] .css-16igrsg`,
                                  `[id$="${baseId}-container"] .css-16igrsg`,
                                  `[id$="${baseId}-container"] [class*="select__control"]`
                                ];
                                
                                let control = null;
                                for (const selector of controlSelectors) {
                                  control = container.querySelector(selector);
                                  if (control) {
                                    console.log(`Jira: Found dropdown control using selector: ${selector}`);
                                    break;
                                  }
                                }
                                
                                if (!control) {
                                  console.warn(`Jira: Dropdown control for ${id} not found`);
                                  // Log all found controls for debugging
                                  const allControls = document.querySelectorAll('[class*="select__control"]');
                                  console.log(`Jira: Available controls (${allControls.length}):`, 
                                    Array.from(allControls).map(el => el.parentElement.id || "unnamed").join(', '));
                                  return false;
                                }
                                
                                // Ensure dropdown is closed before we start (in case it's already open)
                                document.body.click();
                                
                                // Click to open dropdown with retry logic
                                let clickSuccess = false;
                                for (let attempt = 0; attempt < 3; attempt++) {
                                  try {
                                    console.log(`Jira: Clicking dropdown control for ${id} (attempt ${attempt + 1})`);
                                    control.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                                    control.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                                    control.click();
                                    clickSuccess = true;
                                    break;
                                  } catch (e) {
                                    console.warn(`Jira: Click attempt ${attempt + 1} failed:`, e);
                                  }
                                }
                                
                                if (!clickSuccess) {
                                  console.warn(`Jira: Failed to click dropdown after multiple attempts`);
                                  return false;
                                }
                                
                                // Wait for menu to appear then find and click the matching option
                                setTimeout(() => {
                                  // Look for options menu with multiple selectors
                                  const menuSelectors = [
                                    `.select-${baseId}__menu`,
                                    `[id$="${baseId}-select-menu"]`,
                                    `.css-1v9js3n`,
                                    `[class*="select__menu"]`
                                  ];
                                  
                                  let menu = null;
                                  for (const selector of menuSelectors) {
                                    menu = document.querySelector(selector);
                                    if (menu) {
                                      console.log(`Jira: Found dropdown menu using selector: ${selector}`);
                                      break;
                                    }
                                  }
                                  
                                  if (!menu) {
                                    console.warn(`Jira: Menu for ${id} not found after clicking`);
                                    // Log if any menus are visible at all
                                    const anyMenu = document.querySelector('[class*="select__menu"]');
                                    if (anyMenu) {
                                      console.log(`Jira: Found some menu, but not for ${id}`);
                                    }
                                    document.body.click(); // Close any open dropdown
                                    return false;
                                  }
                                  
                                  // Get all options with multiple possible selectors
                                  const optionSelectors = [
                                    '[role="option"]',
                                    '[class*="select__option"]',
                                    '.css-1u0jh9z'
                                  ];
                                  
                                  let options = [];
                                  for (const selector of optionSelectors) {
                                    const found = menu.querySelectorAll(selector);
                                    if (found && found.length > 0) {
                                      options = Array.from(found);
                                      console.log(`Jira: Found ${options.length} options using selector: ${selector}`);
                                      break;
                                    }
                                  }
                                  
                                  if (options.length === 0) {
                                    console.warn(`Jira: No options found for ${id}`);
                                    document.body.click(); // Close dropdown
                                    return false;
                                  }
                                  
                                  // Log all available options for debugging
                                  console.log(`Jira: Available options for ${id}:`, 
                                    options.map(opt => opt.textContent.trim()).join(', '));
                                  
                                  // Try to find the option with matching text
                                  let found = false;
                                  for (const option of options) {
                                    const optionText = option.textContent.trim();
                                    console.log(`Jira: Checking option "${optionText}" against "${displayText}"`);
                                    
                                    if (optionText === displayText || 
                                        optionText.includes(displayText) || 
                                        displayText.includes(optionText)) {
                                      // Click the option with multiple methods to ensure it registers
                                      console.log(`Jira: Found matching option "${optionText}" - clicking it`);
                                      try {
                                        // Try multiple click methods
                                        option.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                                        option.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                                        option.click();
                                        
                                        // Additional verification - check if the dropdown value was updated
                                        setTimeout(() => {
                                          const selectedValue = control.textContent.trim();
                                          console.log(`Jira: After selection, dropdown shows: "${selectedValue}"`);
                                          if (selectedValue.includes(displayText) || displayText.includes(selectedValue)) {
                                            console.log(`Jira: Successfully set ${id} to ${displayText}`);
                                          } else {
                                            console.warn(`Jira: Selection may have failed, control text doesn't match`);
                                          }
                                        }, 300);
                                        
                                        found = true;
                                        break;
                                      } catch (e) {
                                        console.error(`Jira: Error clicking option:`, e);
                                      }
                                    }
                                  }
                                  
                                  if (!found) {
                                    console.warn(`Jira: No matching option found for ${id} with value ${displayText}`);
                                    // If exact match not found, try partial match as fallback
                                    for (const option of options) {
                                      const optionText = option.textContent.trim().toLowerCase();
                                      const targetText = displayText.toLowerCase();
                                      
                                      if (optionText.includes(targetText) || targetText.includes(optionText)) {
                                        console.log(`Jira: Found partial match "${optionText}" - trying it`);
                                        option.click();
                                        found = true;
                                        break;
                                      }
                                    }
                                    
                                    if (!found) {
                                      // Still not found, try first option as last resort
                                      console.log(`Jira: No match found, trying first option as fallback`);
                                      options[0].click();
                                    }
                                  }
                                }, 500);
                                
                                return true;
                              } catch (error) {
                                console.error(`Jira: Error setting dropdown ${id}:`, error);
                                return false;
                              }
                            }
                          
                            function setTextFieldValue(fieldId, value) {
                              console.log(`Jira: Setting text field ${fieldId} to "${value}"`);
                              
                              const field = document.getElementById(fieldId);
                              if (!field) {
                                console.warn(`Jira: Text field ${fieldId} not found`);
                                return false;
                              }
                              
                              // Focus the field
                              field.focus();
                              
                              // Set the value directly
                              field.value = value;
                              
                              // Trigger events to ensure React registers the change
                              field.dispatchEvent(new Event('input', { bubbles: true }));
                              field.dispatchEvent(new Event('change', { bubbles: true }));
                              
                              console.log(`Jira: Set ${fieldId} value to "${field.value}"`);
                              return true;
                            }
                            
                            // Log the localStorage values for debugging
                            console.log("Jira Form Population - Available data:");
                            const accountData = localStorage.getItem('jira_account_profile');
                            const regionData = localStorage.getItem('jira_reporting_region');
                            const groupData = localStorage.getItem('jira_reporting_group');
                            const carrData = localStorage.getItem('jira_carr_value');
                            
                            console.log("Account/Profile:", accountData || "NOT FOUND");
                            console.log("Reporting Region:", regionData || "NOT FOUND");
                            console.log("Reporting Group:", groupData || "NOT FOUND");
                            console.log("CARR Value:", carrData || "NOT FOUND");
                            
                            if (!regionData && !groupData && !carrData) {
                              console.warn("Jira: No data found in localStorage to populate fields!");
                            }
                            
                            // Set up sequential population of dropdowns with delays
                            // Wait longer for page to be ready before starting
                            setTimeout(() => {
                              // 1. First populate Reporting Region
                              const region = localStorage.getItem('jira_reporting_region') || '';
                              if (region) {
                                console.log(`Jira: Starting dropdown population with region ${region}`);
                                setJiraDropdown("customfield_10744-field", region, region);
                                
                                // 2. Then populate Reporting Group after region is set
                                setTimeout(() => {
                                  const group = localStorage.getItem('jira_reporting_group') || '';
                                  if (group) {
                                    // Map the group code to its display text
                                    const groupMap = {
                                      "10746": "Prod Ops",
                                      "10745": "Info Sec",
                                      "10747": "Dev Ops",
                                      "12051": "Engineering",
                                      "12050": "Product",
                                      "10741": "Solutions Consulting",
                                      "10740": "Customer Success",
                                      "11962": "Sales",
                                      "10743": "Education",
                                      "10744": "Marketing"
                                    };
                                    const groupText = groupMap[group] || group;
                                    
                                    setJiraDropdown("customfield_10702-field", group, groupText);
                                    
                                    // 3. Finally populate CARR after group is set
                                    setTimeout(() => {
                                      const carrData = localStorage.getItem('jira_carr_value') || '';
                                      if (carrData) {
                                        try {
                                          const numericStr = carrData.replace(/[\$,]/g, "").trim();
                                          const carrValue = parseInt(numericStr, 10);
                                          
                                          if (!isNaN(carrValue)) {
                                            let optionValue = "-1";
                                            let optionText = "";
                                            
                                            if (carrValue < 100000) {
                                              optionValue = "10580";
                                              optionText = "<$100k";
                                            } else if (carrValue < 200000) {
                                              optionValue = "10581";
                                              optionText = "$100k-$199k";
                                            } else if (carrValue < 400000) {
                                              optionValue = "10582";
                                              optionText = "$200k-$399k";
                                            } else if (carrValue < 800000) {
                                              optionValue = "10583";
                                              optionText = "$400k-$799k";
                                            } else if (carrValue < 1500000) {
                                              optionValue = "10584";
                                              optionText = "$800k-$1.5M";
                                            } else if (carrValue < 3000000) {
                                              optionValue = "10585";
                                              optionText = "$1.5M-$3M";
                                            } else {
                                              optionValue = "11155";
                                              optionText = ">$3M";
                                            }
                                            
                                            setJiraDropdown("customfield_10599-field", optionValue, optionText);
                                          }
                                        } catch (e) {
                                          console.error(`Jira: Error parsing CARR value: ${e}`);
                                        }
                                      }
                                    }, 1500); // Wait 1.5 seconds before setting CARR
                                  }
                                }, 1500); // Wait 1.5 seconds before setting Reporting Group
                              }
                            }, 1000); // Start with Reporting Region after a longer delay
                          }
                          
                          // Execute the function immediately
                          populateJiraFormFields();
                        }
                      });
                    }, 1500);
                  } else if (modalCheckAttempts >= maxModalCheckAttempts) {
                    clearInterval(modalCheckInterval);
                    console.log("Background: Modal not detected after max attempts");
                  }
                });
              }, 500);
            }).catch(err => {
              console.error("Background: Error injecting script:", err);
            });
          }, 2000); // Wait 2 seconds for the page to be fully interactive
        }
      });
      
      sendResponse({ status: "listening_for_jira_tab" });
      return true;
    } else if (message.action === 'setReactSelectValue') {
      handleSetReactSelectValue(message, sender.tab.id)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
    }
  });

// Function to be injected into the Jira page to click the Create button
function clickJiraCreateButton() {
  console.log("Content Script: Looking for Jira Create button");
  
  // Try to find and click the create button
  function attemptToClickCreate() {
    // Try several possible selectors for the Create button
    const createButton = 
      document.querySelector('#createGlobalItem') || 
      document.querySelector('[data-testid="atlassian-navigation--create-button"]') ||
      document.querySelector('button.css-b2msvw[aria-label="Create"]');
      
    if (createButton) {
      console.log("Content Script: Found Create button, clicking...");
      createButton.click();
      return true;
    }
    return false;
  }
  
  // Function to check if the modal is open
  function isModalOpen() {
    // Look for modal elements that indicate it's loaded
    const modal = 
      document.querySelector('#create-issue-dialog') || 
      document.querySelector('[role="dialog"][data-testid="create-issue-modal"]') ||
      document.querySelector('.css-1vslnu6'); // Modal container class
      
    return !!modal;
  }
  
  // First try to click the create button
  if (attemptToClickCreate()) {
    // If successful, the background script will monitor for the modal
    console.log("Content Script: Create button clicked, background script will monitor for modal");
    // Set a flag in localStorage that we can check
    localStorage.setItem('jiraCreateModalRequested', 'true');
    localStorage.setItem('jiraCreateButtonClicked', Date.now().toString());
  } else {
    // If not successful, try again after a short delay
    console.log("Content Script: Create button not found yet, will retry...");
    let attempts = 0;
    const maxAttempts = 10;
    
    const interval = setInterval(() => {
      attempts++;
      if (attemptToClickCreate()) {
        clearInterval(interval);
        console.log("Content Script: Create button found and clicked");
        // Set a flag in localStorage that we can check
        localStorage.setItem('jiraCreateModalRequested', 'true');
        localStorage.setItem('jiraCreateButtonClicked', Date.now().toString());
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log("Content Script: Max attempts reached, Create button not found");
      }
    }, 1000); // Try every 1 second
  }
}
  
// Listen for tab updates to track Freshdesk navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If a Freshdesk tab URL changes and contains a ticket path
  if (changeInfo.url && 
      (changeInfo.url.includes("tealium.freshdesk.com/a/tickets/") || 
       changeInfo.url.includes("support.tealiumiq.com/a/tickets/"))) {
    console.log("Background: Detected Freshdesk ticket navigation:", changeInfo.url);
    
    // Notify any open Jira tabs that might need to update
    chrome.tabs.query({url: "*://tealium.atlassian.net/*"}, (tabs) => {
      if (tabs.length > 0) {
        console.log("Background: Notifying " + tabs.length + " Jira tabs of Freshdesk navigation");
        tabs.forEach(jiraTab => {
          chrome.tabs.sendMessage(jiraTab.id, {
            action: "freshdeskNavigated", 
            url: changeInfo.url
          }).catch(err => console.log("Error sending message to Jira tab:", err));
        });
      }
    });
  }
});

// Function to handle setting React Select values in content script
async function handleSetReactSelectValue(message, tabId) {
  const { fieldId, value, displayText } = message;
  
  try {
    // Execute script in the context of the tab
    const result = await setReactSelectValue(tabId, fieldId, value, displayText);
    
    // Return result from the executed script
    return { success: true, result: result };
  } catch (error) {
    console.error('Error setting React Select value:', error);
    return { success: false, error: error.message };
  }
}

// Fix the setReactSelectValue function to accept tabId as first parameter
function setReactSelectValue(tabId, id, value, displayText) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Setting ReactSelect field ${id} to ${value} (${displayText || value})`);
      
      // Process ID for finding matching elements
      const baseId = id.replace(/-field$/, '');
      
      // Execute script in the page context
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (id, baseId, value, displayText) => {
          console.log(`In-page: Attempting to set ${id} to ${displayText}`);
          
          try {
            // Find dropdown control
            const container = document.getElementById(`${baseId}-container`);
            if (!container) {
              console.warn(`In-page: Container for ${id} not found`);
              return "container_not_found";
            }
            
            // Get the dropdown control
            const control = container.querySelector(`.select-${baseId}__control`);
            if (!control) {
              console.warn(`In-page: Control for ${id} not found`);
              return "control_not_found";
            }
            
            // Click to open the dropdown
            control.click();
            console.log(`In-page: Clicked dropdown control for ${id}`);
            
            // Wait for the dropdown menu to appear
            setTimeout(() => {
              // Find the dropdown menu
              const menu = document.querySelector(`.select-${baseId}__menu`);
              if (!menu) {
                console.warn(`In-page: Menu for ${id} not found after clicking`);
                return "menu_not_found";
              }
              
              // Get all available options
              const options = menu.querySelectorAll('[role="option"]');
              console.log(`In-page: Found ${options.length} options for ${id}`);
              
              if (options.length === 0) {
                console.warn(`In-page: No options found for ${id}`);
                document.body.click(); // Close dropdown
                return "no_options";
              }
              
              // Find and click the matching option
              let found = false;
              for (const option of options) {
                const optionText = option.textContent.trim();
                if (optionText === displayText || optionText.includes(displayText)) {
                  console.log(`In-page: Found matching option "${optionText}" - clicking`);
                  option.click();
                  found = true;
                  return "option_clicked";
                }
              }
              
              if (!found) {
                console.log(`In-page: No matching option found, showing available options:`);
                Array.from(options).forEach(opt => {
                  console.log(`Option: "${opt.textContent.trim()}"`);
                });
                document.body.click(); // Close dropdown
                return "no_match";
              }
            }, 500);
            
            return "process_started";
          } catch (error) {
            console.error(`In-page error: ${error.message}`);
            return `error: ${error.message}`;
          }
        },
        args: [id, baseId, value, displayText || value]
      }).then(results => {
        console.log(`Script result: ${results[0].result}`);
        
        if (results[0].result === "option_clicked") {
          resolve(true);
        } else {
          // Give it time to complete
          setTimeout(() => resolve(true), 1000);
        }
      }).catch(error => {
        console.error(`Script execution error: ${error.message}`);
        reject(error);
      });
    } catch (error) {
      console.error('Error in setReactSelectValue:', error);
      reject(error);
    }
  });
}
  