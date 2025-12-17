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
    let simWidth = 300, simHeight = 400; // Defaults
    let simParticles = []; 
    let shake = 0;
    let gridOffset = 0;
    let animationFrameId; 

    // Game State
    let state = {
        mode: 'linear', 
        robot: { x: 0, y: 0, vx: 0, vy: 0, angle: 0 },
        humanInput: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        walls: { x_min: 0, x_max: 0, y_min: 0, y_max: 0 },
        isDragging: false,
        safetyScore: 100
    };

    /* --- INITIALIZATION & RESIZING --- */
    function resize() {
        const container = simCanvas.parentElement;
        if (!container) return;

        // Force dimensions if hidden, otherwise use client dimensions
        const width = container.clientWidth || 300; 
        const height = container.clientHeight || 400;
        
        // Ensure we don't set 0 dimensions
        simWidth = Math.max(width, 300);
        simHeight = Math.max(height, 300);
        
        simCanvas.width = simWidth;
        simCanvas.height = simHeight;
        
        resetPositions();
    }

    function resetPositions() {
        state.target = { x: simWidth * 0.85, y: simHeight * 0.5 };
        state.humanInput = { x: simWidth * 0.15, y: simHeight * 0.5 };
        state.robot = { x: simWidth * 0.15, y: simHeight * 0.5, vx: 0, vy: 0, angle: 0 };
        
        const pad = Math.min(60, simWidth * 0.1); 
        state.walls = { x_min: pad, x_max: simWidth - pad, y_min: pad, y_max: simHeight - pad };
    }

    /* --- INPUT HANDLING --- */
    function getInputPos(e) {
        const rect = simCanvas.getBoundingClientRect();
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
    simCanvas.addEventListener('mouseleave', () => { state.isDragging = false; });

    // Touch Events (Mobile) 
    simCanvas.addEventListener('touchstart', (e) => { 
        state.isDragging = true; 
        let p = getInputPos(e); 
        state.humanInput = p; 
        // Prevent default only if touching inside canvas bounds (effectively handled by target)
        if(e.target === simCanvas) e.preventDefault();
    }, {passive: false});

    simCanvas.addEventListener('touchmove', (e) => { 
        if(state.isDragging) { 
            let p = getInputPos(e); 
            state.humanInput = p; 
            if(e.target === simCanvas) e.preventDefault();
        } 
    }, {passive: false});

    simCanvas.addEventListener('touchend', () => { state.isDragging = false; });

    /* --- MODE SWITCHING --- */
    function setMode(newMode) {
        state.mode = newMode;
        if(uiRefs.btnLinear) uiRefs.btnLinear.className = state.mode === 'linear' ? 'active' : '';
        if(uiRefs.btnMpc) uiRefs.btnMpc.className = state.mode === 'mpc' ? 'active' : '';
        
        if(uiRefs.descText) {
            if(state.mode === 'linear') {
                uiRefs.descText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Linear Mode:</strong> Direct control. The robot will crash if you push it.`;
            } else {
                uiRefs.descText.innerHTML = `<i class="fas fa-shield-alt"></i> <strong>MPC-B Mode:</strong> Predictive safety. It brakes automatically before hitting walls.`;
            }
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
        // Run update loop constantly
        
        // 1. Calculate Forces
        let desiredVx = (state.humanInput.x - state.robot.x) * 0.12;
        let desiredVy = (state.humanInput.y - state.robot.y) * 0.12;
        let assistVx = (state.target.x - state.robot.x) * 0.015;
        let assistVy = (state.target.y - state.robot.y) * 0.015;
        
        let cmdVx = desiredVx + assistVx;
        let cmdVy = desiredVy + assistVy;
        
        let predictedPath = [];
        let isUnsafe = false;
        let justCrashed = false;

        // 2. Control Logic
        if (state.mode === 'linear') {
            state.robot.vx = cmdVx; 
            state.robot.vy = cmdVy;
            
            if (state.robot.x < state.walls.x_min) { state.robot.x = state.walls.x_min; state.robot.vx=0; isUnsafe=true; justCrashed=true; }
            if (state.robot.x > state.walls.x_max) { state.robot.x = state.walls.x_max; state.robot.vx=0; isUnsafe=true; justCrashed=true; }
            if (state.robot.y < state.walls.y_min) { state.robot.y = state.walls.y_min; state.robot.vy=0; isUnsafe=true; justCrashed=true; }
            if (state.robot.y > state.walls.y_max) { state.robot.y = state.walls.y_max; state.robot.vy=0; isUnsafe=true; justCrashed=true; }
        
        } else {
            const braking = 0.9; 
            let dRight = state.walls.x_max - state.robot.x;
            let dLeft = state.robot.x - state.walls.x_min;
            let dDown = state.walls.y_max - state.robot.y;
            let dUp = state.robot.y - state.walls.y_min;

            let vMaxRight = Math.sqrt(2 * braking * Math.max(0, dRight - 5)); 
            let vMaxLeft = Math.sqrt(2 * braking * Math.max(0, dLeft - 5));
            let vMaxDown = Math.sqrt(2 * braking * Math.max(0, dDown - 5));
            let vMaxUp = Math.sqrt(2 * braking * Math.max(0, dUp - 5));

            if (cmdVx > vMaxRight) cmdVx = vMaxRight;
            if (cmdVx < -vMaxLeft) cmdVx = -vMaxLeft;
            if (cmdVy > vMaxDown) cmdVy = vMaxDown;
            if (cmdVy < -vMaxUp) cmdVy = -vMaxUp;

            state.robot.vx = cmdVx; 
            state.robot.vy = cmdVy;
            
            let px = state.robot.x, py = state.robot.y;
            for(let i=0; i<15; i++){ 
                px+=state.robot.vx; 
                py+=state.robot.vy; 
                predictedPath.push({x:px, y:py}); 
            }
        }

        state.robot.x += state.robot.vx; 
        state.robot.y += state.robot.vy;
        state.robot.angle += (Math.abs(state.robot.vx) + Math.abs(state.robot.vy)) * 0.1;

        if(Math.abs(state.robot.vx)>0.1 || Math.abs(state.robot.vy)>0.1) {
            simParticles.push(new FXParticle(state.robot.x, state.robot.y, state.mode==='mpc'?'#00ff9d':'#00f2ff'));
        }
        if(justCrashed) { 
            shake = 10; 
            for(let k=0;k<8;k++) simParticles.push(new FXParticle(state.robot.x, state.robot.y, '#ff0055')); 
        }
        if(shake > 0) shake *= 0.8;
        if(shake < 0.5) shake = 0;
        gridOffset -= 0.5;

        if(isUnsafe) {
            state.safetyScore = Math.max(0, state.safetyScore - 5);
            if(uiRefs.statusText) { uiRefs.statusText.innerText = "COLLISION"; uiRefs.statusText.className = "value unsafe"; }
        } else {
            if(state.safetyScore < 100) state.safetyScore += 0.2;
            if(uiRefs.statusText) { uiRefs.statusText.innerText = "OPTIMAL"; uiRefs.statusText.className = "value safe"; }
        }
        if(uiRefs.scoreVal) uiRefs.scoreVal.innerText = Math.floor(state.safetyScore) + "%";

        draw(predictedPath, isUnsafe);
        animationFrameId = requestAnimationFrame(update);
    }

    function draw(path, crash) {
        // Ensure we are drawing to the correct size
        if (simCanvas.width !== simWidth || simCanvas.height !== simHeight) {
             simCanvas.width = simWidth;
             simCanvas.height = simHeight;
        }

        ctx.clearRect(0, 0, simWidth, simHeight);
        ctx.save();
        if(shake > 0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; ctx.lineWidth = 1;
        for(let x = 0; x < simWidth; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, simHeight); ctx.stroke(); }
        for(let y = (gridOffset % 40); y < simHeight; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(simWidth, y); ctx.stroke(); }

        ctx.strokeStyle = crash ? "#ff0055" : "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 3;
        ctx.strokeRect(state.walls.x_min, state.walls.y_min, state.walls.x_max - state.walls.x_min, state.walls.y_max - state.walls.y_min);

        let pulse = Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = "#00ff9d"; ctx.beginPath(); ctx.arc(state.target.x, state.target.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#00ff9d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(state.target.x, state.target.y, 12+pulse, 0, Math.PI*2); ctx.stroke();

        ctx.strokeStyle = "rgba(0, 242, 255, 0.5)"; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(state.robot.x, state.robot.y); ctx.lineTo(state.humanInput.x, state.humanInput.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0, 242, 255, 0.2)"; ctx.beginPath(); ctx.arc(state.humanInput.x, state.humanInput.y, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(0, 242, 255, 0.8)"; ctx.beginPath(); ctx.arc(state.humanInput.x, state.humanInput.y, 12, 0, Math.PI*2); ctx.stroke();

        if(path && path.length > 0){
            for(let i=0; i<path.length; i++) {
                ctx.fillStyle = `rgba(0, 255, 157, ${1 - i/path.length})`;
                ctx.beginPath(); ctx.arc(path[i].x, path[i].y, 3, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.translate(state.robot.x, state.robot.y); ctx.rotate(state.robot.angle);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = crash ? "#ff0055" : (state.mode==='mpc'?"#00ff9d":"#00f2ff");
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,18,Math.PI,Math.PI*2.5); ctx.stroke();
        ctx.rotate(-state.robot.angle); ctx.translate(-state.robot.x, -state.robot.y);

        for(let i = simParticles.length - 1; i >= 0; i--) {
            simParticles[i].update(); simParticles[i].draw(ctx);
            if(simParticles[i].life <= 0) simParticles.splice(i, 1);
        }
        ctx.restore();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => { setTimeout(resize, 100); });
    
    // Safety Force Start
    setTimeout(() => {
        resize();
        if(!animationFrameId) update();
    }, 100);

    return { setMode: setMode, resize: resize };

})();