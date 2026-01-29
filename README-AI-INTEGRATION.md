# Jello Image AI Integration Guide

AI-powered image analysis for **Will It Jello?** using Claude Sonnet 4 vision API.

## Quick Start (3 Steps)

### 1. Get a Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or log in
3. Navigate to API Keys section
4. Create a new key and copy it

### 2. Add to Your HTML

```html
<script src="jello-image-ai.js"></script>
<script>
  const imageAI = new JelloImageAI({
    apiKey: 'sk-ant-...',  // Your Claude API key
    onProgress: (message, percent) => {
      console.log(`${percent}%: ${message}`);
    }
  });
</script>
```

### 3. Use It

```javascript
// In your existing upload handler
document.getElementById('imageUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];

  const result = await imageAI.analyzeAndGenerate(file);

  console.log('Detected:', result.objectName);
  console.log('Color:', result.color);
  console.log('Confidence:', result.confidence);

  // Use the processed image
  addToJello(result.processedImage);
});
```

That's it! 🎉

---

## API Documentation

### Constructor Options

```javascript
new JelloImageAI({
  apiKey: string,              // Required: Your Claude API key
  onProgress: function,        // Optional: Progress callback (message, percent)
  enableBackgroundRemoval: boolean,  // Optional: Remove background (default: true)
  enableJelloEffects: boolean, // Optional: Apply jello tinting (default: true)
  maxImageSize: number,        // Optional: Max dimension in px (default: 1024)
  timeout: number,             // Optional: API timeout in ms (default: 30000)
  enableCache: boolean,        // Optional: Cache results (default: true)
  maxRetries: number,          // Optional: Retry attempts (default: 3)
  onLog: function             // Optional: Custom logging function
})
```

### Main Method

#### `analyzeAndGenerate(file)`

Analyzes an image and prepares it for jello embedding.

**Parameters:**
- `file` (File|Blob): Image file to analyze

**Returns:** `Promise<AnalysisResult>`

```javascript
{
  objectName: "rubber duck",
  description: "Yellow plastic duck with orange beak, smooth surface",
  material: "plastic",
  color: "#FFD700",
  confidence: 0.95,
  size: "small",
  suggestions: "Would look adorable wobbling in red jello!",
  processedImage: "data:image/png;base64,...",  // Ready for canvas/Three.js
  generationPrompt: {...},  // For future AI image generation
  processingTime: 2341  // Milliseconds
}
```

### Batch Processing

#### `analyzeBatch(files)`

Process multiple images sequentially.

```javascript
const files = Array.from(document.querySelector('#upload').files);
const results = await imageAI.analyzeBatch(files);

results.forEach(result => {
  if (result.success) {
    console.log(result.result.objectName);
  } else {
    console.error(result.error);
  }
});
```

### Cache Management

```javascript
// Clear cache
imageAI.clearCache();

// Get cache stats
const stats = imageAI.getCacheStats();
console.log(`Cached: ${stats.size} images`);
```

---

## Common Use Cases

### Basic Usage with UI Feedback

```javascript
const imageAI = new JelloImageAI({
  apiKey: 'sk-ant-...',
  onProgress: (message, percent) => {
    updateProgressBar(percent);
    updateStatusText(message);
  }
});

async function handleUpload(file) {
  try {
    showLoader();
    const result = await imageAI.analyzeAndGenerate(file);

    // Update UI
    document.getElementById('objectName').textContent = result.objectName;
    document.getElementById('confidence').textContent =
      `${(result.confidence * 100).toFixed(0)}% confident`;

    // Add to jello
    loadTextureAndAddToJello(result.processedImage);

  } catch (error) {
    showError(error.message);
  } finally {
    hideLoader();
  }
}
```

### With Error Handling

```javascript
async function analyzeWithRetry(file, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await imageAI.analyzeAndGenerate(file);
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);

      if (i === maxAttempts - 1) {
        // Last attempt failed, show user-friendly error
        if (error.message.includes('API key')) {
          showError('API configuration error. Please check your API key.');
        } else if (error.message.includes('timeout')) {
          showError('Request timed out. Please try again.');
        } else {
          showError('Analysis failed. Please try a different image.');
        }
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
```

### Multiple Image Formats

```javascript
// Handle drag & drop
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter(f => f.type.startsWith('image/'));

  for (const file of imageFiles) {
    const result = await imageAI.analyzeAndGenerate(file);
    addToJello(result.processedImage);
  }
});

// Handle paste
document.addEventListener('paste', async (e) => {
  const items = e.clipboardData.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      const result = await imageAI.analyzeAndGenerate(file);
      addToJello(result.processedImage);
    }
  }
});
```

### Custom Logging

```javascript
const imageAI = new JelloImageAI({
  apiKey: 'sk-ant-...',
  onLog: (message, data) => {
    // Send to analytics
    analytics.track('jello_image_ai', { message, data });

    // Console with styling
    console.log(`%c${message}`, 'color: #dc1e32; font-weight: bold', data);
  }
});
```

---

## Adding AI Image Generation Later

The module is future-proof for AI image generation. Here's how to add it:

### 1. Update `jello-image-ai.js`

Add a new method after `analyzeAndGenerate`:

```javascript
async generateImage(prompt, options = {}) {
  // Choose your service
  const service = options.service || 'dalle'; // or 'midjourney', 'stable-diffusion'

  switch (service) {
    case 'dalle':
      return await this._generateWithDALLE(prompt, options);
    case 'midjourney':
      return await this._generateWithMidjourney(prompt, options);
    case 'stable-diffusion':
      return await this._generateWithStableDiffusion(prompt, options);
  }
}

async _generateWithDALLE(prompt, options) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.openaiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1024x1024',
      quality: 'hd',
      response_format: 'b64_json'
    })
  });

  const data = await response.json();
  return `data:image/png;base64,${data.data[0].b64_json}`;
}
```

### 2. Use the Generation Prompt

The analysis result includes a ready-to-use generation prompt:

```javascript
const result = await imageAI.analyzeAndGenerate(uploadedFile);

// Use the AI-generated prompt
console.log(result.generationPrompt);
/*
{
  service: 'placeholder',
  prompt: 'A clean, isolated rubber duck on a transparent background...',
  negativePrompt: 'background, shadow, text, watermark...',
  styleGuide: 'Material: plastic, Primary color: #FFD700, Size: small',
  metadata: {...}
}
*/

// Generate new image
const generatedImage = await imageAI.generateImage(
  result.generationPrompt.prompt,
  { service: 'dalle', openaiKey: 'sk-...' }
);
```

### 3. Complete Flow

```javascript
// Option A: Use uploaded image
const uploadResult = await imageAI.analyzeAndGenerate(file);
addToJello(uploadResult.processedImage);

// Option B: Generate AI image based on analysis
const uploadResult = await imageAI.analyzeAndGenerate(file);
const aiImage = await imageAI.generateImage(
  uploadResult.generationPrompt.prompt,
  { service: 'dalle', openaiKey: 'sk-...' }
);
addToJello(aiImage);
```

---

## Backend Proxy Setup (Production)

**⚠️ Important:** For production, use a backend proxy to protect your API keys.

### Why?

- API keys exposed in client-side code can be stolen
- Rate limiting is easier on backend
- Better error handling and monitoring
- Cost control

### Simple Node.js Proxy

```javascript
// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { image, mediaType } = req.body;

    // Rate limiting check
    // Authentication check
    // Usage quota check

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: req.body.prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Update Client Code

```javascript
// Modify _analyzeWithClaude method to use your proxy
async _analyzeWithClaude(base64DataUrl, mediaType) {
  const response = await fetch('/api/analyze-image', {  // Your backend
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: base64DataUrl.split(',')[1],
      mediaType,
      prompt: '...'
    })
  });

  return await response.json();
}
```

---

## Troubleshooting

### API Key Issues

**Error:** `Claude API key not provided`

**Solution:** Make sure you pass the API key in constructor:
```javascript
const imageAI = new JelloImageAI({ apiKey: 'sk-ant-...' });
```

### CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:** This happens when calling Anthropic API directly from browser. Use a backend proxy (see above).

### Timeout Errors

**Error:** `Request timed out`

**Solution:** Increase timeout or check internet connection:
```javascript
const imageAI = new JelloImageAI({
  apiKey: 'sk-ant-...',
  timeout: 60000  // 60 seconds
});
```

### Image Too Large

**Error:** `File too large: 12.5MB (max 10MB)`

**Solution:** Compress image before upload, or increase `maxImageSize`:
```javascript
const imageAI = new JelloImageAI({
  apiKey: 'sk-ant-...',
  maxImageSize: 512  // Smaller images = faster processing
});
```

### Rate Limiting

**Error:** `429 Too Many Requests`

**Solution:** The module has built-in rate limiting (1 request/second). For higher volumes, implement backend queuing.

### No Background Removal

**Problem:** Background not being removed

**Solution:** Disable it and use Remove.bg API instead:
```javascript
const imageAI = new JelloImageAI({
  apiKey: 'sk-ant-...',
  enableBackgroundRemoval: false
});

// Use Remove.bg API separately
const noBgImage = await removeBackgroundWithRemoveBg(file);
const result = await imageAI.analyzeAndGenerate(noBgImage);
```

### Cache Not Working

**Problem:** Same image analyzed multiple times

**Solution:** Cache is enabled by default. Check if you're modifying the image before analysis (creates different cache key).

---

## Cost Estimates

### Claude API (Sonnet 4)

- **Input:** ~$3 per million tokens (~7,500 images)
- **Output:** ~$15 per million tokens
- **Average cost per image:** ~$0.001 - $0.002

### DALL-E 3 (Future)

- **Standard quality:** $0.040 per image
- **HD quality:** $0.080 per image

### Total Estimate (with generation)

- **Analysis only:** $0.001 per image
- **Analysis + Generation:** $0.041 - $0.082 per image

### Optimization Tips

1. **Cache aggressively** - Same image = free
2. **Batch processing** - Reduce overhead
3. **Resize images** - Smaller = cheaper
4. **Backend proxy** - Control spending
5. **Usage quotas** - Set per-user limits

---

## Performance Tips

### 1. Preload Images

```javascript
// Preload common objects
const commonObjects = ['apple', 'ball', 'cube'];
for (const obj of commonObjects) {
  await imageAI.analyzeAndGenerate(await fetchImage(obj));
}
```

### 2. Progressive Loading

```javascript
// Show low-res immediately, analyze in background
showLowResPreview(file);

imageAI.analyzeAndGenerate(file).then(result => {
  replaceWithProcessedImage(result.processedImage);
});
```

### 3. Web Workers

```javascript
// Offload image processing to worker
const worker = new Worker('image-processor-worker.js');
worker.postMessage({ file, action: 'process' });
worker.onmessage = (e) => {
  const result = e.data;
  addToJello(result.processedImage);
};
```

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ IE 11 (not supported)

**Required APIs:**
- Fetch API
- Canvas API
- FileReader API
- Promises/Async-await

---

## License

MIT License - Feel free to use in your projects!

---

## Support

Questions? Issues? Check:

1. [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
2. [Will It Jello? GitHub](https://github.com/cynfria/will-it-jello)
3. Open an issue on GitHub

---

## Changelog

### v1.0.0 (2026-01-29)
- Initial release
- Claude Sonnet 4 vision integration
- Background removal
- Jello effects processing
- Caching and retry logic
- Batch processing support
- Future-proof for AI generation
