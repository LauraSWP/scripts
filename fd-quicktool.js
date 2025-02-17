// ==UserScript==
// @name         Freshdesk Ticket Info Menu with Injected Night Mode & Recent Tickets (7-day threshold)
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.5
// @description  Adds a sticky menu to Freshdesk ticket pages with ticket info, copy-to-clipboard buttons, recent tickets (last 7 days), and a night mode toggle that injects CSS to change Freshdesk to dark mode.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Toggle function to add/remove dark mode CSS classes
    function toggleNightMode(enable) {
        if (enable) {
            document.body.classList.add('fd-night-mode');
            container.classList.add('night');
        } else {
            document.body.classList.remove('fd-night-mode');
            container.classList.remove('night');
        }
        localStorage.setItem('fdNightMode', enable ? 'true' : 'false');
        nightModeToggle.textContent = enable ? "Day Mode" : "Night Mode";
    }

    // Wait for the page to fully load
    window.addEventListener('load', function() {

        // Inject CSS for global dark mode on Freshdesk and the sticky menu
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            /* Global Dark Mode for Freshdesk */
            body.fd-night-mode {
                background-color: #121212 !important;
                color: #e0e0e0 !important;
            }
            body.fd-night-mode a {
                color: #bb86fc !important;
            }
            body.fd-night-mode input,
            body.fd-night-mode textarea,
            body.fd-night-mode select,
            body.fd-night-mode button {
                background-color: #1e1e1e !important;
                color: #e0e0e0 !important;
                border-color: #333 !important;
            }
            /* Sticky Menu Dark Mode Overrides */
            #ticket-info-menu.night {
                background-color: #333 !important;
                border: 1px solid #555 !important;
                color: #ddd !important;
            }
            #ticket-info-menu.night a {
                color: #66aaff !important;
            }
            #ticket-info-menu.night button {
                background-color: #444 !important;
                color: #ddd !important;
                border: 1px solid #555 !important;
            }
        `;
        document.head.appendChild(styleTag);

        // Create the sticky container for our menu
        const container = document.createElement('div');
        container.id = "ticket-info-menu";
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.backgroundColor = '#fff';
        container.style.border = '1px solid #ccc';
        container.style.padding = '10px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        container.style.zIndex = '9999';
        container.style.fontSize = '14px';
        container.style.maxWidth = '300px';
        container.style.borderRadius = '5px';
        container.style.fontFamily = 'sans-serif';
        container.style.lineHeight = '1.4';

        // Night mode toggle button (positioned in the top-right corner of the menu)
        const nightModeToggle = document.createElement('button');
        nightModeToggle.textContent = "Night Mode";
        nightModeToggle.style.position = 'absolute';
        nightModeToggle.style.top = '5px';
        nightModeToggle.style.right = '5px';
        nightModeToggle.style.fontSize = '12px';
        nightModeToggle.style.cursor = 'pointer';
        nightModeToggle.style.padding = '2px 6px';
        nightModeToggle.style.border = 'none';
        nightModeToggle.style.borderRadius = '3px';
        nightModeToggle.style.backgroundColor = '#eee';
        nightModeToggle.style.color = '#333';
        container.appendChild(nightModeToggle);

        // Check localStorage for saved night mode preference
        const nightModeEnabled = localStorage.getItem('fdNightMode') === 'true';
        if (nightModeEnabled) {
            container.classList.add('night');
            document.body.classList.add('fd-night-mode');
            nightModeToggle.textContent = "Day Mode";
        }

        // Set up the toggle event
        nightModeToggle.addEventListener('click', function() {
            const current = localStorage.getItem('fdNightMode') === 'true';
            toggleNightMode(!current);
        });

        // Title of the menu
        const title = document.createElement('div');
        title.textContent = "Ticket Info";
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';
        container.appendChild(title);

        // Helper function to create a menu item with a copy button
        function createMenuItem(labelText, valueText) {
            const itemDiv = document.createElement('div');
            itemDiv.style.marginBottom = '6px';
            
            const label = document.createElement('span');
            label.textContent = labelText + ": ";
            label.style.fontWeight = 'bold';
            itemDiv.appendChild(label);
            
            const value = document.createElement('span');
            value.textContent = valueText || "N/A";
            value.style.userSelect = 'text';
            itemDiv.appendChild(value);
            
            const copyBtn = document.createElement('button');
            copyBtn.textContent = "Copy";
            copyBtn.style.marginLeft = '5px';
            copyBtn.style.fontSize = '12px';
            copyBtn.style.cursor = 'pointer';
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

        // Grab ticket fields based on your selectors
        const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
        const accountValue = accountInput ? accountInput.value.trim() : "";

        const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
        const profileValue = profileInput ? profileInput.value.trim() : "";

        const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
        const urlsValue = urlsTextarea ? urlsTextarea.value.trim() : "";

        const emailInput = document.querySelector('input[name="requester[email]"]') || document.querySelector('input[data-test-text-field="requester[email]"]');
        const emailValue = emailInput ? emailInput.value.trim() : "";

        // Append main info items
        container.appendChild(createMenuItem("Account", accountValue));
        container.appendChild(createMenuItem("Account Profile", profileValue));
        container.appendChild(createMenuItem("Sender Email", emailValue));
        container.appendChild(createMenuItem("Relevant URLs", urlsValue));

        // ---------- Recent Tickets Section ----------
        // Function to parse timeline ticket dates and return recent ones (last 7 days)
        function getRecentTickets() {
            const tickets = [];
            const ticketElements = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
            if (!ticketElements.length) return tickets;
            const now = new Date();
            const thresholdDays = 7; // 7-day threshold
            const threshold = thresholdDays * 24 * 60 * 60 * 1000;
            
            ticketElements.forEach(ticketEl => {
                const timeEl = ticketEl.querySelector('[data-test-id="timeline-activity-time"]');
                if (timeEl) {
                    let dateStr = timeEl.textContent.trim();
                    // Remove comma for cleaner parsing ("16 Feb 2025, 05:01 PM" -> "16 Feb 2025 05:01 PM")
                    dateStr = dateStr.replace(',', '');
                    let ticketDate = new Date(dateStr);
                    if (!isNaN(ticketDate)) {
                        if ((now - ticketDate <= threshold) && (ticketDate <= now)) {
                            const linkEl = ticketEl.querySelector('a.text__link-heading');
                            if (linkEl) {
                                const href = linkEl.href;
                                const subject = linkEl.textContent.trim();
                                tickets.push({href, subject, date: ticketDate});
                            }
                        }
                    }
                }
            });
            return tickets;
        }

        const recentTickets = getRecentTickets();
        if (recentTickets.length) {
            const divider = document.createElement('hr');
            divider.style.margin = '10px 0';
            container.appendChild(divider);

            const recentHeader = document.createElement('div');
            recentHeader.textContent = "Recent Tickets (last 7 days)";
            recentHeader.style.fontWeight = 'bold';
            recentHeader.style.marginBottom = '6px';
            container.appendChild(recentHeader);

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
                copyTicketBtn.style.fontSize = '12px';
                copyTicketBtn.style.cursor = 'pointer';
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
        }

        // Append the sticky menu to the document
        document.body.appendChild(container);
    });
})();
