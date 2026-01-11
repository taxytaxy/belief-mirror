/**
 * share.js - Share Results
 * 
 * Allows users to share their analysis results on social media.
 */

/**
 * Generate shareable summary text
 */
function generateShareText() {
    if (!appState.stats) return '';

    const stats = appState.stats;
    
    let text = `🪞 My Polymarket Trading Analysis\n\n`;
    text += `📊 ${stats.totalTrades} trades across ${stats.uniqueMarkets} markets\n`;
    text += `💰 ${formatCurrency(stats.totalVolume)} total volume\n`;
    
    if (stats.totalResolved > 0) {
        text += `🎯 ${stats.winRate.toFixed(1)}% win rate (${stats.wins}W/${stats.losses}L)\n`;
        const pnlSign = stats.totalRealizedPnL >= 0 ? '+' : '';
        text += `💵 ${pnlSign}${formatCurrency(stats.totalRealizedPnL)} realized P&L\n`;
    }
    
    text += `\nAnalyze your own trading at belief-mirror.vercel.app`;
    
    return text;
}

/**
 * Share to Twitter/X
 */
function shareToTwitter() {
    const text = generateShareText();
    const encodedText = encodeURIComponent(text);
    const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(url, '_blank', 'width=550,height=420');
}

/**
 * Copy share text to clipboard
 */
async function copyShareText() {
    const text = generateShareText();
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Summary copied to clipboard!');
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Summary copied to clipboard!');
    }
}

/**
 * Show share section after AI insights are generated
 */
function showShareSection() {
    const shareSection = document.getElementById('share-section');
    if (shareSection) {
        shareSection.classList.remove('hidden');
    }
}
