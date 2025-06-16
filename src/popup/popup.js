/**
 * SeekSpeak Popup Script
 * Handles the extension popup interface with robust communication
 */

class PopupController {
  constructor() {
    this.currentTab = null;
    this.videoInfo = null;
    this.isYouTubeVideo = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 500; // ms
    
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
    
    // Load and display the current keyboard shortcut
    await this.loadKeyboardShortcut();
    
    // Get current tab and check if it's YouTube
    await this.checkCurrentTab();
    
    // Update UI based on current state
    this.updateUI();
  }

  async loadKeyboardShortcut() {
    try {
      // Get the current keyboard shortcut from storage
      const settings = await chrome.storage.sync.get({
        searchShortcut: 'Ctrl+Shift+F' // Default shortcut
      });
      
      console.log('SeekSpeak Popup: Loaded shortcut:', settings.searchShortcut);
      
      // Update the shortcut display in the button and help text
      const shortcutElements = document.querySelectorAll('.button-shortcut, .popup-help kbd');
      shortcutElements.forEach(element => {
        element.textContent = settings.searchShortcut;
      });
      
    } catch (error) {
      console.warn('SeekSpeak Popup: Could not load keyboard shortcut:', error);
      // Keep default values if loading fails
    }
  }

  setupEventListeners() {
    // Search button click
    this.elements.searchButton.addEventListener('click', () => {
      this.openSearch();
    });

    // Options link click
    const optionsLink = document.getElementById('options-link');
    if (optionsLink) {
      optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        window.close(); // Close popup after opening options
      });
    }

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

      // It's a YouTube video, verify content scripts are loaded
      await this.verifyContentScriptsLoaded();
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error checking tab:', error);
      this.setStatus('error', 'Error accessing current tab');
    }
  }

  async verifyContentScriptsLoaded() {
    try {
      this.setStatus('loading', 'Checking extension status...');
      
      // Try to ping content scripts with retry logic
      const isLoaded = await this.pingContentScripts();
      
      if (isLoaded) {
        console.log('SeekSpeak Popup: Content scripts are loaded and ready');
        await this.getVideoInfo();
      } else {
        console.warn('SeekSpeak Popup: Content scripts not responding after retries');
        
        // Check if we're on a YouTube video page at all
        if (this.isYouTubeVideo) {
          this.setStatus('warning', 'Extension not fully loaded');
          this.elements.captionStatus.textContent = 'Try refreshing the page';
          document.getElementById('troubleshoot').style.display = 'block';
        } else {
          this.setStatus('info', 'Open a YouTube video to search captions');
          this.elements.captionStatus.textContent = '';
        }
        
        // Enable retry button
        this.enableRetryButton();
      }
    } catch (error) {
      console.error('SeekSpeak Popup: Error verifying content scripts:', error);
      this.setStatus('error', 'Extension verification failed');
    }
  }

  async pingContentScripts(retryCount = 0) {
    try {
      console.log(`SeekSpeak Popup: Pinging content scripts (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      const response = await this.sendMessageWithTimeout(
        { type: 'PING' },
        1000 // 1 second timeout per attempt
      );
      
      if (response && response.pong) {
        return true;
      }
    } catch (error) {
      console.warn(`SeekSpeak Popup: Ping attempt ${retryCount + 1} failed:`, error.message);
    }
    
    // Retry if failed and haven't exceeded max retries
    if (retryCount < this.maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      return this.pingContentScripts(retryCount + 1);
    }
    
    return false;
  }

  async sendMessageWithTimeout(message, timeout = 2000) {
    return new Promise((resolve, reject) => {
      // Track if we've already responded
      let responded = false;
      
      const timeoutId = setTimeout(() => {
        if (!responded) {
          responded = true;
          reject(new Error('Message timeout'));
        }
      }, timeout);
      
      try {
        chrome.tabs.sendMessage(this.currentTab.id, message, (response) => {
          if (!responded) {
            responded = true;
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response || {});
            }
          }
        });
      } catch (error) {
        if (!responded) {
          responded = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      }
    });
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
      
      // Send message to content script to get video info with retry
      const response = await this.sendMessageWithRetry({
        type: 'GET_CURRENT_VIDEO'
      });
      
      if (response && response.videoId) {
        this.videoInfo = response;
        
        // Update video info display with actual video title
        this.elements.videoTitle.textContent = response.videoTitle || this.currentTab.title || 'YouTube Video';
        this.elements.videoInfo.style.display = 'block';
        
        // Check if captions are available
        await this.checkCaptionAvailability();
        
      } else {
        this.setStatus('warning', 'Video information not available');
        this.enableRetryButton();
      }
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error getting video info:', error);
      
      // More specific error message
      if (error.message && error.message.includes('Could not establish connection')) {
        this.setStatus('error', 'Extension not loaded on this page');
        this.elements.captionStatus.textContent = 'Try refreshing the page';
        document.getElementById('troubleshoot').style.display = 'block';
      } else {
        this.setStatus('error', 'Extension communication failed');
        this.elements.captionStatus.textContent = 'Click to retry';
      }
      
      this.enableRetryButton();
    }
  }

  async sendMessageWithRetry(message, retryCount = 0) {
    try {
      console.log(`SeekSpeak Popup: Sending message ${message.type} (attempt ${retryCount + 1})`);
      
      const response = await this.sendMessageWithTimeout(message, 2000);
      return response;
      
    } catch (error) {
      console.warn(`SeekSpeak Popup: Message ${message.type} failed:`, error.message);
      
      if (retryCount < this.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.sendMessageWithRetry(message, retryCount + 1);
      }
      
      throw error;
    }
  }

  async checkCaptionAvailability() {
    try {
      // Request caption status through message passing (not executeScript)
      const captionStatus = await this.sendMessageWithRetry({
        type: 'GET_CAPTION_STATUS'
      });
      
      console.log('SeekSpeak Popup: Received caption status:', captionStatus);

      if (captionStatus && captionStatus.available) {
        this.setStatus('ready', 'Ready to search captions');
        this.elements.captionStatus.textContent = `${captionStatus.segmentCount} caption segments found`;
        this.enableSearchButton();
        
      } else if (captionStatus && captionStatus.loading) {
        this.setStatus('loading', 'Loading captions...');
        this.elements.captionStatus.textContent = 'Please wait...';
        
        // Check again after a delay
        setTimeout(() => this.checkCaptionAvailability(), 2000);
        
      } else if (captionStatus && captionStatus.noCaptions) {
        // Definitively no captions available
        this.setStatus('warning', 'No captions available');
        this.elements.captionStatus.textContent = 'This video has no captions';
        this.disableSearchButton();
        // Don't show retry for videos without captions
        
      } else {
        this.setStatus('warning', 'No captions available for this video');
        this.elements.captionStatus.textContent = 'No captions found';
        this.disableSearchButton();
        
        // Still enable retry in case captions load later
        this.enableRetryButton();
      }
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error checking captions:', error);
      this.setStatus('warning', 'Cannot check caption status');
      this.elements.captionStatus.textContent = 'Status unknown';
      this.enableRetryButton();
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
    this.elements.searchButton.classList.remove('retry');
    this.elements.searchButton.querySelector('.button-text').textContent = 'Search Captions';
  }

  disableSearchButton() {
    this.elements.searchButton.disabled = true;
    this.elements.searchButton.classList.remove('enabled');
    this.elements.searchButton.classList.remove('retry');
  }

  enableRetryButton() {
    this.elements.searchButton.disabled = false;
    this.elements.searchButton.classList.add('retry');
    this.elements.searchButton.classList.remove('enabled');
    const buttonText = this.elements.searchButton.querySelector('.button-text');
    if (buttonText) {
      buttonText.textContent = 'Retry';
    }
    
    // Change click behavior to retry
    this.elements.searchButton.onclick = () => {
      this.retryInitialization();
    };
  }

  async retryInitialization() {
    console.log('SeekSpeak Popup: Retrying initialization');
    this.retryCount = 0; // Reset retry count
    
    // Reset button to loading state
    this.setStatus('loading', 'Retrying...');
    this.disableSearchButton();
    
    // Re-check current tab first
    await this.checkCurrentTab();
  }

  async openSearch() {
    console.log('SeekSpeak Popup: openSearch called');
    console.log('SeekSpeak Popup: isYouTubeVideo:', this.isYouTubeVideo);
    console.log('SeekSpeak Popup: videoInfo:', this.videoInfo);
    console.log('SeekSpeak Popup: currentTab:', this.currentTab);

    if (!this.isYouTubeVideo || !this.currentTab || !this.currentTab.id) {
      console.log('SeekSpeak Popup: Prerequisites not met');
      return;
    }

    try {
      console.log('SeekSpeak Popup: Sending OPEN_SEARCH message to tab:', this.currentTab.id);
      
      // Send message to content script to open search overlay with retry
      await this.sendMessageWithRetry({
        type: 'OPEN_SEARCH'
      });
      
      console.log('SeekSpeak Popup: Message sent successfully');
      
      // Close popup after opening search
      window.close();
      
    } catch (error) {
      console.error('SeekSpeak Popup: Error opening search:', error);
      this.setStatus('error', 'Failed to open search');
      
      // Enable retry
      this.enableRetryButton();
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
        
      case 'SETTINGS_UPDATED':
        // Update keyboard shortcut display if settings changed
        if (message.settings && message.settings.searchShortcut) {
          console.log('SeekSpeak Popup: Updating shortcut display to:', message.settings.searchShortcut);
          const shortcutElements = document.querySelectorAll('.button-shortcut, .popup-help kbd');
          shortcutElements.forEach(element => {
            element.textContent = message.settings.searchShortcut;
          });
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