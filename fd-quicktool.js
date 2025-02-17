// ==UserScript==
// @name         Freshdesk Ticket Info Menu with Injected Night Mode & Recent Tickets (7-day threshold)
// @namespace    https://github.com/LauraSWP/scripts
// @version      1.7
// @description  Adds a sticky menu to Freshdesk ticket pages with ticket info, copy-to-clipboard buttons, recent tickets (last 7 days), and a night mode toggle that injects CSS to change Freshdesk to dark mode.
// @homepageURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @updateURL    https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @downloadURL  https://raw.githubusercontent.com/LauraSWP/scripts/refs/heads/main/fd-quicktool.js
// @match        *://*.freshdesk.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function initTool() {
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

        // Toggle night mode function
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
            
            const copyBtn = document.createElement(
