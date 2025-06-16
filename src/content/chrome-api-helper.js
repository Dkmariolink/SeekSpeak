/**
 * SeekSpeak Chrome API Helper
 * Provides robust, retry-enabled access to Chrome extension APIs
 * Handles extension context invalidation gracefully during fresh installs
 */

class ChromeAPIHelper {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.contextReady = false;
    this.readyPromise = this.waitForContext();
    this.setupMessageHandlers();
  }

  /**
   * Wait for Chrome extension context to be ready
   */
  async waitForContext() {
    console.log('SeekSpeak: ChromeAPIHelper waiting for extension context...');
    
    let attempts = 0;
    while (attempts < 20) { // Max 20 seconds
      try {
        // Test if Chrome APIs are accessible
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          // Test storage API
          await this.testStorageAPI();
          
          console.log('SeekSpeak: Chrome extension context is ready');
          this.contextReady = true;
          return true;
        }
      } catch (error) {
        console.warn(`SeekSpeak: Context check attempt ${attempts + 1} failed:`, error.message);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.error('SeekSpeak: Chrome extension context failed to initialize after 20 seconds');
    return false;
  }

  async testStorageAPI() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get({}, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(true);
        }
      });
    });
  }

  isContextReady() {
    return this.contextReady && chrome && chrome.runtime && chrome.runtime.id;
  }

  /**
   * Retry-enabled storage.sync.get
   */
  async storageGet(keys, defaultValues = {}) {
    if (!this.isContextReady()) {
      console.warn('SeekSpeak: Chrome context not ready, returning defaults');
      return defaultValues;
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          chrome.storage.sync.get(keys || defaultValues, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      } catch (error) {
        console.warn(`SeekSpeak: Storage get attempt ${attempt + 1} failed:`, error);
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    console.error('SeekSpeak: All storage get attempts failed, returning defaults');
    return defaultValues;
  }

  /**
   * Retry-enabled storage.sync.set
   */
  async storageSet(items) {
    if (!this.isContextReady()) {
      console.warn('SeekSpeak: Chrome context not ready, cannot save');
      return false;
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.sync.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
        return true;
      } catch (error) {
        console.warn(`SeekSpeak: Storage set attempt ${attempt + 1} failed:`, error);
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    console.error('SeekSpeak: All storage set attempts failed');
    return false;
  }

  /**
   * Retry-enabled storage.local.get
   */
  async storageLocalGet(keys, defaultValues = {}) {
    if (!this.isContextReady()) {
      console.warn('SeekSpeak: Chrome context not ready, returning defaults');
      return defaultValues;
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          chrome.storage.local.get(keys || defaultValues, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      } catch (error) {
        console.warn(`SeekSpeak: Storage local get attempt ${attempt + 1} failed:`, error);
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    console.error('SeekSpeak: All storage local get attempts failed, returning defaults');
    return defaultValues;
  }

  /**
   * Retry-enabled storage.local.set
   */
  async storageLocalSet(items) {
    if (!this.isContextReady()) {
      console.warn('SeekSpeak: Chrome context not ready, cannot save');
      return false;
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
        return true;
      } catch (error) {
        console.warn(`SeekSpeak: Storage local set attempt ${attempt + 1} failed:`, error);
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    console.error('SeekSpeak: All storage local set attempts failed');
    return false;
  }

  /**
   * Retry-enabled runtime.sendMessage
   */
  async sendMessage(message) {
    if (!this.isContextReady()) {
      console.warn('SeekSpeak: Chrome context not ready, cannot send message');
      return null;
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        console.warn(`SeekSpeak: Message send attempt ${attempt + 1} failed:`, error);
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    console.error('SeekSpeak: All message send attempts failed');
    return null;
  }

  /**
   * Set up message handlers for popup communication during fresh install
   */
  setupMessageHandlers() {
    // Handle popup ping messages immediately, even during initialization
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'PING') {
          console.log('SeekSpeak: Received PING from popup, responding with PONG');
          sendResponse({ pong: true });
          return true; // Keep message channel open
        }
        
        if (message.type === 'GET_CAPTION_STATUS') {
          // Respond with current status even if still initializing
          const status = this.getCurrentCaptionStatus();
          console.log('SeekSpeak: Responding to popup with caption status:', status);
          sendResponse(status);
          return true;
        }
        
        if (message.type === 'OPEN_SEARCH') {
          // Try to open search, but gracefully handle if not ready
          this.handleOpenSearchRequest();
          sendResponse({ success: true });
          return true;
        }
      });
      
      console.log('SeekSpeak: ChromeAPIHelper message handlers registered');
    }
  }

  getCurrentCaptionStatus() {
    // Check if extension components are available and ready
    if (window.uiController && typeof window.uiController.getCaptionStatus === 'function') {
      return window.uiController.getCaptionStatus();
    }
    
    // Fallback response during initialization
    return {
      available: false,
      segmentCount: 0,
      loading: true,
      error: null
    };
  }

  handleOpenSearchRequest() {
    if (window.uiController && window.uiController.showSearchOverlay) {
      console.log('SeekSpeak: Opening search overlay via popup request');
      window.uiController.showSearchOverlay();
    } else {
      console.warn('SeekSpeak: UI controller not ready for search overlay');
      // Try fallback keyboard shortcut
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F',
        ctrlKey: true,
        shiftKey: true
      }));
    }
  }
}

// Create and expose global instance
window.chromeAPIHelper = new ChromeAPIHelper();
console.log('SeekSpeak: ChromeAPIHelper loaded');
