/**
 * chat.js - AI Chat Feature
 * 
 * Allows users to ask follow-up questions about their trading.
 */

// Chat history for context
let chatHistory = [];

/**
 * Handle enter key in chat input
 */
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

/**
 * Ask a quick question
 */
function askQuickQuestion(question) {
    document.getElementById('chat-input').value = question;
    sendChatMessage();
}

/**
 * Send a chat message
 */
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!appState.stats) {
        showToast('Please analyze a wallet first');
        return;
    }
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addChatMessage('user', message);
    
    // Add to history
    chatHistory.push({ role: 'user', content: message });
    
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                stats: appState.stats,
                history: chatHistory.slice(-6) // Last 6 messages for context
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add assistant message
        addChatMessage('assistant', data.response);
        
        // Add to history
        chatHistory.push({ role: 'assistant', content: data.response });
        
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}

/**
 * Add a message to the chat
 */
function addChatMessage(role, content) {
    const container = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    
    // Convert markdown-style formatting
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `
        <div class="chat-avatar">${avatar}</div>
        <div class="chat-bubble">${formatted}</div>
    `;
    
    container.appendChild(messageDiv);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant typing';
    typingDiv.id = id;
    typingDiv.innerHTML = `
        <div class="chat-avatar">🤖</div>
        <div class="chat-bubble">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    
    return id;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

/**
 * Clear chat history
 */
function clearChat() {
    chatHistory = [];
    const container = document.getElementById('chat-messages');
    container.innerHTML = `
        <div class="chat-message assistant">
            <div class="chat-avatar">🤖</div>
            <div class="chat-bubble">
                Hi! I've analyzed your trading data. Ask me anything about your patterns, specific positions, or general trading advice.
            </div>
        </div>
    `;
}
