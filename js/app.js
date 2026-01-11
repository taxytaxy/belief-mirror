/**
 * app.js - Main Application (Terminal Style)
 */

const appState = {
    walletAddress: null,
    data: null,
    stats: null,
    currentTradeOffset: 0,
    tradesPerPage: 25,
    chartRange: 'weekly'
};

// Nav link highlighting
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove('active'));
                const activeLink = document.querySelector(`.nav-link[data-section="${entry.target.id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, { threshold: 0.3 });
    
    document.querySelectorAll('.section').forEach(section => observer.observe(section));
});

/**
 * Analyze wallet
 */
async function analyzeWallet() {
    const input = document.getElementById('wallet-input');
    const walletAddress = input.value.trim();
    
    if (!walletAddress || !walletAddress.startsWith('0x')) {
        showError('Invalid wallet address');
        return;
    }
    
    showLoading(true);
    hideResults();
    hideError();
    
    try {
        const data = await fetchAllData(walletAddress);
        
        if (!data.activity || data.activity.length === 0) {
            throw new Error('No trading history found');
        }
        
        const stats = calculateStats(data);
        
        appState.walletAddress = walletAddress;
        appState.data = data;
        appState.stats = stats;
        appState.currentTradeOffset = 0;
        
        // Update display
        document.getElementById('wallet-display').textContent = 
            walletAddress.substring(0, 6) + '...' + walletAddress.substring(38);
        
        renderSummary(stats);
        renderPositions(data.positions);
        renderAnalysis(stats);
        renderTrades(data.activity.slice(0, appState.tradesPerPage));
        createAllCharts(stats);
        
        if (typeof initializeJournal === 'function') initializeJournal(data);
        if (typeof initializeLeaderboard === 'function') initializeLeaderboard(stats);
        
        document.getElementById('trades-count').textContent = data.activity.length;
        
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (data.activity.length > appState.tradesPerPage) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }
        
        showLoading(false);
        showResults();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        showLoading(false);
    }
}

/**
 * Render summary stats
 */
function renderSummary(stats) {
    document.getElementById('stat-winrate').textContent = (stats.winRate || 0).toFixed(1) + '%';
    document.getElementById('stat-trades').textContent = stats.totalTrades || 0;
    document.getElementById('stat-volume').textContent = formatCurrency(stats.totalVolume || 0);
    document.getElementById('stat-avgsize').textContent = formatCurrency(stats.avgTradeSize || 0);
    document.getElementById('stat-wl').textContent = `${stats.wins || 0}/${stats.losses || 0}`;
    
    const pnl = stats.totalRealizedPnL || 0;
    const pnlEl = document.getElementById('stat-pnl');
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + formatCurrency(pnl);
    pnlEl.className = 'summary-value ' + (pnl >= 0 ? 'positive' : 'negative');
    
    const avgWin = stats.avgWinAmount || 0;
    const avgLoss = stats.avgLossAmount || 0;
    document.getElementById('stat-avgwl').textContent = `$${avgWin.toFixed(0)}/$${Math.abs(avgLoss).toFixed(0)}`;
    
    const pf = stats.profitFactor;
    document.getElementById('stat-pf').textContent = pf === Infinity ? '∞' : (pf || 0).toFixed(2);
}

/**
 * Render positions
 */
function renderPositions(positions) {
    const container = document.getElementById('positions-container');
    document.getElementById('positions-count').textContent = positions?.length || 0;
    
    if (!positions || positions.length === 0) {
        container.innerHTML = '<p class="no-data">No open positions</p>';
        return;
    }
    
    container.innerHTML = positions.slice(0, 12).map(p => {
        const pnl = p.currentValue - p.initialValue;
        const pnlPct = ((p.currentValue / p.initialValue - 1) * 100).toFixed(1);
        return `
            <div class="position-card">
                <div class="position-title">${p.title || 'Unknown'}</div>
                <div class="position-row">
                    <span class="label">Outcome</span>
                    <span class="value">${p.outcome || '-'}</span>
                </div>
                <div class="position-row">
                    <span class="label">Size</span>
                    <span class="value">${p.size?.toFixed(2) || '-'}</span>
                </div>
                <div class="position-row">
                    <span class="label">Avg Price</span>
                    <span class="value">${(p.avgPrice * 100).toFixed(0)}¢</span>
                </div>
                <div class="position-row">
                    <span class="label">P&L</span>
                    <span class="value ${pnl >= 0 ? 'positive' : 'negative'}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct}%)</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render analysis tables
 */
function renderAnalysis(stats) {
    // Category table - sorted by P&L
    const catContainer = document.getElementById('category-table');
    if (stats.winLossByCategory) {
        const sorted = Object.entries(stats.winLossByCategory)
            .filter(([_, d]) => d.count > 0)
            .sort((a, b) => b[1].totalPnl - a[1].totalPnl);
        
        if (sorted.length > 0) {
            catContainer.innerHTML = sorted.map(([cat, d]) => {
                const wrClass = d.winRate >= 55 ? 'good' : d.winRate < 45 ? 'bad' : '';
                const pnlClass = d.totalPnl >= 0 ? 'positive' : 'negative';
                return `
                    <div class="mini-table-row">
                        <span class="cat">${cat}</span>
                        <span class="ct">${d.count}</span>
                        <span class="wr ${wrClass}">${d.winRate.toFixed(0)}%</span>
                        <span class="pnl ${pnlClass}">${d.totalPnl >= 0 ? '+' : ''}$${d.totalPnl.toFixed(0)}</span>
                    </div>
                `;
            }).join('');
        } else {
            catContainer.innerHTML = '<p class="no-data">No data</p>';
        }
    }
    
    // Price range table
    const priceContainer = document.getElementById('price-table');
    if (stats.winLossByPriceRange) {
        const ranges = Object.entries(stats.winLossByPriceRange).filter(([_, d]) => d.count > 0);
        
        if (ranges.length > 0) {
            priceContainer.innerHTML = ranges.map(([range, d]) => {
                const wrClass = d.winRate >= 55 ? 'good' : d.winRate < 45 ? 'bad' : '';
                const pnlClass = d.totalPnl >= 0 ? 'positive' : 'negative';
                return `
                    <div class="mini-table-row">
                        <span class="cat">${range}</span>
                        <span class="ct">${d.count}</span>
                        <span class="wr ${wrClass}">${d.winRate.toFixed(0)}%</span>
                        <span class="pnl ${pnlClass}">${d.totalPnl >= 0 ? '+' : ''}$${d.totalPnl.toFixed(0)}</span>
                    </div>
                `;
            }).join('');
        } else {
            priceContainer.innerHTML = '<p class="no-data">No data</p>';
        }
    }
    
    // Extremes
    const extremesContainer = document.getElementById('extremes-container');
    let html = '';
    
    if (stats.biggestWin) {
        html += `
            <div class="extreme-card win">
                <div class="extreme-header">
                    <span class="extreme-label">Biggest Win</span>
                    <span class="extreme-amount positive">+$${stats.biggestWin.realizedPnl.toFixed(2)}</span>
                </div>
                <div class="extreme-title">${stats.biggestWin.title || 'Unknown'}</div>
            </div>
        `;
    }
    
    if (stats.biggestLoss) {
        html += `
            <div class="extreme-card loss">
                <div class="extreme-header">
                    <span class="extreme-label">Biggest Loss</span>
                    <span class="extreme-amount negative">-$${Math.abs(stats.biggestLoss.realizedPnl).toFixed(2)}</span>
                </div>
                <div class="extreme-title">${stats.biggestLoss.title || 'Unknown'}</div>
            </div>
        `;
    }
    
    extremesContainer.innerHTML = html || '';
}

/**
 * Render trades table
 */
function renderTrades(trades) {
    const tbody = document.getElementById('trades-tbody');
    
    tbody.innerHTML = trades.map(t => {
        const date = new Date(t.timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const side = t.side || 'BUY';
        const price = (t.price * 100).toFixed(0);
        const size = t.size?.toFixed(2) || '-';
        const usdc = t.usdcSize?.toFixed(2) || '-';
        
        return `
            <tr>
                <td>${date}</td>
                <td class="market">${t.title || 'Unknown'}</td>
                <td class="${side.toLowerCase()}">${side}</td>
                <td>${t.outcome || '-'}</td>
                <td>${price}¢</td>
                <td>${size}</td>
                <td>$${usdc}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Load more trades
 */
function loadMoreTrades() {
    if (!appState.data) return;
    
    appState.currentTradeOffset += appState.tradesPerPage;
    const nextTrades = appState.data.activity.slice(
        appState.currentTradeOffset,
        appState.currentTradeOffset + appState.tradesPerPage
    );
    
    renderTrades([
        ...Array.from(document.getElementById('trades-tbody').querySelectorAll('tr')).map(() => ({})),
        ...appState.data.activity.slice(0, appState.currentTradeOffset + appState.tradesPerPage)
    ].slice(-appState.currentTradeOffset - appState.tradesPerPage));
    
    // Actually just re-render all loaded trades
    const allLoaded = appState.data.activity.slice(0, appState.currentTradeOffset + appState.tradesPerPage);
    renderTrades(allLoaded);
    
    if (appState.currentTradeOffset + appState.tradesPerPage >= appState.data.activity.length) {
        document.getElementById('load-more-btn').classList.add('hidden');
    }
}

/**
 * Chart range control
 */
function setChartRange(range) {
    appState.chartRange = range;
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
    });
    
    if (appState.stats) {
        createAllCharts(appState.stats);
    }
}

/**
 * Helpers
 */
function formatCurrency(value) {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
    return '$' + value.toFixed(0);
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function showResults() {
    document.getElementById('results').classList.remove('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

function showError(msg) {
    const el = document.getElementById('error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}
