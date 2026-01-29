# Quick Setup with Proxy Server

This solves the CORS error you were seeing!

## What Changed?

**Before:** Browser → Anthropic API ❌ (CORS blocked)
**Now:** Browser → Local Proxy → Anthropic API ✅ (Works!)

## Setup (3 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- express (web server)
- cors (CORS handling)
- node-fetch (API calls)

### Step 2: Add Your API Keys

Open `proxy-server.js` and add your keys around line 15:

```javascript
const CLAUDE_API_KEY = 'sk-ant-YOUR_KEY_HERE';       // Required
const REPLICATE_TOKEN = 'r8_YOUR_TOKEN_HERE';        // Required
const OPENAI_KEY = '';                                // Optional
const STABILITY_KEY = '';                             // Optional
```

**Where to get keys:**
- **Claude**: https://console.anthropic.com/ → API Keys
- **Replicate**: https://replicate.com/ → Account → API Tokens

### Step 3: Start the Server

```bash
npm start
```

You'll see:
```
🎉 Will It Jello? Proxy Server Running!

📍 Server: http://localhost:3000

🔑 API Keys configured:
   Claude: ✅
   Replicate: ✅
   OpenAI: ⚠️  Optional
   Stability: ⚠️  Optional

🌐 Open http://localhost:3000 in your browser

💡 Press Ctrl+C to stop
```

### Step 4: Open in Browser

Go to: **http://localhost:3000**

Upload an image and watch:
```
🔍 Detecting object... 15%
🎨 Generating NEW AI image... 60%
✨ Processing for jello... 90%
✓ red toy car jellofied successfully!
```

## How It Works

```
┌─────────┐       ┌──────────┐       ┌──────────────┐
│ Browser │  -->  │  Proxy   │  -->  │ Anthropic    │
│         │       │ (Node.js)│       │ API          │
└─────────┘  <--  └──────────┘  <--  └──────────────┘

                  ┌──────────┐       ┌──────────────┐
                  │  Proxy   │  -->  │ Replicate    │
                  │          │       │ API          │
                  └──────────┘  <--  └──────────────┘
```

**Benefits:**
- ✅ No CORS errors
- ✅ API keys hidden from browser
- ✅ Rate limiting easy to add
- ✅ Serves your static files too

## Alternative: Using Environment Variables

Create a `.env` file:

```bash
CLAUDE_API_KEY=sk-ant-...
REPLICATE_TOKEN=r8_...
OPENAI_KEY=sk-...
STABILITY_KEY=sk-...
```

Then run:
```bash
npm start
```

The proxy server will automatically use these keys.

## Troubleshooting

### "Cannot find module 'express'"
**Solution:** Run `npm install`

### "Claude: ❌ Missing"
**Solution:** Add your Claude API key to `proxy-server.js`

### "EADDRINUSE: address already in use"
**Solution:** Port 3000 is busy. Change PORT in proxy-server.js or:
```bash
PORT=3001 npm start
```

Then update `main.js` line 325:
```javascript
proxyUrl: 'http://localhost:3001/api'
```

### "Failed to fetch"
**Solution:** Make sure the proxy server is running first!

## Costs

With Replicate (recommended):
- Detection: $0.012 per image (Claude)
- Generation: $0.003 per image (Flux Schnell)
- **Total: $0.015 per image**

With OpenAI:
- Detection: $0.012 per image (Claude)
- Generation: $0.040 per image (DALL-E 3)
- **Total: $0.052 per image**

## Next Steps

1. ✅ Install dependencies
2. ✅ Add API keys to proxy-server.js
3. ✅ Run `npm start`
4. ✅ Open http://localhost:3000
5. ✅ Upload an image
6. 🎉 Watch AI generate a new image!

## Production Deployment

For production, deploy the proxy server to:
- **Heroku** (easiest)
- **Vercel** (serverless)
- **Railway** (simple)
- **AWS Lambda** (scalable)

Then update `proxyUrl` in main.js to your deployed URL.
