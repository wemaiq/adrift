// Wait for DOM to be ready, then start embers
function initEmbers() {
    const canvas = document.getElementById('embers-canvas');
    
    // Safety check
    if (!canvas) {
        console.warn('embers-canvas not found, retrying...');
        setTimeout(initEmbers, 100);
        return;
    }
    
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Ember class
    class Ember {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.2;
            this.vy = (Math.random() - 0.5) * 0.2 - 0.05; // slight upward drift
            this.size = Math.random() * 0.75 + 0.5;
            this.brightness = Math.random() * 0.4 + 0.4;
            this.brightnessDirection = Math.random() > 0.5 ? 1 : -1;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.wobbleSpeed = Math.random() * 0.015 + 0.008;
            this.redIntensity = Math.random() * 0.3 + 0.7;
            this.flickerSpeed = Math.random() * 0.05 + 0.02;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Wrap around edges
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;

            // Flickering brightness (more chaotic like fire)
            this.brightness += (Math.random() - 0.5) * this.flickerSpeed;
            if (this.brightness > 0.8) {
                this.brightness = 0.8;
            } else if (this.brightness < 0.2) {
                this.brightness = 0.2;
            }

            // Wobble the movement
            this.wobblePhase += this.wobbleSpeed;
            this.vx += Math.cos(this.wobblePhase) * 0.025;
            this.vy += Math.sin(this.wobblePhase) * 0.025;

            // Dampen velocity
            this.vx *= 0.97;
            this.vy *= 0.97;

            // Keep velocity in reasonable range
            const maxVel = 0.8;
            if (Math.abs(this.vx) > maxVel) this.vx = maxVel * Math.sign(this.vx);
            if (Math.abs(this.vy) > maxVel) this.vy = maxVel * Math.sign(this.vy);
        }

        draw() {
            // Outer glow - red/orange
            const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 5);
            glowGradient.addColorStop(0, `rgba(255, 100, 0, ${this.brightness * 0.5})`);
            glowGradient.addColorStop(0.4, `rgba(255, 50, 0, ${this.brightness * 0.2})`);
            glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 5, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow - yellow to red
            const innerGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2.5);
            innerGradient.addColorStop(0, `rgba(255, 200, 0, ${this.brightness * 0.8})`);
            innerGradient.addColorStop(0.6, `rgba(255, 100, 0, ${this.brightness * 0.4})`);
            innerGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

            ctx.fillStyle = innerGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Core - bright yellow/white hot center
            ctx.fillStyle = `rgba(255, 220, 100, ${this.brightness})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Create embers
    const embers = [];
    const emberCount = 6;
    for (let i = 0; i < emberCount; i++) {
        embers.push(new Ember());
    }

    // Animation loop
    function animate() {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw embers
        for (let ember of embers) {
            ember.update();
            ember.draw();
        }

        requestAnimationFrame(animate);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Restart embers every minute
    setInterval(() => {
        embers.length = 0;
        for (let i = 0; i < emberCount; i++) {
            embers.push(new Ember());
        }
    }, 60000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbers);
} else {
    initEmbers();
}