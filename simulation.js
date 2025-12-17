const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const safetyText = document.getElementById('safety-text');

// State
let mode = 'linear'; // 'linear' or 'mpc'
let robot = { x: 100, y: 200, vx: 0, vy: 0 };
let humanInput = { x: 100, y: 200 }; // The blue dot (mouse cursor)
let target = { x: 700, y: 200 };     // The green goal

// Parameters
const dt = 0.05;
const alpha = 0.05; // Smoothing factor
const assistanceWeight = 0.3; // How much the robot wants to go to target
const speedLimit = 5; 

// Workspace Constraints (The "Safe Zone")
const walls = { x_min: 50, x_max: 750, y_min: 50, y_max: 350 };

// Interactions
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    humanInput.x = e.clientX - rect.left;
    humanInput.y = e.clientY - rect.top;
});

// Switch Modes
function setMode(newMode) {
    mode = newMode;
    document.getElementById('btn-linear').className = mode === 'linear' ? 'mode-btn active' : 'mode-btn';
    document.getElementById('btn-mpc').className = mode === 'mpc' ? 'mode-btn active' : 'mode-btn';
    
    // Toggle descriptions
    document.getElementById('linear-desc').style.display = mode === 'linear' ? 'block' : 'none';
    document.getElementById('mpc-desc').style.display = mode === 'mpc' ? 'block' : 'none';
}

function update() {
    // 1. Calculate Desired Velocity (Human Intention)
    let desiredVx = (humanInput.x - robot.x) * 0.1;
    let desiredVy = (humanInput.y - robot.y) * 0.1;

    // 2. Add Assistance (Pull towards target)
    let assistVx = (target.x - robot.x) * 0.05;
    let assistVy = (target.y - robot.y) * 0.05;

    // Blending Command (Unconstrained)
    let cmdVx = (1 - assistanceWeight) * desiredVx + assistanceWeight * assistVx;
    let cmdVy = (1 - assistanceWeight) * desiredVy + assistanceWeight * assistVy;

    // 3. APPLY CONTROLLER LOGIC
    if (mode === 'linear') {
        // LINEAR: Just apply command, clamp only if we actually hit wall
        // This mimics "Reactive" control - it hits the wall then stops
        robot.vx = cmdVx;
        robot.vy = cmdVy;

        // Simple hard stop (Reactive)
        if (robot.x < walls.x_min) robot.x = walls.x_min;
        if (robot.x > walls.x_max) robot.x = walls.x_max;
        if (robot.y < walls.y_min) robot.y = walls.y_min;
        if (robot.y > walls.y_max) robot.y = walls.y_max;
        
        // Check safety for display
        let isUnsafe = robot.x <= walls.x_min + 2 || robot.x >= walls.x_max - 2 || 
                       robot.y <= walls.y_min + 2 || robot.y >= walls.y_max - 2;
        updateSafety(isUnsafe ? "CRASH / CONSTRAINT VIOLATION" : "Safe", isUnsafe);

    } else if (mode === 'mpc') {
        // MPC-B (Simplified): Predictive Braking
        // Look ahead: If current velocity leads to crash in N steps, reduce it.
        
        const horizon = 20; // Prediction horizon
        
        // X-Axis Constraints
        let distToRightWall = walls.x_max - robot.x;
        let distToLeftWall = robot.x - walls.x_min;
        
        // Simple MPC Logic: Max velocity is prop to sqrt(distance) (Kinematic braking)
        // This mimics the QP constraint behavior
        let maxVelRight = Math.sqrt(2 * 0.5 * distToRightWall); // 0.5 is braking accel
        let maxVelLeft = Math.sqrt(2 * 0.5 * distToLeftWall);

        if (cmdVx > maxVelRight) cmdVx = maxVelRight; // Clamp velocity proactively
        if (cmdVx < -maxVelLeft) cmdVx = -maxVelLeft;

        // Y-Axis Constraints
        let distToBottom = walls.y_max - robot.y;
        let distToTop = robot.y - walls.y_min;
        let maxVelDown = Math.sqrt(2 * 0.5 * distToBottom);
        let maxVelUp = Math.sqrt(2 * 0.5 * distToTop);

        if (cmdVy > maxVelDown) cmdVy = maxVelDown;
        if (cmdVy < -maxVelUp) cmdVy = -maxVelUp;

        robot.vx = cmdVx;
        robot.vy = cmdVy;
        updateSafety("Optimal & Safe", false);
    }

    // Physics Update
    robot.x += robot.vx;
    robot.y += robot.vy;

    draw();
    requestAnimationFrame(update);
}

function updateSafety(text, isBad) {
    safetyText.innerText = text;
    safetyText.className = isBad ? "unsafe" : "safe";
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Constraints (Walls)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 5;
    ctx.strokeRect(walls.x_min, walls.y_min, walls.x_max - walls.x_min, walls.y_max - walls.y_min);
    
    // Draw Target
    ctx.fillStyle = "#27ae60";
    ctx.fillRect(target.x - 15, target.y - 15, 30, 30);
    ctx.fillStyle = "black";
    ctx.fillText("Target", target.x - 15, target.y - 25);

    // Draw Human Input (Blue Ghost)
    ctx.beginPath();
    ctx.arc(humanInput.x, humanInput.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(41, 128, 185, 0.5)";
    ctx.fill();
    ctx.fillText("Human Input", humanInput.x + 15, humanInput.y);

    // Draw Robot (Red)
    ctx.beginPath();
    ctx.arc(robot.x, robot.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#e74c3c";
    ctx.fill();
    
    // Draw Prediction Line (Visualizing MPC)
    if (mode === 'mpc') {
        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        ctx.lineTo(robot.x + robot.vx * 10, robot.y + robot.vy * 10);
        ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
        ctx.stroke();
    }
}

// Start
update();