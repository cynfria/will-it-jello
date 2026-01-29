/**
 * Jello Image Generator - AI-powered object detection + image generation
 *
 * Detects objects in uploaded photos, then generates clean isolated product shots
 * using AI (Replicate, OpenAI DALL-E, or Stability AI).
 *
 * @version 1.0.0
 * @author Claude Code
 * @license MIT
 */

/**
 * @typedef {Object} GenerationResult
 * @property {string} objectName - Detected object name
 * @property {string} generatedImageUrl - URL of generated image
 * @property {string} processedImage - Data URL ready for jello (with effects)
 * @property {Object} detection - Full Claude vision detection data
 * @property {Object} generationMetadata - Generation service info
 * @property {number} totalTime - Total processing time in ms
 */

/**
 * @typedef {Object} ProgressUpdate
 * @property {string} message - Progress message
 * @property {number} percent - Progress percentage (0-100)
 * @property {string} stage - Current stage (detect/generate/process)
 */

class JelloImageGenerator {
    /**
     * Create a new image generator
     * @param {Object} config - Configuration
     * @param {string} config.claudeKey - Claude API key (required)
     * @param {string} config.generationService - Service: 'replicate', 'openai', 'stability'
     * @param {string} config.replicateToken - Replicate API token
     * @param {string} config.openaiKey - OpenAI API key
     * @param {string} config.stabilityKey - Stability AI key
     * @param {Function} config.onProgress - Progress callback
     * @param {number} config.timeout - Generation timeout in ms (default: 60000)
     * @param {boolean} config.enableJelloEffects - Apply jello tinting (default: true)
     */
    constructor(config = {}) {
        this.claudeKey = config.claudeKey || '';
        this.generationService = config.generationService || 'replicate';
        this.replicateToken = config.replicateToken || '';
        this.openaiKey = config.openaiKey || '';
        this.stabilityKey = config.stabilityKey || '';
        this.onProgress = config.onProgress || (() => {});
        this.timeout = config.timeout || 60000;
        this.enableJelloEffects = config.enableJelloEffects !== false;

        // Polling config
        this.maxPollAttempts = 60;
        this.pollInterval = 1000; // 1 second

        this.log('🎨 JelloImageGenerator initialized');
        this.log(`   Service: ${this.generationService}`);
    }

    /**
     * Main entry point: detect object and generate new image
     * @param {File|Blob} imageFile - Uploaded image
     * @returns {Promise<GenerationResult>}
     */
    async detectAndGenerate(imageFile) {
        const startTime = Date.now();
        this.log('🚀 Starting detection + generation pipeline...');

        try {
            // Validate API keys
            this._validateConfig();

            // Stage 1: Convert to base64
            this._updateProgress('Converting image...', 5, 'detect');
            const base64 = await this._fileToBase64(imageFile);
            const base64Data = base64.split(',')[1];
            const mimeType = imageFile.type;

            // Stage 2: Detect object with Claude Vision
            this._updateProgress('Analyzing image with AI...', 15, 'detect');
            const detection = await this.detectObject(base64Data, mimeType);
            this.log('✅ Detection complete:', detection.objectName);

            // Stage 3: Create generation prompt
            this._updateProgress('Creating generation prompt...', 30, 'generate');
            const prompt = this.createPrompt(detection);
            this.log('📝 Prompt created:', prompt.positive.substring(0, 100) + '...');

            // Stage 4: Generate NEW image with AI
            this._updateProgress('Generating new image...', 40, 'generate');
            const generatedUrl = await this._generateImage(prompt);
            this.log('✅ Generation complete:', generatedUrl.substring(0, 50) + '...');

            // Stage 5: Process for jello
            this._updateProgress('Processing for jello...', 80, 'process');
            const processedImage = await this.processForJello(generatedUrl);

            // Stage 6: Done!
            this._updateProgress('Complete!', 100, 'done');

            const result = {
                objectName: detection.objectName,
                generatedImageUrl: generatedUrl,
                processedImage: processedImage,
                detection: detection,
                generationMetadata: {
                    service: this.generationService,
                    prompt: prompt.positive,
                    negativePrompt: prompt.negative
                },
                totalTime: Date.now() - startTime
            };

            this.log('🎉 Pipeline complete!', result);
            return result;

        } catch (error) {
            this.log('❌ Pipeline failed:', error);
            throw error;
        }
    }

    /**
     * Detect object using Claude Vision API
     * @param {string} base64Data - Base64 image data (without prefix)
     * @param {string} mimeType - Image MIME type
     * @returns {Promise<Object>} Detection data
     */
    async detectObject(base64Data, mimeType) {
        const requestBody = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        type: 'text',
                        text: `Analyze this image to generate a NEW AI image for "Will It Jello?" project.

Provide detailed information in JSON format:
{
  "objectName": "Short name (2-4 words)",
  "detailedDescription": "Very detailed visual description for image generation (shape, materials, colors, textures, style, key features)",
  "material": "Primary material type",
  "color": "Primary color as hex code",
  "size": "Size estimate (small/medium/large)",
  "style": "Visual style (realistic, cartoon, minimal, etc.)",
  "viewAngle": "Best viewing angle (front, 3/4, side, top)",
  "lighting": "Lighting description (studio, natural, dramatic)",
  "confidence": "Detection confidence (0-1)"
}

Be extremely detailed in detailedDescription - it will be used to generate a new image.
Respond ONLY with valid JSON.`
                    }
                ]
            }]
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.claudeKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error ${response.status}: ${error}`);
        }

        const data = await response.json();
        const textContent = data.content.find(c => c.type === 'text')?.text || '';
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('No JSON found in detection response');
        }

        return JSON.parse(jsonMatch[0]);
    }

    /**
     * Create detailed prompts from detection data
     * @param {Object} detection - Claude vision detection
     * @returns {Object} { positive, negative, metadata }
     */
    createPrompt(detection) {
        // Positive prompt with all details
        const positive = `Professional product photography of ${detection.objectName}. ${detection.detailedDescription}. Isolated on pure white background (#FFFFFF). Clean studio lighting with soft shadows. Centered composition. High detail, sharp focus, photorealistic. Shot from ${detection.viewAngle || 'slightly above at 3/4 angle'}. ${detection.lighting || 'Studio'} lighting. 8k resolution, professional photography.`;

        // Negative prompt to avoid unwanted elements
        const negative = 'blurry, low quality, multiple objects, cluttered background, text, watermark, logo, busy background, distorted, deformed, low resolution, grainy, out of focus, dark background, colored background, shadows on background, floating, multiple views, collage';

        return {
            positive,
            negative,
            metadata: {
                objectName: detection.objectName,
                style: detection.style,
                material: detection.material,
                color: detection.color
            }
        };
    }

    /**
     * Generate image using configured service
     * @private
     */
    async _generateImage(prompt) {
        switch (this.generationService) {
            case 'replicate':
                return await this.generateWithReplicate(prompt);
            case 'openai':
                return await this.generateWithOpenAI(prompt);
            case 'stability':
                return await this.generateWithStability(prompt);
            default:
                throw new Error(`Unknown generation service: ${this.generationService}`);
        }
    }

    /**
     * Generate with Replicate (Flux model)
     * @param {Object} prompt - Prompt object
     * @returns {Promise<string>} Image URL
     */
    async generateWithReplicate(prompt) {
        if (!this.replicateToken) {
            throw new Error('Replicate token not provided');
        }

        // Step 1: Create prediction
        this.log('📤 Creating Replicate prediction...');
        const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.replicateToken}`
            },
            body: JSON.stringify({
                version: 'black-forest-labs/flux-schnell', // Fast model
                input: {
                    prompt: prompt.positive,
                    num_outputs: 1,
                    aspect_ratio: '1:1',
                    output_format: 'png',
                    output_quality: 90
                }
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            throw new Error(`Replicate create error: ${error}`);
        }

        const prediction = await createResponse.json();
        const predictionId = prediction.id;
        this.log(`⏳ Prediction created: ${predictionId}`);

        // Step 2: Poll until complete
        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await this._wait(this.pollInterval);

            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.replicateToken}`
                }
            });

            if (!pollResponse.ok) {
                throw new Error('Replicate poll error');
            }

            const result = await pollResponse.json();
            const progress = Math.min(40 + (attempt / this.maxPollAttempts) * 35, 75);
            this._updateProgress(`Generating... (${attempt + 1}s)`, progress, 'generate');

            if (result.status === 'succeeded') {
                this.log('✅ Replicate generation succeeded');
                return result.output[0]; // URL of generated image
            }

            if (result.status === 'failed') {
                throw new Error(`Replicate generation failed: ${result.error}`);
            }

            // Status is 'starting' or 'processing', continue polling
        }

        throw new Error('Replicate generation timeout');
    }

    /**
     * Generate with OpenAI DALL-E 3
     * @param {Object} prompt - Prompt object
     * @returns {Promise<string>} Image URL
     */
    async generateWithOpenAI(prompt) {
        if (!this.openaiKey) {
            throw new Error('OpenAI API key not provided');
        }

        this.log('📤 Calling OpenAI DALL-E 3...');
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.openaiKey}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt.positive,
                n: 1,
                size: '1024x1024',
                quality: 'hd',
                style: 'natural'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI error: ${error}`);
        }

        const data = await response.json();
        this.log('✅ DALL-E generation succeeded');
        return data.data[0].url;
    }

    /**
     * Generate with Stability AI
     * @param {Object} prompt - Prompt object
     * @returns {Promise<string>} Image data URL
     */
    async generateWithStability(prompt) {
        if (!this.stabilityKey) {
            throw new Error('Stability AI key not provided');
        }

        this.log('📤 Calling Stability AI...');

        const formData = new FormData();
        formData.append('prompt', prompt.positive);
        formData.append('negative_prompt', prompt.negative);
        formData.append('output_format', 'png');
        formData.append('aspect_ratio', '1:1');

        const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.stabilityKey}`,
                'Accept': 'image/*'
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Stability AI error: ${error}`);
        }

        // Convert blob to data URL
        const blob = await response.blob();
        const dataUrl = await this._blobToDataUrl(blob);
        this.log('✅ Stability generation succeeded');
        return dataUrl;
    }

    /**
     * Process generated image for jello: apply effects and return data URL
     * @param {string} imageUrl - URL or data URL of generated image
     * @returns {Promise<string>} Data URL ready for canvas
     */
    async processForJello(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // CORS handling

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw image
                    ctx.drawImage(img, 0, 0);

                    if (this.enableJelloEffects) {
                        // Apply subtle jello effects
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;

                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i + 3] > 20) { // Only visible pixels
                                // Subtle red tint
                                data[i] = Math.min(255, data[i] * 1.05);      // 5% more red
                                data[i + 1] = data[i + 1] * 0.98;              // 2% less green
                                data[i + 2] = data[i + 2] * 0.98;              // 2% less blue

                                // Slight contrast reduction
                                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                                const contrastAmount = 0.95;
                                data[i] = avg + (data[i] - avg) * contrastAmount;
                                data[i + 1] = avg + (data[i + 1] - avg) * contrastAmount;
                                data[i + 2] = avg + (data[i + 2] - avg) * contrastAmount;
                            }
                        }

                        ctx.putImageData(imageData, 0, 0);

                        // Subtle blur
                        const blurred = document.createElement('canvas');
                        blurred.width = canvas.width;
                        blurred.height = canvas.height;
                        const blurCtx = blurred.getContext('2d');
                        blurCtx.filter = 'blur(0.5px)';
                        blurCtx.drawImage(canvas, 0, 0);

                        resolve(blurred.toDataURL('image/png'));
                    } else {
                        resolve(canvas.toDataURL('image/png'));
                    }

                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load generated image'));
            img.src = imageUrl;
        });
    }

    /**
     * Validate configuration
     * @private
     */
    _validateConfig() {
        if (!this.claudeKey) {
            throw new Error('Claude API key required for detection');
        }

        switch (this.generationService) {
            case 'replicate':
                if (!this.replicateToken) {
                    throw new Error('Replicate token required for generation');
                }
                break;
            case 'openai':
                if (!this.openaiKey) {
                    throw new Error('OpenAI API key required for generation');
                }
                break;
            case 'stability':
                if (!this.stabilityKey) {
                    throw new Error('Stability AI key required for generation');
                }
                break;
        }
    }

    /**
     * Convert File to base64
     * @private
     */
    async _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert Blob to data URL
     * @private
     */
    async _blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Update progress
     * @private
     */
    _updateProgress(message, percent, stage) {
        this.onProgress({ message, percent, stage });
    }

    /**
     * Wait for milliseconds
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log message
     * @private
     */
    log(message, data = null) {
        if (data) {
            console.log(`%c${message}`, 'color: #dc1e32; font-weight: bold', data);
        } else {
            console.log(`%c${message}`, 'color: #dc1e32; font-weight: bold');
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JelloImageGenerator;
}

if (typeof window !== 'undefined') {
    window.JelloImageGenerator = JelloImageGenerator;
}
