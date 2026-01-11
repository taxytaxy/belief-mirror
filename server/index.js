require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(cors());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', keyLoaded: !!process.env.ANTHROPIC_API_KEY });
});

app.post('/api/insights', async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const { stats } = req.body;
    if (!stats) {
        return res.status(400).json({ error: 'Missing stats data' });
    }

    const prompt = buildInsightsPrompt(stats);

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Anthropic error:', data);
            return res.status(500).json({ error: 'AI service error', details: data.error?.message });
        }

        res.json({ insights: data.content[0].text });
    } catch (err) {
        console.error('Fetch error:', err);
        res.status(500).json({ error: 'Failed to contact AI service' });
    }
});

// Chat endpoint for follow-up questions
app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const { message, stats, history } = req.body;
    if (!message || !stats) {
        return res.status(400).json({ error: 'Missing message or stats' });
    }

    // Build system context with user's stats
    const systemPrompt = buildChatSystemPrompt(stats);
    
    // Build messages array
    const messages = [];
    
    // Add history if exists
    if (history && history.length > 0) {
        history.forEach(h => {
            messages.push({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.content
            });
        });
    }
    
    // Add current message if not already in history
    if (!history || history.length === 0 || history[history.length - 1].content !== message) {
        messages.push({ role: 'user', content: message });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 800,
                system: systemPrompt,
                messages: messages
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Anthropic error:', data);
            return res.status(500).json({ error: 'AI service error', details: data.error?.message });
        }

        res.json({ response: data.content[0].text });
    } catch (err) {
        console.error('Fetch error:', err);
        res.status(500).json({ error: 'Failed to contact AI service' });
    }
});

function buildInsightsPrompt(stats) {
    let categoryPerf = '';
    if (stats.winLossByCategory) {
        categoryPerf = Object.entries(stats.winLossByCategory)
            .filter(([_, d]) => d.count > 0)
            .map(([cat, d]) => `  - ${cat}: ${d.count} markets, ${d.winRate.toFixed(1)}% win rate, $${d.totalPnl.toFixed(2)} P&L`)
            .join('\n');
    }

    let pricePerf = '';
    if (stats.winLossByPriceRange) {
        pricePerf = Object.entries(stats.winLossByPriceRange)
            .filter(([_, d]) => d.count > 0)
            .map(([range, d]) => `  - ${range}: ${d.count} markets, ${d.winRate.toFixed(1)}% win rate, $${d.totalPnl.toFixed(2)} P&L`)
            .join('\n');
    }

    return `You are an expert trading coach analyzing a Polymarket trader. Provide personalized insights.

TRADER DATA:
- Total trades: ${stats.totalTrades || 0}
- Volume: $${(stats.totalVolume || 0).toFixed(2)}
- Win rate: ${(stats.winRate || 0).toFixed(1)}%
- Resolved markets: ${stats.totalResolved || 0}
- Wins/Losses: ${stats.wins || 0}/${stats.losses || 0}
- Realized P&L: $${(stats.totalRealizedPnL || 0).toFixed(2)}
- Avg win: $${(stats.avgWinAmount || 0).toFixed(2)}
- Avg loss: $${(stats.avgLossAmount || 0).toFixed(2)}
- Profit factor: ${stats.profitFactor === Infinity ? 'Infinite' : (stats.profitFactor || 0).toFixed(2)}

Performance by Category:
${categoryPerf || 'No category data'}

Performance by Price Range:
${pricePerf || 'No price range data'}

Give insights in 4 sections:
1. **Strengths** - What they do well
2. **Weaknesses** - Problem patterns  
3. **Biases Detected** - Cognitive biases affecting decisions
4. **Recommendations** - 3-5 specific actions

Be data-driven, constructive, specific, concise. This is for education, not financial advice.`;
}

function buildChatSystemPrompt(stats) {
    let categoryPerf = '';
    if (stats.winLossByCategory) {
        categoryPerf = Object.entries(stats.winLossByCategory)
            .filter(([_, d]) => d.count > 0)
            .map(([cat, d]) => `${cat}: ${d.winRate.toFixed(1)}% win rate, $${d.totalPnl.toFixed(2)} P&L`)
            .join(', ');
    }

    return `You are an expert trading coach helping a Polymarket trader improve. You have access to their trading data:

TRADER STATS:
- Total trades: ${stats.totalTrades || 0}
- Volume: $${(stats.totalVolume || 0).toFixed(2)}
- Win rate: ${(stats.winRate || 0).toFixed(1)}%
- Resolved markets: ${stats.totalResolved || 0}
- Wins: ${stats.wins || 0}, Losses: ${stats.losses || 0}
- Realized P&L: $${(stats.totalRealizedPnL || 0).toFixed(2)}
- Avg win: $${(stats.avgWinAmount || 0).toFixed(2)}, Avg loss: $${(stats.avgLossAmount || 0).toFixed(2)}
- Profit factor: ${stats.profitFactor === Infinity ? 'Infinite' : (stats.profitFactor || 0).toFixed(2)}
- Category performance: ${categoryPerf || 'No data'}

Guidelines:
- Be helpful, specific, and data-driven
- Reference their actual numbers when relevant
- Keep responses concise (2-4 sentences usually)
- This is for education, not financial advice
- Be encouraging but honest about weaknesses`;
}

app.listen(PORT, () => {
    console.log('Server running on port', PORT);
    console.log('API Key:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');
});
