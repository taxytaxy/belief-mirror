/**
 * stats.js - Statistics Calculation
 * 
 * Calculates various statistics from trading data.
 */

/**
 * Calculate all statistics from activity and positions data
 * @param {Object} data - Object containing activity and positions arrays
 * @returns {Object} - Calculated statistics
 */
function calculateStats(data) {
    const { activity, positions, closedPositions } = data;
    
    // Filter to only trades (should already be filtered, but double-check)
    const trades = activity.filter(a => a.type === 'TRADE');
    
    // Basic counts
    const totalTrades = trades.length;
    
    // Total volume (USDC)
    const totalVolume = trades.reduce((sum, trade) => {
        return sum + (trade.usdcSize || 0);
    }, 0);
    
    // Unique markets
    const uniqueMarkets = new Set(trades.map(t => t.conditionId)).size;
    
    // Average trade size
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    
    // Buy/Sell counts
    const buys = trades.filter(t => t.side === 'BUY').length;
    const sells = trades.filter(t => t.side === 'SELL').length;
    const buySellRatio = sells > 0 ? (buys / sells).toFixed(2) : buys > 0 ? '∞' : '-';
    
    // Active trading days
    const tradingDays = new Set(
        trades.map(t => {
            const date = new Date(t.timestamp * 1000);
            return date.toISOString().split('T')[0];
        })
    ).size;
    
    // Date range
    const timestamps = trades.map(t => t.timestamp);
    const firstTrade = timestamps.length > 0 ? new Date(Math.min(...timestamps) * 1000) : null;
    const lastTrade = timestamps.length > 0 ? new Date(Math.max(...timestamps) * 1000) : null;
    
    // Trading frequency (trades per day on active days)
    const tradesPerDay = tradingDays > 0 ? (totalTrades / tradingDays).toFixed(1) : 0;
    
    // Volume by side
    const buyVolume = trades
        .filter(t => t.side === 'BUY')
        .reduce((sum, t) => sum + (t.usdcSize || 0), 0);
    const sellVolume = trades
        .filter(t => t.side === 'SELL')
        .reduce((sum, t) => sum + (t.usdcSize || 0), 0);
    
    // Average prices
    const avgBuyPrice = buys > 0 
        ? trades.filter(t => t.side === 'BUY').reduce((sum, t) => sum + t.price, 0) / buys 
        : 0;
    const avgSellPrice = sells > 0 
        ? trades.filter(t => t.side === 'SELL').reduce((sum, t) => sum + t.price, 0) / sells 
        : 0;
    
    // Market categories (extracted from titles)
    const marketCategories = categorizeMarkets(trades);
    
    // Current positions stats
    const totalPositionValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
    const totalUnrealizedPnL = positions.reduce((sum, p) => sum + (p.cashPnl || 0), 0);
    
    // Trade timing analysis
    const hourDistribution = getHourDistribution(trades);
    const dayDistribution = getDayDistribution(trades);
    
    // Monthly volume
    const monthlyVolume = getMonthlyVolume(trades);
    
    // === WIN/LOSS ANALYSIS (NEW) ===
    const winLossStats = calculateWinLossStats(closedPositions);
    
    return {
        totalTrades,
        totalVolume,
        uniqueMarkets,
        avgTradeSize,
        buys,
        sells,
        buySellRatio,
        tradingDays,
        firstTrade,
        lastTrade,
        tradesPerDay,
        buyVolume,
        sellVolume,
        avgBuyPrice,
        avgSellPrice,
        marketCategories,
        totalPositionValue,
        totalUnrealizedPnL,
        hourDistribution,
        dayDistribution,
        monthlyVolume,
        positions: positions.length,
        // Win/Loss stats
        ...winLossStats
    };
}

/**
 * Calculate win/loss statistics from closed positions
 * @param {Array} closedPositions - Array of closed position records
 * @returns {Object} - Win/loss statistics
 */
function calculateWinLossStats(closedPositions) {
    if (!closedPositions || closedPositions.length === 0) {
        return {
            totalResolved: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            totalRealizedPnL: 0,
            avgWinAmount: 0,
            avgLossAmount: 0,
            biggestWin: null,
            biggestLoss: null,
            profitFactor: 0,
            winLossByCategory: {},
            winLossByPriceRange: {}
        };
    }
    
    // Determine wins and losses based on realizedPnl
    const wins = closedPositions.filter(p => (p.realizedPnl || 0) > 0);
    const losses = closedPositions.filter(p => (p.realizedPnl || 0) < 0);
    const breakeven = closedPositions.filter(p => (p.realizedPnl || 0) === 0);
    
    const totalResolved = closedPositions.length;
    const winCount = wins.length;
    const lossCount = losses.length;
    const winRate = totalResolved > 0 ? (winCount / totalResolved) * 100 : 0;
    
    // P&L calculations
    const totalRealizedPnL = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const totalWinAmount = wins.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, p) => sum + (p.realizedPnl || 0), 0));
    
    const avgWinAmount = winCount > 0 ? totalWinAmount / winCount : 0;
    const avgLossAmount = lossCount > 0 ? totalLossAmount / lossCount : 0;
    
    // Profit factor (total wins / total losses)
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? Infinity : 0;
    
    // Find biggest win and loss
    const biggestWin = wins.length > 0 
        ? wins.reduce((max, p) => (p.realizedPnl || 0) > (max.realizedPnl || 0) ? p : max, wins[0])
        : null;
    const biggestLoss = losses.length > 0
        ? losses.reduce((min, p) => (p.realizedPnl || 0) < (min.realizedPnl || 0) ? p : min, losses[0])
        : null;
    
    // Win/loss by category
    const winLossByCategory = calculateWinLossByCategory(closedPositions);
    
    // Win/loss by entry price range
    const winLossByPriceRange = calculateWinLossByPriceRange(closedPositions);
    
    // Expectancy (average profit per trade)
    const expectancy = totalResolved > 0 ? totalRealizedPnL / totalResolved : 0;
    
    return {
        totalResolved,
        wins: winCount,
        losses: lossCount,
        breakeven: breakeven.length,
        winRate,
        totalRealizedPnL,
        totalWinAmount,
        totalLossAmount,
        avgWinAmount,
        avgLossAmount,
        biggestWin,
        biggestLoss,
        profitFactor,
        expectancy,
        winLossByCategory,
        winLossByPriceRange,
        closedPositions // Keep for detailed display
    };
}

/**
 * Calculate win/loss stats by market category
 */
function calculateWinLossByCategory(closedPositions) {
    const categories = {};
    
    const keywords = {
        'Politics': ['election', 'president', 'congress', 'senate', 'trump', 'biden', 'democrat', 'republican', 'vote', 'governor', 'mayor', 'political', 'impeach'],
        'Sports': ['nba', 'nfl', 'mlb', 'world cup', 'super bowl', 'championship', 'playoffs', 'game', 'team', 'player', 'match'],
        'Crypto': ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'token', 'coin', 'defi', 'nft', 'blockchain'],
        'Economy': ['fed', 'interest rate', 'inflation', 'gdp', 'recession', 'economy', 'market', 'stock', 'treasury', 'unemployment'],
        'Entertainment': ['oscar', 'emmy', 'movie', 'film', 'album', 'spotify', 'netflix', 'celebrity', 'award'],
        'Science': ['climate', 'nasa', 'space', 'ai', 'artificial intelligence', 'scientific', 'research', 'temperature']
    };
    
    closedPositions.forEach(position => {
        const title = (position.title || '').toLowerCase();
        let category = 'Other';
        
        for (const [cat, words] of Object.entries(keywords)) {
            if (words.some(word => title.includes(word))) {
                category = cat;
                break;
            }
        }
        
        if (!categories[category]) {
            categories[category] = { wins: 0, losses: 0, totalPnl: 0, count: 0 };
        }
        
        categories[category].count++;
        categories[category].totalPnl += position.realizedPnl || 0;
        
        if ((position.realizedPnl || 0) > 0) {
            categories[category].wins++;
        } else if ((position.realizedPnl || 0) < 0) {
            categories[category].losses++;
        }
    });
    
    // Calculate win rate for each category
    for (const cat of Object.keys(categories)) {
        const data = categories[cat];
        data.winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
    }
    
    return categories;
}

/**
 * Calculate win/loss stats by entry price range
 */
function calculateWinLossByPriceRange(closedPositions) {
    const ranges = {
        'Longshots (0-20¢)': { wins: 0, losses: 0, totalPnl: 0, count: 0 },
        'Underdogs (20-40¢)': { wins: 0, losses: 0, totalPnl: 0, count: 0 },
        'Toss-ups (40-60¢)': { wins: 0, losses: 0, totalPnl: 0, count: 0 },
        'Favorites (60-80¢)': { wins: 0, losses: 0, totalPnl: 0, count: 0 },
        'Heavy Favorites (80-100¢)': { wins: 0, losses: 0, totalPnl: 0, count: 0 }
    };
    
    closedPositions.forEach(position => {
        const avgPrice = position.avgPrice || 0;
        let range;
        
        if (avgPrice <= 0.20) range = 'Longshots (0-20¢)';
        else if (avgPrice <= 0.40) range = 'Underdogs (20-40¢)';
        else if (avgPrice <= 0.60) range = 'Toss-ups (40-60¢)';
        else if (avgPrice <= 0.80) range = 'Favorites (60-80¢)';
        else range = 'Heavy Favorites (80-100¢)';
        
        ranges[range].count++;
        ranges[range].totalPnl += position.realizedPnl || 0;
        
        if ((position.realizedPnl || 0) > 0) {
            ranges[range].wins++;
        } else if ((position.realizedPnl || 0) < 0) {
            ranges[range].losses++;
        }
    });
    
    // Calculate win rate for each range
    for (const range of Object.keys(ranges)) {
        const data = ranges[range];
        data.winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
    }
    
    return ranges;
}

/**
 * Categorize markets by topic based on title keywords
 */
function categorizeMarkets(trades) {
    const categories = {
        'Politics': 0,
        'Sports': 0,
        'Crypto': 0,
        'Economy': 0,
        'Entertainment': 0,
        'Science': 0,
        'Other': 0
    };
    
    const keywords = {
        'Politics': ['election', 'president', 'congress', 'senate', 'trump', 'biden', 'democrat', 'republican', 'vote', 'governor', 'mayor', 'political', 'impeach'],
        'Sports': ['nba', 'nfl', 'mlb', 'world cup', 'super bowl', 'championship', 'playoffs', 'game', 'team', 'player', 'win', 'score', 'match'],
        'Crypto': ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'token', 'coin', 'defi', 'nft', 'blockchain'],
        'Economy': ['fed', 'interest rate', 'inflation', 'gdp', 'recession', 'economy', 'market', 'stock', 'treasury', 'unemployment'],
        'Entertainment': ['oscar', 'emmy', 'movie', 'film', 'album', 'spotify', 'netflix', 'celebrity', 'award'],
        'Science': ['climate', 'nasa', 'space', 'ai', 'artificial intelligence', 'scientific', 'research', 'temperature']
    };
    
    // Count unique markets by category
    const marketCategories = new Map();
    
    trades.forEach(trade => {
        const title = (trade.title || '').toLowerCase();
        const conditionId = trade.conditionId;
        
        if (marketCategories.has(conditionId)) return;
        
        let found = false;
        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => title.includes(word))) {
                categories[category]++;
                marketCategories.set(conditionId, category);
                found = true;
                break;
            }
        }
        
        if (!found) {
            categories['Other']++;
            marketCategories.set(conditionId, 'Other');
        }
    });
    
    return categories;
}

/**
 * Get distribution of trades by hour of day (UTC)
 */
function getHourDistribution(trades) {
    const hours = Array(24).fill(0);
    
    trades.forEach(trade => {
        const hour = new Date(trade.timestamp * 1000).getUTCHours();
        hours[hour]++;
    });
    
    return hours;
}

/**
 * Get distribution of trades by day of week
 */
function getDayDistribution(trades) {
    const days = {
        'Sunday': 0,
        'Monday': 0,
        'Tuesday': 0,
        'Wednesday': 0,
        'Thursday': 0,
        'Friday': 0,
        'Saturday': 0
    };
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    trades.forEach(trade => {
        const day = new Date(trade.timestamp * 1000).getUTCDay();
        days[dayNames[day]]++;
    });
    
    return days;
}

/**
 * Get volume by month
 */
function getMonthlyVolume(trades) {
    const monthly = {};
    
    trades.forEach(trade => {
        const date = new Date(trade.timestamp * 1000);
        const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        
        if (!monthly[key]) {
            monthly[key] = { volume: 0, trades: 0, buys: 0, sells: 0 };
        }
        
        monthly[key].volume += trade.usdcSize || 0;
        monthly[key].trades++;
        if (trade.side === 'BUY') monthly[key].buys++;
        if (trade.side === 'SELL') monthly[key].sells++;
    });
    
    // Sort by month
    const sorted = Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    
    return sorted;
}

/**
 * Format currency for display
 */
function formatCurrency(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

/**
 * Format number with commas
 */
function formatNumber(value) {
    return value.toLocaleString();
}

/**
 * Format percentage
 */
function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}
