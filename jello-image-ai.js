/**
 * Jello Image AI - AI-powered image analysis for Will It Jello?
 *
 * This module uses Claude Sonnet 4 vision API to analyze uploaded images,
 * detect objects, and process them for embedding in jello.
 *
 * @version 1.0.0
 * @author Claude Code
 * @license MIT
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} objectName - Short name (2-4 words)
 * @property {string} description - Visual description
 * @property {string} material - Material type (plastic, metal, food, etc.)
 * @property {string} color - Primary color as hex code
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} size - Size estimate (small/medium/large)
 * @property {string} suggestions - Creative suggestions for jello embedding
 * @property {string} processedImage - Data URL of processed image
 * @property {Object} generationPrompt - Placeholder for future AI generation
 * @property {number} processingTime - Time taken in ms
 */

/**
 * @typedef {Object} JelloImageAIOptions
 * @property {string} apiKey - Claude API key
 * @property {Function} onProgress - Progress callback (message: string, percent: number)
 * @property {boolean} enableBackgroundRemoval - Remove background (default: true)
 * @property {boolean} enableJelloEffects - Apply jello tinting (default: true)
 * @property {number} maxImageSize - Max image dimension in px (default: 1024)
 * @property {number} timeout - API timeout in ms (default: 30000)
 * @property {boolean} enableCache - Cache results (default: true)
 * @property {number} maxRetries - Max retry attempts (default: 3)
 * @property {Function} onLog - Custom logging function
 */

class JelloImageAI {
    /**
     * Create a new JelloImageAI instance
     * @param {JelloImageAIOptions} options - Configuration options
     */
    constructor(options = {}) {
        this.apiKey = options.apiKey || '';
        this.onProgress = options.onProgress || (() => {});
        this.enableBackgroundRemoval = options.enableBackgroundRemoval !== false;
        this.enableJelloEffects = options.enableJelloEffects !== false;
        this.maxImageSize = options.maxImageSize || 1024;
        this.timeout = options.timeout || 30000;
        this.enableCache = options.enableCache !== false;
        this.maxRetries = options.maxRetries || 3;
        this.onLog = options.onLog || console.log;

        // Cache for results
        this.cache = new Map();

        // Rate limiting
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests

        this.log('✨ JelloImageAI initialized');
    }

    /**
     * Log message with optional styling
     * @private
     */
    log(message, data = null) {
        if (this.onLog) {
            this.onLog(message, data);
        }
    }

    /**
     * Main entry point: analyze image and prepare for jello
     * @param {File|Blob} file - Image file to analyze
     * @returns {Promise<AnalysisResult>}
     */
    async analyzeAndGenerate(file) {
        const startTime = Date.now();
        this.log('🔍 Starting image analysis...', { fileName: file.name, size: file.size });

        try {
            // Step 1: Validate file
            this.onProgress('Validating image...', 5);
            await this._validateFile(file);

            // Step 2: Convert to base64 and get cache key
            this.onProgress('Processing image...', 10);
            const base64 = await this._fileToBase64(file);
            const cacheKey = this._generateCacheKey(base64);

            // Check cache
            if (this.enableCache && this.cache.has(cacheKey)) {
                this.log('✅ Cache hit!');
                this.onProgress('Loading from cache...', 100);
                return this.cache.get(cacheKey);
            }

            // Step 3: Analyze with Claude Vision API
            this.onProgress('Analyzing with AI...', 30);
            const analysis = await this._analyzeWithClaude(base64, file.type);

            // Step 4: Process image (background removal + jello effects)
            this.onProgress('Processing for jello...', 60);
            const processedImage = await this._processImage(base64);

            // Step 5: Build result
            this.onProgress('Finalizing...', 90);
            const result = {
                ...analysis,
                processedImage,
                generationPrompt: this._buildGenerationPrompt(analysis),
                processingTime: Date.now() - startTime
            };

            // Cache result
            if (this.enableCache) {
                this.cache.set(cacheKey, result);
            }

            this.onProgress('Complete!', 100);
            this.log('✅ Analysis complete', result);
            return result;

        } catch (error) {
            this.log('❌ Error during analysis:', error);
            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    /**
     * Batch process multiple images
     * @param {File[]} files - Array of image files
     * @returns {Promise<AnalysisResult[]>}
     */
    async analyzeBatch(files) {
        this.log(`🔄 Processing batch of ${files.length} images...`);
        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.log(`Processing ${i + 1}/${files.length}: ${file.name}`);

            try {
                const result = await this.analyzeAndGenerate(file);
                results.push({ success: true, file: file.name, result });
            } catch (error) {
                results.push({ success: false, file: file.name, error: error.message });
            }

            // Rate limiting between requests
            if (i < files.length - 1) {
                await this._wait(this.minRequestInterval);
            }
        }

        return results;
    }

    /**
     * Validate uploaded file
     * @private
     */
    async _validateFile(file) {
        // Check if it's a file
        if (!(file instanceof File || file instanceof Blob)) {
            throw new Error('Invalid file object');
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            throw new Error(`Invalid file type: ${file.type}. Supported: JPEG, PNG, WebP, GIF`);
        }
    }

    /**
     * Convert File to base64 data URL
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
     * Generate cache key from image data
     * @private
     */
    _generateCacheKey(base64) {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < base64.length; i++) {
            hash = ((hash << 5) - hash) + base64.charCodeAt(i);
            hash = hash & hash;
        }
        return `img_${hash}`;
    }

    /**
     * Analyze image with Claude Vision API
     * @private
     */
    async _analyzeWithClaude(base64DataUrl, mediaType) {
        // Check API key
        if (!this.apiKey) {
            throw new Error('Claude API key not provided. Set it in constructor options.');
        }

        // Rate limiting
        await this._enforceRateLimit();

        // Extract base64 data without data URL prefix
        const base64Data = base64DataUrl.split(',')[1];

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
                            media_type: mediaType,
                            data: base64Data
                        }
                    },
                    {
                        type: 'text',
                        text: `Analyze this image for the "Will It Jello?" project. The object will be embedded in translucent red jello and wobble when clicked.

Please provide a JSON response with:
- objectName: Short name (2-4 words)
- description: Visual description (shape, texture, colors, materials)
- material: Material type (plastic, metal, food, fabric, glass, rubber, wood, ceramic, etc.)
- color: Primary color as hex code (e.g., #FF0000)
- confidence: Your confidence in the detection (0-1)
- size: Size estimate (small/medium/large)
- suggestions: Creative suggestions about how this would look wobbling in jello

Respond ONLY with valid JSON, no other text.`
                    }
                ]
            }]
        };

        // Retry logic
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.log(`API attempt ${attempt}/${this.maxRetries}...`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`API error ${response.status}: ${error}`);
                }

                const data = await response.json();

                // Extract JSON from response
                const textContent = data.content.find(c => c.type === 'text')?.text || '';
                const jsonMatch = textContent.match(/\{[\s\S]*\}/);

                if (!jsonMatch) {
                    throw new Error('No JSON found in API response');
                }

                const analysis = JSON.parse(jsonMatch[0]);

                // Validate response structure
                this._validateAnalysis(analysis);

                return analysis;

            } catch (error) {
                lastError = error;
                this.log(`❌ Attempt ${attempt} failed:`, error.message);

                if (attempt < this.maxRetries) {
                    const backoffTime = Math.pow(2, attempt) * 1000;
                    this.log(`⏳ Retrying in ${backoffTime}ms...`);
                    await this._wait(backoffTime);
                }
            }
        }

        throw new Error(`API failed after ${this.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Validate analysis response structure
     * @private
     */
    _validateAnalysis(analysis) {
        const required = ['objectName', 'description', 'material', 'color', 'confidence', 'size'];
        for (const field of required) {
            if (!(field in analysis)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate confidence
        if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
            throw new Error('Invalid confidence value (must be 0-1)');
        }

        // Validate color
        if (!/^#[0-9A-Fa-f]{6}$/.test(analysis.color)) {
            throw new Error('Invalid color format (must be hex like #FF0000)');
        }
    }

    /**
     * Process image: resize, background removal, jello effects
     * @private
     */
    async _processImage(base64DataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize if needed
                    const scale = Math.min(
                        this.maxImageSize / img.width,
                        this.maxImageSize / img.height,
                        1
                    );
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Background removal (simple corner-based)
                    if (this.enableBackgroundRemoval) {
                        this._removeBackground(data, canvas.width, canvas.height);
                    }

                    // Apply subtle jello effects
                    if (this.enableJelloEffects) {
                        this._applyJelloEffects(data);
                    }

                    // Put back to canvas
                    ctx.putImageData(imageData, 0, 0);

                    // Apply subtle blur for depth
                    if (this.enableJelloEffects) {
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

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = base64DataUrl;
        });
    }

    /**
     * Remove background using corner-based sampling
     * @private
     */
    _removeBackground(data, width, height) {
        // Sample background from corners
        const bgSamples = [
            data[0], data[1], data[2],  // Top-left
            data[(width - 1) * 4], data[(width - 1) * 4 + 1], data[(width - 1) * 4 + 2],  // Top-right
        ];
        const bgColor = {
            r: (bgSamples[0] + bgSamples[3]) / 2,
            g: (bgSamples[1] + bgSamples[4]) / 2,
            b: (bgSamples[2] + bgSamples[5]) / 2
        };

        // Remove similar colors
        for (let i = 0; i < data.length; i += 4) {
            const diff = Math.abs(data[i] - bgColor.r) +
                        Math.abs(data[i + 1] - bgColor.g) +
                        Math.abs(data[i + 2] - bgColor.b);

            if (diff < 80) {
                data[i + 3] = 0;  // Transparent
            } else if (diff < 120) {
                data[i + 3] = Math.min(data[i + 3], (diff - 80) * 6);  // Feather edges
            }
        }
    }

    /**
     * Apply subtle jello effects to image
     * @private
     */
    _applyJelloEffects(data) {
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 20) {  // Only visible pixels
                // Very subtle red tint (not extreme like before)
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
    }

    /**
     * Build generation prompt for future AI image generation
     * @private
     */
    _buildGenerationPrompt(analysis) {
        return {
            service: 'placeholder', // Will be 'dalle', 'midjourney', or 'stable-diffusion'
            prompt: `A clean, isolated ${analysis.objectName} on a transparent background. ${analysis.description}. Professional product photography style, well-lit, high detail, 4K quality.`,
            negativePrompt: 'background, shadow, text, watermark, blurry',
            styleGuide: `Material: ${analysis.material}, Primary color: ${analysis.color}, Size: ${analysis.size}`,
            metadata: {
                originalAnalysis: analysis,
                purpose: 'will-it-jello-embedding',
                targetFormat: 'png-transparent'
            }
        };
    }

    /**
     * Enforce rate limiting
     * @private
     */
    async _enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            this.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
            await this._wait(waitTime);
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Wait for specified milliseconds
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cached results
     */
    clearCache() {
        this.cache.clear();
        this.log('🗑️ Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JelloImageAI;
}

if (typeof window !== 'undefined') {
    window.JelloImageAI = JelloImageAI;
}
