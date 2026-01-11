/**
 * api.js - Polymarket Data API Integration
 * 
 * Handles all communication with the Polymarket Data API.
 * All endpoints are read-only and require no authentication.
 */

const API_BASE = 'https://data-api.polymarket.com';

// Store for pagination
let currentOffset = 0;
const LIMIT = 100;

/**
 * Fetch user activity (trades) from Polymarket
 * @param {string} walletAddress - The proxy wallet address
 * @param {number} limit - Number of records to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<Array>} - Array of activity records
 */
async function fetchActivity(walletAddress, limit = LIMIT, offset = 0) {
    const url = `${API_BASE}/activity?user=${walletAddress}&limit=${limit}&offset=${offset}&type=TRADE`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching activity:', error);
        throw error;
    }
}

/**
 * Fetch ALL user activity by paginating through results
 * @param {string} walletAddress - The proxy wallet address
 * @returns {Promise<Array>} - Complete array of all activity records
 */
async function fetchAllActivity(walletAddress) {
    let allActivity = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
        const batch = await fetchActivity(walletAddress, 500, offset);
        
        if (batch.length === 0) {
            hasMore = false;
        } else {
            allActivity = allActivity.concat(batch);
            offset += batch.length;
            
            // Safety check: stop at 10,000 records to prevent infinite loops
            if (offset >= 10000) {
                console.warn('Reached 10,000 record limit');
                hasMore = false;
            }
            
            // If we got less than 500, we've reached the end
            if (batch.length < 500) {
                hasMore = false;
            }
        }
    }
    
    return allActivity;
}

/**
 * Fetch current open positions
 * @param {string} walletAddress - The proxy wallet address
 * @returns {Promise<Array>} - Array of position records
 */
async function fetchPositions(walletAddress) {
    const url = `${API_BASE}/positions?user=${walletAddress}&sizeThreshold=0&limit=500`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Filter out dust positions (less than $1 current value)
        const filtered = data.filter(position => {
            const currentValue = position.currentValue || 0;
            return currentValue >= 1;
        });
        
        return filtered;
    } catch (error) {
        console.error('Error fetching positions:', error);
        throw error;
    }
}

/**
 * Fetch closed/historical positions with pagination
 * @param {string} walletAddress - The proxy wallet address
 * @returns {Promise<Array>} - Array of closed position records
 */
async function fetchClosedPositions(walletAddress) {
    let allClosed = [];
    let offset = 0;
    const limit = 50; // API max is 50 for this endpoint
    let hasMore = true;
    
    try {
        while (hasMore) {
            const url = `${API_BASE}/closed-positions?user=${walletAddress}&limit=${limit}&offset=${offset}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return allClosed;
                }
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.length === 0) {
                hasMore = false;
            } else {
                allClosed = allClosed.concat(data);
                offset += data.length;
                
                // Safety limit
                if (offset >= 10000) {
                    hasMore = false;
                }
                
                // If we got less than limit, we're done
                if (data.length < limit) {
                    hasMore = false;
                }
            }
        }
        
        return allClosed;
    } catch (error) {
        console.error('Error fetching closed positions:', error);
        return allClosed; // Return what we have so far
    }
}

/**
 * Fetch all data for a wallet
 * @param {string} walletAddress - The proxy wallet address
 * @returns {Promise<Object>} - Object containing activity, positions, and closedPositions
 */
async function fetchAllData(walletAddress) {
    // Validate wallet address format
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid wallet address format. Must be 0x followed by 40 hex characters.');
    }
    
    // Fetch all data in parallel
    const [activity, positions, closedPositions] = await Promise.all([
        fetchAllActivity(walletAddress),
        fetchPositions(walletAddress),
        fetchClosedPositions(walletAddress)
    ]);
    
    return {
        activity,
        positions,
        closedPositions,
        walletAddress
    };
}

// Export for use in other modules (if using modules)
// For now, these are global functions
