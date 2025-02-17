// ==UserScript==
// @name         Freshdesk Ticket Info Menu with Injected Night Mode & Recent Tickets (7-day threshold)
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.10
// @description  Adds a menu to Freshdesk ticket pages with ticket info, copy-to-clipboard buttons, recent tickets (last 7 days), and a night mode toggle (dark mode CSS injected). Uses setInterval to wait for the sidebar in SPA.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function initTool() {
        // Avoid duplicate insertion
        if (document.getElementById("ticket-info-menu")) {
            console.log("Ticket info menu already exists.");
            return;
        }
        console.log("Initializing ticket info menu...");

        // Inject CSS for global dark mode on Freshdesk and for our menu
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
            /* Sidebar Menu Dark Mode Overrides */
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

        // Create the container for our menu
        const container = document.createElement('div');
        container.id = "ticket-info-menu";
        // For sidebar insertion, use static positioning
        container.style.position = 'static';
        container.style.margin = '10px 0';
        container.style.backgroundColor = '#fff';
        container.style.border = '1px solid #ccc';
        container.style.padding = '10px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        container.style.fontSize = '14px';
        container.style.maxWidth = '300px';
        container.style.borderRadius = '5px';
        container.style.fontFamily = 'sans-serif';
        container.style.lineHeight = '1.4';

        // Night mode toggle button (floated to the right)
        const nightModeToggle = document.createElement('button');
        nightModeToggle.textContent = "Night Mode";
        nightModeToggle.style.float = 'right';
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

        // Helper: create a menu item with a copy button
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

        // Grab ticket fields (if available)
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
        function getRecentTickets() {
            const tickets = [];
            const ticketElements = document.querySelectorAll('div[data-test-id="timeline-activity-ticket"]');
            if (!ticketElements.length) return tickets;
            const now = new Date();
            const thresholdDays = 7;
            const threshold = thresholdDays * 24 * 60 * 60 * 1000;
            
            ticketElements.forEach(ticketEl => {
                const timeEl = ticketEl.querySelector('[data-test-id="timeline-activity-time"]');
                if (timeEl) {
                    let dateStr = timeEl.textContent.trim().replace(',', '');
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

        // Determine insertion point: sidebar or fallback
        const sidebarTarget = document.getElementById('widget-sidebar-content');
        if (sidebarTarget) {
            console.log("Sidebar found. Inserting ticket info menu.");
            sidebarTarget.appendChild(container);
        } else {
            console.log("Sidebar not found. Inserting ticket info menu into document body.");
            document.body.appendChild(container);
        }
    }

    // Use setInterval to wait for the sidebar element (in case Freshdesk is an SPA)
    function waitForSidebar() {
        let attempts = 0;
        const maxAttempts = 30; // Try for 30 seconds max
        const intervalId = setInterval(() => {
            attempts++;
            const sidebar = document.getElementById('widget-sidebar-content');
            console.log("Attempt", attempts, "sidebar found:", sidebar);
            if (sidebar || attempts >= maxAttempts) {
                clearInterval(intervalId);
                initTool();
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForSidebar);
    } else {
        waitForSidebar();
    }
})();
