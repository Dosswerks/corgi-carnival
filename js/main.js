/**
 * Corgi Carnival Hub - Procedural Graphics
 * Draws corgi-themed icons on each game card canvas and the logo
 */

(function () {
    'use strict';

    // Color palette
    const COLORS = {
        black: '#2a2a2a',
        tan: '#c4813a',
        tanDark: '#a06828',
        tanLight: '#d4954a',
        white: '#f5f0e8',
        nose: '#1a1a1a',
        eye: '#3d2b1a',
        eyeHighlight: '#ffffff',
        earInner: '#c49060',
        accent: '#f5a623',
        blue: '#5b9bd5',
        pink: '#e88fa2',
        green: '#6abf69',
    };

    /**
     * Draw the hub logo corgi (front-facing, friendly)
     */
    function drawLogoCorgi(canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2 + 5;

        // Body
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 30, 20, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.black;
        ctx.fill();

        // White chest
        ctx.beginPath();
        ctx.ellipse(cx, cy + 16, 18, 14, 0, 0, Math.PI);
        ctx.fillStyle = COLORS.white;
        ctx.fill();

        // Tan sides
        ctx.beginPath();
        ctx.ellipse(cx - 20, cy + 8, 12, 16, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 20, cy + 8, 12, 16, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();

        // Front paws
        ctx.beginPath();
        ctx.ellipse(cx - 12, cy + 30, 6, 4, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 12, cy + 30, 6, 4, 0.1, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(cx, cy - 12, 20, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();

        // Black mask
        ctx.beginPath();
        ctx.ellipse(cx, cy - 18, 14, 8, 0, Math.PI, 0);
        ctx.fillStyle = COLORS.black;
        ctx.fill();

        // White blaze
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 26);
        ctx.lineTo(cx + 2, cy - 26);
        ctx.lineTo(cx + 3, cy - 14);
        ctx.lineTo(cx - 3, cy - 14);
        ctx.closePath();
        ctx.fillStyle = COLORS.white;
        ctx.fill();

        // White muzzle
        ctx.beginPath();
        ctx.ellipse(cx, cy - 6, 10, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();

        // Nose
        ctx.beginPath();
        ctx.ellipse(cx, cy - 9, 4, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.nose;
        ctx.fill();

        // Eyes
        ctx.beginPath();
        ctx.arc(cx - 8, cy - 15, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eye;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 15, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eye;
        ctx.fill();

        // Eye highlights
        ctx.beginPath();
        ctx.arc(cx - 9, cy - 16, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eyeHighlight;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 7, cy - 16, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eyeHighlight;
        ctx.fill();

        // Tan cheeks
        ctx.beginPath();
        ctx.ellipse(cx - 10, cy - 10, 5, 4, 0, 0, Math.PI);
        ctx.fillStyle = COLORS.tanLight;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 10, cy - 10, 5, 4, 0, 0, Math.PI);
        ctx.fillStyle = COLORS.tanLight;
        ctx.fill();

        // Ears
        // Left ear
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - 24);
        ctx.lineTo(cx - 22, cy - 42);
        ctx.lineTo(cx - 6, cy - 26);
        ctx.closePath();
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy - 25);
        ctx.lineTo(cx - 19, cy - 38);
        ctx.lineTo(cx - 8, cy - 26);
        ctx.closePath();
        ctx.fillStyle = COLORS.earInner;
        ctx.fill();

        // Right ear
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy - 24);
        ctx.lineTo(cx + 22, cy - 42);
        ctx.lineTo(cx + 6, cy - 26);
        ctx.closePath();
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 13, cy - 25);
        ctx.lineTo(cx + 19, cy - 38);
        ctx.lineTo(cx + 8, cy - 26);
        ctx.closePath();
        ctx.fillStyle = COLORS.earInner;
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(cx, cy - 5, 6, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.strokeStyle = COLORS.nose;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    /**
     * Draw Jasper Junction card icon (side-view corgi with sheep)
     */
    function drawJasperIcon(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Green field background
        ctx.beginPath();
        ctx.rect(0, 50, 100, 30);
        ctx.fillStyle = '#4a7c3f';
        ctx.fill();

        // Simple sheep (white puff)
        ctx.beginPath();
        ctx.ellipse(72, 48, 10, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(72, 44, 6, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#e8e8e8';
        ctx.fill();
        // Sheep face
        ctx.beginPath();
        ctx.ellipse(72, 44, 3, 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        // Sheep legs
        ctx.fillStyle = '#333';
        ctx.fillRect(67, 54, 2, 6);
        ctx.fillRect(75, 54, 2, 6);

        // Mini corgi (side view)
        // Body
        ctx.beginPath();
        ctx.ellipse(32, 50, 14, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(32, 52, 14, 6, 0, 0, Math.PI);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        // White chest
        ctx.beginPath();
        ctx.ellipse(22, 51, 5, 6, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.ellipse(20, 44, 7, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        // Black mask
        ctx.beginPath();
        ctx.ellipse(20, 42, 5, 3, 0, Math.PI, 0);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // Ear
        ctx.beginPath();
        ctx.moveTo(21, 39);
        ctx.lineTo(24, 32);
        ctx.lineTo(26, 39);
        ctx.closePath();
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // Eye
        ctx.beginPath();
        ctx.arc(18, 43, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eye;
        ctx.fill();
        // Legs
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(24, 56, 2.5, 5);
        ctx.fillRect(28, 56, 2.5, 5);
        ctx.fillStyle = COLORS.tan;
        ctx.fillRect(35, 56, 2.5, 5);
        ctx.fillRect(39, 56, 2.5, 5);

        // Herd radius indicator (subtle arc)
        ctx.beginPath();
        ctx.arc(26, 48, 20, -0.8, 0.8);
        ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * Draw Archer's Alley card icon (corgi catching falling objects)
     */
    function drawArchersIcon(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Falling objects
        const objects = [
            { x: 20, y: 12, r: 5, color: '#e74c3c' },
            { x: 50, y: 8, r: 5, color: '#f39c12' },
            { x: 75, y: 18, r: 5, color: '#9b59b6' },
            { x: 35, y: 28, r: 4, color: '#e74c3c' },
            { x: 65, y: 32, r: 4, color: '#f39c12' },
        ];
        objects.forEach(obj => {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
            ctx.fillStyle = obj.color;
            ctx.fill();
            // Motion lines
            ctx.beginPath();
            ctx.moveTo(obj.x, obj.y - obj.r - 3);
            ctx.lineTo(obj.x, obj.y - obj.r - 8);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Corgi with basket (top-down-ish)
        // Basket
        ctx.beginPath();
        ctx.ellipse(50, 62, 16, 8, 0, 0, Math.PI);
        ctx.fillStyle = '#8B6914';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(50, 62, 16, 4, 0, Math.PI, 0);
        ctx.fillStyle = '#a07818';
        ctx.fill();

        // Corgi body behind basket
        ctx.beginPath();
        ctx.ellipse(50, 66, 12, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        // Head poking up
        ctx.beginPath();
        ctx.ellipse(50, 54, 8, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        // Black mask
        ctx.beginPath();
        ctx.ellipse(50, 52, 6, 3, 0, Math.PI, 0);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(44, 49);
        ctx.lineTo(40, 42);
        ctx.lineTo(46, 48);
        ctx.closePath();
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(56, 49);
        ctx.lineTo(60, 42);
        ctx.lineTo(54, 48);
        ctx.closePath();
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // Eyes
        ctx.beginPath();
        ctx.arc(47, 53, 1.5, 0, Math.PI * 2);
        ctx.arc(53, 53, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eye;
        ctx.fill();
        // White muzzle
        ctx.beginPath();
        ctx.ellipse(50, 56, 4, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        // Nose
        ctx.beginPath();
        ctx.ellipse(50, 55, 2, 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.nose;
        ctx.fill();
    }

    /**
     * Draw Peachy Polo card icon (corgi paddle with ball and bricks)
     */
    function drawPeachyIcon(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Bricks at top
        const brickColors = ['#e88fa2', '#f5a623', '#5b9bd5', '#6abf69', '#e88fa2'];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                ctx.beginPath();
                ctx.roundRect(col * 19 + 3, row * 10 + 4, 17, 8, 2);
                ctx.fillStyle = brickColors[(row + col) % 5];
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Ball
        ctx.beginPath();
        ctx.arc(55, 48, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        // Ball trail
        ctx.beginPath();
        ctx.moveTo(55, 52);
        ctx.lineTo(52, 58);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Corgi paddle at bottom
        // Body as paddle shape
        ctx.beginPath();
        ctx.roundRect(25, 62, 50, 14, 7);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        // Black saddle on paddle
        ctx.beginPath();
        ctx.roundRect(35, 62, 30, 7, [4, 4, 0, 0]);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // White belly
        ctx.beginPath();
        ctx.roundRect(30, 69, 40, 6, [0, 0, 5, 5]);
        ctx.fillStyle = COLORS.white;
        ctx.fill();

        // Corgi head on left side of paddle
        ctx.beginPath();
        ctx.ellipse(28, 65, 8, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.tan;
        ctx.fill();
        // Black mask
        ctx.beginPath();
        ctx.ellipse(28, 63, 5, 3, 0, Math.PI, 0);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // Ear
        ctx.beginPath();
        ctx.moveTo(30, 59);
        ctx.lineTo(33, 54);
        ctx.lineTo(34, 59);
        ctx.closePath();
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        // Eye
        ctx.beginPath();
        ctx.arc(26, 64, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eye;
        ctx.fill();
        // Muzzle
        ctx.beginPath();
        ctx.ellipse(24, 66, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        // Nose
        ctx.beginPath();
        ctx.ellipse(22, 65.5, 1.5, 1, 0, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.nose;
        ctx.fill();
    }

    // Initialize all canvases
    function init() {
        drawLogoCorgi(document.getElementById('corgi-logo'));
        drawJasperIcon(document.getElementById('canvas-jasper'));
        drawArchersIcon(document.getElementById('canvas-archers'));
        drawPeachyIcon(document.getElementById('canvas-peachy'));
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
