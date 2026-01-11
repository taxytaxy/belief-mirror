/**
 * ai.js - Claude AI Integration
 * 
 * Handles communication with the backend server for AI-powered insights.
 * No API key needed on frontend - backend handles authentication.
 */

// Backend API URL
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://belief-mirror-production.up.railway.app';

/**
 * Generate AI insights based on trading stats
 */
async function getAIInsights() {
    if (!appState.stats) {
        alert('Please analyze a wallet first');
        return;
    }
    
    // Show loading
    document.getElementById('ai-loading').classList.remove('hidden');
    document.getElementById('ai-insights-container').classList.add('hidden');
    document.getElementById('share-section').classList.add('hidden');
    document.getElementById('ai-insights-btn').disabled = true;
    
    try {
        const stats = appState.stats;
        
        // Call our backend server (not Anthropic directly)
        const response = await fetch(`${API_URL}/api/insights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stats })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Server error');
        }
        
        const data = await response.json();
        const insights = data.insights;
        
        // Display insights
        displayInsights(insights);
        
        // Show share section
        showShareSection();
        
    } catch (error) {
        console.error('AI Insights error:', error);
        displayError(error.message);
    } finally {
        document.getElementById('ai-loading').classList.add('hidden');
        document.getElementById('ai-insights-btn').disabled = false;
    }
}

/**
 * Display the AI insights
 */
function displayInsights(insights) {
    const container = document.getElementById('ai-insights-container');
    
    // Convert markdown-style formatting to HTML
    let formatted = insights
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n- /g, '</p><li>')
        .replace(/\n\d\. /g, '</p><li>');
    
    // Wrap in paragraphs
    formatted = '<p>' + formatted + '</p>';
    
    // Fix list formatting
    formatted = formatted.replace(/<\/p><li>/g, '<li>');
    formatted = formatted.replace(/<li>([^<]+)(?=<li>|<p>|$)/g, '<li>$1</li>');
    
    container.innerHTML = `
        <h3>🧠 Claude's Analysis</h3>
        <div class="ai-insight-content">
            ${formatted}
        </div>
    `;
    
    container.classList.remove('hidden');
}

/**
 * Display an error message
 */
function displayError(message) {
    const container = document.getElementById('ai-insights-container');
    
    let helpText = 'Please try again later.';
    if (message.includes('Too many requests')) {
        helpText = 'You\'ve reached the rate limit. Please wait about an hour before trying again.';
    }
    
    container.innerHTML = `
        <div class="ai-error">
            <strong>Error:</strong> ${message}
            <p style="margin-top: 10px; font-size: 0.9rem;">
                ${helpText}
            </p>
        </div>
    `;
    
    container.classList.remove('hidden');
}

