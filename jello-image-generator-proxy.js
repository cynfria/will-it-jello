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

        // NEW: Choose prompt strategy
        // 'v3-jello' = Effects-based jello (no bubble artifacts)
        // 'v4-clean' = Clean generation + strong post-processing (SAFEST)
        // 'v2-isolation' = Old isolation approach
        this.promptStrategy = options.promptStrategy || 'v3-jello';

        this.maxPollAttempts = 60;
        this.pollInterval = 1000;

        console.log('🎨 JelloImageGenerator initialized (PROXY MODE)');
        console.log('   Service:', this.generationService);
        console.log('   Strategy:', this.promptStrategy);
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

            // Stage 3: Create prompt (strategy-based)
            this._reportProgress('Creating generation prompt...', 30, 'detect');
            let prompt;

            if (this.promptStrategy === 'v4-clean') {
                // V4: Clean generation, add ALL jello effects in post (SAFEST)
                prompt = this.createCleanPrompt(detection);
                console.log('🎨 Using V4 strategy: Clean + full post-processing (no artifacts)');
            } else if (this.promptStrategy === 'v3-jello') {
                // V3.1: Effects-based prompt (no bubble)
                prompt = this.createJelloPrompt(detection);
                console.log('🎨 Using V3.1 strategy: Effects-based (no bubble)');
            } else {
                // V2: Generate clean + add jello effects later
                prompt = this.createImprovedPrompt(detection);
                console.log('📝 Using V2 strategy: Isolation + post-process');
            }

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

        console.log('🎯 Improved prompt created (V2 - Isolation):');
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
                promptVersion: 'v2-isolation'
            }
        };
    }

    /**
     * Create REFINED JELLO prompt - Avoid bubble artifacts!
     * V3.1: Effects-based approach, NOT literal jello container
     */
    createJelloPrompt(detection) {
        const objectName = detection.objectName;
        const description = detection.detailedDescription;

        // NEW APPROACH: Focus on EFFECTS, not literal embedding
        const positivePrompt = `${objectName}, ${description}.

IMPORTANT: Show ONLY the object itself, isolated on pure white background (#FFFFFF).

Apply these visual effects to make it look like it's viewed through translucent red jello:
- Soft red ambient glow around the object (jello ambient lighting effect)
- Slight blur on edges (subtle jello distortion)
- Gentle red color cast on the object (jello refraction effect)
- Soft focus, dreamlike quality (viewing through gelatin medium)
- Atmospheric red lighting, warm glow

CRITICAL - DO NOT CREATE:
- NO visible jello container, bubble, or sphere around object
- NO transparent capsule or dome
- NO jello mass or structure visible
- The object should appear as if photographed THROUGH red jello, but NO jello structure visible

Style: Professional product photography with red gel filter effect.
Lighting: Soft studio lighting with warm red glow, atmospheric.
Composition: Centered, ${detection.viewAngle || '3/4 angle'}, isolated on pure white background.
Effects: Subtle red color cast, soft edges, dreamlike quality, slight blur.

Think: Object photographed through red-tinted glass or filter, NOT object inside jello container.`;

        const negativePrompt = `jello bubble, visible jello container, sphere around object, transparent sphere,
jello mass visible, gelatin structure, encasing visible, capsule, dome,
realistic jello texture showing, jello block, container visible, glass container,
bubble effect, orb, ball around object, transparent shell,
surface, ground, floor, table, shadow on ground,
multiple objects, cluttered, sharp focus with no effects, no color cast,
cartoon, illustration, low quality, blurry beyond recognition`;

        console.log('🎯 Refined jello prompt created (V3.1 - No Bubble):');
        console.log('   ✅ Effects-based (no literal jello)');
        console.log('   ✅ Soft red ambient glow');
        console.log('   ✅ Dreamlike quality');
        console.log('   ⚠️  NO bubble/sphere/container');
        console.log('   ✅ Pure white background');

        return {
            positive: positivePrompt,
            negative: negativePrompt,
            metadata: {
                objectName: detection.objectName,
                material: detection.material,
                color: detection.color,
                size: detection.size,
                promptVersion: 'v3.1-refined-no-bubble',
                approach: 'effects-based'
            }
        };
    }

    /**
     * Create CLEAN prompt for fallback (V4 - Minimal)
     * Generate clean object, add jello effects in post-processing
     */
    createCleanPrompt(detection) {
        const objectName = detection.objectName;
        const description = detection.detailedDescription;

        const positivePrompt = `${objectName}, ${description}.

Professional product photography of isolated object.
Pure white background (#FFFFFF), no surface, no shadows.
Clean, sharp, high quality product shot.
Studio lighting, centered composition.
${detection.viewAngle || '3/4 angle'} view.
Photorealistic, 8k resolution.

Simple, clean product photography - object only on white background.`;

        const negativePrompt = `jello, gelatin, effects, filters, tinted, colored background,
surface, ground, floor, shadow, multiple objects, cluttered,
blurry, low quality, distorted, cartoon, illustration`;

        console.log('🎯 Clean prompt created (V4 - Fallback):');
        console.log('   ✅ No jello effects (added in post)');
        console.log('   ✅ Clean product shot');
        console.log('   ✅ White background');

        return {
            positive: positivePrompt,
            negative: negativePrompt,
            metadata: {
                objectName: detection.objectName,
                material: detection.material,
                color: detection.color,
                size: detection.size,
                promptVersion: 'v4-clean-fallback',
                approach: 'post-processing'
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
     * Process generated image for jello (apply effects based on strategy)
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

                if (this.promptStrategy === 'v4-clean') {
                    // V4: STRONG jello effects (clean image needs full processing)
                    console.log('✨ Strong jello effects (full post-processing)');

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 20) {
                            // Strong red tint for jello effect
                            data[i] = Math.min(255, data[i] * 1.08);
                            data[i + 1] = data[i + 1] * 0.96;
                            data[i + 2] = data[i + 2] * 0.96;

                            // Contrast reduction for soft look
                            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                            const contrastAmount = 0.92;
                            data[i] = avg + (data[i] - avg) * contrastAmount;
                            data[i + 1] = avg + (data[i + 1] - avg) * contrastAmount;
                            data[i + 2] = avg + (data[i + 2] - avg) * contrastAmount;

                            // Add warmth (red glow)
                            data[i] = Math.min(255, data[i] + 5);
                        }
                    }

                    ctx.putImageData(imageData, 0, 0);

                    // Apply blur for dreamlike quality
                    const blurred = document.createElement('canvas');
                    blurred.width = canvas.width;
                    blurred.height = canvas.height;
                    const blurCtx = blurred.getContext('2d');
                    blurCtx.filter = 'blur(1px)';  // Stronger blur
                    blurCtx.drawImage(canvas, 0, 0);

                    resolve(blurred.toDataURL('image/png'));

                } else if (this.promptStrategy === 'v3-jello') {
                    // V3: Minimal processing - effects already in prompt
                    console.log('✨ Light processing (effects from prompt)');

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 20) {
                            // Just a tiny adjustment
                            data[i] = Math.min(255, data[i] * 1.02);
                        }
                    }

                    ctx.putImageData(imageData, 0, 0);
                    resolve(canvas.toDataURL('image/png'));

                } else {
                    // V2: Medium processing
                    console.log('✨ Medium processing (adding jello effects)');

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

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
                }
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
