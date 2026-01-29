# AI Image Generation Setup Guide

Transform your "Will It Jello?" project to **generate NEW AI images** instead of just processing uploads.

## 🎯 What This Does

**Before:** Upload photo → Process → Embed in jello
**After:** Upload photo → Detect object → **Generate NEW clean image** → Embed in jello

Users upload messy photos, you get perfect isolated product shots!

---

## 🚀 Quick Start

### 1. Get API Keys

You need two keys:
1. **Claude API** (detection) - Required
2. **Generation Service** (choose one):
   - Replicate (recommended)
   - OpenAI DALL-E 3
   - Stability AI

### 2. Add to Your Project

```html
<script src="jello-image-generator.js"></script>
```

### 3. Use It

```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',           // For detection
    generationService: 'replicate',     // Or 'openai' or 'stability'
    replicateToken: 'r8_...',          // Your chosen service
    onProgress: ({message, percent, stage}) => {
        console.log(`${percent}%: ${message}`);
    }
});

// Upload → Detect → Generate → Ready!
const result = await generator.detectAndGenerate(uploadedFile);

console.log('Generated:', result.objectName);
console.log('NEW Image:', result.generatedImageUrl);
console.log('Ready for jello:', result.processedImage); // Use this!
```

---

## 🔑 Getting API Keys

### Claude API (Required for Detection)

**Cost:** ~$0.012 per image

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Create new key starting with `sk-ant-`
5. Copy and save it

**Usage in code:**
```javascript
claudeKey: 'sk-ant-api03-...'
```

---

### Replicate (Recommended for Generation)

**Cost:** $0.003 per image (Flux Schnell) or $0.05 (Flux Pro)
**Speed:** 2-5 seconds
**Quality:** Excellent

**Why Replicate?**
- Cheapest option ($0.003 vs $0.04 for DALL-E)
- Fast (Flux Schnell model)
- Great quality
- Best for product photography

**Setup:**

1. Go to [replicate.com](https://replicate.com/)
2. Sign up (free tier: $5 credit)
3. Go to Account → API Tokens
4. Create token starting with `r8_`
5. Copy token

**Usage:**
```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'replicate',
    replicateToken: 'r8_...'
});
```

**Model Options:**
- `flux-schnell` - Fast, cheap ($0.003), good quality ✅ Default
- `flux-1.1-pro` - Slow, expensive ($0.05), best quality

---

### OpenAI DALL-E 3 (Alternative)

**Cost:** $0.04 per image
**Speed:** 10-20 seconds
**Quality:** Very good

**Setup:**

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up (requires payment method)
3. API Keys → Create new key
4. Copy key starting with `sk-`

**Usage:**
```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'openai',
    openaiKey: 'sk-...'
});
```

---

### Stability AI (Alternative)

**Cost:** ~$0.01 per image
**Speed:** 3-8 seconds
**Quality:** Good

**Setup:**

1. Go to [stability.ai](https://platform.stability.ai/)
2. Sign up (free credits available)
3. Account → API Keys
4. Create key starting with `sk-`

**Usage:**
```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'stability',
    stabilityKey: 'sk-...'
});
```

---

## 💰 Cost Comparison

| Service | Detection | Generation | Total | Speed | Quality |
|---------|-----------|------------|-------|-------|---------|
| **Replicate (Schnell)** | $0.012 | $0.003 | **$0.015** | ⚡ Fast | ⭐⭐⭐⭐ |
| Replicate (Pro) | $0.012 | $0.050 | $0.062 | 🐌 Slow | ⭐⭐⭐⭐⭐ |
| **OpenAI DALL-E** | $0.012 | $0.040 | **$0.052** | ⚡ Fast | ⭐⭐⭐⭐⭐ |
| **Stability AI** | $0.012 | $0.010 | **$0.022** | ⚡ Fast | ⭐⭐⭐⭐ |

**Recommendation:** Start with **Replicate (Flux Schnell)** - it's the cheapest and fastest.

---

## 📖 Complete Integration Example

```javascript
// Initialize generator
const generator = new JelloImageGenerator({
    // Required
    claudeKey: 'sk-ant-...',

    // Choose service
    generationService: 'replicate', // or 'openai' or 'stability'
    replicateToken: 'r8_...',

    // Optional settings
    timeout: 60000, // 60 seconds
    enableJelloEffects: true, // Apply red tint

    // Progress callback
    onProgress: ({message, percent, stage}) => {
        updateProgressBar(percent);
        updateStatusText(message);

        if (stage === 'detect') {
            console.log('🔍 Detecting...');
        } else if (stage === 'generate') {
            console.log('🎨 Generating NEW image...');
        } else if (stage === 'process') {
            console.log('✨ Processing for jello...');
        }
    }
});

// Handle upload
document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        showLoader();

        // This is where the magic happens!
        const result = await generator.detectAndGenerate(file);

        // Show results
        console.log('Detected:', result.objectName);
        console.log('Detection data:', result.detection);
        console.log('Generated image URL:', result.generatedImageUrl);
        console.log('Processing time:', result.totalTime + 'ms');

        // Use the generated image in your jello!
        loadTextureAndAddToJello(result.processedImage);

        // Optional: Show before/after
        showComparison(file, result.generatedImageUrl);

    } catch (error) {
        console.error('Generation failed:', error);
        showError(error.message);
    } finally {
        hideLoader();
    }
});
```

---

## 🎨 Understanding the Pipeline

### Stage 1: Detection (Claude Vision)
- Analyzes uploaded photo
- Extracts: object name, detailed description, colors, materials
- Takes ~1-2 seconds

### Stage 2: Prompt Creation
- Converts detection into detailed generation prompt
- Adds: "isolated on white background", "professional photography"
- Instant

### Stage 3: Image Generation
- Calls chosen AI service (Replicate/OpenAI/Stability)
- Generates brand NEW image of the detected object
- Takes 2-20 seconds (depends on service)

### Stage 4: Jello Processing
- Applies subtle effects: red tint, contrast reduction, blur
- Returns data URL ready for Three.js
- Takes <1 second

**Total time:** 5-25 seconds depending on service

---

## 🎯 Prompt Engineering

The module automatically creates great prompts like:

```
Professional product photography of red toy car.
Detailed vintage-style toy race car with smooth red plastic body,
chrome details, black rubber tires, and racing number 7 decal.
Small scale model with glossy finish.
Isolated on pure white background (#FFFFFF).
Clean studio lighting with soft shadows.
Centered composition. High detail, sharp focus, photorealistic.
Shot from slightly above at 3/4 angle.
Studio lighting. 8k resolution, professional photography.
```

**Negative prompt automatically added:**
```
blurry, low quality, multiple objects, cluttered background,
text, watermark, logo, busy background, distorted, deformed
```

---

## ⚙️ Advanced Configuration

### Custom Timeout

```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'replicate',
    replicateToken: 'r8_...',
    timeout: 120000 // 2 minutes for complex generations
});
```

### Disable Jello Effects

```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'replicate',
    replicateToken: 'r8_...',
    enableJelloEffects: false // Pure generated image
});
```

### Progress Tracking

```javascript
onProgress: ({message, percent, stage}) => {
    // Update UI
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('status').textContent = message;

    // Track in analytics
    if (stage === 'generate') {
        analytics.track('image_generation_started');
    }

    // Log to console
    console.log(`[${stage}] ${percent}%: ${message}`);
}
```

---

## 🛠️ Troubleshooting

### "Claude API key required"

**Problem:** No Claude key provided
**Solution:** Add `claudeKey: 'sk-ant-...'` to constructor

### "Replicate token required"

**Problem:** Using Replicate but no token
**Solution:** Add `replicateToken: 'r8_...'` to constructor

### "CORS error loading image"

**Problem:** Generated image can't be loaded
**Solution:** Module handles this automatically with `crossOrigin: 'anonymous'`

### "Generation timeout"

**Problem:** Generation took too long
**Solution:**
```javascript
timeout: 120000 // Increase to 2 minutes
```

### "Failed to load generated image"

**Problem:** External URL blocked
**Solution:** Use backend proxy (see Production Setup below)

### Poor generation quality

**Problem:** Generated images don't match uploads
**Solution:** Try different service:
```javascript
generationService: 'openai' // DALL-E often better for complex objects
```

---

## 🏭 Production Setup (Backend Proxy)

**⚠️ Important:** For production, use a backend to protect API keys.

### Why?

- API keys exposed in client = security risk
- Rate limiting easier on backend
- Cost control
- Better error handling

### Node.js Proxy Example

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json({limit: '10mb'}));

app.post('/api/generate-image', async (req, res) => {
    try {
        const {imageData, mimeType} = req.body;

        // Rate limiting
        // User authentication
        // Usage quotas

        // 1. Detect with Claude
        const detection = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.CLAUDE_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({...})
        });

        // 2. Generate with Replicate
        const generation = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.REPLICATE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({...})
        });

        res.json({success: true, imageUrl: ...});

    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.listen(3000);
```

### Client Code (Using Proxy)

```javascript
// Modify the module to use your backend
class JelloImageGenerator {
    async detectAndGenerate(imageFile) {
        const base64 = await this._fileToBase64(imageFile);

        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                imageData: base64.split(',')[1],
                mimeType: imageFile.type
            })
        });

        const result = await response.json();
        return result;
    }
}
```

---

## 📊 Monitoring & Analytics

Track generation performance:

```javascript
const generator = new JelloImageGenerator({
    claudeKey: 'sk-ant-...',
    generationService: 'replicate',
    replicateToken: 'r8_...',
    onProgress: ({message, percent, stage}) => {
        // Log to analytics
        analytics.track('image_generation_progress', {
            stage,
            percent,
            message,
            timestamp: Date.now()
        });
    }
});

// Track complete generation
const result = await generator.detectAndGenerate(file);

analytics.track('image_generation_complete', {
    objectName: result.objectName,
    service: result.generationMetadata.service,
    totalTime: result.totalTime,
    success: true
});
```

---

## 🎓 Best Practices

### 1. Start with Replicate Schnell
Cheapest and fastest. Upgrade to Pro or DALL-E if quality isn't good enough.

### 2. Cache Results
Same object = don't regenerate:
```javascript
const cache = new Map();
const cacheKey = `${detection.objectName}_${detection.color}`;

if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
}
```

### 3. Show Preview
Show user the detection before generating:
```javascript
const detection = await generator.detectObject(base64, mimeType);
if (confirm(`Generate new image of "${detection.objectName}"?`)) {
    const result = await generator._generateImage(...);
}
```

### 4. Fallback to Upload
If generation fails, use processed upload:
```javascript
try {
    const result = await generator.detectAndGenerate(file);
    useGeneratedImage(result.processedImage);
} catch (error) {
    console.warn('Generation failed, using upload:', error);
    const processed = await processUploadedImage(file);
    useGeneratedImage(processed);
}
```

### 5. Batch Processing
Generate multiple at once:
```javascript
const files = Array.from(uploadInput.files);
const results = await Promise.all(
    files.map(file => generator.detectAndGenerate(file))
);
```

---

## 🧪 Testing Your Setup

### Test Detection Only

```javascript
const base64 = await generator._fileToBase64(testImage);
const detection = await generator.detectObject(
    base64.split(',')[1],
    testImage.type
);
console.log('Detection:', detection);
```

### Test Generation Only

```javascript
const testPrompt = {
    positive: 'Professional product photography of red toy car. Isolated on white background.',
    negative: 'blurry, low quality'
};

const imageUrl = await generator.generateWithReplicate(testPrompt);
console.log('Generated:', imageUrl);
```

### Test Full Pipeline

```javascript
const result = await generator.detectAndGenerate(testImage);
console.assert(result.generatedImageUrl, 'Should have generated URL');
console.assert(result.processedImage.startsWith('data:image'), 'Should have data URL');
console.assert(result.objectName, 'Should have object name');
```

---

## 📚 Additional Resources

- [Replicate Docs](https://replicate.com/docs)
- [OpenAI DALL-E Docs](https://platform.openai.com/docs/guides/images)
- [Stability AI Docs](https://platform.stability.ai/docs)
- [Claude API Docs](https://docs.anthropic.com/claude/reference)

---

## 🆘 Support

Issues? Questions?

1. Check troubleshooting section above
2. Review example-usage.js
3. Open issue on [GitHub](https://github.com/cynfria/will-it-jello)

---

## 📝 License

MIT License - Use freely in your projects!
