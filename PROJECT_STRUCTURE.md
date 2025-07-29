# Project Structure

This document describes the structure of the Freshdesk Ticket MultiTool for Tealium project and the purpose of each file and directory.

.
├── **manifest.json**
│   Chrome extension manifest containing metadata, permissions, and content script definitions.
├── **content_script.js**
│   **UNIFIED** content script injected into both Freshdesk and Jira pages. Implements a single adaptive MultiTool panel that adjusts its content and functionality based on the current domain and page type.
│   
│   **KEY FEATURES:**
│   - **Domain Detection:** Automatically detects whether running on Jira or Freshdesk domains
│   - **Adaptive UI:** Shows relevant tabs and content based on current page context
│   - **Unified Panel ID:** Uses single `multitool-beast-wrapper` ID instead of separate panels
│   - **Smart Tab Management:** Dynamically shows/hides tabs (Profile for Freshdesk tickets, Jira actions for all domains, Settings always available)
│   - **Cross-Domain Data Sharing:** Seamlessly shares account/profile data between Freshdesk and Jira
│   - **Responsive Content:** Profile tab appears only on Freshdesk ticket pages, Jira tab shows issue details when on Jira issue pages, creation buttons everywhere
│   - **SPA Navigation Support:** Handles single-page application navigation on both platforms
│   - **Consistent Styling:** Unified CSS that works across both domains with theme support
│   - **Enhanced Page Search:** Modern search functionality in header that searches the current web page content (excludes extension panel) with visual highlighting, navigation through results (Enter/Shift+Enter), and live search-as-you-type
│   - **Enhanced Jira Integration (2024 Update):** Clean icon-only buttons (Bug 🐛, Enhancement ⬆️, Permission 🔒) and streamlined auto-populate interface with comprehensive reliability improvements:
     - **Clean Icon Design:** Compact 32x32px icon-only buttons with hover tooltips, color-coded backgrounds, and smooth scale animations for modern UI
     - **Streamlined Auto-Populate Interface:** Simplified Jira form population section with just title and populate button for cleaner, distraction-free experience
     - **Enhanced Dark Mode Support:** Comprehensive dark mode styling for all settings sections with proper white text, appropriate borders, and theme-aware colors
     - **Silent Form Population:** Removed intrusive alert dialogs when forms are populated, using console logging for feedback instead
     - **Restored Jira Issue Form Fields:** Fixed auto-population to target correct Jira issue form fields (Reporting Region, Reporting Group, Environment, Region(s) Impacted, Account/Profile, Total Revenue Impact) instead of generic fields
     - **Updated Button Detection:** 15+ modern selectors including aria-label, data-testid, and navigation-specific selectors for current Jira UI
     - **Smart Fallback System:** Multi-tier search strategy (primary selectors → priority container search → full-page text search) 
     - **Enhanced Modal Detection:** Real-time modal monitoring with 10+ detection methods and content indicator fallbacks
     - **Improved Clicking Sequence:** Enhanced click reliability with scroll-to-view, focus, multiple event types (click, mouse, pointer)
     - **Comprehensive Debugging:** Advanced debugging functions with detailed button analysis, modal detection, and troubleshooting suggestions
     - **Robust Error Handling:** Automatic retry mechanisms, graceful degradation, and manual recovery options
     - **Cross-Domain Support:** Works from any Jira page with automatic Create button discovery and modal handling
     - **Enhanced Cross-Tab Communication:** Dual-channel approach using both localStorage and URL parameters for reliable Freshdesk→Jira workflow
     - **Smart Auto-Detection:** Multi-stage readiness checking with DOM completion detection and Jira navigation element validation
     - **Enhanced Timing:** 3-second initial delay + DOM readiness checks + 2-second Jira validation delays for new tab reliability  
     - **Timestamp Validation:** 10-minute validity window for both localStorage and URL parameter work types
     - **Debug Console Commands:** `debugWorkTypeStatus()`, `triggerCreateButtonClick()`, `triggerIssueCreation()`, `triggerPermissionRequest()` for manual troubleshooting with cross-tab scenario detection
│   - **Permission Request Automation:** Dedicated lock icon 🔒 button with intelligent form auto-population:
     - **One-Click Access:** Direct link to Tealium permission request form with automatic detection and population
     - **Smart Form Detection:** Automatically recognizes permission request forms and switches to appropriate population logic  
     - **Comprehensive Auto-Fill:** Populates all required fields including reason, reporting group/region, account/profile, internal users, platform scope, and permission level
     - **Settings Integration:** Uses stored agent email, reporting group/region, and customizable default permission reason
     - **Freshdesk Data Integration:** Automatically includes account/profile information from stored Freshdesk ticket data when available
     - **React Component Support:** Advanced interaction with modern React-based form dropdowns and rich text editors
     - **Default Values:** Pre-configures "Full Platform" and "Full" permission level as requested, with "Permission required to investigate an issue" as default reason
     - **Inline Auto-Fill Button:** Dedicated "🔧 Auto-Fill Form" button appears directly on permission request forms next to the title with real-time data availability display
     - **Form-Specific Data Display:** Shows only relevant fields for permission requests (Region, Group, Email, Reason, Account) instead of Jira-specific fields
     - **Smart Integration:** Auto-fill button integrates seamlessly with existing form styling and provides hover effects and success feedback
│   - **Enhanced Text Selection to Clipboard (Configurable):** Select any text on the page and a floating + icon (styled to match panel buttons) appears to add the selection directly to the shared clipboard tab:
     - **Settings Control:** Enable/disable feature via Settings tab with persistent preference storage
     - **Dynamic Toggle:** Real-time enable/disable without page refresh with proper event listener cleanup
     - Proper button styling matching panel design (rectangular with green border, not circular)
     - Enhanced visual feedback with success/error animations
     - Improved clipboard refresh mechanism with forced data reload
     - Intelligent context-based labeling for selected text
     - Real-time UI updates with error handling and debugging
│   - **Auto-Sync Freshdesk Data:** Intelligent monitoring system that automatically refreshes Profile tab data when Freshdesk ticket information changes:
     - **Real-time Field Monitoring:** Watches Account and Profile custom fields for changes with instant refresh
     - **Periodic Data Checking:** Scans for CARR and other data changes every 3 seconds
     - **Navigation Detection:** Automatically resets and restarts monitoring when navigating between tickets
     - **Cross-Tab Synchronization:** Detects when Freshdesk data is updated in another tab/window and automatically refreshes Profile tab on Jira pages with enhanced monitoring (3-second intervals + storage events + immediate refresh on page load)
     - **Visual Feedback:** Provides subtle tab highlighting when auto-refresh occurs
     - **Smart DOM Observation:** Monitors for dynamically added fields and form elements
     - **Multi-trigger Detection:** Responds to input events, change events, and DOM mutations
     - **Debug Controls:** Console functions available for manual sync control and troubleshooting (`setupFreshdeskAutoSync()`, `setupStoredDataMonitoring()`, `checkStoredDataChanges()`, `forceStoredDataSync()`, `debugStoredDataSync()`, `resetFreshdeskAutoSync()`, `refreshProfileIfChanged()`)
│   - **Customizable Auto-Population Settings:** Comprehensive field selection interface allowing agents to enable/disable specific fields for both Jira and Permission Request form auto-population:
     - **Jira Issue Forms:** Toggle Reporting Region, Reporting Group, Environment, Region(s) Impacted, Account/Profile, Affected Clients, and Total Revenue Impact (CARR Range) fields individually
     - **Permission Request Forms:** Control Reason, Reporting Group/Region, Account(s)/Profile(s), Internal Users, Platform Part, and Permission Level population
     - **Smart Interface:** Color-coded settings panel with clear field groupings and descriptive labels for easy management
     - **Bulk Controls:** "Select All" and "Select None" buttons for quick preference management across all fields
     - **Real-time Logging:** Console feedback shows which fields are enabled/disabled and why fields are skipped during population
     - **Persistent Storage:** All field preferences saved automatically and persist across browser sessions
     - **Intelligent Defaults:** All fields enabled by default for immediate functionality, with granular control for customization
│   - **Quick Access Buttons:** Top bar includes circular buttons for Tealium Docs, Customer Portal, Slack channel, Snippet Box, Glean Chat, scroll controls, and panel close
│   
│   **BEHAVIOR BY DOMAIN:**
│   - **Freshdesk Ticket Pages:** Shows Profile tab (live ticket data with auto-sync), Jira tab (creation buttons), Settings tab
│   - **Jira Pages (with stored Freshdesk data):** Shows Profile tab (stored Freshdesk data with age indicators), Jira tab (issue details + creation buttons), Settings tab  
│   - **Jira Pages (without stored data):** Shows Jira tab (creation buttons only), Settings tab
│   - **Cross-Domain Features:** Both Freshdesk and Jira data automatically stored and accessible across domains for 24 hours
   - **Clipboard Tab:** Universal data collection system with + buttons throughout the app AND text selection feature - select any text on page and click floating + icon to add to shared clipboard with intelligent context-based labeling
├── **background.js**
│   Service worker handling profile data storage and retrieval via `chrome.runtime` messaging and `chrome.storage`.
│   - Stores basic profile info from Freshdesk for display in Jira.
│   - Stores user settings (theme, reporting region/group, email).
│   - Listens for messages to trigger Jira create modal.
│   - Stores last viewed Jira issue ID.
├── **update.xml**
│   Auto-update configuration for Google Chrome (Google Update 2 protocol).
├── **scripts.crx**
│   Packaged Chrome extension file.
├── **assets/**
│   Directory containing image assets (logos).
│   └── tealiumlogo.png
│   └── jiralogo.svg
├── **PROJECT_STRUCTURE.md**
│   This file, describing the project layout.
└── **README.md**
    Project overview, installation, and usage instructions.

## Changelog

- **2024-12-XX:** **MAJOR REFACTOR** - Consolidated separate Jira and Freshdesk boxes into one unified main box
  - Removed duplicate code and separate domain-specific logic blocks
  - Created single adaptive panel that detects domain and adjusts content accordingly  
  - Unified all styling under single CSS injection
  - Simplified codebase from ~4700 lines to ~1500 lines while maintaining all functionality
  - Improved maintainability with shared utility functions and consistent UI patterns
  - **Added Cross-Domain Data Sharing:** Both Freshdesk and Jira data now automatically shared across domains
    - Profile tab appears with stored data from either platform (24-hour retention)
    - Reciprocal data sharing: Freshdesk shows stored Jira data, Jira shows stored Freshdesk data
    - Shows data freshness indicators and source links for both platforms
    - Enhanced copy functionality for all fields including summaries and details
  - **NEW: Clipboard Tab** - Universal data collection system for agent workflows
    - + buttons next to all data items for easy collection across different tickets/issues
    - Groups collected data by source (Freshdesk/Jira) with timestamps
    - Copy selected functionality with markdown formatting for easy pasting
    - Persistent storage across sessions with individual item management
- 2024-07-XX: Removed Pinned tab and moved New Bug and New Enhancement buttons to the Jira tab
- 2024-07-XX: Added Jira Fields tab to allow users to see and copy the current Jira issue ID and other details, similar to the Freshdesk Profile tab
- 2024-06-XX: Fixed bug in content_script.js where classNames.includes could throw a TypeError if className was not a string (e.g., for SVG elements). Now, classNames and id are always checked to be strings before using .includes(). This prevents runtime errors in the Freshdesk MutationObserver logic. 