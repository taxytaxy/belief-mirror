/**
 * journal.js - Decision Journal with Calendar & Timezone Support
 */

const JOURNAL_STORAGE_KEY = 'belief_mirror_journal';
const CUSTOM_TAGS_KEY = 'belief_mirror_custom_tags';
const TIMEZONE_KEY = 'belief_mirror_timezone';

let selectedTags = [];
let currentCalendarDate = new Date();
let selectedCalendarDate = null;
let currentTimezone = 'UTC';
let marketTrades = {}; // Store trades by market for date selection

/**
 * Initialize journal
 */
function initializeJournal(data) {
    // Load timezone
    currentTimezone = localStorage.getItem(TIMEZONE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const tzSelect = document.getElementById('timezone-select');
    if (tzSelect) {
        // Try to match saved timezone
        for (let opt of tzSelect.options) {
            if (opt.value === currentTimezone) {
                opt.selected = true;
                break;
            }
        }
    }
    
    // Build market trades map
    marketTrades = {};
    data.activity.forEach(trade => {
        const marketId = trade.conditionId;
        if (!marketTrades[marketId]) {
            marketTrades[marketId] = {
                title: trade.title || 'Unknown Market',
                trades: []
            };
        }
        marketTrades[marketId].trades.push({
            timestamp: trade.timestamp,
            side: trade.side,
            price: trade.price,
            size: trade.size
        });
    });
    
    // Populate market select
    const select = document.getElementById('journal-market-select');
    if (select) {
        select.innerHTML = '<option value="">Select market...</option>';
        
        // Sort by most recent trade
        const sorted = Object.entries(marketTrades)
            .sort((a, b) => {
                const aMax = Math.max(...a[1].trades.map(t => t.timestamp));
                const bMax = Math.max(...b[1].trades.map(t => t.timestamp));
                return bMax - aMax;
            })
            .slice(0, 50);
        
        sorted.forEach(([id, data]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = data.title.length > 50 ? data.title.substring(0, 50) + '...' : data.title;
            opt.title = data.title;
            select.appendChild(opt);
        });
        
        select.onchange = onMarketSelect;
    }
    
    // Load custom tags
    loadCustomTags();
    
    // Render calendar
    renderCalendar();
    
    // Load entries
    loadJournalEntries();
}

/**
 * Handle market selection - show trade dates
 */
function onMarketSelect() {
    const marketId = document.getElementById('journal-market-select').value;
    const tradeSelect = document.getElementById('journal-trade-select');
    
    if (!marketId || !marketTrades[marketId]) {
        tradeSelect.style.display = 'none';
        return;
    }
    
    const trades = marketTrades[marketId].trades;
    tradeSelect.innerHTML = '<option value="">Select trade date...</option>';
    
    trades.sort((a, b) => b.timestamp - a.timestamp).forEach((trade, idx) => {
        const date = formatInTimezone(new Date(trade.timestamp * 1000));
        const side = trade.side === 'BUY' ? '🟢 Buy' : '🔴 Sell';
        const opt = document.createElement('option');
        opt.value = trade.timestamp;
        opt.textContent = `${date} - ${side} @ ${(trade.price * 100).toFixed(0)}¢`;
        tradeSelect.appendChild(opt);
    });
    
    tradeSelect.style.display = 'block';
}

/**
 * Format date in current timezone
 */
function formatInTimezone(date) {
    return date.toLocaleDateString('en-US', {
        timeZone: currentTimezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Change timezone
 */
function changeTimezone() {
    const newTz = document.getElementById('timezone-select').value;
    currentTimezone = newTz;
    localStorage.setItem(TIMEZONE_KEY, newTz);
    
    // Re-render everything
    renderCalendar();
    loadJournalEntries();
    
    // Update trade select if market selected
    const marketId = document.getElementById('journal-market-select').value;
    if (marketId) onMarketSelect();
    
    showToast('Timezone updated');
}

/**
 * Toggle tag
 */
function toggleTag(btn) {
    const tag = btn.dataset.tag;
    if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
        btn.classList.remove('active');
    } else {
        selectedTags.push(tag);
        btn.classList.add('active');
    }
}

/**
 * Save journal entry
 */
function saveJournalEntry() {
    const marketSelect = document.getElementById('journal-market-select');
    const tradeSelect = document.getElementById('journal-trade-select');
    const textarea = document.getElementById('journal-text');
    
    const marketId = marketSelect.value;
    const tradeTimestamp = tradeSelect.value;
    const text = textarea.value.trim();
    
    if (!marketId) {
        showToast('Select a market');
        return;
    }
    
    if (!text) {
        showToast('Write something');
        return;
    }
    
    // Use selected calendar date, trade date, or now
    let entryDate;
    if (selectedCalendarDate) {
        entryDate = selectedCalendarDate.toISOString();
    } else if (tradeTimestamp) {
        entryDate = new Date(tradeTimestamp * 1000).toISOString();
    } else {
        entryDate = new Date().toISOString();
    }
    
    const entries = getJournalEntries();
    entries.unshift({
        id: Date.now(),
        marketId,
        marketTitle: marketTrades[marketId]?.title || 'Unknown',
        tradeTimestamp: tradeTimestamp ? parseInt(tradeTimestamp) : null,
        text,
        tags: [...selectedTags],
        date: entryDate,
        timezone: currentTimezone,
        created: new Date().toISOString()
    });
    
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
    
    // Reset form
    marketSelect.value = '';
    tradeSelect.style.display = 'none';
    textarea.value = '';
    selectedTags = [];
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    selectedCalendarDate = null;
    
    renderCalendar();
    loadJournalEntries();
    showToast('Entry saved');
}

/**
 * Get entries
 */
function getJournalEntries() {
    try {
        return JSON.parse(localStorage.getItem(JOURNAL_STORAGE_KEY) || '[]');
    } catch { return []; }
}

/**
 * Load and display entries
 */
function loadJournalEntries() {
    const container = document.getElementById('entries-list');
    if (!container) return;
    
    const entries = getJournalEntries();
    
    // Filter by selected calendar date if any
    let filtered = entries;
    if (selectedCalendarDate) {
        const selDate = selectedCalendarDate.toDateString();
        filtered = entries.filter(e => {
            const entryDate = new Date(e.date);
            return entryDate.toDateString() === selDate;
        });
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-data">No entries' + (selectedCalendarDate ? ' for this date' : '') + '</p>';
        return;
    }
    
    container.innerHTML = filtered.map(e => `
        <div class="entry-card">
            <div class="entry-header">
                <span class="entry-market">${escapeHtml(e.marketTitle?.substring(0, 40) || 'Unknown')}${e.marketTitle?.length > 40 ? '...' : ''}</span>
                <span class="entry-date">${formatEntryDate(e.date)}</span>
            </div>
            <div class="entry-text">${escapeHtml(e.text)}</div>
            ${e.tags?.length ? `<div class="entry-tags">${e.tags.map(t => `<span class="entry-tag">${getTagDisplay(t)}</span>`).join('')}</div>` : ''}
            <span class="entry-delete" onclick="deleteEntry(${e.id})">✕</span>
        </div>
    `).join('');
}

/**
 * Format entry date
 */
function formatEntryDate(isoString) {
    return new Date(isoString).toLocaleDateString('en-US', {
        timeZone: currentTimezone,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Delete entry
 */
function deleteEntry(id) {
    if (!confirm('Delete entry?')) return;
    const entries = getJournalEntries().filter(e => e.id !== id);
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
    renderCalendar();
    loadJournalEntries();
    showToast('Deleted');
}

/**
 * Render calendar
 */
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month');
    if (!grid || !monthLabel) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthLabel.textContent = currentCalendarDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric',
        timeZone: currentTimezone 
    });
    
    // Get entries dates
    const entries = getJournalEntries();
    const entryDates = new Set(entries.map(e => {
        const d = new Date(e.date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }));
    
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        .map(d => `<div class="calendar-day-header">${d}</div>`).join('');
    
    // Pad start
    for (let i = 0; i < startPad; i++) {
        const d = new Date(year, month, -startPad + i + 1);
        html += `<div class="calendar-day other-month">${d.getDate()}</div>`;
    }
    
    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dateKey = `${year}-${month}-${d}`;
        const isToday = date.toDateString() === today.toDateString();
        const hasEntry = entryDates.has(dateKey);
        const isSelected = selectedCalendarDate && date.toDateString() === selectedCalendarDate.toDateString();
        
        let cls = 'calendar-day';
        if (isToday) cls += ' today';
        if (hasEntry) cls += ' has-entry';
        if (isSelected) cls += ' selected';
        
        html += `<div class="${cls}" onclick="selectCalendarDay(${year}, ${month}, ${d})">${d}</div>`;
    }
    
    grid.innerHTML = html;
}

/**
 * Select calendar day
 */
function selectCalendarDay(year, month, day) {
    const date = new Date(year, month, day);
    
    if (selectedCalendarDate && date.toDateString() === selectedCalendarDate.toDateString()) {
        // Deselect
        selectedCalendarDate = null;
    } else {
        selectedCalendarDate = date;
    }
    
    renderCalendar();
    loadJournalEntries();
}

/**
 * Navigation
 */
function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

/**
 * Custom tags
 */
const defaultTags = {
    confident: '😎 Confident',
    uncertain: '🤔 Uncertain',
    fomo: '😰 FOMO',
    research: '📚 Researched',
    gut: '🎯 Gut Feel'
};

function getCustomTags() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_TAGS_KEY) || '[]');
    } catch { return []; }
}

function loadCustomTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;
    
    const customTags = getCustomTags();
    
    // Remove old custom tag buttons
    container.querySelectorAll('.custom-tag').forEach(b => b.remove());
    
    // Add custom tags
    customTags.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn custom-tag';
        btn.dataset.tag = t.name;
        btn.textContent = `${t.emoji} ${t.name}`;
        btn.onclick = () => toggleTag(btn);
        container.appendChild(btn);
    });
}

function getTagDisplay(tag) {
    if (defaultTags[tag]) return defaultTags[tag];
    const custom = getCustomTags().find(t => t.name === tag);
    return custom ? `${custom.emoji} ${custom.name}` : tag;
}

function openCustomTagModal() {
    const custom = getCustomTags();
    if (custom.length >= 3) {
        showToast('Max 3 custom tags');
        return;
    }
    document.getElementById('tag-modal').classList.remove('hidden');
}

function closeCustomTagModal() {
    document.getElementById('tag-modal').classList.add('hidden');
    document.getElementById('custom-tag-emoji').value = '';
    document.getElementById('custom-tag-name').value = '';
}

function saveCustomTag() {
    const emoji = document.getElementById('custom-tag-emoji').value.trim();
    const name = document.getElementById('custom-tag-name').value.trim().toLowerCase();
    
    if (!emoji || !name) {
        showToast('Fill in both fields');
        return;
    }
    
    const custom = getCustomTags();
    if (custom.length >= 3) {
        showToast('Max 3 custom tags');
        return;
    }
    
    if (custom.find(t => t.name === name) || defaultTags[name]) {
        showToast('Tag already exists');
        return;
    }
    
    custom.push({ emoji, name });
    localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(custom));
    
    loadCustomTags();
    closeCustomTagModal();
    showToast('Tag added');
}

/**
 * Utils
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hidden');
    }, 2000);
}
