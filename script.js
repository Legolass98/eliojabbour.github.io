/* =========================================
   1. APP NAVIGATION (TABS)
   ========================================= */
function switchTab(tabId) {
    // 1. Update Buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    // Find the button that called this (based on text or index, simplistic match)
    // Actually, we can just highlight based on onclick attribute for simplicity in vanilla JS
    const targetBtn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if(targetBtn) targetBtn.classList.add('active');

    // 2. Hide all Views
    const views = document.querySelectorAll('.view-section');
    views.forEach(view => view.classList.remove('active-view'));

    // 3. Show Target View
    const activeView = document.getElementById(tabId);
    if(activeView) {
        activeView.classList.add('active-view');
        
        // Special Case: If switching to simulation, resize canvas immediately
        if(tabId === 'simulation') {
            setTimeout(() => {
                resizeSim(); 
            }, 50); // Small delay to allow CSS transition to finish layout
        }
    }
}


/* =========================================
   2. BACKGROUND SYSTEM (Optimization: Low CPU when idle)
   ========================================= */
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let width, height;
let particles = [];
let mouse = { x: null, y: null, radius: 150 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

function resizeBg() {
    width = window.innerWidth;
    height = window.innerHeight;
    bgCanvas.width = width;
    bgCanvas.height = height;
    initParticles();
}

function initParticles() {
    particles = [];
    const count = Math.floor(width * height / 15000); 
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2,
            baseX: Math.random() * width,
            baseY: Math.random() * height,
            density: (Math.random() * 30) + 1
        });
    }
}

function drawBg() {
    bgCtx.clearRect(0, 0, width, height);
    bgCtx.fillStyle = 'rgba(0, 242, 255, 0.4)'; 
    bgCtx.strokeStyle = 'rgba(112, 0, 255, 0.1)'; 

    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Mouse Interaction
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            const directionX = forceDirectionX * force * p.density;
            const directionY = forceDirectionY * force * p.density;
            p.x -= directionX;
            p.y -= directionY;
        } else {
            if (p.x !== p.baseX) { p.x -= (p.x - p.baseX) / 20; }
            if (p.y !== p.baseY) { p.y -= (p.y - p.baseY) / 20; }
        }

        p.x += p.vx;
        p.y += p.vy;

        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        bgCtx.fill();

        // Connect
        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 100) {
                bgCtx.beginPath();
                bgCtx.lineWidth = 1 - (dist/100);
                bgCtx.moveTo(p.x, p.y);
                bgCtx.lineTo(p2.x, p2.y);
                bgCtx.stroke();
            }
        }
    }
    requestAnimationFrame(drawBg);
}

window.addEventListener('resize', () => { resizeBg(); resizeSim(); });
resizeBg();
drawBg();


/* =========================================
   3. SIMULATION LOGIC
   ========================================= */
const simCanvas = document.getElementById('simCanvas');
const ctx = simCanvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const statusText = document.getElementById('safety-status');
const descText = document.getElementById('sim-desc');

let simWidth, simHeight;
let simParticles = [];
let shake = 0;
let gridOffset = 0;

// State
let mode = 'linear';
let robot = { x: 0, y: 0, vx: 0, vy: 0, angle: 0 };
let humanInput = { x: 0, y: 0 };
let target = { x: 0, y: 0 };
let walls = { x_min: 0, x_max: 0, y_min: 0, y_max: 0 };
let isDragging = false;
let safetyScore = 100;

function resizeSim() {
    // Only resize if the simulation view is visible to avoid 0x0 errors
    if(simCanvas.offsetParent === null) return;
    
    const rect = simCanvas.parentElement.getBoundingClientRect();
    simWidth = rect.width;
    simHeight = rect.height;
    simCanvas.width = simWidth;
    simCanvas.height = simHeight;
    resetSimState();
}

function resetSimState() {
    target = { x: simWidth * 0.85, y: simHeight * 0.5 };
    humanInput = { x: simWidth * 0.15, y: simHeight * 0.5 };
    robot = { x: simWidth * 0.15, y: simHeight * 0.5, vx: 0, vy: 0, angle: 0 };
    walls = { x_min: 60, x_max: simWidth - 60, y_min: 60, y_max: simHeight - 60 };
}

// Interaction
function getSimInputPos(e) {
    const rect = simCanvas.getBoundingClientRect();
    return {
        x: (e.clientX || e.touches[0].clientX) - rect.left,
        y: (e.clientY || e.touches[0].clientY) - rect.top
    };
}

simCanvas.addEventListener('mousedown', (e) => { isDragging = true; let p = getSimInputPos(e); humanInput.x = p.x; humanInput.y = p.y; });
simCanvas.addEventListener('mousemove', (e) => { if(isDragging) { let p = getSimInputPos(e); humanInput.x = p.x; humanInput.y = p.y; } });
simCanvas.addEventListener('mouseup', () => { isDragging = false; });
simCanvas.addEventListener('touchstart', (e) => { isDragging = true; let p = getSimInputPos(e); humanInput.x = p.x; humanInput.y = p.y; e.preventDefault(); }, {passive: false});
simCanvas.addEventListener('touchmove', (e) => { if(isDragging) { let p = getSimInputPos(e); humanInput.x = p.x; humanInput.y = p.y; e.preventDefault(); } }, {passive: false});

function setMode(newMode) {
    mode = newMode;
    document.getElementById('btn-linear').className = mode === 'linear' ? 'active' : '';
    document.getElementById('btn-mpc').className = mode === 'mpc' ? 'active' : '';
    
    if(mode === 'linear') {
        descText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Linear Mode:</strong> Direct control. The robot will crash if you push it.`;
    } else {
        descText.innerHTML = `<i class="fas fa-shield-alt"></i> <strong>MPC-B Mode:</strong> Predictive safety. It brakes automatically before hitting walls.`;
    }
    safetyScore = 100;
}

// Particle Class
class Particle {
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

function updateSim() {
    // Only run if visible
    if(simCanvas.offsetParent !== null) {
        // Physics
        let desiredVx = (humanInput.x - robot.x) * 0.12;
        let desiredVy = (humanInput.y - robot.y) * 0.12;
        let assistVx = (target.x - robot.x) * 0.015;
        let assistVy = (target.y - robot.y) * 0.015;
        
        let cmdVx = desiredVx + assistVx;
        let cmdVy = desiredVy + assistVy;
        let predictedPath = [];
        let isUnsafe = false;
        let justCrashed = false;

        if (mode === 'linear') {
            robot.vx = cmdVx; robot.vy = cmdVy;
            if (robot.x < walls.x_min) { robot.x = walls.x_min; robot.vx=0; isUnsafe=true; justCrashed=true; }
            if (robot.x > walls.x_max) { robot.x = walls.x_max; robot.vx=0; isUnsafe=true; justCrashed=true; }
            if (robot.y < walls.y_min) { robot.y = walls.y_min; robot.vy=0; isUnsafe=true; justCrashed=true; }
            if (robot.y > walls.y_max) { robot.y = walls.y_max; robot.vy=0; isUnsafe=true; justCrashed=true; }
        } else {
            // MPC Logic
            const braking = 0.9; 
            let dRight = walls.x_max - robot.x;
            let dLeft = robot.x - walls.x_min;
            let dDown = walls.y_max - robot.y;
            let dUp = robot.y - walls.y_min;

            // Safe Velocity calculation
            let vMaxRight = Math.sqrt(2 * braking * Math.max(0, dRight - 5)); 
            let vMaxLeft = Math.sqrt(2 * braking * Math.max(0, dLeft - 5));
            let vMaxDown = Math.sqrt(2 * braking * Math.max(0, dDown - 5));
            let vMaxUp = Math.sqrt(2 * braking * Math.max(0, dUp - 5));

            if (cmdVx > vMaxRight) cmdVx = vMaxRight;
            if (cmdVx < -vMaxLeft) cmdVx = -vMaxLeft;
            if (cmdVy > vMaxDown) cmdVy = vMaxDown;
            if (cmdVy < -vMaxUp) cmdVy = -vMaxUp;

            robot.vx = cmdVx; robot.vy = cmdVy;
            
            // Prediction
            let px = robot.x, py = robot.y;
            for(let i=0; i<15; i++){ px+=robot.vx; py+=robot.vy; predictedPath.push({x:px, y:py}); }
        }

        robot.x += robot.vx; robot.y += robot.vy;
        robot.angle += (Math.abs(robot.vx) + Math.abs(robot.vy)) * 0.1;

        // FX
        if(Math.abs(robot.vx)>0.1 || Math.abs(robot.vy)>0.1) simParticles.push(new Particle(robot.x, robot.y, mode==='mpc'?'#00ff9d':'#00f2ff'));
        if(justCrashed) { shake = 10; for(let k=0;k<8;k++) simParticles.push(new Particle(robot.x, robot.y, '#ff0055')); }
        if(shake > 0) shake *= 0.8;
        if(shake < 0.5) shake = 0;
        gridOffset -= 0.5;

        // Score
        if(isUnsafe) {
            safetyScore = Math.max(0, safetyScore - 5);
            statusText.innerText = "COLLISION"; statusText.className = "value unsafe";
        } else {
            if(safetyScore < 100) safetyScore += 0.2;
            statusText.innerText = "OPTIMAL"; statusText.className = "value safe";
        }
        scoreVal.innerText = Math.floor(safetyScore) + "%";

        drawSim(predictedPath, isUnsafe);
    }
    requestAnimationFrame(updateSim);
}

function drawSim(path, crash) {
    ctx.clearRect(0, 0, simWidth, simHeight);
    ctx.save();
    if(shake > 0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);

    // 1. Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"; ctx.lineWidth = 1;
    for(let x = 0; x < simWidth; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, simHeight); ctx.stroke(); }
    for(let y = (gridOffset % 40); y < simHeight; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(simWidth, y); ctx.stroke(); }

    // 2. Walls
    ctx.strokeStyle = crash ? "#ff0055" : "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 3;
    ctx.strokeRect(walls.x_min, walls.y_min, walls.x_max - walls.x_min, walls.y_max - walls.y_min);

    // 3. Target
    let pulse = Math.sin(Date.now() / 200) * 3;
    ctx.fillStyle = "#00ff9d"; ctx.beginPath(); ctx.arc(target.x, target.y, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#00ff9d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(target.x, target.y, 12+pulse, 0, Math.PI*2); ctx.stroke();

    // 4. Human Input
    ctx.strokeStyle = "rgba(0, 242, 255, 0.5)"; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(robot.x, robot.y); ctx.lineTo(humanInput.x, humanInput.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0, 242, 255, 0.2)"; ctx.beginPath(); ctx.arc(humanInput.x, humanInput.y, 8, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(0, 242, 255, 0.8)"; ctx.beginPath(); ctx.arc(humanInput.x, humanInput.y, 12, 0, Math.PI*2); ctx.stroke();

    // 5. Prediction (MPC)
    if(path && path.length > 0){
        for(let i=0; i<path.length; i++) {
            ctx.fillStyle = `rgba(0, 255, 157, ${1 - i/path.length})`;
            ctx.beginPath(); ctx.arc(path[i].x, path[i].y, 3, 0, Math.PI*2); ctx.fill();
        }
    }

    // 6. Robot
    ctx.translate(robot.x, robot.y); ctx.rotate(robot.angle);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = crash ? "#ff0055" : (mode==='mpc'?"#00ff9d":"#00f2ff");
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,18,Math.PI,Math.PI*2.5); ctx.stroke();
    ctx.rotate(-robot.angle); ctx.translate(-robot.x, -robot.y);

    // 7. Particles
    for(let i = simParticles.length - 1; i >= 0; i--) {
        simParticles[i].update(); simParticles[i].draw(ctx);
        if(simParticles[i].life <= 0) simParticles.splice(i, 1);
    }
    ctx.restore();
}

resizeSim();
updateSim();