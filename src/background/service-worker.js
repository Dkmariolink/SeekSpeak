/**
 * SeekSpeak Background Service Worker
 * Handles extension lifecycle and coordinates between content scripts
 */

class BackgroundService {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Extension installation and startup - handled globally below
    // chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
    // chrome.runtime.onStartup.addListener(this.onStartup.bind(this));
    
    // Message handling - handled globally below 
    // chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Tab updates for YouTube navigation
    chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this));
    
    console.log('SeekSpeak Background: BackgroundService event listeners setup complete');
  }

  onInstalled(details) {
    console.log('SeekSpeak installed:', details.reason);
    
    if (details.reason === 'install') {
      // First time installation
      this.showWelcomeMessage();
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('SeekSpeak updated to version:', chrome.runtime.getManifest().version);
    }
  }

  onStartup() {
    console.log('SeekSpeak started');
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('SeekSpeak Background: Received message:', message.type);
    
    try {
      switch (message.type) {
        case 'GET_VIDEO_INFO':
          return await this.getVideoInfo(sender.tab);
          
        case 'UPDATE_BADGE':
          await this.updateBadge(sender.tab.id, message.status);
          return { success: true };
          
        case 'STORE_CAPTIONS':
          await this.storeCaptions(message.videoId, message.captions);
          return { success: true };
          
        case 'GET_CAPTIONS':
          return await this.getCaptions(message.videoId);

        case 'FETCH_CAPTION_URL':
          console.log('SeekSpeak Background: Handling FETCH_CAPTION_URL request');
          const result = await this.fetchCaptionUrl(message.url, message.videoId);
          console.log('SeekSpeak Background: Returning result:', result);
          return result;
          
        default:
          console.warn('SeekSpeak Background: Unknown message type:', message.type);
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('SeekSpeak Background: Error handling message:', error);
      return { success: false, error: error.message };
    }
  }

  async onTabUpdated(tabId, changeInfo, tab) {
    // Only process YouTube video pages
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('youtube.com/watch')) {
      
      // Clear badge when navigating to new video
      await this.updateBadge(tabId, 'ready');
    }
  }

  async getVideoInfo(tab) {
    // Extract video information from tab URL
    if (!tab.url || !tab.url.includes('youtube.com/watch')) {
      return null;
    }

    const url = new URL(tab.url);
    const videoId = url.searchParams.get('v');
    
    return {
      videoId,
      url: tab.url,
      title: tab.title
    };
  }

  async updateBadge(tabId, status) {
    const badgeText = {
      'ready': '',
      'loading': '...',
      'error': '!',
      'found': '✓'
    };

    const badgeColor = {
      'ready': '#4285f4',
      'loading': '#fbbc04', 
      'error': '#ea4335',
      'found': '#34a853'
    };

    await chrome.action.setBadgeText({
      tabId,
      text: badgeText[status] || ''
    });

    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: badgeColor[status] || '#4285f4'
    });

    // Notify content script about badge status change for button sync
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'BADGE_STATUS_UPDATE',
        status: status
      });
      console.log('SeekSpeak Background: Sent badge status update to content script:', status);
    } catch (error) {
      // Content script might not be ready yet, that's okay
      console.log('SeekSpeak Background: Could not send badge update to content script (tab not ready)');
    }
  }

  async storeCaptions(videoId, captions) {
    // Store captions in session storage (cleared when tab closes)
    await chrome.storage.session.set({
      [`captions_${videoId}`]: {
        data: captions,
        timestamp: Date.now()
      }
    });
  }

  async getCaptions(videoId) {
    const result = await chrome.storage.session.get(`captions_${videoId}`);
    const stored = result[`captions_${videoId}`];
    
    if (stored) {
      // Check if captions are less than 1 hour old
      const ageMs = Date.now() - stored.timestamp;
      if (ageMs < 60 * 60 * 1000) { // 1 hour
        return stored.data;
      } else {
        // Clean up old captions
        await chrome.storage.session.remove(`captions_${videoId}`);
      }
    }
    
    return null;
  }

  async fetchCaptionUrl(url, videoId) {
    console.log('SeekSpeak Background: Fetching caption URL:', url);
    
    try {
      // Background script can make requests with full browser permissions
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': navigator.userAgent,
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
          'Origin': 'https://www.youtube.com'
        },
        credentials: 'include',
        mode: 'cors'
      });

      console.log('SeekSpeak Background: Response status:', response.status);
      console.log('SeekSpeak Background: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.log('SeekSpeak Background: Response not OK:', response.status, response.statusText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status 
        };
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('SeekSpeak Background: Content-Type:', contentType);

      // Try to get the response text
      const text = await response.text();
      console.log('SeekSpeak Background: Response length:', text.length);
      console.log('SeekSpeak Background: First 200 chars:', text.substring(0, 200));

      if (text.length === 0) {
        console.log('SeekSpeak Background: Empty response received');
        return { 
          success: false, 
          error: 'Empty response from YouTube',
          contentType 
        };
      }

      // Check if we got an HTML error page instead of captions
      if (contentType.includes('text/html') && text.includes('<html')) {
        console.log('SeekSpeak Background: Received HTML page instead of captions');
        return { 
          success: false, 
          error: 'YouTube returned HTML page instead of captions (possibly authentication issue)',
          contentType 
        };
      }

      return {
        success: true,
        data: text,
        contentType,
        length: text.length
      };

    } catch (error) {
      console.error('SeekSpeak Background: Fetch error:', error);
      return {
        success: false,
        error: error.message,
        type: error.name
      };
    }
  }

  showWelcomeMessage() {
    // Create welcome notification or open options page
    console.log('Welcome to SeekSpeak! Use Ctrl+Shift+F to search video captions.');
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

// Add global logging to debug message handling
console.log('SeekSpeak Background: Service worker starting up');

// Debug: Log when service worker is ready
chrome.runtime.onStartup.addListener(() => {
  console.log('SeekSpeak Background: Runtime startup event fired');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('SeekSpeak Background: Extension installed/updated');
});

// Debug: Add additional message listener to catch any missed messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('SeekSpeak Background: Message received (global listener):', message);
  console.log('SeekSpeak Background: Sender tab:', sender.tab?.id);
  
  // Call the class method and return the promise
  const result = backgroundService.handleMessage(message, sender, sendResponse);
  
  // If it's a promise, handle it properly
  if (result instanceof Promise) {
    result.then(response => {
      console.log('SeekSpeak Background: Sending response:', response);
      sendResponse(response);
    }).catch(error => {
      console.error('SeekSpeak Background: Promise error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  } else {
    console.log('SeekSpeak Background: Sending sync response:', result);
    sendResponse(result);
  }
});

console.log('SeekSpeak Background: All listeners registered');