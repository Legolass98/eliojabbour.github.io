/* =========================================
   1. SCROLL ANIMATIONS
   ========================================= */
window.addEventListener('scroll', reveal);

function reveal() {
    var reveals = document.querySelectorAll('.reveal');
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add('active');
        }
    }
}
// Trigger once on load
reveal();

/* =========================================
   2. BACKGROUND PARTICLE SYSTEM
   ========================================= */
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let width, height;
let particles = [];

function resizeBg() {
    width = window.innerWidth;
    height = window.innerHeight;
    bgCanvas.width = width;
    bgCanvas.height = height;
    initParticles();
}

function initParticles() {
    particles = [];
    const count = Math.floor(width * height / 15000); // Density
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1
        });
    }
}

function drawBg() {
    bgCtx.clearRect(0, 0, width, height);
    bgCtx.fillStyle = 'rgba(0, 242, 255, 0.3)'; // Primary color
    bgCtx.strokeStyle = 'rgba(112, 0, 255, 0.1)'; // Secondary color

    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        bgCtx.fill();

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dx = p.x - p2.x;
            let dy = p.y - p2.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 100) {
                bgCtx.beginPath();
                bgCtx.moveTo(p.x, p.y);
                bgCtx.lineTo(p2.x, p2.y);
                bgCtx.stroke();
            }
        }
    }
    requestAnimationFrame(drawBg);
}

window.addEventListener('resize', resizeBg);
resizeBg();
drawBg();

/* =========================================
   3. ROBOTICS SIMULATION (Linear vs MPC)
   ========================================= */
const simCanvas = document.getElementById('simCanvas');
const ctx = simCanvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const statusText = document.getElementById('safety-status');
const descText = document.getElementById('sim-desc');

let simWidth, simHeight;
function resizeSim() {
    const rect = simCanvas.parentElement.getBoundingClientRect();
    simWidth = rect.width;
    simHeight = rect.height;
    simCanvas.width = simWidth;
    simCanvas.height = simHeight;
    // Reset positions on resize
    target = { x: simWidth * 0.8, y: simHeight * 0.5 };
    humanInput = { x: simWidth * 0.2, y: simHeight * 0.5 };
    robot = { x: simWidth * 0.2, y: simHeight * 0.5, vx: 0, vy: 0 };
    walls = { x_min: 50, x_max: simWidth - 50, y_min: 50, y_max: simHeight - 50 };
}

// Simulation State
let mode = 'linear';
let robot = { x: 100, y: 200, vx: 0, vy: 0 };
let humanInput = { x: 100, y: 200 };
let target = { x: 0, y: 0 };
let walls = { x_min: 0, x_max: 0, y_min: 0, y_max: 0 };
let isDragging = false;
let safetyScore = 100;

// User Interactions
simCanvas.addEventListener('mousedown', (e) => { isDragging = true; updateInput(e); });
simCanvas.addEventListener('mousemove', (e) => { if(isDragging) updateInput(e); });
simCanvas.addEventListener('mouseup', () => { isDragging = false; });
simCanvas.addEventListener('touchstart', (e) => { isDragging = true; updateInput(e.touches[0]); e.preventDefault(); }, {passive: false});
simCanvas.addEventListener('touchmove', (e) => { if(isDragging) updateInput(e.touches[0]); e.preventDefault(); }, {passive: false});

function updateInput(e) {
    const rect = simCanvas.getBoundingClientRect();
    humanInput.x = e.clientX - rect.left;
    humanInput.y = e.clientY - rect.top;
}

function setMode(newMode) {
    mode = newMode;
    document.getElementById('btn-linear').className = mode === 'linear' ? 'active' : '';
    document.getElementById('btn-mpc').className = mode === 'mpc' ? 'active' : '';
    
    // Update Description
    if(mode === 'linear'){
        descText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Linear Mode:</strong> The robot follows your command directly. If you push it into a wall, it crashes (Constraint Violation).`;
    } else {
        descText.innerHTML = `<i class="fas fa-shield-alt"></i> <strong>MPC-B Mode:</strong> The robot <em>predicts</em> collisions 20 steps ahead. Notice how the green trajectory curves to avoid the wall even if you push hard.`;
    }
    safetyScore = 100; // Reset score on switch
}

function updateSim() {
    // 1. Desired Velocity (Human pulls robot to blue dot)
    let desiredVx = (humanInput.x - robot.x) * 0.15;
    let desiredVy = (humanInput.y - robot.y) * 0.15;

    // 2. Assistance (Weak pull to target)
    let assistVx = (target.x - robot.x) * 0.02;
    let assistVy = (target.y - robot.y) * 0.02;

    let cmdVx = desiredVx + assistVx;
    let cmdVy = desiredVy + assistVy;

    let predictedPath = [];
    let isUnsafe = false;

    // 3. Controller Logic
    if (mode === 'linear') {
        robot.vx = cmdVx;
        robot.vy = cmdVy;

        // Reactive collision (Crash check)
        if (robot.x < walls.x_min || robot.x > walls.x_max || 
            robot.y < walls.y_min || robot.y > walls.y_max) {
            isUnsafe = true;
            // Hard clamp (Physics collision)
            robot.x = Math.max(walls.x_min, Math.min(walls.x_max, robot.x));
            robot.y = Math.max(walls.y_min, Math.min(walls.y_max, robot.y));
        }

    } else if (mode === 'mpc') {
        // MPC Prediction logic (Simplified QP)
        const horizon = 20;
        const dt = 0.1;
        const brakingDecel = 0.8; 

        // Check distance to boundaries
        let dRight = walls.x_max - robot.x;
        let dLeft = robot.x - walls.x_min;
        let dDown = walls.y_max - robot.y;
        let dUp = robot.y - walls.y_min;

        // Velocity Constraints: v^2 = 2*a*d -> v_max = sqrt(2*a*d)
        let vMaxRight = Math.sqrt(2 * brakingDecel * Math.max(0, dRight));
        let vMaxLeft = Math.sqrt(2 * brakingDecel * Math.max(0, dLeft));
        let vMaxDown = Math.sqrt(2 * brakingDecel * Math.max(0, dDown));
        let vMaxUp = Math.sqrt(2 * brakingDecel * Math.max(0, dUp));

        // Apply Constraints (The "Blending" part)
        if (cmdVx > vMaxRight) cmdVx = vMaxRight;
        if (cmdVx < -vMaxLeft) cmdVx = -vMaxLeft;
        if (cmdVy > vMaxDown) cmdVy = vMaxDown;
        if (cmdVy < -vMaxUp) cmdVy = -vMaxUp;

        robot.vx = cmdVx;
        robot.vy = cmdVy;

        // Generate Prediction Vis
        let px = robot.x; 
        let py = robot.y;
        for(let i=0; i<horizon; i++){
            px += robot.vx; // assume constant vel for short horizon
            py += robot.vy;
            predictedPath.push({x: px, y: py});
        }
    }

    // Physics Integration
    robot.x += robot.vx;
    robot.y += robot.vy;

    // Score Logic
    if(isUnsafe) {
        safetyScore = Math.max(0, safetyScore - 2);
        statusText.innerText = "COLLISION!";
        statusText.className = "value unsafe";
    } else {
        if(safetyScore < 100) safetyScore += 0.1;
        statusText.innerText = "OPTIMAL";
        statusText.className = "value safe";
    }
    scoreVal.innerText = Math.floor(safetyScore) + "%";

    drawSim(predictedPath, isUnsafe);
    requestAnimationFrame(updateSim);
}

function drawSim(path, crash) {
    ctx.clearRect(0, 0, simWidth, simHeight);

    // Walls
    ctx.strokeStyle = crash ? "#ff0055" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = 4;
    ctx.strokeRect(walls.x_min, walls.y_min, walls.x_max - walls.x_min, walls.y_max - walls.y_min);

    // Target
    ctx.fillStyle = "#00ff9d";
    ctx.beginPath();
    ctx.arc(target.x, target.y, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 10; ctx.shadowColor = "#00ff9d";

    // Human Input (Ghost)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0, 242, 255, 0.5)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(robot.x, robot.y);
    ctx.lineTo(humanInput.x, humanInput.y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = "rgba(0, 242, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(humanInput.x, humanInput.y, 10, 0, Math.PI*2);
    ctx.fill();

    // Robot
    ctx.fillStyle = crash ? "#ff0055" : "#e0e0e0";
    ctx.beginPath();
    ctx.arc(robot.x, robot.y, 12, 0, Math.PI*2);
    ctx.fill();

    // MPC Prediction Trail
    if(path && path.length > 0){
        ctx.strokeStyle = "#00ff9d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        for(let p of path) ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }
}

// Init
resizeSim();
window.addEventListener('resize', resizeSim);
updateSim();
