/**
 * [MODULE: BACKGROUND]
 * This file handles the "Network Particle" animation in the background.
 * It is purely cosmetic and should run efficiently to not lag the main simulation.
 * * Future AI Note:
 * Variables here are scoped (bgWidth, bgHeight) to avoid clashing with 
 * the simulation's variables.
 */

(function() { // Wrap in IIFE (Immediately Invoked Function Expression) to protect scope
    
    const bgCanvas = document.getElementById('bg-canvas');
    if (!bgCanvas) return; // Guard clause

    const bgCtx = bgCanvas.getContext('2d');
    let bgWidth, bgHeight;
    let particles = [];
    let mouse = { x: -9999, y: -9999, radius: 150 }; // Init off-screen
    
    // Dynamic Colors based on CSS variables
    let particleColor = 'rgba(0, 242, 255, 0.4)';
    let lineColor = 'rgba(0, 242, 255, 0.1)';

    function updateColors() {
        // Read the computed style of the --primary variable from the body
        const style = getComputedStyle(document.body);
        const primary = style.getPropertyValue('--primary').trim();
        
        // Convert to RGBA for canvas
        // This is a simple heuristic. For robustness, we assume hex or named colors
        // and let canvas fillStyle handle it, but we add opacity manually if needed.
        particleColor = primary; 
        lineColor = primary; // We'll apply globalAlpha for transparency
    }

    // Event Listener for Mouse Interaction
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // Listen for Theme Changes (Custom Event from navigation.js)
    window.addEventListener('themeChanged', () => {
        setTimeout(updateColors, 100); // Small delay to allow CSS to apply
    });

    function resizeBg() {
        bgWidth = window.innerWidth;
        bgHeight = window.innerHeight;
        bgCanvas.width = bgWidth;
        bgCanvas.height = bgHeight;
        initParticles();
        updateColors();
    }

    function initParticles() {
        particles = [];
        // Density calculation: fewer particles on mobile
        const count = Math.floor(bgWidth * bgHeight / 15000); 
        
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * bgWidth,
                y: Math.random() * bgHeight,
                vx: (Math.random() - 0.5) * 0.3, // Low velocity for chill vibes
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2,
                baseX: Math.random() * bgWidth,
                baseY: Math.random() * bgHeight,
                density: (Math.random() * 30) + 1
            });
        }
    }

    function drawBg() {
        bgCtx.clearRect(0, 0, bgWidth, bgHeight);
        
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            
            // Mouse Interaction (Repulsion effect)
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
                // Return to original position (Elasticity)
                if (p.x !== p.baseX) { p.x -= (p.x - p.baseX) / 20; }
                if (p.y !== p.baseY) { p.y -= (p.y - p.baseY) / 20; }
            }

            p.x += p.vx;
            p.y += p.vy;

            // Draw Particle
            bgCtx.globalAlpha = 0.4;
            bgCtx.fillStyle = particleColor;
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            bgCtx.fill();

            // Draw Connections (Lines)
            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 100) { // Connection threshold
                    bgCtx.globalAlpha = 0.1 * (1 - dist/100); // Fade out with distance
                    bgCtx.strokeStyle = lineColor;
                    bgCtx.beginPath();
                    bgCtx.lineWidth = 1;
                    bgCtx.moveTo(p.x, p.y);
                    bgCtx.lineTo(p2.x, p2.y);
                    bgCtx.stroke();
                }
            }
        }
        requestAnimationFrame(drawBg);
    }

    // Initialize
    window.addEventListener('resize', resizeBg);
    resizeBg();
    drawBg();

})();