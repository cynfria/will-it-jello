/**
 * Jello Image Generator - Usage Examples
 *
 * This file shows practical integration examples for the AI image generation module.
 * Copy and adapt these examples to your project.
 */

// ============================================================================
// EXAMPLE 1: Basic Usage - Upload → Detect → Generate → Embed
// ============================================================================

async function basicExample() {
    // Initialize generator
    const generator = new JelloImageGenerator({
        claudeKey: 'sk-ant-...',           // Your Claude API key
        generationService: 'replicate',     // Or 'openai' or 'stability'
        replicateToken: 'r8_...',          // Your Replicate token
        onProgress: ({message, percent}) => {
            console.log(`${percent}%: ${message}`);
        }
    });

    // Handle file upload
    document.getElementById('imageUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Generate NEW AI image
            const result = await generator.detectAndGenerate(file);

            console.log('✅ Generated:', result.objectName);

            // Use in your existing Three.js code
            addToJello(result.processedImage);

        } catch (error) {
            console.error('❌ Generation failed:', error);
            alert('Failed to generate image: ' + error.message);
        }
    });
}

// ============================================================================
// EXAMPLE 2: With UI Progress Feedback
// ============================================================================

async function progressExample() {
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('status-text');
    const progressContainer = document.getElementById('progress-container');

    const generator = new JelloImageGenerator({
        claudeKey: 'sk-ant-...',
        generationService: 'replicate',
        replicateToken: 'r8_...',

        onProgress: ({message, percent, stage}) => {
            // Update progress bar
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${Math.round(percent)}%`;

            // Update status text with stage emoji
            const stageEmoji = {
                'detect': '🔍',
                'generate': '🎨',
                'process': '✨',
                'done': '✅'
            };
            statusText.textContent = `${stageEmoji[stage]} ${message}`;

            // Show/hide progress container
            if (percent === 100) {
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 1000);
            } else {
                progressContainer.style.display = 'block';
            }
        }
    });

    document.getElementById('imageUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await generator.detectAndGenerate(file);

            // Show result
            document.getElementById('object-name').textContent = result.objectName;
            document.getElementById('detection-confidence').textContent =
                `${(result.detection.confidence * 100).toFixed(0)}% confident`;
            document.getElementById('processing-time').textContent =
                `${(result.totalTime / 1000).toFixed(1)}s`;

            // Add to jello
            addToJello(result.processedImage);

        } catch (error) {
            statusText.textContent = `❌ Error: ${error.message}`;
            statusText.style.color = 'red';
        }
    });
}

// ============================================================================
// EXAMPLE 3: Before/After Comparison UI
// ============================================================================

async function comparisonExample() {
    const generator = new JelloImageGenerator({
        claudeKey: 'sk-ant-...',
        generationService: 'replicate',
        replicateToken: 'r8_...'
    });

    document.getElementById('imageUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Show uploaded image preview
            const uploadedPreview = document.getElementById('uploaded-preview');
            uploadedPreview.src = URL.createObjectURL(file);
            uploadedPreview.parentElement.style.display = 'block';

            // Generate new image
            const result = await generator.detectAndGenerate(file);

            // Show generated image
            const generatedPreview = document.getElementById('generated-preview');
            generatedPreview.src = result.generatedImageUrl;
            generatedPreview.parentElement.style.display = 'block';

            // Show comparison UI
            document.getElementById('comparison-container').style.display = 'flex';
            document.getElementById('comparison-text').innerHTML = `
                <strong>Original Upload:</strong> ${file.name}<br>
                <strong>AI Generated:</strong> ${result.objectName}<br>
                <strong>Detection:</strong> ${result.detection.detailedDescription}
            `;

            // Let user choose which to use
            document.getElementById('use-uploaded').onclick = () => {
                addToJello(uploadedPreview.src);
            };

            document.getElementById('use-generated').onclick = () => {
                addToJello(result.processedImage);
            };

        } catch (error) {
            console.error('Generation failed:', error);
        }
    });
}

// ============================================================================
// EXAMPLE 4: Multiple Services - Try All Three
// ============================================================================

async function multiServiceExample() {
    const services = ['replicate', 'openai', 'stability'];

    for (const service of services) {
        console.log(`\n🎨 Testing ${service}...`);

        const generator = new JelloImageGenerator({
            claudeKey: 'sk-ant-...',
            generationService: service,
            replicateToken: service === 'replicate' ? 'r8_...' : null,
            openaiKey: service === 'openai' ? 'sk-...' : null,
            stabilityKey: service === 'stability' ? 'sk-...' : null
        });

        try {
            const startTime = Date.now();
            const result = await generator.detectAndGenerate(testImage);
            const duration = Date.now() - startTime;

            console.log(`✅ ${service}: ${duration}ms`);
            console.log(`   Object: ${result.objectName}`);
            console.log(`   URL: ${result.generatedImageUrl.substring(0, 50)}...`);

            // Save result
            document.getElementById(`${service}-preview`).src = result.generatedImageUrl;
            document.getElementById(`${service}-time`).textContent = `${duration}ms`;

        } catch (error) {
            console.error(`❌ ${service} failed:`, error.message);
        }
    }
}

// ============================================================================
// EXAMPLE 5: Error Handling & Fallback
// ============================================================================

async function errorHandlingExample() {
    const generator = new JelloImageGenerator({
        claudeKey: 'sk-ant-...',
        generationService: 'replicate',
        replicateToken: 'r8_...',
        timeout: 30000 // 30 second timeout
    });

    document.getElementById('imageUpload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Attempt AI generation
            const result = await generator.detectAndGenerate(file);
            addToJello(result.processedImage);

        } catch (error) {
            console.error('Generation failed:', error);

            // Determine error type and show appropriate message
            if (error.message.includes('API key')) {
                alert('API key error. Please check your configuration.');
            } else if (error.message.includes('timeout')) {
                alert('Generation timed out. Try again or use a faster service.');

                // Fallback: use processed upload instead
                if (confirm('Use uploaded image instead?')) {
                    const processedUpload = await processUploadOnly(file);
                    addToJello(processedUpload);
                }
            } else if (error.message.includes('CORS')) {
                alert('Image loading error. Try a different service or use backend proxy.');
            } else {
                alert('Generation failed: ' + error.message);

                // Always offer fallback to upload
                if (confirm('Use uploaded image instead?')) {
                    const processedUpload = await processUploadOnly(file);
                    addToJello(processedUpload);
                }
            }
        }
    });
}

// Helper: Process upload without generation (fallback)
async function processUploadOnly(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Apply basic processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

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
        img.src = URL.createObjectURL(file);
    });
}

// ============================================================================
// EXAMPLE 6: Batch Processing - Multiple Uploads
// ============================================================================

async function batchExample() {
    const generator = new JelloImageGenerator({
        claudeKey: 'sk-ant-...',
        generationService: 'replicate',
        replicateToken: 'r8_...'
    });

    document.getElementById('imageUpload').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        console.log(`🔄 Processing ${files.length} images...`);

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                console.log(`Processing ${i + 1}/${files.length}: ${file.name}`);

                const result = await generator.detectAndGenerate(file);

                results.push({
                    success: true,
                    fileName: file.name,
                    objectName: result.objectName,
                    imageUrl: result.generatedImageUrl,
                    processedImage: result.processedImage
                });

                // Add to jello
                addToJello(result.processedImage);

                // Update UI
                addBatchResultToUI(file.name, result, true);

            } catch (error) {
                console.error(`Failed: ${file.name}`, error);
                results.push({
                    success: false,
                    fileName: file.name,
                    error: error.message
                });

                addBatchResultToUI(file.name, error.message, false);
            }

            // Wait between requests (rate limiting)
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`✅ Batch complete: ${results.filter(r => r.success).length}/${files.length} successful`);
    });
}

function addBatchResultToUI(fileName, result, success) {
    const container = document.getElementById('batch-results');
    const item = document.createElement('div');
    item.className = `batch-item ${success ? 'success' : 'error'}`;

    if (success) {
        item.innerHTML = `
            <strong>${fileName}</strong><br>
            Generated: ${result.objectName}<br>
            <img src="${result.generatedImageUrl}" style="max-width: 100px; margin-top: 10px;">
        `;
    } else {
        item.innerHTML = `
            <strong>${fileName}</strong><br>
            Error: ${result}
        `;
    }

    container.appendChild(item);
}

// ============================================================================
// EXAMPLE 7: Caching Results
// ============================================================================

class CachedGenerator {
    constructor(config) {
        this.generator = new JelloImageGenerator(config);
        this.cache = new Map();
    }

    async detectAndGenerate(file) {
        // Create cache key from file
        const cacheKey = await this.createCacheKey(file);

        // Check cache
        if (this.cache.has(cacheKey)) {
            console.log('✅ Cache hit!');
            return this.cache.get(cacheKey);
        }

        // Generate
        const result = await this.generator.detectAndGenerate(file);

        // Cache result
        this.cache.set(cacheKey, result);

        return result;
    }

    async createCacheKey(file) {
        // Simple hash from file data
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Usage
const cachedGenerator = new CachedGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'replicate',
    replicateToken: 'r8_...'
});

// ============================================================================
// EXAMPLE 8: Integration with Existing Jello Code
// ============================================================================

async function fullIntegrationExample() {
    // Your existing jello variables
    const scene = window.scene;
    const jelloMesh = window.jelloMesh;

    // Initialize generator
    const generator = new JelloImageGenerator({
        claudeKey: 'sk-ant-...',
        generationService: 'replicate',
        replicateToken: 'r8_...',

        onProgress: ({message, percent}) => {
            document.getElementById('upload-status').textContent = message;
        }
    });

    // Replace your existing upload handler
    document.getElementById('imageUpload').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = '<span class="loading-spin">⏳</span> Generating AI image...';

        try {
            // Remove old object (your existing cleanup code)
            if (window.jellyObject) {
                jelloMesh.remove(window.jellyObject);
                window.jellyObject.geometry.dispose();
                window.jellyObject.material.dispose();
                window.jellyObject = null;
            }

            // Generate NEW AI image
            const result = await generator.detectAndGenerate(file);

            // Use your existing texture loader
            const textureLoader = new THREE.TextureLoader();
            textureLoader.crossOrigin = 'anonymous';

            textureLoader.load(result.processedImage, function(texture) {
                // Your existing texture settings
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.generateMipmaps = false;

                // Your existing geometry creation
                const aspect = texture.image.width / texture.image.height;
                let width, height;
                const maxSize = 1.8;

                if (aspect > 1) {
                    width = maxSize;
                    height = maxSize / aspect;
                } else {
                    height = maxSize;
                    width = maxSize * aspect;
                }

                const geometry = new THREE.PlaneGeometry(width, height, 16, 16);

                // Your existing material
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.05,
                    roughness: 0.5,
                    metalness: 0.0,
                    emissive: new THREE.Color(0x110000),
                    emissiveIntensity: 0.1,
                    color: new THREE.Color(1.05, 0.98, 0.98),
                    depthWrite: true,
                    depthTest: true
                });

                // Your existing mesh creation
                window.jellyObject = new THREE.Mesh(geometry, material);
                window.jellyObject.position.set(
                    window.objectOriginalPos.x,
                    window.objectOriginalPos.y,
                    window.objectOriginalPos.z
                );

                // Add to jello
                jelloMesh.add(window.jellyObject);

                // Update status
                statusDiv.textContent = `✓ ${result.objectName} added to jello!`;
                statusDiv.style.color = '#00aa00';

                console.log('✅ Generated and added:', result.objectName);
            });

        } catch (error) {
            console.error('Generation failed:', error);
            statusDiv.textContent = '✗ Generation failed. Try again.';
            statusDiv.style.color = '#cc0000';
        }
    });
}

// ============================================================================
// EXAMPLE 9: Service Comparison
// ============================================================================

async function compareServicesExample(testFile) {
    const services = [
        {name: 'Replicate Schnell', service: 'replicate', token: 'r8_...'},
        {name: 'OpenAI DALL-E 3', service: 'openai', token: 'sk-...'},
        {name: 'Stability AI', service: 'stability', token: 'sk-...'}
    ];

    console.log('🔬 Comparing generation services...\n');

    for (const {name, service, token} of services) {
        const generator = new JelloImageGenerator({
            claudeKey: 'sk-ant-...',
            generationService: service,
            replicateToken: service === 'replicate' ? token : null,
            openaiKey: service === 'openai' ? token : null,
            stabilityKey: service === 'stability' ? token : null
        });

        const startTime = Date.now();

        try {
            const result = await generator.detectAndGenerate(testFile);
            const duration = Date.now() - startTime;

            console.log(`✅ ${name}`);
            console.log(`   Time: ${duration}ms`);
            console.log(`   Object: ${result.objectName}`);
            console.log(`   Confidence: ${(result.detection.confidence * 100).toFixed(0)}%`);
            console.log('');

        } catch (error) {
            console.error(`❌ ${name} failed:`, error.message);
            console.log('');
        }
    }
}

// ============================================================================
// Helper function referenced in examples
// ============================================================================

function addToJello(imageDataUrl) {
    // This is a placeholder for your existing jello-embedding code
    console.log('Adding to jello:', imageDataUrl.substring(0, 50) + '...');

    // Your actual implementation would load this into Three.js
    // See EXAMPLE 8 for complete integration
}

// ============================================================================
// Export for use in other files
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        basicExample,
        progressExample,
        comparisonExample,
        multiServiceExample,
        errorHandlingExample,
        batchExample,
        CachedGenerator,
        fullIntegrationExample,
        compareServicesExample
    };
}
