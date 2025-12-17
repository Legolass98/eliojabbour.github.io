/**
 * [MODULE: ROBOT SIMULATION]
 * This file contains the physics engine and logic for the "Linear vs MPC" demo.
 * * Future AI Note:
 * This code implements a simplified kinematic model. 
 * - 'Linear' mode mimics standard PD control.
 * - 'MPC' mode mimics a QP-based controller with barrier functions (Constraint Avoidance).
 */

const robotSim = (function() {

    const simCanvas = document.getElementById('simCanvas');
    if (!simCanvas) return {};

    const ctx = simCanvas.getContext('2d');
    const uiRefs = {
        scoreVal: document.getElementById('score-val'),
        statusText: document.getElementById('safety-status'),
        descText: document.getElementById('sim-desc'),
        btnLinear: document.getElementById('btn-linear'),
        btnMpc: document.getElementById('btn-mpc')
    };

    // Simulation Variables
    let simWidth, simHeight;
    let simParticles = []; // FX particles, distinct from background particles
    let shake = 0;
    let gridOffset = 0;
    let animationFrameId; // To control the loop

    // Game State
    let state = {
        mode: 'linear', // 'linear' or 'mpc'
        robot: { x: 0, y: 0, vx: 0, vy: 0, angle: 0 },
        humanInput: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        walls: { x_min: 0, x_max: 0, y_min: 0, y_max: 0 },
        isDragging: false,
        safetyScore: 100
    };

    /* --- INITIALIZATION & RESIZING --- */
    function resize() {
        // Use container dimensions if canvas is hidden/0
        const container = simCanvas.parentElement;
        if (!container) return;

        // Force a minimum size if container is hidden
        simWidth = container.clientWidth || 300;
        simHeight = container.clientHeight || 400;
        
        simCanvas.width = simWidth;
        simCanvas.height = simHeight;
        
        resetPositions();
    }

    function resetPositions() {
        state.target = { x: simWidth * 0.85, y: simHeight * 0.5 };
        state.humanInput = { x: simWidth * 0.15, y: simHeight * 0.5 };
        state.robot = { x: simWidth * 0.15, y: simHeight * 0.5, vx: 0, vy: 0, angle: 0 };
        // Define safe zone (walls)
        // Use relative percentages for mobile responsiveness
        const pad = Math.min(60, simWidth * 0.1); 
        state.walls = { x_min: pad, x_max: simWidth - pad, y_min: pad, y_max: simHeight - pad };
    }

    /* --- INPUT HANDLING --- */
    function getInputPos(e) {
        const rect = simCanvas.getBoundingClientRect();
        // Handle both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // Mouse Events
    simCanvas.addEventListener('mousedown', (e) => { 
        state.isDragging = true; 
        let p = getInputPos(e); 
        state.humanInput = p; 
    });
    simCanvas.addEventListener('mousemove', (e) => { 
        if(state.isDragging) { 
            let p = getInputPos(e); 
            state.humanInput = p; 
        } 
    });
    simCanvas.addEventListener('mouseup', () => { state.isDragging = false; });
    simCanvas.addEventListener('mouseleave', () => { state.isDragging = false; }); // Safety

    // Touch Events (Mobile) - Critical fixes for scrolling
    simCanvas.addEventListener('touchstart', (e) => { 
        state.isDragging = true; 
        let p = getInputPos(e); 
        state.humanInput = p; 
        e.preventDefault(); // Stop screen from scrolling when touching canvas
    }, {passive: false});

    simCanvas.addEventListener('touchmove', (e) => { 
        if(state.isDragging) { 
            let p = getInputPos(e); 
            state.humanInput = p; 
            e.preventDefault(); // Stop screen from scrolling
        } 
    }, {passive: false});

    simCanvas.addEventListener('touchend', () => { state.isDragging = false; });

    /* --- MODE SWITCHING --- */
    function setMode(newMode) {
        state.mode = newMode;
        uiRefs.btnLinear.className = state.mode === 'linear' ? 'active' : '';
        uiRefs.btnMpc.className = state.mode === 'mpc' ? 'active' : '';
        
        if(state.mode === 'linear') {
            uiRefs.descText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Linear Mode:</strong> Direct control. The robot will crash if you push it.`;
        } else {
            uiRefs.descText.innerHTML = `<i class="fas fa-shield-alt"></i> <strong>MPC-B Mode:</strong> Predictive safety. It brakes automatically before hitting walls.`;
        }
        state.safetyScore = 100;
    }

    /* --- FX CLASS --- */
    class FXParticle {
        constructor(x, y, color) {
            this.x = x; this.y = y; this.color = color;
            this.size = Math.random() * 3 + 1;
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 1.0;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            this.life -= 0.05; this.size *= 0.9;
        }
        draw(ctx) {
            ctx.fillStyle = this.color; ctx.globalAlpha = this.life;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    /* --- MAIN LOOP --- */
    function update() {
        // Always run update loop, but check visibility for rendering
        // if(simCanvas.offsetParent !== null) { 
            
            // 1. Calculate Forces
            // Human pulls robot to blue dot
            let desiredVx = (state.humanInput.x - state.robot.x) * 0.12;
            let desiredVy = (state.humanInput.y - state.robot.y) * 0.12;
            // Assistance pulls robot to green target
            let assistVx = (state.target.x - state.robot.x) * 0.015;
            let assistVy = (state.target.y - state.robot.y) * 0.015;
            
            let cmdVx = desiredVx + assistVx;
            let cmdVy = desiredVy + assistVy;
            
            let predictedPath = [];
            let isUnsafe = false;
            let justCrashed = false;

            // 2. Control Logic
            if (state.mode === 'linear') {
                // Naive approach: Just apply velocity
                state.robot.vx = cmdVx; 
                state.robot.vy = cmdVy;
                
                // Hard Collision Check
                if (state.robot.x < state.walls.x_min) { state.robot.x = state.walls.x_min; state.robot.vx=0; isUnsafe=true; justCrashed=true; }
                if (state.robot.x > state.walls.x_max) { state.robot.x = state.walls.x_max; state.robot.vx=0; isUnsafe=true; justCrashed=true; }
                if (state.robot.y < state.walls.y_min) { state.robot.y = state.walls.y_min; state.robot.vy=0; isUnsafe=true; justCrashed=true; }
                if (state.robot.y > state.walls.y_max) { state.robot.y = state.walls.y_max; state.robot.vy=0; isUnsafe=true; justCrashed=true; }
            
            } else {
                // MPC Approach: Constraint-Aware
                const braking = 0.9; 
                
                // Calculate distance to walls
                let dRight = state.walls.x_max - state.robot.x;
                let dLeft = state.robot.x - state.walls.x_min;
                let dDown = state.walls.y_max - state.robot.y;
                let dUp = state.robot.y - state.walls.y_min;

                // Calculate Max Safe Velocity (Sqrt law based on kinematic stopping distance)
                // v_max = sqrt(2 * a * distance)
                let vMaxRight = Math.sqrt(2 * braking * Math.max(0, dRight - 5)); 
                let vMaxLeft = Math.sqrt(2 * braking * Math.max(0, dLeft - 5));
                let vMaxDown = Math.sqrt(2 * braking * Math.max(0, dDown - 5));
                let vMaxUp = Math.sqrt(2 * braking * Math.max(0, dUp - 5));

                // Clamp Command
                if (cmdVx > vMaxRight) cmdVx = vMaxRight;
                if (cmdVx < -vMaxLeft) cmdVx = -vMaxLeft;
                if (cmdVy > vMaxDown) cmdVy = vMaxDown;
                if (cmdVy < -vMaxUp) cmdVy = -vMaxUp;

                state.robot.vx = cmdVx; 
                state.robot.vy = cmdVy;
                
                // Generate Prediction Trail for visualization
                let px = state.robot.x, py = state.robot.y;
                for(let i=0; i<15; i++){ 
                    px+=state.robot.vx; 
                    py+=state.robot.vy; 
                    predictedPath.push({x:px, y:py}); 
                }
            }

            // 3. Integration
            state.robot.x += state.robot.vx; 
            state.robot.y += state.robot.vy;
            // Visual spin based on speed
            state.robot.angle += (Math.abs(state.robot.vx) + Math.abs(state.robot.vy)) * 0.1;

            // 4. VFX Management
            if(Math.abs(state.robot.vx)>0.1 || Math.abs(state.robot.vy)>0.1) {
                // Add thruster trail
                simParticles.push(new FXParticle(state.robot.x, state.robot.y, state.mode==='mpc'?'#00ff9d':'#00f2ff'));
            }
            if(justCrashed) { 
                shake = 10; 
                for(let k=0;k<8;k++) simParticles.push(new FXParticle(state.robot.x, state.robot.y, '#ff0055')); 
            }
            if(shake > 0) shake *= 0.8;
            if(shake < 0.5) shake = 0;
            gridOffset -= 0.5;

            // 5. Scoring System
            if(isUnsafe) {
                state.safetyScore = Math.max(0, state.safetyScore - 5);
                uiRefs.statusText.innerText = "COLLISION"; 
                uiRefs.statusText.className = "value unsafe";
            } else {
                if(state.safetyScore < 100) state.safetyScore += 0.2;
                uiRefs.statusText.innerText = "OPTIMAL"; 
                uiRefs.statusText.className = "value safe";
            }
            uiRefs.scoreVal.innerText = Math.floor(state.safetyScore) + "%";

            draw(predictedPath, isUnsafe);
        // }
        animationFrameId = requestAnimationFrame(update);
    }

    /* --- RENDERING --- */
    function draw(path, crash) {
        // Always clear to prevent trails
        ctx.clearRect(0, 0, simWidth, simHeight);
        ctx.save();
        if(shake > 0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);

        // Grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; ctx.lineWidth = 1;
        for(let x = 0; x < simWidth; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, simHeight); ctx.stroke(); }
        for(let y = (gridOffset % 40); y < simHeight; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(simWidth, y); ctx.stroke(); }

        // Walls
        ctx.strokeStyle = crash ? "#ff0055" : "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 3;
        ctx.strokeRect(state.walls.x_min, state.walls.y_min, state.walls.x_max - state.walls.x_min, state.walls.y_max - state.walls.y_min);

        // Target
        let pulse = Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = "#00ff9d"; ctx.beginPath(); ctx.arc(state.target.x, state.target.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#00ff9d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(state.target.x, state.target.y, 12+pulse, 0, Math.PI*2); ctx.stroke();

        // Human Input
        ctx.strokeStyle = "rgba(0, 242, 255, 0.5)"; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(state.robot.x, state.robot.y); ctx.lineTo(state.humanInput.x, state.humanInput.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0, 242, 255, 0.2)"; ctx.beginPath(); ctx.arc(state.humanInput.x, state.humanInput.y, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(0, 242, 255, 0.8)"; ctx.beginPath(); ctx.arc(state.humanInput.x, state.humanInput.y, 12, 0, Math.PI*2); ctx.stroke();

        // Prediction (MPC Trail)
        if(path && path.length > 0){
            for(let i=0; i<path.length; i++) {
                ctx.fillStyle = `rgba(0, 255, 157, ${1 - i/path.length})`;
                ctx.beginPath(); ctx.arc(path[i].x, path[i].y, 3, 0, Math.PI*2); ctx.fill();
            }
        }

        // Robot
        ctx.translate(state.robot.x, state.robot.y); ctx.rotate(state.robot.angle);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = crash ? "#ff0055" : (state.mode==='mpc'?"#00ff9d":"#00f2ff");
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,18,Math.PI,Math.PI*2.5); ctx.stroke();
        ctx.rotate(-state.robot.angle); ctx.translate(-state.robot.x, -state.robot.y);

        // Particles
        for(let i = simParticles.length - 1; i >= 0; i--) {
            simParticles[i].update(); simParticles[i].draw(ctx);
            if(simParticles[i].life <= 0) simParticles.splice(i, 1);
        }
        ctx.restore();
    }

    // Public API
    window.addEventListener('resize', resize);
    // Listen for orientation change on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(resize, 100); 
    });
    
    // Explicitly call resize once to ensure variables are set
    resize();
    update();

    return {
        setMode: setMode,
        resize: resize
    };

})();