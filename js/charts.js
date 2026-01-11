/**
 * charts.js - Chart Creation with Time Range Options
 */

let activityChart = null;
let pnlChart = null;
let categoryPieChart = null;
let categoryWinrateChart = null;

const chartColors = {
    primary: '#6366f1',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    muted: '#5a5a6a',
    grid: '#2a2a3a',
    text: '#8b8b9a'
};

Chart.defaults.color = chartColors.text;
Chart.defaults.borderColor = chartColors.grid;
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 10;

/**
 * Create all charts
 */
function createAllCharts(stats) {
    createActivityChart(stats);
    createPnLChart(stats);
    createCategoryPieChart(stats);
    createCategoryWinrateChart(stats);
}

/**
 * Aggregate data by time range
 */
function aggregateByTimeRange(data, dateField, valueField) {
    const range = appState.chartRange;
    const grouped = {};
    
    data.forEach(item => {
        const date = new Date(item[dateField] * 1000);
        let key;
        
        if (range === 'daily') {
            key = date.toISOString().split('T')[0];
        } else if (range === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!grouped[key]) grouped[key] = 0;
        grouped[key] += item[valueField] || 0;
    });
    
    return Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }));
}

/**
 * Activity Chart
 */
function createActivityChart(stats) {
    const ctx = document.getElementById('activity-chart');
    if (!ctx || !appState.data) return;
    
    if (activityChart) activityChart.destroy();
    
    const aggregated = aggregateByTimeRange(appState.data.activity, 'timestamp', 'usdcSize');
    
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: aggregated.map(d => d.date),
            datasets: [{
                label: 'Volume',
                data: aggregated.map(d => d.value),
                backgroundColor: chartColors.primary + '80',
                borderColor: chartColors.primary,
                borderWidth: 1,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => '$' + ctx.raw.toFixed(2)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: chartColors.grid },
                    ticks: {
                        callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'K' : v)
                    }
                }
            }
        }
    });
}

/**
 * P&L Chart
 */
function createPnLChart(stats) {
    const ctx = document.getElementById('pnl-chart');
    if (!ctx || !stats.pnlOverTime || stats.pnlOverTime.length === 0) return;
    
    if (pnlChart) pnlChart.destroy();
    
    const range = appState.chartRange;
    const grouped = {};
    
    stats.pnlOverTime.forEach(item => {
        const date = new Date(item.date);
        let key;
        
        if (range === 'daily') {
            key = date.toISOString().split('T')[0];
        } else if (range === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        grouped[key] = item.cumulative;
    });
    
    const data = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }));
    
    const values = data.map(d => d.value);
    const isPositive = values.length > 0 && values[values.length - 1] >= 0;
    
    pnlChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Cumulative P&L',
                data: values,
                borderColor: isPositive ? chartColors.success : chartColors.danger,
                backgroundColor: (isPositive ? chartColors.success : chartColors.danger) + '20',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => (ctx.raw >= 0 ? '+' : '') + '$' + ctx.raw.toFixed(2)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: chartColors.grid },
                    ticks: {
                        callback: v => (v >= 0 ? '+' : '') + '$' + v.toFixed(0)
                    }
                }
            }
        }
    });
}

/**
 * Category Pie Chart
 */
function createCategoryPieChart(stats) {
    const ctx = document.getElementById('category-pie-chart');
    if (!ctx || !stats.winLossByCategory) return;
    
    if (categoryPieChart) categoryPieChart.destroy();
    
    const data = Object.entries(stats.winLossByCategory)
        .filter(([_, d]) => d.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6);
    
    if (data.length === 0) return;
    
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    
    categoryPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(([cat]) => cat),
            datasets: [{
                data: data.map(([_, d]) => d.count),
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 10, padding: 8, font: { size: 10 } }
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Category Win Rate Chart
 */
function createCategoryWinrateChart(stats) {
    const ctx = document.getElementById('category-winrate-chart');
    if (!ctx || !stats.winLossByCategory) return;
    
    if (categoryWinrateChart) categoryWinrateChart.destroy();
    
    const data = Object.entries(stats.winLossByCategory)
        .filter(([_, d]) => d.count >= 3)
        .sort((a, b) => b[1].winRate - a[1].winRate)
        .slice(0, 6);
    
    if (data.length === 0) return;
    
    categoryWinrateChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(([cat]) => cat.length > 10 ? cat.substring(0, 10) + '...' : cat),
            datasets: [{
                label: 'Win Rate',
                data: data.map(([_, d]) => d.winRate),
                backgroundColor: data.map(([_, d]) => 
                    d.winRate >= 55 ? chartColors.success + '80' : 
                    d.winRate < 45 ? chartColors.danger + '80' : 
                    chartColors.warning + '80'
                ),
                borderWidth: 0,
                borderRadius: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.raw.toFixed(1) + '%'
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: chartColors.grid },
                    max: 100,
                    ticks: { callback: v => v + '%' }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}
