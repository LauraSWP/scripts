// ==UserScript==
// @name         Freshdesk Ticket Info Menu with Night Mode & Recent Tickets (7-day threshold)
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.15
// @description  Appends a sticky menu to Freshdesk pages (bottom‑right) with ticket info, copy buttons, recent tickets (last 7 days), and a night mode toggle. For account and profile fields, falls back to placeholder if value is empty.
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
        if (document.getElementById("ticket-info-menu")) return;
        console.log("Initializing ticket info menu...");

        // Inject CSS for dark mode and our sticky menu styling
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            /* Global Dark Mode Overrides */
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
            /* Sticky Menu Styling */
            #ticket-info-menu {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #fff;
                border: 1px solid #ccc;
                padding: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 9999;
                font-size: 14px;
                max-width: 300px;
                border-radius: 5px;
                font-family: sans-serif;
                line-height: 1.4;
            }
            /* Night Mode for Menu */
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
            /* Button Styling */
            #ticket-info-menu button {
                font-size: 12px;
                cursor: pointer;
                padding: 2px 6px;
                border: none;
                border-radius: 3px;
                background-color: #eee;
                color: #333;
            }
        `;
        document.head.appendChild(styleTag);

        // Create the container for our menu
        const container = document.createElement('div');
        container.id = "ticket-info-menu";

        // Night mode toggle button (floated to right)
        const nightModeToggle = document.createElement('button');
        nightModeToggle.textContent = "Night Mode";
        nightModeToggle.style.float = 'right';
        container.appendChild(nightModeToggle);

        // Set initial night mode state from localStorage
        const nightModeEnabled = localStorage.getItem('fdNightMode') === 'true';
        if (nightModeEnabled) {
            container.classList.add('night');
            document.body.classList.add('fd-night-mode');
            nightModeToggle.textContent = "Day Mode";
        }

        // Toggle night mode on click
        nightModeToggle.addEventListener('click', function() {
            const current = localStorage.getItem('fdNightMode') === 'true';
            if (current) {
                document.body.classList.remove('fd-night-mode');
                container.classList.remove('night');
                localStorage.setItem('fdNightMode', 'false');
                nightModeToggle.textContent = "Night Mode";
            } else {
                document.body.classList.add('fd-night-mode');
                container.classList.add('night');
                localStorage.setItem('fdNightMode', 'true');
                nightModeToggle.textContent = "Day Mode";
            }
        });

        // Menu Title
        const title = document.createElement('div');
        title.textContent = "Ticket Info";
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';
        container.appendChild(title);

        // Helper: Create a menu item with a copy button
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

        // Function to extract value from an input element using value or placeholder fallback
        function getFieldValue(inputElement) {
            if (!inputElement) return "";
            let val = inputElement.value.trim();
            if (!val) {
                // Fallback to placeholder if value is empty
                val = (inputElement.getAttribute('placeholder') || "").trim();
            }
            return val;
        }

        // For account and profile fields, use the fallback function
        const accountInput = document.querySelector('input[data-test-text-field="customFields.cf_tealium_account"]');
        const accountValue = getFieldValue(accountInput);
        const profileInput = document.querySelector('input[data-test-text-field="customFields.cf_iq_profile"]');
        const profileValue = getFieldValue(profileInput);

        // For URLs and email, we can use .value (or similar fallback if needed)
        const urlsTextarea = document.querySelector('textarea[data-test-text-area="customFields.cf_relevant_urls"]');
        const urlsValue = urlsTextarea ? urlsTextarea.value.trim() : "";
        const emailInput = document.querySelector('input[name="requester[email]"]') ||
                           document.querySelector('input[data-test-text-field="requester[email]"]');
        const emailValue = emailInput ? emailInput.value.trim() : "";

        container.appendChild(createMenuItem("Account", accountValue));
        container.appendChild(createMenuItem("Account Profile", profileValue));
        container.appendChild(createMenuItem("Sender Email", emailValue));
        container.appendChild(createMenuItem("Relevant URLs", urlsValue));

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
                            tickets.push({href, subject, date: ticketDate});
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

        // Append the menu to the document body (sticky at bottom-right)
        document.body.appendChild(container);
        console.log("Ticket info menu appended to document.body");
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTool);
    } else {
        initTool();
    }
})();
