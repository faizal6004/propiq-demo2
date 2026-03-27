const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are PropIQ, a warm and professional AI real estate lead qualification assistant. Your job is to qualify property buyers through a natural conversation.

FLOW TO FOLLOW (ask ONE question at a time, in this order):
1. Greeting + ask: Are they looking to Buy, Invest, or Rent?
2. Budget range: Under 50L / 50L-1Cr / 1Cr+
3. Preferred location or area
4. Timeline: Immediately / 1-3 months / Just exploring
5. Ask for their name and phone number for agent follow-up

After collecting all info, provide a lead score in this EXACT format at the end of your message:
SCORE:{"tier":"HOT|WARM|COLD","score":85,"reason":"Brief reason","summary":"One line summary"}

SCORING RULES:
- HOT (75-100): Ready to buy immediately, budget 1Cr+, or 50L-1Cr with clear location
- WARM (40-74): 1-3 month timeline, or lower budget but serious intent
- COLD (0-39): Just exploring, no clear budget, or vague answers

STYLE:
- Warm, concise, professional
- Max 1 emoji per message
- Keep messages short (2-3 sentences)
- Always include SCORE JSON when you have budget and timeline info`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  try {
    // Convert messages to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, something went wrong.";
    res.json({ content: [{ text }] });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Failed to connect to AI service' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PropIQ running on port ${PORT}`));
