# 🚀 Start Here - Fix CORS & Run AI Generation

## ✅ CORS Error Fixed!

I've added a **local proxy server** that solves the CORS blocking issue.

## Quick Start (Follow These Steps)

### 1️⃣ Install Dependencies (Already Done ✅)

```bash
npm install
```

### 2️⃣ Add Your API Keys (REQUIRED)

Open **`proxy-server.js`** in your editor and find line 15:

```javascript
// CHANGE THESE:
const CLAUDE_API_KEY = 'YOUR_CLAUDE_KEY_HERE';       // ← Add your key here
const REPLICATE_TOKEN = 'YOUR_REPLICATE_TOKEN_HERE';  // ← Add your key here
```

**Where to get API keys:**

#### Claude API (Required - $0.012 per image)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Click "API Keys" in the left sidebar
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Paste into `proxy-server.js`

#### Replicate Token (Required - $0.003 per image)
1. Go to https://replicate.com/
2. Sign up (free $5 credit!)
3. Go to Account → API Tokens
4. Create new token
5. Copy the token (starts with `r8_`)
6. Paste into `proxy-server.js`

### 3️⃣ Start the Server

```bash
npm start
```

You should see:
```
🎉 Will It Jello? Proxy Server Running!

📍 Server: http://localhost:3000

🔑 API Keys configured:
   Claude: ✅
   Replicate: ✅

🌐 Open http://localhost:3000 in your browser
```

### 4️⃣ Open in Browser

Go to: **http://localhost:3000**

### 5️⃣ Upload an Image

Click "Upload Object Photo" and watch:

```
🔍 Detecting object... 15%
🎨 Generating NEW AI image... 60%
✨ Processing for jello... 90%
✓ red toy car jellofied successfully!
```

## 🎯 What's Different Now?

**Before (CORS error):**
```
Browser → ❌ → Anthropic API (blocked)
```

**After (Works!):**
```
Browser → ✅ Proxy Server → ✅ Anthropic API
         → ✅ Proxy Server → ✅ Replicate API
```

## 💰 Costs

**Per image with Replicate (recommended):**
- Claude detection: $0.012
- Replicate generation: $0.003
- **Total: $0.015** (1.5 cents)

**Free credits:**
- Claude: Free tier available
- Replicate: $5 free credit

## 🔧 Troubleshooting

### "Claude: ❌ Missing"
You forgot to add your Claude API key to `proxy-server.js` line 15.

### "Cannot find module 'express'"
Run `npm install` first.

### "Port 3000 already in use"
Something else is using port 3000. Try:
```bash
PORT=3001 npm start
```

Then update `main.js` line 325 to use port 3001.

### "Failed to fetch"
The proxy server isn't running. Make sure you ran `npm start` first.

## 📝 Files You Need to Edit

Only **ONE** file needs your API keys:

```
proxy-server.js  ← Add your API keys here (line 15)
```

That's it! The browser code (`main.js`) doesn't need any API keys anymore.

## 🎓 How It Works

```
┌──────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                            │
│  - Uploads image                                     │
│  - Shows progress                                    │
│  - Displays result                                   │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  Proxy Server (Node.js)                              │
│  - Stores API keys safely                            │
│  - Calls Anthropic API                               │
│  - Calls Replicate API                               │
│  - Returns results                                   │
└────────────────┬─────────────────────────────────────┘
                 │
                 ├──────────────┐
                 ▼              ▼
         ┌───────────┐  ┌───────────┐
         │ Anthropic │  │ Replicate │
         │    API    │  │    API    │
         └───────────┘  └───────────┘
```

## 📚 More Info

- Full details: `PROXY_SETUP.md`
- Image generation guide: `IMAGE_GENERATION_SETUP.md`
- Original AI integration: `README-AI-INTEGRATION.md`

## ✅ Checklist

- [ ] Run `npm install`
- [ ] Get Claude API key from console.anthropic.com
- [ ] Get Replicate token from replicate.com
- [ ] Add both keys to `proxy-server.js` line 15
- [ ] Run `npm start`
- [ ] Open http://localhost:3000
- [ ] Upload an image
- [ ] 🎉 Watch it generate a NEW AI image!

Ready? Edit `proxy-server.js` and add your API keys, then run `npm start`!
