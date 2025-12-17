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
            
            // Special Case: If switching to 'simulation' tab, reset to the main grid view
            if(tabId === 'simulation') {
                this.closeProject();
            }
        }
    },

    /**
     * Opens a specific project detail view within the 'The Lab' section.
     * @param {string} projectId - The ID suffix for the project container (e.g. 'mpc' -> 'project-mpc')
     */
    openProject: function(projectId) {
        this.switchTab('simulation');
        document.getElementById('lab-grid-container').style.display = 'none';
        document.querySelectorAll('.project-view').forEach(el => el.style.display = 'none');
        
        const projectView = document.getElementById('project-' + projectId);
        if(projectView) {
            projectView.style.display = 'block';
            if(projectId === 'mpc' && typeof robotSim !== 'undefined') {
                setTimeout(() => { robotSim.resize(); }, 50); 
            }
        }
    },

    /**
     * Closes the active project view and returns to the Lab Grid.
     */
    closeProject: function() {
        document.querySelectorAll('.project-view').forEach(el => el.style.display = 'none');
        const grid = document.getElementById('lab-grid-container');
        if(grid) grid.style.display = 'block';
    },

    /**
     * Sets the UI Theme by changing the body attribute.
     * @param {string} themeName - 'orbital', 'titanium', 'aurora', 'matrix', 'carbon'
     */
    setTheme: function(themeName) {
        document.body.setAttribute('data-theme', themeName);
        
        // Trigger background particle update
        window.dispatchEvent(new Event('themeChanged'));
    }
};