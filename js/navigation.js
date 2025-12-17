/**
 * [MODULE: NAVIGATION & RENDERER]
 * Updated to handle 3D Model viewing logic.
 */

const appNav = {
    
    // --- 1. Tab Switching Logic ---
    switchTab: function(tabId) {
        // Update Buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`button[onclick="appNav.switchTab('${tabId}')"]`);
        if(targetBtn) targetBtn.classList.add('active');
    
        // Hide all Views
        document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active-view'));
    
        // Show Target View
        const activeView = document.getElementById(tabId);
        if(activeView) {
            activeView.classList.add('active-view');
            
            // Special reset for Lab
            if(tabId === 'simulation') {
                this.closeProject();
            }
        }
    },

    // --- 2. Project Rendering Logic ---
    openProject: function(projectId) {
        // A. Switch to Lab Tab
        this.switchTab('simulation');

        // B. Get Data from Database
        const data = projectDatabase[projectId];
        if(!data) { console.error("Project not found:", projectId); return; }

        // C. Hide Grid, Show Detail Container
        document.getElementById('lab-grid-container').style.display = 'none';
        const container = document.getElementById('dynamic-project-container');
        container.style.display = 'block';

        // D. Inject Content (Dynamic Rendering)
        document.getElementById('dp-title').innerText = data.title;
        document.getElementById('dp-subtitle').innerText = data.subtitle;
        
        const tagContainer = document.getElementById('dp-tags');
        tagContainer.innerHTML = '';
        data.tags.forEach(tag => {
            tagContainer.innerHTML += `<span>${tag}</span>`;
        });

        document.getElementById('dp-description').innerHTML = data.description;
        
        const listContainer = document.getElementById('dp-details');
        listContainer.innerHTML = '';
        data.details.forEach(item => {
            listContainer.innerHTML += `<li>${item}</li>`;
        });

        // E. Handle MPC Simulation
        const simView = document.getElementById('project-mpc-sim-view');
        if(data.hasSimulation) {
            simView.style.display = 'block';
            if(typeof robotSim !== 'undefined') {
                setTimeout(() => robotSim.resize(), 50);
            }
        } else {
            simView.style.display = 'none';
        }

        // F. Handle 3D Model Viewer (NEW)
        const modelView = document.getElementById('project-3d-view');
        if(data.has3DModel && typeof modelViewer !== 'undefined') {
            modelView.style.display = 'block';
            // Trigger Load
            setTimeout(() => {
                modelViewer.resize();
                modelViewer.load(data.modelPath);
            }, 100);
        } else {
            modelView.style.display = 'none';
        }
    },

    // --- 3. Close Logic ---
    closeProject: function() {
        document.getElementById('dynamic-project-container').style.display = 'none';
        document.getElementById('lab-grid-container').style.display = 'block';
    },

    // --- 4. Theme Engine ---
    setTheme: function(themeName) {
        document.body.setAttribute('data-theme', themeName);
        window.dispatchEvent(new Event('themeChanged'));
    }
};