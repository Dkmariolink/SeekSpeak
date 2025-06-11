/**
 * SeekSpeak Background Service Worker
 * Handles extension lifecycle and coordinates between content scripts
 */

class BackgroundService {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Extension installation and startup
    chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
    chrome.runtime.onStartup.addListener(this.onStartup.bind(this));
    
    // Message handling between content scripts and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Command handling (keyboard shortcuts)
    chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
    
    // Tab updates for YouTube navigation
    chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this));
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
    try {
      switch (message.type) {
        case 'GET_VIDEO_INFO':
          return await this.getVideoInfo(sender.tab);
          
        case 'UPDATE_BADGE':
          await this.updateBadge(sender.tab.id, message.status);
          break;
          
        case 'STORE_CAPTIONS':
          await this.storeCaptions(message.videoId, message.captions);
          break;
          
        case 'GET_CAPTIONS':
          return await this.getCaptions(message.videoId);
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { error: error.message };
    }
  }

  async handleCommand(command) {
    if (command === 'open-search') {
      // Get active YouTube tab
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true,
        url: 'https://www.youtube.com/watch*'
      });
      
      if (tab) {
        // Send message to content script to open search
        chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SEARCH' });
      }
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

  showWelcomeMessage() {
    // Create welcome notification or open options page
    console.log('Welcome to SeekSpeak! Use Ctrl+Shift+F to search video captions.');
  }
}

// Initialize the background service
new BackgroundService();