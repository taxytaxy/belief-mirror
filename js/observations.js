/**
 * observations.js - Pattern Detection and Observations
 * 
 * Generates insights based on trading patterns.
 * These are rule-based observations, not AI-generated.
 */

/**
 * Generate observations based on trading statistics
 * @param {Object} stats - Calculated statistics
 * @param {Object} data - Raw data containing activity and positions
 * @returns {Array} - Array of observation objects
 */
function generateObservations(stats, data) {
    const observations = [];
    
    // 1. Trading volume observation
    observations.push(generateVolumeObservation(stats));
    
    // 2. Category preference observation
    observations.push(generateCategoryObservation(stats));
    
    // 3. Buy/Sell behavior observation
    observations.push(generateBuySellObservation(stats));
    
    // 4. Trading frequency observation
    observations.push(generateFrequencyObservation(stats));
    
    // 5. Price range observation
    observations.push(generatePriceRangeObservation(stats, data));
    
    // 6. Timing observation
    observations.push(generateTimingObservation(stats));
    
    // 7. Position sizing observation
    observations.push(generatePositionSizeObservation(stats));
    
    // 8. Current positions observation (if any)
    if (stats.positions > 0) {
        observations.push(generateCurrentPositionsObservation(stats, data));
    }
    
    // 9. Win/Loss performance observation (NEW)
    if (stats.totalResolved > 0) {
        observations.push(generateWinLossObservation(stats));
    }
    
    // 10. Category edge observation (NEW)
    if (stats.totalResolved >= 5) {
        observations.push(generateCategoryEdgeObservation(stats));
    }
    
    // 11. Price range edge observation (NEW)
    if (stats.totalResolved >= 5) {
        observations.push(generatePriceRangeEdgeObservation(stats));
    }
    
    // Filter out null observations
    return observations.filter(obs => obs !== null);
}

/**
 * Generate volume-based observation
 */
function generateVolumeObservation(stats) {
    const { totalVolume, totalTrades, avgTradeSize } = stats;
    
    let sentiment = 'neutral';
    let title = 'Trading Activity Level';
    let detail = '';
    
    if (totalVolume >= 100000) {
        sentiment = 'neutral';
        title = '💰 High-Volume Trader';
        detail = `You've traded ${formatCurrency(totalVolume)} across ${stats.totalTrades} trades. Your average trade size of ${formatCurrency(avgTradeSize)} suggests you're comfortable with significant positions.`;
    } else if (totalVolume >= 10000) {
        sentiment = 'neutral';
        title = '📊 Active Trader';
        detail = `With ${formatCurrency(totalVolume)} in total volume and ${stats.totalTrades} trades, you're an active participant in prediction markets.`;
    } else if (totalVolume >= 1000) {
        sentiment = 'neutral';
        title = '🌱 Growing Trader';
        detail = `You've traded ${formatCurrency(totalVolume)} so far. As you gain experience, your trading patterns will become clearer.`;
    } else {
        sentiment = 'neutral';
        title = '👋 Getting Started';
        detail = `You're just getting started with ${formatCurrency(totalVolume)} in total volume. More data will help identify your trading patterns.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate category preference observation
 */
function generateCategoryObservation(stats) {
    const { marketCategories } = stats;
    
    // Find top category
    const sorted = Object.entries(marketCategories)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
        return null;
    }
    
    const [topCategory, topCount] = sorted[0];
    const totalMarkets = Object.values(marketCategories).reduce((a, b) => a + b, 0);
    const percentage = ((topCount / totalMarkets) * 100).toFixed(0);
    
    let title = `🎯 ${topCategory} Focus`;
    let detail = '';
    
    if (percentage >= 60) {
        detail = `${percentage}% of your markets are in ${topCategory}. You have a strong preference for this category. Consider whether this concentration aligns with your actual knowledge advantage.`;
    } else if (percentage >= 40) {
        detail = `${topCategory} makes up ${percentage}% of your trading activity. You have a notable focus here, though you're also exploring other categories.`;
    } else {
        detail = `Your trading is distributed across categories, with ${topCategory} being slightly more common (${percentage}%). This diversification may reflect broad interests or systematic exploration.`;
    }
    
    // Add secondary categories if relevant
    if (sorted.length >= 2 && sorted[1][1] > 0) {
        const [secondCategory, secondCount] = sorted[1];
        const secondPercentage = ((secondCount / totalMarkets) * 100).toFixed(0);
        detail += ` ${secondCategory} is your second most active category at ${secondPercentage}%.`;
    }
    
    return { title, detail, sentiment: 'neutral' };
}

/**
 * Generate buy/sell behavior observation
 */
function generateBuySellObservation(stats) {
    const { buys, sells, buyVolume, sellVolume } = stats;
    const total = buys + sells;
    
    if (total === 0) return null;
    
    const buyPct = ((buys / total) * 100).toFixed(0);
    const sellPct = ((sells / total) * 100).toFixed(0);
    
    let title = '↔️ Trading Direction';
    let detail = '';
    let sentiment = 'neutral';
    
    if (buyPct >= 70) {
        title = '📈 Position Builder';
        detail = `${buyPct}% of your trades are buys. You tend to accumulate positions rather than actively trade in and out. This could indicate conviction in your picks, or it could mean you're not taking profits when available.`;
        sentiment = 'neutral';
    } else if (sellPct >= 70) {
        title = '📉 Active Profit-Taker';
        detail = `${sellPct}% of your trades are sells. You actively manage and exit positions. This could indicate disciplined profit-taking or quick loss-cutting.`;
        sentiment = 'neutral';
    } else {
        detail = `Your trades are balanced: ${buyPct}% buys and ${sellPct}% sells. This suggests active position management with both entries and exits.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate trading frequency observation
 */
function generateFrequencyObservation(stats) {
    const { tradingDays, firstTrade, lastTrade, tradesPerDay, totalTrades } = stats;
    
    if (!firstTrade || !lastTrade) return null;
    
    // Calculate total days in range
    const dayRange = Math.ceil((lastTrade - firstTrade) / (1000 * 60 * 60 * 24)) + 1;
    const activeRatio = ((tradingDays / dayRange) * 100).toFixed(0);
    
    let title = '📅 Trading Rhythm';
    let detail = '';
    let sentiment = 'neutral';
    
    if (parseFloat(tradesPerDay) >= 5) {
        title = '⚡ High-Frequency Trader';
        detail = `When you trade, you average ${tradesPerDay} trades per day. You were active on ${tradingDays} out of ${dayRange} days (${activeRatio}%). This high activity level requires significant attention and may increase transaction costs.`;
    } else if (parseFloat(tradesPerDay) >= 2) {
        title = '📊 Regular Trader';
        detail = `You average ${tradesPerDay} trades on active days, trading on ${tradingDays} out of ${dayRange} days (${activeRatio}%). This moderate pace allows for thoughtful decision-making.`;
    } else {
        title = '🧘 Selective Trader';
        detail = `You trade selectively, averaging ${tradesPerDay} trades on active days. You were active on ${tradingDays} out of ${dayRange} days (${activeRatio}%). This patience could indicate careful market selection.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate price range observation
 */
function generatePriceRangeObservation(stats, data) {
    const { activity } = data;
    const trades = activity.filter(a => a.type === 'TRADE' && a.price !== undefined);
    
    if (trades.length < 5) return null;
    
    // Categorize by price range
    const ranges = {
        'low': 0,      // 0-20 cents
        'mid': 0,      // 20-50 cents  
        'high': 0,     // 50-80 cents
        'extreme': 0   // 80-100 cents
    };
    
    trades.forEach(trade => {
        const price = trade.price;
        if (price <= 0.20) ranges.low++;
        else if (price <= 0.50) ranges.mid++;
        else if (price <= 0.80) ranges.high++;
        else ranges.extreme++;
    });
    
    const total = trades.length;
    const dominant = Object.entries(ranges).sort((a, b) => b[1] - a[1])[0];
    const [rangeName, count] = dominant;
    const pct = ((count / total) * 100).toFixed(0);
    
    let title = '🎲 Risk Preference';
    let detail = '';
    let sentiment = 'neutral';
    
    if (rangeName === 'low' && pct >= 40) {
        title = '🎯 Longshot Hunter';
        detail = `${pct}% of your trades are at odds below 20¢. You're drawn to low-probability, high-payoff opportunities. These can be profitable if you have genuine insight, but be aware of the inherent difficulty in predicting rare events.`;
    } else if (rangeName === 'extreme' && pct >= 40) {
        title = '🛡️ Conservative Player';
        detail = `${pct}% of your trades are at odds above 80¢. You prefer high-probability outcomes with smaller potential returns. This conservative approach limits downside but caps upside.`;
    } else if (rangeName === 'mid') {
        title = '⚖️ Balanced Odds Seeker';
        detail = `${pct}% of your trades are in the 20-50¢ range. You gravitate toward more uncertain outcomes where the market is genuinely split. This can be where the most alpha exists, but also where overconfidence is most dangerous.`;
    } else {
        detail = `Your trades span various probability ranges, with ${pct}% in the ${rangeName} odds category. This diversification across risk levels may indicate opportunistic trading based on perceived value.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate timing observation
 */
function generateTimingObservation(stats) {
    const { hourDistribution, dayDistribution } = stats;
    
    // Find peak hour
    const peakHour = hourDistribution.indexOf(Math.max(...hourDistribution));
    const peakHourTrades = hourDistribution[peakHour];
    
    // Find peak day
    const peakDay = Object.entries(dayDistribution).sort((a, b) => b[1] - a[1])[0];
    
    let title = '🕐 Trading Time Patterns';
    let detail = '';
    
    // Format hour nicely
    const formatHour = (h) => {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
    };
    
    detail = `Your most active trading hour is ${formatHour(peakHour)} UTC, and ${peakDay[0]} is your busiest day. `;
    
    // Check if trading correlates with US market hours (14-21 UTC)
    const usHoursTrades = hourDistribution.slice(14, 21).reduce((a, b) => a + b, 0);
    const totalTrades = hourDistribution.reduce((a, b) => a + b, 0);
    const usHoursPct = totalTrades > 0 ? ((usHoursTrades / totalTrades) * 100).toFixed(0) : 0;
    
    if (usHoursPct >= 50) {
        detail += `${usHoursPct}% of your trades occur during US market hours, suggesting you may be influenced by US news cycles.`;
    }
    
    return { title, detail, sentiment: 'neutral' };
}

/**
 * Generate position sizing observation
 */
function generatePositionSizeObservation(stats) {
    const { avgTradeSize, totalVolume, totalTrades } = stats;
    
    if (totalTrades < 5) return null;
    
    let title = '📏 Position Sizing';
    let detail = '';
    let sentiment = 'neutral';
    
    if (avgTradeSize >= 500) {
        title = '🐋 Large Position Trader';
        detail = `Your average trade is ${formatCurrency(avgTradeSize)}. Large positions can amplify both gains and losses. Consider whether your conviction truly justifies this sizing.`;
    } else if (avgTradeSize >= 100) {
        title = '📊 Moderate Position Trader';
        detail = `Your average trade size is ${formatCurrency(avgTradeSize)}. This moderate sizing allows for meaningful returns while managing risk.`;
    } else {
        title = '🌱 Small Position Trader';
        detail = `Your average trade is ${formatCurrency(avgTradeSize)}. Small positions limit risk but also cap potential profits. As you develop conviction, you might consider scaling up selectively.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate current positions observation
 */
function generateCurrentPositionsObservation(stats, data) {
    const { positions } = data;
    const { totalPositionValue, totalUnrealizedPnL } = stats;
    
    const profitablePositions = positions.filter(p => (p.cashPnl || 0) > 0).length;
    const losingPositions = positions.filter(p => (p.cashPnl || 0) < 0).length;
    
    let title = '💼 Current Portfolio';
    let detail = '';
    let sentiment = 'neutral';
    
    if (totalUnrealizedPnL > 0) {
        sentiment = 'positive';
        detail = `You have ${positions.length} open positions worth ${formatCurrency(totalPositionValue)} with ${formatCurrency(totalUnrealizedPnL)} in unrealized gains. ${profitablePositions} positions are profitable, ${losingPositions} are underwater.`;
    } else if (totalUnrealizedPnL < 0) {
        sentiment = 'negative';
        detail = `You have ${positions.length} open positions worth ${formatCurrency(totalPositionValue)} with ${formatCurrency(Math.abs(totalUnrealizedPnL))} in unrealized losses. ${profitablePositions} positions are profitable, ${losingPositions} are underwater.`;
    } else {
        detail = `You have ${positions.length} open positions worth ${formatCurrency(totalPositionValue)}. Your portfolio is currently at breakeven.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate win/loss performance observation
 */
function generateWinLossObservation(stats) {
    const { winRate, totalResolved, totalRealizedPnL, profitFactor, avgWinAmount, avgLossAmount } = stats;
    
    let title = '📈 Overall Performance';
    let detail = '';
    let sentiment = 'neutral';
    
    if (totalRealizedPnL > 0) {
        sentiment = 'positive';
        title = '✅ Profitable Track Record';
        
        if (winRate >= 55) {
            detail = `You've made ${formatCurrency(totalRealizedPnL)} across ${totalResolved} resolved markets with a ${winRate.toFixed(1)}% win rate. Your above-average hit rate suggests good prediction calibration.`;
        } else {
            detail = `You've made ${formatCurrency(totalRealizedPnL)} across ${totalResolved} resolved markets despite a ${winRate.toFixed(1)}% win rate. Your profit factor of ${profitFactor.toFixed(2)} shows you're making more on wins than you lose on losses.`;
        }
    } else if (totalRealizedPnL < 0) {
        sentiment = 'negative';
        title = '⚠️ Room for Improvement';
        
        if (winRate < 45) {
            detail = `You've lost ${formatCurrency(Math.abs(totalRealizedPnL))} across ${totalResolved} resolved markets with a ${winRate.toFixed(1)}% win rate. Consider whether you're overconfident in low-probability positions.`;
        } else {
            detail = `Despite a ${winRate.toFixed(1)}% win rate, you've lost ${formatCurrency(Math.abs(totalRealizedPnL))}. Your average loss (${formatCurrency(avgLossAmount)}) exceeds your average win (${formatCurrency(avgWinAmount)}). Consider tighter position sizing on uncertain bets.`;
        }
    } else {
        detail = `You're at breakeven across ${totalResolved} resolved markets with a ${winRate.toFixed(1)}% win rate.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate category edge observation
 */
function generateCategoryEdgeObservation(stats) {
    const { winLossByCategory } = stats;
    
    if (!winLossByCategory) return null;
    
    // Find best and worst categories with at least 3 trades
    const categories = Object.entries(winLossByCategory)
        .filter(([_, data]) => data.count >= 3)
        .map(([name, data]) => ({ name, ...data }));
    
    if (categories.length < 2) return null;
    
    const best = categories.reduce((a, b) => a.winRate > b.winRate ? a : b);
    const worst = categories.reduce((a, b) => a.winRate < b.winRate ? a : b);
    
    // Only show if there's a meaningful difference
    if (best.winRate - worst.winRate < 15) return null;
    
    let title = '🎯 Category Edge';
    let sentiment = 'neutral';
    let detail = '';
    
    if (best.winRate >= 60 && best.totalPnl > 0) {
        sentiment = 'positive';
        detail = `You perform best in ${best.name} (${best.winRate.toFixed(0)}% win rate, ${formatCurrency(best.totalPnl)} profit). `;
    } else {
        detail = `Your strongest category is ${best.name} at ${best.winRate.toFixed(0)}% win rate. `;
    }
    
    if (worst.winRate < 40 && worst.totalPnl < 0) {
        detail += `Consider avoiding ${worst.name} where you're at ${worst.winRate.toFixed(0)}% win rate with ${formatCurrency(worst.totalPnl)} in losses.`;
        if (sentiment !== 'positive') sentiment = 'negative';
    } else {
        detail += `${worst.name} is your weakest at ${worst.winRate.toFixed(0)}%.`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Generate price range edge observation
 */
function generatePriceRangeEdgeObservation(stats) {
    const { winLossByPriceRange } = stats;
    
    if (!winLossByPriceRange) return null;
    
    // Find ranges with meaningful data
    const ranges = Object.entries(winLossByPriceRange)
        .filter(([_, data]) => data.count >= 3)
        .map(([name, data]) => ({ name, ...data }));
    
    if (ranges.length < 2) return null;
    
    const best = ranges.reduce((a, b) => a.winRate > b.winRate ? a : b);
    const worst = ranges.reduce((a, b) => a.winRate < b.winRate ? a : b);
    const mostProfitable = ranges.reduce((a, b) => a.totalPnl > b.totalPnl ? a : b);
    
    let title = '🎲 Probability Sweet Spot';
    let sentiment = 'neutral';
    let detail = '';
    
    // Check for calibration issues
    if (best.name.includes('Longshot') && best.winRate > 30) {
        sentiment = 'positive';
        detail = `Impressive: you're hitting ${best.winRate.toFixed(0)}% on longshots (0-20¢). Either you have genuine edge in spotting undervalued outcomes, or this is a small sample size.`;
    } else if (best.name.includes('Heavy Favorite') && best.winRate < 85) {
        sentiment = 'negative';
        detail = `Your heavy favorite picks (80-100¢) are winning at ${best.winRate.toFixed(0)}%, which is below what those prices imply. You may be overpaying for "safe" bets.`;
    } else if (mostProfitable.totalPnl > 0) {
        sentiment = 'positive';
        detail = `Your most profitable range is ${mostProfitable.name} with ${formatCurrency(mostProfitable.totalPnl)} in gains. Your worst is ${worst.name} at ${worst.winRate.toFixed(0)}% win rate.`;
    } else {
        detail = `You perform best at ${best.name} (${best.winRate.toFixed(0)}% win rate) and struggle with ${worst.name} (${worst.winRate.toFixed(0)}%).`;
    }
    
    return { title, detail, sentiment };
}

/**
 * Render observations to the DOM
 */
function renderObservations(observations) {
    const container = document.getElementById('observations-container');
    
    if (observations.length === 0) {
        container.innerHTML = '<p class="no-data">Not enough data to generate observations.</p>';
        return;
    }
    
    container.innerHTML = observations.map(obs => `
        <div class="observation ${obs.sentiment}">
            <div class="observation-title">${obs.title}</div>
            <div class="observation-detail">${obs.detail}</div>
        </div>
    `).join('');
}
