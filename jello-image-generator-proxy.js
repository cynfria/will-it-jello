/**
 * Jello Image Generator - Proxy Version
 * Uses local backend proxy to avoid CORS issues
 */

class JelloImageGenerator {
    constructor(options = {}) {
        // Proxy URL (local server)
        this.proxyUrl = options.proxyUrl || 'http://localhost:3000/api';

        this.generationService = options.generationService || 'replicate';
        this.timeout = options.timeout || 60000;
        this.enableJelloEffects = options.enableJelloEffects !== false;
        this.onProgress = options.onProgress || (() => {});

        this.maxPollAttempts = 60;
        this.pollInterval = 1000;

        console.log('🎨 JelloImageGenerator initialized (PROXY MODE)');
        console.log('   Service:', this.generationService);
        console.log('   Proxy:', this.proxyUrl);
    }

    /**
     * Main entry point: detect object and generate new AI image
     * V2: Includes aggressive background removal after generation
     */
    async detectAndGenerate(imageFile) {
        const startTime = Date.now();

        console.log('🚀 Starting detection + generation + isolation pipeline...');

        try {
            // Stage 1: Convert to base64
            this._reportProgress('Converting image...', 5, 'detect');
            const base64 = await this._fileToBase64(imageFile);
            const base64Data = base64.split(',')[1];
            const mimeType = imageFile.type;

            // Stage 2: Detect object
            this._reportProgress('Analyzing image with AI...', 15, 'detect');
            const detection = await this.detectObject(base64Data, mimeType);
            console.log('✅ Detection complete:', detection.objectName);

            // Stage 3: Create IMPROVED prompt with strong isolation emphasis
            this._reportProgress('Creating isolation prompt...', 30, 'detect');
            const prompt = this.createImprovedPrompt(detection);
            console.log('📝 Prompt includes: pure white background, no surface, no shadows');

            // Stage 4: Generate image
            this._reportProgress('Starting image generation...', 40, 'generate');
            let generatedImageUrl;

            switch (this.generationService) {
                case 'replicate':
                    generatedImageUrl = await this.generateWithReplicate(prompt);
                    break;
                case 'openai':
                    generatedImageUrl = await this.generateWithOpenAI(prompt);
                    break;
                case 'stability':
                    generatedImageUrl = await this.generateWithStability(prompt);
                    break;
                default:
                    throw new Error(`Unknown service: ${this.generationService}`);
            }

            console.log('✅ Generation complete:', generatedImageUrl);
            this._reportProgress('Image generated!', 70, 'generate');

            // Stage 5: REMOVE BACKGROUND (NEW!) - Force isolation even if AI didn't comply
            this._reportProgress('Removing background...', 75, 'process');
            const isolatedImageUrl = await this.removeBackground(generatedImageUrl);
            console.log('✅ Background removed, object isolated');

            // Stage 6: Process for jello
            this._reportProgress('Applying jello effects...', 85, 'process');
            const processedImage = await this.processForJello(isolatedImageUrl);

            const totalTime = Date.now() - startTime;
            this._reportProgress('Complete!', 100, 'process');

            return {
                objectName: detection.objectName,
                detection: detection,
                generatedImageUrl: generatedImageUrl,
                isolatedImageUrl: isolatedImageUrl,
                processedImage: processedImage,
                prompt: prompt,
                totalTime: totalTime,
                generationMetadata: {
                    service: this.generationService,
                    modelUsed: this._getModelName()
                }
            };

        } catch (error) {
            console.error('❌ Pipeline failed:', error);
            throw error;
        }
    }

    /**
     * Detect object using Claude vision API (via proxy)
     */
    async detectObject(base64Data, mimeType) {
        try {
            const response = await fetch(`${this.proxyUrl}/detect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64Data,
                    mediaType: mimeType
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Detection failed: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            const textContent = data.content.find(c => c.type === 'text');

            if (!textContent) {
                throw new Error('No text response from Claude');
            }

            const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const detection = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (!detection.objectName || !detection.detailedDescription) {
                throw new Error('Invalid detection response');
            }

            return detection;

        } catch (error) {
            console.error('Detection error:', error);
            throw new Error(`Failed to detect object: ${error.message}`);
        }
    }

    /**
     * Create detailed prompt from detection
     * LEGACY: Use createImprovedPrompt instead for better isolation
     */
    createPrompt(detection) {
        const positivePrompt = `Professional product photography of ${detection.objectName}. ${detection.detailedDescription}. Isolated on pure white background (#FFFFFF). Clean studio lighting with soft shadows. Centered composition. High detail, sharp focus, photorealistic. Shot from ${detection.viewAngle || '3/4 angle'}. ${detection.lighting || 'Studio'} lighting. 8k resolution, professional photography.`;

        const negativePrompt = 'blurry, low quality, multiple objects, cluttered background, text, watermark, logo, busy background, distorted, deformed, cropped, out of frame, draft, amateur';

        return {
            positive: positivePrompt,
            negative: negativePrompt,
            metadata: {
                objectName: detection.objectName,
                material: detection.material,
                color: detection.color,
                size: detection.size
            }
        };
    }

    /**
     * Create IMPROVED prompt with STRONG emphasis on isolation
     * V2: Multiple mentions of white background, no surface, floating object
     */
    createImprovedPrompt(detection) {
        const objectName = detection.objectName;
        const description = detection.detailedDescription;

        // STRONG positive prompt - emphasize isolation multiple times
        const positivePrompt = `${objectName}, ${description}.
PURE WHITE BACKGROUND (#FFFFFF), completely isolated object, no surface, no ground plane, no shadows on background.
Professional product photography, object floating in white void.
Clean cutout style, PNG transparent ready.
IMPORTANT: Object must be completely isolated with pure white background, no floor or table visible.
Centered composition, high detail, sharp focus, photorealistic.
Shot from ${detection.viewAngle || '3/4 angle'}.
Studio lighting, 8k resolution, professional photography.
WHITE BACKGROUND ONLY - no other colors in background.`;

        // STRONG negative prompt - list everything we DON'T want
        const negativePrompt = `surface, ground, floor, table, desk, platform, stand, holder, base, pedestal,
shadow on ground, cast shadow, ground shadow, surface shadow,
background elements, scenery, environment, room, setting,
gray background, colored background, textured background, busy background,
wall, ceiling, props, accessories,
blurry, low quality, multiple objects, cluttered, text, watermark, logo,
distorted, deformed, cropped, out of frame, draft, amateur`;

        console.log('🎯 Improved prompt created:');
        console.log('   ✅ Pure white background (mentioned 3x)');
        console.log('   ✅ No surface/ground/floor');
        console.log('   ✅ Floating object style');
        console.log('   ✅ Negative: surface, shadow, background');

        return {
            positive: positivePrompt,
            negative: negativePrompt,
            metadata: {
                objectName: detection.objectName,
                material: detection.material,
                color: detection.color,
                size: detection.size,
                improvedPrompt: true
            }
        };
    }

    /**
     * Generate image using Replicate (via proxy)
     */
    async generateWithReplicate(prompt) {
        try {
            // Start prediction
            const createResponse = await fetch(`${this.proxyUrl}/generate/replicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!createResponse.ok) {
                throw new Error(`Replicate start failed: ${createResponse.statusText}`);
            }

            const prediction = await createResponse.json();
            const predictionId = prediction.id;

            console.log('⏳ Replicate prediction started:', predictionId);

            // Poll for completion
            for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
                await this._wait(this.pollInterval);

                const pollResponse = await fetch(`${this.proxyUrl}/generate/replicate/${predictionId}`);

                if (!pollResponse.ok) {
                    throw new Error('Polling failed');
                }

                const result = await pollResponse.json();

                const progress = 40 + (attempt / this.maxPollAttempts) * 40;
                this._reportProgress(`Generating (${attempt + 1}/${this.maxPollAttempts})...`, progress, 'generate');

                if (result.status === 'succeeded') {
                    return result.output[0];
                }

                if (result.status === 'failed') {
                    throw new Error('Generation failed: ' + (result.error || 'Unknown error'));
                }
            }

            throw new Error('Generation timeout');

        } catch (error) {
            console.error('Replicate error:', error);
            throw error;
        }
    }

    /**
     * Generate image using OpenAI DALL-E (via proxy)
     */
    async generateWithOpenAI(prompt) {
        try {
            const response = await fetch(`${this.proxyUrl}/generate/openai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error(`OpenAI generation failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data[0].url;

        } catch (error) {
            console.error('OpenAI error:', error);
            throw error;
        }
    }

    /**
     * Generate image using Stability AI (via proxy)
     */
    async generateWithStability(prompt) {
        throw new Error('Stability AI not yet implemented in proxy');
    }

    /**
     * REMOVE BACKGROUND - Force isolation even if AI didn't comply
     * V2: Aggressive background removal to eliminate surfaces/floors/shadows
     */
    async removeBackground(imageUrl) {
        console.log('🔪 Starting aggressive background removal...');

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Sample edge pixels to find background color
                const edgeSamples = [];
                const sampleSize = 5;

                // Sample top edge
                for (let x = 0; x < canvas.width; x += Math.floor(canvas.width / 20)) {
                    for (let y = 0; y < sampleSize; y++) {
                        const i = (y * canvas.width + x) * 4;
                        edgeSamples.push([data[i], data[i + 1], data[i + 2]]);
                    }
                }

                // Sample bottom edge
                for (let x = 0; x < canvas.width; x += Math.floor(canvas.width / 20)) {
                    for (let y = canvas.height - sampleSize; y < canvas.height; y++) {
                        const i = (y * canvas.width + x) * 4;
                        edgeSamples.push([data[i], data[i + 1], data[i + 2]]);
                    }
                }

                // Sample left/right edges
                for (let y = 0; y < canvas.height; y += Math.floor(canvas.height / 20)) {
                    for (let x = 0; x < sampleSize; x++) {
                        const i = (y * canvas.width + x) * 4;
                        edgeSamples.push([data[i], data[i + 1], data[i + 2]]);
                    }
                    for (let x = canvas.width - sampleSize; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        edgeSamples.push([data[i], data[i + 1], data[i + 2]]);
                    }
                }

                // Calculate average background color
                const avgR = edgeSamples.reduce((sum, c) => sum + c[0], 0) / edgeSamples.length;
                const avgG = edgeSamples.reduce((sum, c) => sum + c[1], 0) / edgeSamples.length;
                const avgB = edgeSamples.reduce((sum, c) => sum + c[2], 0) / edgeSamples.length;

                console.log(`   Background detected: rgb(${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)})`);

                // AGGRESSIVE removal - wider tolerance to catch gray surfaces
                const tolerance = 50; // Higher = more aggressive
                const featherRange = 30; // Smooth edges

                let removedPixels = 0;
                let featheredPixels = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    // Calculate color distance from background
                    const distance = Math.sqrt(
                        Math.pow(r - avgR, 2) +
                        Math.pow(g - avgG, 2) +
                        Math.pow(b - avgB, 2)
                    );

                    if (distance < tolerance) {
                        // Close to background - make fully transparent
                        data[i + 3] = 0;
                        removedPixels++;
                    } else if (distance < tolerance + featherRange) {
                        // In feather zone - partial transparency for smooth edges
                        const alpha = (distance - tolerance) / featherRange;
                        data[i + 3] = Math.min(a, a * alpha);
                        featheredPixels++;
                    }
                }

                console.log(`   ✅ Removed ${removedPixels} background pixels`);
                console.log(`   ✅ Feathered ${featheredPixels} edge pixels`);

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror = () => reject(new Error('Failed to load image for background removal'));
            img.src = imageUrl;
        });
    }

    /**
     * Process generated image for jello (apply subtle effects)
     */
    async processForJello(imageUrl) {
        if (!this.enableJelloEffects) {
            return imageUrl;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Apply subtle jello effects
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 20) {
                        // Subtle red tint
                        data[i] = Math.min(255, data[i] * 1.05);
                        data[i + 1] = data[i + 1] * 0.98;
                        data[i + 2] = data[i + 2] * 0.98;

                        // Slight contrast reduction
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        const contrastAmount = 0.95;
                        data[i] = avg + (data[i] - avg) * contrastAmount;
                        data[i + 1] = avg + (data[i + 1] - avg) * contrastAmount;
                        data[i + 2] = avg + (data[i + 2] - avg) * contrastAmount;
                    }
                }

                ctx.putImageData(imageData, 0, 0);

                // Apply blur
                const blurred = document.createElement('canvas');
                blurred.width = canvas.width;
                blurred.height = canvas.height;
                const blurCtx = blurred.getContext('2d');
                blurCtx.filter = 'blur(0.5px)';
                blurCtx.drawImage(canvas, 0, 0);

                resolve(blurred.toDataURL('image/png'));
            };

            img.onerror = () => reject(new Error('Failed to load generated image'));
            img.src = imageUrl;
        });
    }

    // Helper methods
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _reportProgress(message, percent, stage) {
        this.onProgress({ message, percent, stage });
    }

    _getModelName() {
        const models = {
            replicate: 'black-forest-labs/flux-schnell',
            openai: 'dall-e-3',
            stability: 'stable-diffusion-3'
        };
        return models[this.generationService] || 'unknown';
    }
}
