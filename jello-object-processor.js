/**
 * Jello Object Processor - Make things look GREAT in jello
 *
 * Simple focus: Excellent background removal + subtle effects = looks good!
 *
 * NO AI GENERATION - just professional processing
 */

class JelloObjectProcessor {
    constructor(config = {}) {
        // Optional Remove.bg API key for professional quality
        this.removebgKey = config.removebgKey || null;
        this.onProgress = config.onProgress || (() => {});

        console.log('🎨 JelloObjectProcessor initialized');
        console.log('   Focus: Perfect background removal + subtle effects');
        if (this.removebgKey) {
            console.log('   Using Remove.bg API for professional quality');
        } else {
            console.log('   Using advanced client-side removal');
        }
    }

    /**
     * Main entry point: Process uploaded photo for jello
     */
    async processForJello(imageFile) {
        const startTime = Date.now();
        console.log('🚀 Processing for jello...');

        try {
            // Step 1: Remove background PERFECTLY (most important!)
            this.updateProgress('Removing background...', 30);
            const noBg = await this.removeBackgroundPerfectly(imageFile);
            console.log('✅ Background removed');

            // Step 2: Apply subtle jello effects
            this.updateProgress('Applying jello effects...', 70);
            const jellofied = await this.applyJelloEffects(noBg);
            console.log('✅ Jello effects applied');

            const totalTime = Date.now() - startTime;
            this.updateProgress('Ready!', 100);

            console.log(`✅ Complete in ${totalTime}ms`);

            return {
                processedImage: jellofied,
                totalTime: totalTime,
                approach: 'quality-processing'
            };

        } catch (error) {
            console.error('❌ Processing failed:', error);
            throw error;
        }
    }

    /**
     * PERFECT background removal - this is the most important part!
     */
    async removeBackgroundPerfectly(imageFile) {
        // If you have Remove.bg API key, use it - it's worth $0.20 for quality
        if (this.removebgKey) {
            try {
                return await this.removeBackgroundAPI(imageFile);
            } catch (error) {
                console.warn('Remove.bg failed, using fallback:', error.message);
                return await this.removeBackgroundAdvanced(imageFile);
            }
        }

        // Otherwise, use improved client-side algorithm
        return await this.removeBackgroundAdvanced(imageFile);
    }

    /**
     * Remove.bg API - professional quality
     */
    async removeBackgroundAPI(imageFile) {
        console.log('   Using Remove.bg API...');

        const formData = new FormData();
        formData.append('image_file', imageFile);
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': this.removebgKey
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Remove.bg API error: ${response.statusText}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    /**
     * Advanced client-side background removal
     */
    async removeBackgroundAdvanced(imageFile) {
        console.log('   Using advanced client-side removal...');

        const base64 = await this.fileToBase64(imageFile);

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Good size for quality
                const maxSize = 1024;
                let width = img.width;
                let height = img.height;

                if (width > maxSize || height > maxSize) {
                    const scale = maxSize / Math.max(width, height);
                    width = Math.floor(width * scale);
                    height = Math.floor(height * scale);
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // Sample MORE edge pixels for better background detection
                const edgeSamples = [];
                const sampleEvery = 5;

                // Top and bottom edges
                for (let x = 0; x < width; x += sampleEvery) {
                    // Top
                    let idx = (0 * width + x) * 4;
                    edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
                    // Bottom
                    idx = ((height - 1) * width + x) * 4;
                    edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
                }

                // Left and right edges
                for (let y = 0; y < height; y += sampleEvery) {
                    // Left
                    let idx = (y * width + 0) * 4;
                    edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
                    // Right
                    idx = (y * width + (width - 1)) * 4;
                    edgeSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
                }

                // Calculate median background color (more robust than average)
                const medianColor = this.calculateMedianColor(edgeSamples);

                console.log(`   Detected background: rgb(${medianColor[0]}, ${medianColor[1]}, ${medianColor[2]})`);

                // Remove background with better edge feathering
                const tolerance = 40;
                const featherRange = tolerance * 0.8;
                let removedCount = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Color distance from background
                    const dist = Math.sqrt(
                        Math.pow(r - medianColor[0], 2) +
                        Math.pow(g - medianColor[1], 2) +
                        Math.pow(b - medianColor[2], 2)
                    );

                    if (dist < tolerance) {
                        // Close to background - make transparent
                        data[i + 3] = 0;
                        removedCount++;
                    } else if (dist < tolerance + featherRange) {
                        // Edge pixels - feather for smooth transition
                        const alpha = (dist - tolerance) / featherRange;
                        data[i + 3] = Math.floor(data[i + 3] * alpha);
                    }
                    // Else keep as is
                }

                console.log(`   ✅ Removed ${removedCount} background pixels`);

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };

            img.src = base64;
        });
    }

    /**
     * Calculate median color (more robust than average)
     */
    calculateMedianColor(samples) {
        const r = samples.map(s => s[0]).sort((a, b) => a - b);
        const g = samples.map(s => s[1]).sort((a, b) => a - b);
        const b = samples.map(s => s[2]).sort((a, b) => a - b);

        const mid = Math.floor(samples.length / 2);
        return [r[mid], g[mid], b[mid]];
    }

    /**
     * Apply SUBTLE jello effects - less is more!
     */
    async applyJelloEffects(imageUrl) {
        console.log('✨ Applying very subtle jello effects...');

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

                // VERY subtle effects - barely noticeable
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha === 0) continue;

                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Barely noticeable red tint (2% more red)
                    data[i] = Math.min(255, r * 1.02);
                    data[i + 1] = g * 0.99;
                    data[i + 2] = b * 0.99;

                    // Tiny contrast reduction (98%)
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = avg + (data[i] - avg) * 0.98;
                    data[i + 1] = avg + (data[i + 1] - avg) * 0.98;
                    data[i + 2] = avg + (data[i + 2] - avg) * 0.98;
                }

                ctx.putImageData(imageData, 0, 0);

                // Minimal blur (0.3px - barely visible)
                const temp = document.createElement('canvas');
                temp.width = canvas.width;
                temp.height = canvas.height;
                const tempCtx = temp.getContext('2d');
                tempCtx.filter = 'blur(0.3px)';
                tempCtx.drawImage(canvas, 0, 0);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(temp, 0, 0);

                console.log('   ✅ Effects applied: barely-there red tint, soft edges');

                resolve(canvas.toDataURL('image/png'));
            };

            if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
                img.src = imageUrl;
            } else {
                img.crossOrigin = 'anonymous';
                img.src = imageUrl;
            }
        });
    }

    // Helper methods
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    updateProgress(message, percent) {
        console.log(`[${Math.round(percent)}%] ${message}`);
        this.onProgress({ message, percent });
    }
}
