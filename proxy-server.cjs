// Simple proxy server for AI image generation
// This protects your API keys and avoids CORS issues

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config(); // Load .env file

const app = express();

// Enable CORS for localhost
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from current directory
app.use(express.static('.'));

// IMPORTANT: Add your API keys here (server-side, safe from client exposure)
// Best practice: Use environment variables (create .env file)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'YOUR_CLAUDE_KEY_HERE';
const REPLICATE_TOKEN = process.env.REPLICATE_TOKEN || 'YOUR_REPLICATE_TOKEN_HERE';
const OPENAI_KEY = process.env.OPENAI_KEY || '';
const STABILITY_KEY = process.env.STABILITY_KEY || '';

// Proxy endpoint for Claude detection
app.post('/api/detect', async (req, res) => {
    try {
        console.log('🔍 Detection request received');

        const { image, mediaType } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
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
                                data: image
                            }
                        },
                        {
                            type: 'text',
                            text: `Analyze this image and identify the main object. Provide a detailed response in JSON format:

{
  "objectName": "simple object name (e.g., 'red toy car')",
  "detailedDescription": "detailed visual description for image generation",
  "material": "primary material (e.g., 'plastic', 'metal', 'fabric')",
  "color": "primary color as hex code (e.g., '#FF0000')",
  "size": "approximate size (e.g., 'small', 'medium', 'large')",
  "style": "style characteristics (e.g., 'modern', 'vintage', 'minimalist')",
  "viewAngle": "optimal view angle for product photo (e.g., '3/4 angle', 'front view')",
  "lighting": "recommended lighting (e.g., 'studio', 'natural', 'dramatic')",
  "confidence": 0.95
}

Only respond with valid JSON, no other text.`
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', response.status, errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        console.log('✅ Detection successful');

        res.json(data);

    } catch (error) {
        console.error('Detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for Replicate generation
app.post('/api/generate/replicate', async (req, res) => {
    try {
        console.log('🎨 Replicate generation request');

        const { prompt } = req.body;

        console.log('📝 Prompt (first 200 chars):', prompt.positive.substring(0, 200) + '...');
        if (prompt.negative) {
            console.log('🚫 Negative prompt included:', prompt.negative.substring(0, 100) + '...');
        }

        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REPLICATE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: 'black-forest-labs/flux-schnell',
                input: {
                    prompt: prompt.positive,
                    num_outputs: 1,
                    aspect_ratio: '1:1',
                    output_format: 'png',
                    output_quality: 90,
                    // Note: Flux Schnell doesn't support negative_prompt
                    // But we've embedded the negatives in the positive prompt itself
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Replicate API error:', response.status, errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Replicate generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for Replicate polling
app.get('/api/generate/replicate/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
            headers: {
                'Authorization': `Bearer ${REPLICATE_TOKEN}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Replicate polling error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for OpenAI generation
app.post('/api/generate/openai', async (req, res) => {
    try {
        console.log('🎨 OpenAI generation request');

        const { prompt } = req.body;

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt.positive,
                size: '1024x1024',
                quality: 'hd',
                style: 'natural',
                response_format: 'url'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('OpenAI generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        services: {
            claude: CLAUDE_API_KEY !== 'YOUR_CLAUDE_KEY_HERE',
            replicate: REPLICATE_TOKEN !== 'YOUR_REPLICATE_TOKEN_HERE',
            openai: OPENAI_KEY.length > 0,
            stability: STABILITY_KEY.length > 0
        }
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n🎉 Will It Jello? Proxy Server Running!`);
    console.log(`\n📍 Server: http://localhost:${PORT}`);
    console.log(`\n🔑 API Keys configured:`);
    console.log(`   Claude: ${CLAUDE_API_KEY !== 'YOUR_CLAUDE_KEY_HERE' ? '✅' : '❌ Missing'}`);
    console.log(`   Replicate: ${REPLICATE_TOKEN !== 'YOUR_REPLICATE_TOKEN_HERE' ? '✅' : '❌ Missing'}`);
    console.log(`   OpenAI: ${OPENAI_KEY ? '✅' : '⚠️  Optional'}`);
    console.log(`   Stability: ${STABILITY_KEY ? '✅' : '⚠️  Optional'}`);
    console.log(`\n🌐 Open http://localhost:${PORT} in your browser`);
    console.log(`\n💡 Press Ctrl+C to stop\n`);
});
