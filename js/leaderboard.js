/**
 * leaderboard.js - Anonymous Leaderboard
 * 
 * Allows users to compare their stats with others anonymously.
 * Data stored in localStorage and shared via backend.
 */

const LEADERBOARD_STORAGE_KEY = 'belief_mirror_leaderboard_optin';
const LEADERBOARD_ID_KEY = 'belief_mirror_leaderboard_id';

// Simulated leaderboard data (in production, this would come from a database)
let leaderboardData = [
    { id: 1, winRate: 68.5, volume: 125000, profitFactor: 2.4, markets: 89 },
    { id: 2, winRate: 62.3, volume: 89000, profitFactor: 1.9, markets: 156 },
    { id: 3, winRate: 58.9, volume: 245000, profitFactor: 1.7, markets: 234 },
    { id: 4, winRate: 55.2, volume: 56000, profitFactor: 1.5, markets: 67 },
    { id: 5, winRate: 52.1, volume: 178000, profitFactor: 1.3, markets: 198 },
    { id: 6, winRate: 49.8, volume: 34000, profitFactor: 1.1, markets: 45 },
    { id: 7, winRate: 47.5, volume: 420000, profitFactor: 0.95, markets: 312 },
    { id: 8, winRate: 45.0, volume: 67000, profitFactor: 0.85, markets: 78 },
    { id: 9, winRate: 42.3, volume: 23000, profitFactor: 0.75, markets: 34 },
    { id: 10, winRate: 38.9, volume: 12000, profitFactor: 0.6, markets: 23 },
];

/**
 * Initialize leaderboard with user's stats
 */
function initializeLeaderboard(stats) {
    updateLeaderboardStats(stats);
    renderLeaderboardTable(stats);
    loadOptInStatus();
}

/**
 * Update the user's leaderboard stats display
 */
function updateLeaderboardStats(stats) {
    // Win Rate
    const winRateEl = document.getElementById('lb-winrate');
    const winRateRankEl = document.getElementById('lb-winrate-rank');
    if (winRateEl && stats.winRate !== undefined) {
        winRateEl.textContent = stats.winRate.toFixed(1) + '%';
        const winRateRank = calculateRank(stats.winRate, leaderboardData.map(d => d.winRate));
        winRateRankEl.textContent = getRankText(winRateRank);
        winRateRankEl.className = 'leaderboard-rank ' + getRankClass(winRateRank);
    }
    
    // Volume
    const volumeEl = document.getElementById('lb-volume');
    const volumeRankEl = document.getElementById('lb-volume-rank');
    if (volumeEl && stats.totalVolume !== undefined) {
        volumeEl.textContent = formatCurrency(stats.totalVolume);
        const volumeRank = calculateRank(stats.totalVolume, leaderboardData.map(d => d.volume));
        volumeRankEl.textContent = getRankText(volumeRank);
        volumeRankEl.className = 'leaderboard-rank ' + getRankClass(volumeRank);
    }
    
    // Profit Factor
    const profitEl = document.getElementById('lb-profit');
    const profitRankEl = document.getElementById('lb-profit-rank');
    if (profitEl && stats.profitFactor !== undefined) {
        const pf = stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2);
        profitEl.textContent = pf;
        const profitRank = calculateRank(
            stats.profitFactor === Infinity ? 999 : stats.profitFactor, 
            leaderboardData.map(d => d.profitFactor)
        );
        profitRankEl.textContent = getRankText(profitRank);
        profitRankEl.className = 'leaderboard-rank ' + getRankClass(profitRank);
    }
}

/**
 * Calculate percentile rank
 */
function calculateRank(value, allValues) {
    const sorted = [...allValues].sort((a, b) => b - a);
    let rank = 0;
    for (let i = 0; i < sorted.length; i++) {
        if (value >= sorted[i]) {
            rank = ((sorted.length - i) / sorted.length) * 100;
            break;
        }
    }
    if (rank === 0) rank = 5; // Bottom 5%
    return Math.round(rank);
}

/**
 * Get rank text
 */
function getRankText(percentile) {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Top 50%';
    if (percentile >= 25) return 'Top 75%';
    return 'Bottom 25%';
}

/**
 * Get rank CSS class
 */
function getRankClass(percentile) {
    if (percentile >= 75) return 'rank-top';
    if (percentile >= 50) return 'rank-mid';
    return 'rank-low';
}

/**
 * Render leaderboard table
 */
function renderLeaderboardTable(userStats) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    
    // Add user to leaderboard data temporarily
    const userData = {
        id: 'you',
        winRate: userStats.winRate || 0,
        volume: userStats.totalVolume || 0,
        profitFactor: userStats.profitFactor === Infinity ? 999 : (userStats.profitFactor || 0),
        markets: userStats.totalResolved || 0,
        isUser: true
    };
    
    // Combine and sort by win rate
    const combined = [...leaderboardData, userData].sort((a, b) => b.winRate - a.winRate);
    
    // Take top 10
    const top10 = combined.slice(0, 10);
    
    // Find user's position if not in top 10
    const userPosition = combined.findIndex(d => d.id === 'you') + 1;
    
    tbody.innerHTML = top10.map((entry, index) => {
        const isUser = entry.id === 'you';
        const rowClass = isUser ? 'leaderboard-row-user' : '';
        const rankDisplay = index + 1;
        const rankEmoji = rankDisplay === 1 ? '🥇' : rankDisplay === 2 ? '🥈' : rankDisplay === 3 ? '🥉' : rankDisplay;
        
        return `
            <tr class="${rowClass}">
                <td>${rankEmoji}</td>
                <td>${entry.winRate.toFixed(1)}%</td>
                <td>${formatLeaderboardVolume(entry.volume)}</td>
                <td>${entry.profitFactor === 999 ? '∞' : entry.profitFactor.toFixed(2)}</td>
                <td>${entry.markets}</td>
            </tr>
        `;
    }).join('');
    
    // If user not in top 10, add them at bottom with their rank
    if (userPosition > 10) {
        tbody.innerHTML += `
            <tr class="leaderboard-row-separator">
                <td colspan="5">...</td>
            </tr>
            <tr class="leaderboard-row-user">
                <td>#${userPosition}</td>
                <td>${userData.winRate.toFixed(1)}%</td>
                <td>${formatLeaderboardVolume(userData.volume)}</td>
                <td>${userData.profitFactor === 999 ? '∞' : userData.profitFactor.toFixed(2)}</td>
                <td>${userData.markets}</td>
            </tr>
        `;
    }
}

/**
 * Format volume for leaderboard
 */
function formatLeaderboardVolume(value) {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + value.toFixed(0);
}

/**
 * Toggle leaderboard opt-in
 */
function toggleLeaderboardOptIn() {
    const checkbox = document.getElementById('leaderboard-optin');
    const optedIn = checkbox.checked;
    
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, optedIn ? 'true' : 'false');
    
    if (optedIn) {
        // Generate anonymous ID if not exists
        if (!localStorage.getItem(LEADERBOARD_ID_KEY)) {
            localStorage.setItem(LEADERBOARD_ID_KEY, 'anon_' + Math.random().toString(36).substr(2, 9));
        }
        showToast('Thanks! Your anonymous stats will help others compare.');
        
        // In production, would submit to backend here
        submitToLeaderboard();
    } else {
        showToast('Opt-out saved. Your stats are private.');
    }
}

/**
 * Load opt-in status
 */
function loadOptInStatus() {
    const checkbox = document.getElementById('leaderboard-optin');
    if (checkbox) {
        const optedIn = localStorage.getItem(LEADERBOARD_STORAGE_KEY) === 'true';
        checkbox.checked = optedIn;
    }
}

/**
 * Submit stats to leaderboard (mock)
 */
function submitToLeaderboard() {
    // In production, this would POST to backend
    console.log('Would submit to leaderboard:', {
        id: localStorage.getItem(LEADERBOARD_ID_KEY),
        stats: {
            winRate: appState.stats?.winRate,
            volume: appState.stats?.totalVolume,
            profitFactor: appState.stats?.profitFactor,
            markets: appState.stats?.totalResolved
        }
    });
}
