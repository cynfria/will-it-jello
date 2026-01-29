// Temporary fallback: Process uploads without AI generation
// Use this while waiting for Claude credits

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ... (Copy your existing main.js Three.js setup here)

// Simple processing function (no AI)
async function processImageForJello(imageFile) {
    console.log('📸 Processing upload (no AI generation)...');

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Apply jello effects
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 20) {
                    data[i] = Math.min(255, data[i] * 1.05);
                    data[i + 1] = data[i + 1] * 0.98;
                    data[i + 2] = data[i + 2] * 0.98;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };

        img.src = URL.createObjectURL(imageFile);
    });
}

// Use processImageForJello instead of imageGenerator.detectAndGenerate
