// /.netlify/functions/analyze-news.js
const fetch = require('node-fetch'); // For making HTTP requests in Node.js

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: 'Invalid JSON payload' };
    }

    const { news, apiType } = requestBody;

    if (!news) {
        return { statusCode: 400, body: JSON.stringify({ error: 'News text is required.' }) };
    }

    let analysisResult = "Could not get analysis from AI.";
    let statusCode = 200;

    try {
        if (apiType === 'gemini') {
            const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Get API key from Netlify Environment Variables
            if (!GEMINI_API_KEY) {
                throw new Error('Gemini API Key not configured.');
            }

            const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            const geminiPayload = {
                contents: [{
                    role: "user",
                    parts: [{ text: `Analyze the following news text for authenticity, bias, and factual accuracy. Provide a concise summary and clearly state if it's "likely real," "likely fake," or "uncertain." Also mention the basis of your conclusion in a simple, direct manner. Keep the response to max 200 words.:\n\n"${news}"` }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 200
                }
            };

            const geminiResponse = await fetch(geminiApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(geminiPayload)
            });

            if (!geminiResponse.ok) {
                const errorData = await geminiResponse.json();
                console.error('Gemini API Error:', errorData);
                throw new Error(`Gemini API responded with status ${geminiResponse.status}: ${errorData.error ? errorData.error.message : JSON.stringify(errorData)}`);
            }

            const geminiResult = await geminiResponse.json();
            analysisResult = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis from Gemini.';

        } else if (apiType === 'perplexity') {
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY; // Get API key from Netlify Environment Variables
            if (!PERPLEXITY_API_KEY) {
                throw new Error('Perplexity API Key not configured.');
            }

            const perplexityApiUrl = 'https://api.perplexity.ai/chat/completions';
            const perplexityPayload = {
                model: "sonar-small-chat", // Using a smaller model for quicker response and general use
                messages: [
                    { "role": "system", "content": "You are a helpful AI assistant specialized in news analysis. Analyze the provided text for authenticity, bias, and factual accuracy. Provide a concise summary and clearly state if it's 'likely real,' 'likely fake,' or 'uncertain.' Briefly explain your reasoning. Keep the response to max 200 words." },
                    { "role": "user", "content": news }
                ],
                temperature: 0.7,
                max_tokens: 200
            };

            const perplexityResponse = await fetch(perplexityApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
                },
                body: JSON.stringify(perplexityPayload)
            });

            if (!perplexityResponse.ok) {
                const errorData = await perplexityResponse.json();
                console.error('Perplexity API Error:', errorData);
                throw new Error(`Perplexity API responded with status ${perplexityResponse.status}: ${errorData.error ? errorData.error.message : JSON.stringify(errorData)}`);
            }

            const perplexityResult = await perplexityResponse.json();
            analysisResult = perplexityResult.choices?.[0]?.message?.content || 'No analysis from Perplexity.';

        } else {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid API type specified.' }) };
        }

    } catch (error) {
        console.error('API call error:', error);
        statusCode = 500;
        analysisResult = `Internal server error: ${error.message}`;
    }

    return {
        statusCode: statusCode,
        body: JSON.stringify({ analysis: analysisResult }),
    };
};
