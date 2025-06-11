/**
 * SeekSpeak Popup Script
 * Handles the extension popup interface
 */

class PopupController {
  constructor() {
    this.currentTab = null;
    this.videoInfo = null;
    this.isYouTubeVideo = false;
    
    this.elements = {
      statusIcon: document.getElementById('status-icon'),
      statusText: document.getElementById('status-text'),
      searchButton: document.getElementById('search-button'),
      videoInfo: document.getElementById('video-info'),
      videoTitle: document.getElementById('video-title'),
      captionStatus: document.getElementById('caption-status')
    };
    
    this.init();
  }

  async init() {
    console.log('SeekSpeak Popup: Initializing');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Get current tab and check if it's YouTube
    await this.checkCurrentTab();
    
    // Update UI based on current state
    this.updateUI();
  }

  setupEventListeners() {
    // Search button click
    this.elements.searchButton.addEventListener('click', () => {
      this.openSearch();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.openSearch();
      }
    });

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  async checkCurrentTab() {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      this.currentTab = tab;
      
      if (!tab) {
        this.setStatus('error', 'No active tab found');
        return;
      }

      // Check if it's a YouTube video page
      this.isYouTubeVideo = this.isYouTubeVideoUrl(tab.url);
      
      if (!this.isYouTubeVideo) {
        this.setStatus('info', 'Open a YouTube video to search captions');
        return;
      }

      // It's a YouTube video, get more info
      await this.getVideoInfo();
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error checking tab:', error);
      this.setStatus('error', 'Error accessing current tab');
    }
  }

  isYouTubeVideoUrl(url) {
    if (!url) return false;
    
    const patterns = [
      /youtube\.com\/watch\?.*v=/,
      /m\.youtube\.com\/watch\?.*v=/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  async getVideoInfo() {
    try {
      this.setStatus('loading', 'Checking video captions...');
      
      // Send message to content script to get video info
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'GET_CURRENT_VIDEO'
      });
      
      if (response && response.videoId) {
        this.videoInfo = response;
        
        // Update video info display
        this.elements.videoTitle.textContent = this.currentTab.title || 'YouTube Video';
        this.elements.videoInfo.style.display = 'block';
        
        // Check if captions are available
        await this.checkCaptionAvailability();
        
      } else {
        this.setStatus('warning', 'Video information not available');
      }
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error getting video info:', error);
      
      // More specific error message
      if (error.message && error.message.includes('Could not establish connection')) {
        this.setStatus('error', 'Extension not loaded on this page');
        this.elements.captionStatus.textContent = 'Try refreshing the page';
        // Show troubleshooting section
        document.getElementById('troubleshoot').style.display = 'block';
      } else {
        this.setStatus('error', 'Extension not active');
        this.elements.captionStatus.textContent = 'Extension not active';
      }
    }
  }

  async checkCaptionAvailability() {
    try {
      // Get caption status from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CAPTIONS',
        videoId: this.videoInfo.videoId
      });
      
      if (response && !response.error && response.segments) {
        this.setStatus('ready', 'Ready to search captions');
        this.elements.captionStatus.textContent = `${response.segments.length} caption segments`;
        this.enableSearchButton();
        
      } else {
        this.setStatus('warning', 'No captions available for this video');
        this.elements.captionStatus.textContent = 'No captions found';
      }
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error checking captions:', error);
      this.setStatus('warning', 'Captions status unknown');
      this.elements.captionStatus.textContent = 'Status unknown';
    }
  }

  setStatus(type, message) {
    const icons = {
      loading: '⏳',
      ready: '✅', 
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    
    const colors = {
      loading: '#ff9800',
      ready: '#ff0000',
      warning: '#ff9800', 
      error: '#ea4335',
      info: '#ff0000'
    };
    
    this.elements.statusIcon.textContent = icons[type] || 'ℹ️';
    this.elements.statusText.textContent = message;
    this.elements.statusIcon.style.color = colors[type] || '#4285f4';
  }

  enableSearchButton() {
    this.elements.searchButton.disabled = false;
    this.elements.searchButton.classList.add('enabled');
  }

  disableSearchButton() {
    this.elements.searchButton.disabled = true;
    this.elements.searchButton.classList.remove('enabled');
  }

  async openSearch() {
    if (!this.isYouTubeVideo || !this.videoInfo) {
      return;
    }

    try {
      // Send message to content script to open search overlay
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'OPEN_SEARCH'
      });
      
      // Close popup after opening search
      window.close();
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error opening search:', error);
      this.setStatus('error', 'Failed to open search');
    }
  }

  updateUI() {
    if (!this.isYouTubeVideo) {
      this.disableSearchButton();
      this.elements.videoInfo.style.display = 'none';
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'STATUS_UPDATE':
        this.setStatus(message.status, message.message);
        break;
        
      case 'CAPTION_UPDATE':
        if (message.available) {
          this.enableSearchButton();
          this.elements.captionStatus.textContent = `${message.count} segments available`;
        } else {
          this.elements.captionStatus.textContent = 'No captions available';
        }
        break;
        
      default:
        // Unknown message type
        break;
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});