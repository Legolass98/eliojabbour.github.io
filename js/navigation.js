/**
 * [MODULE: NAVIGATION]
 * This file handles the Single Page Application (SPA) logic.
 * It toggles visibility of sections (Home, Simulation, CV) without reloading the page.
 * * Future AI Note: 
 * We use a global namespace `appNav` to prevent function name collisions 
 * with other scripts.
 */

const appNav = {
    /**
     * Switches the active view tab.
     * @param {string} tabId - The ID of the section to show (e.g., 'home', 'simulation')
     */
    switchTab: function(tabId) {
        // 1. Update Navigation Buttons
        // We find the button that triggered this via the onclick attribute matching
        const buttons = document.querySelectorAll('.nav-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const targetBtn = document.querySelector(`button[onclick="appNav.switchTab('${tabId}')"]`);
        if(targetBtn) targetBtn.classList.add('active');
    
        // 2. Hide all View Sections
        const views = document.querySelectorAll('.view-section');
        views.forEach(view => view.classList.remove('active-view'));
    
        // 3. Show Target View
        const activeView = document.getElementById(tabId);
        if(activeView) {
            activeView.classList.add('active-view');
            
            // [INTER-MODULE COMMUNICATION]
            // If we switched to the Simulation tab, we must tell the simulation 
            // to resize its canvas, otherwise it might render at 0x0 size.
            if(tabId === 'simulation' && typeof robotSim !== 'undefined') {
                setTimeout(() => {
                    robotSim.resize(); 
                }, 50); // Small delay to allow CSS transitions to complete
            }
        }
    }
};