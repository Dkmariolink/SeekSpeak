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
  }

  /**
   * Wait for Chrome extension context to be ready
   */
  async waitForContext() {
    console.log('SeekSpeak: Waiting for Chrome extension context...');
    
    let attempts = 0;
    while (attempts < 20) { // Max 20 seconds
      try {
        // Test if Chrome APIs are accessible
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          
          // Test storage APIs specifically since those are failing
          await new Promise((resolve, reject) => {
            try {
              // Test both sync and local storage
              chrome.storage.sync.get({}, (result) => {
                if (chrome.runtime.lastError) {
                  reject(new Error('Sync storage test failed: ' + chrome.runtime.lastError.message));
                } else {
                  // Test local storage too
                  chrome.storage.local.get({}, (result2) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error('Local storage test failed: ' + chrome.runtime.lastError.message));
                    } else {
                      resolve(true);
                    }
                  });
                }
              });
            } catch (error) {
              reject(error);
            }
          });
          
          console.log('SeekSpeak: Chrome extension context and storage APIs are ready');
          this.contextReady = true;
          return true;
        }
      } catch (error) {
        console.log(`SeekSpeak: Chrome context not ready (attempt ${attempts + 1}):`, error.message);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.warn('SeekSpeak: Chrome extension context did not become ready after 20 seconds');
    console.log('SeekSpeak: Extension will continue with reduced functionality');
    
    // Even if we can't establish context, allow the extension to continue
    // This prevents complete failure during fresh installs
    return false;
  }

  /**
   * Check if extension context is currently valid
   */
  isContextValid() {
    try {
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.id && 
             chrome.storage && 
             chrome.storage.sync && 
             chrome.storage.local;
    } catch (error) {
      return false;
    }
  }

  /**
   * Safely call chrome.storage.sync.get with retry logic
   */
  async storageGet(keys, defaultValues = {}) {
    // Always try to wait for context first
    await this.readyPromise;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Check context validity right before the call
        if (!this.isContextValid()) {
          throw new Error('Chrome extension context not valid');
        }
        
        return await new Promise((resolve, reject) => {
          chrome.storage.sync.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      } catch (error) {
        console.warn(`SeekSpeak: Storage get attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === this.maxRetries - 1) {
          console.warn('SeekSpeak: All storage get attempts failed, using defaults');
          return typeof keys === 'object' ? { ...defaultValues, ...keys } : defaultValues;
        }
        
        // Wait before retrying, with exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Safely call chrome.storage.sync.set with retry logic
   */
  async storageSet(items) {
    await this.readyPromise;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          return await new Promise((resolve, reject) => {
            chrome.storage.sync.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        } else {
          throw new Error('Chrome storage API not available');
        }
      } catch (error) {
        console.warn(`SeekSpeak: Storage set attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === this.maxRetries - 1) {
          console.warn('SeekSpeak: All storage set attempts failed, operation skipped');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Safely call chrome.storage.local.get with retry logic
   */
  async storageLocalGet(keys, defaultValues = {}) {
    await this.readyPromise;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Check context validity right before the call
        if (!this.isContextValid()) {
          throw new Error('Chrome extension context not valid');
        }
        
        return await new Promise((resolve, reject) => {
          chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });
      } catch (error) {
        console.warn(`SeekSpeak: Local storage get attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === this.maxRetries - 1) {
          console.warn('SeekSpeak: All local storage get attempts failed, using defaults');
          return typeof keys === 'object' ? { ...defaultValues, ...keys } : defaultValues;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Safely call chrome.storage.local.set with retry logic
   */
  async storageLocalSet(items) {
    await this.readyPromise;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Check context validity right before the call
        if (!this.isContextValid()) {
          throw new Error('Chrome extension context not valid');
        }
        
        return await new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        console.warn(`SeekSpeak: Local storage set attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === this.maxRetries - 1) {
          console.warn('SeekSpeak: All local storage set attempts failed, operation skipped');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Safely call chrome.storage.local.remove with retry logic
   */
  async storageLocalRemove(keys) {
    await this.readyPromise;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          return await new Promise((resolve, reject) => {
            chrome.storage.local.remove(keys, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        } else {
          throw new Error('Chrome storage API not available');
        }
      } catch (error) {
        console.warn(`SeekSpeak: Local storage remove attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === this.maxRetries - 1) {
          console.warn('SeekSpeak: All local storage remove attempts failed, operation skipped');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Safely send message to background script
   */
  async sendMessage(message) {
    await this.readyPromise;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          return await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
              if (chrome.runtime.lastError) {
                // Some errors are expected (like "Could not establish connection")
                if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
                  console.log('SeekSpeak: Background script not ready, message dropped');
                  resolve(null);
                } else {
                  reject(new Error(chrome.runtime.lastError.message));
                }
              } else {
                resolve(response);
              }
            });
          });
        } else {
          throw new Error('Chrome runtime API not available');
        }
      } catch (error) {
        console.warn(`SeekSpeak: Send message attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === this.maxRetries - 1) {
          console.warn('SeekSpeak: All send message attempts failed, message dropped');
          return null;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Check if Chrome extension context appears to be ready
   */
  isContextReady() {
    return this.contextReady && 
           typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id;
  }
}

// Create global instance
window.chromeAPIHelper = new ChromeAPIHelper();
console.log('SeekSpeak: Chrome API Helper loaded');
