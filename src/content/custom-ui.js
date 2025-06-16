/**
 * SeekSpeak Custom UI - Simple Button Integration
 */

class SeekSpeakCustomUI {
  constructor() {
    this.button = null;
    this.captionsReady = false;
    this.isLoading = false;
    this.checkInterval = null; // For periodic caption checking
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('seekspeak-button-styles')) return;

    // Wait for document head to be ready
    const injectWhenReady = () => {
      if (!document.head) {
        setTimeout(injectWhenReady, 100);
        return;
      }

      const style = document.createElement('style');
      style.id = 'seekspeak-button-styles';
      style.textContent = `
        .seekspeak-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--yt-spec-text-primary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 18px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-left: 12px;
          transition: all 0.1s ease;
          font-family: "Roboto", "Arial", sans-serif;
          height: 36px;
          min-width: 140px;
          justify-content: center;
          box-sizing: border-box;
        }

        .seekspeak-button:hover:not(.loading):not(.disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .seekspeak-button.disabled {
          background: var(--yt-spec-button-chip-background-disabled);
          color: var(--yt-spec-text-disabled);
          border-color: transparent;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .seekspeak-button.loading {
          background: rgba(255, 255, 255, 0.1);
          color: var(--yt-spec-text-secondary);
          border-color: rgba(255, 255, 255, 0.1);
          cursor: not-allowed;
          pointer-events: none;
        }

        .seekspeak-button.retry {
          background: rgba(255, 193, 7, 0.1);
          color: var(--yt-spec-text-primary);
          border: 1px solid rgba(255, 193, 7, 0.3);
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .seekspeak-button.retry:hover {
          background: rgba(255, 193, 7, 0.2);
          border-color: rgba(255, 193, 7, 0.5);
        }

        .seekspeak-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 3px;
          line-height: 1;
        }

        .seekspeak-icon img {
          width: 16px;
          height: 16px;
          border-radius: 2px;
        }

        .seekspeak-button.disabled .seekspeak-icon {
          opacity: 0.5;
        }

        .seekspeak-button.loading .seekspeak-icon {
          animation: seekspeak-pulse 1.2s ease-in-out infinite;
        }

        @keyframes seekspeak-pulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        /* Loading dots animation - prevent layout shift */
        .seekspeak-loading-dots {
          display: inline-block;
          min-width: 18px; /* Space for "..." */
          text-align: left;
        }

        .seekspeak-loading-dots::after {
          content: '';
          animation: seekspeak-dots 1.5s infinite;
        }

        @keyframes seekspeak-dots {
          0%, 20% { content: ''; }
          25%, 45% { content: '.'; }
          50%, 70% { content: '..'; }
          75%, 95% { content: '...'; }
        }

        /* Ensure proper flex layout with subscribe button */
        ytd-subscribe-button-renderer {
          margin-right: 0 !important;
        }
      `;

      // Safely append to head with error handling
      try {
        if (document.head) {
          document.head.appendChild(style);
          console.log('SeekSpeak: Button styles injected successfully');
        } else {
          console.error('SeekSpeak: document.head is still null, cannot inject styles');
        }
      } catch (error) {
        console.error('SeekSpeak: Error injecting button styles:', error);
      }
    };
    
    injectWhenReady();
  }

  createButton() {
    if (this.button) {
      console.log('SeekSpeak: Button already exists, skipping creation');
      return true; // Button already exists
    }

    // Wait for document to be ready
    if (!document.body) {
      console.log('SeekSpeak: Document body not ready yet');
      return false;
    }

    // Find the subscribe button container more precisely
    const subscribeSelectors = [
      'ytd-subscribe-button-renderer',
      '#subscribe-button ytd-subscribe-button-renderer',
      '#subscribe-button'
    ];

    let subscribeElement = null;
    for (const selector of subscribeSelectors) {
      subscribeElement = document.querySelector(selector);
      if (subscribeElement) {
        console.log('SeekSpeak: Found subscribe button with selector:', selector);
        break;
      }
    }

    if (!subscribeElement) {
      console.log('SeekSpeak: Subscribe button not found, will retry');
      return false;
    }

    // Find the container that holds the subscribe button
    let container = subscribeElement.parentNode;
    
    // Make sure container can handle flex layout
    if (container) {
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '12px';
    }

    // Create SeekSpeak button
    this.button = document.createElement('button');
    this.button.className = 'seekspeak-button loading'; // Start in loading state
    this.button.title = 'Loading captions, please wait...';

    // Try to get the icon URL, fallback to text if extension API not available
    let iconHTML = '';
    try {
      if (window.chromeAPIHelper && window.chromeAPIHelper.isContextReady() && 
          typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        const iconUrl = chrome.runtime.getURL('assets/icons/icon16.png');
        iconHTML = `<img src="${iconUrl}" alt="SeekSpeak" style="width: 16px; height: 16px;">`;
        console.log('SeekSpeak: Using extension icon from:', iconUrl);
      } else {
        // Fallback to search icon if chrome API not available
        iconHTML = `<span style="font-size: 14px;">🔍</span>`;
        console.log('SeekSpeak: Using fallback search icon');
      }
    } catch (error) {
      console.log('SeekSpeak: Chrome runtime not available, using fallback icon:', error);
      iconHTML = `<span style="font-size: 14px;">🔍</span>`;
    }
    
    this.button.innerHTML = `
      <span class="seekspeak-icon">${iconHTML}</span>
      <span>Loading<span class="seekspeak-loading-dots"></span></span>
    `;

    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openSeekSpeakSearch();
    });

    // Insert after subscribe button
    try {
      if (subscribeElement.nextSibling) {
        container.insertBefore(this.button, subscribeElement.nextSibling);
      } else {
        container.appendChild(this.button);
      }
      
      console.log('SeekSpeak: Button added next to subscribe button successfully');
      
      // Set initial loading state
      this.isLoading = true;
      this.captionsReady = false;
      
      // Check if captions are already available after a brief delay
      setTimeout(() => this.checkExistingCaptions(), 1000);
      
      return true; // Success
    } catch (error) {
      console.error('SeekSpeak: Error inserting button:', error);
      this.button = null; // Clean up on failure
      return false;
    }
  }

  // Check if captions are already loaded and update button state accordingly
  checkExistingCaptions() {
    console.log('SeekSpeak: Checking for existing captions');
    
    // First, check if the extension is fully initialized
    if (!this.isExtensionReady()) {
      console.log('SeekSpeak: Extension not fully ready, will retry in 2 seconds');
      setTimeout(() => this.checkExistingCaptions(), 2000);
      return;
    }
    
    // Use the same logic as the popup for accuracy
    if (window.uiController && typeof window.uiController.getCaptionStatus === 'function') {
      const status = window.uiController.getCaptionStatus();
      console.log('SeekSpeak: Caption status from UI controller:', status);
      
      if (status && status.available && status.segmentCount > 0) {
        console.log('SeekSpeak: Found existing captions, updating button to ready state');
        this.updateButtonState('ready');
        return;
      }
    }
    
    // If no captions found, trigger loading process
    console.log('SeekSpeak: No existing captions found, starting fetch process');
    this.startCaptionFetching();
  }

  // Check if extension components are ready
  isExtensionReady() {
    const componentsReady = window.chromeAPIHelper && 
                           window.captionFetcher && 
                           window.searchEngine && 
                           window.uiController;
    
    const chromeAPIReady = window.chromeAPIHelper && 
                          window.chromeAPIHelper.isContextReady && 
                          window.chromeAPIHelper.isContextReady();
    
    console.log('SeekSpeak: Extension readiness check:', {
      componentsReady,
      chromeAPIReady,
      chromeAPIHelper: !!window.chromeAPIHelper,
      captionFetcher: !!window.captionFetcher,
      searchEngine: !!window.searchEngine,
      uiController: !!window.uiController
    });
    
    return componentsReady && chromeAPIReady;
  }

  // Start the caption fetching process with loading state
  startCaptionFetching() {
    if (this.isLoading) {
      console.log('SeekSpeak: Already loading captions - resetting loading state');
      this.isLoading = false; // Reset stuck loading state
      // Don't return, continue with fresh attempt
    }

    // Don't start if extension isn't ready
    if (!this.isExtensionReady()) {
      console.log('SeekSpeak: Extension not ready, showing retry button');
      this.updateButtonState('retry', 'Retry');
      return;
    }

    // Check if youtube-injector is already processing captions (not just tracking video ID)
    const videoId = this.extractVideoId();
    if (window.seekSpeakInjector && window.seekSpeakInjector.currentVideoId === videoId) {
      // Check if captions are actually being processed or are ready
      if (window.uiController && window.uiController.getCaptionStatus) {
        const status = window.uiController.getCaptionStatus();
        if (status && (status.available || status.loading)) {
          console.log('SeekSpeak: YouTube injector handling this video and captions are available/loading');
          setTimeout(() => this.checkExistingCaptions(), 2000);
          return;
        }
      }
      console.log('SeekSpeak: YouTube injector tracking video but captions not processing yet - proceeding with custom UI fetch');
    }

    this.isLoading = true; // Set loading flag
    this.updateButtonState('loading');
    
    // Add a timeout to prevent infinite loading (30 seconds)
    const loadingTimeout = setTimeout(() => {
      if (this.isLoading) {
        console.warn('SeekSpeak: Loading timeout reached, showing retry option');
        this.isLoading = false; // Clear loading flag
        this.updateButtonState('retry', 'Retry');
      }
    }, 30000);
    
    // Set up periodic checking for when captions become available
    this.checkInterval = setInterval(() => {
      this.checkCaptionReadiness();
    }, 1000); // Check every second
    
    // Stop checking after 30 seconds
    setTimeout(() => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        clearTimeout(loadingTimeout);
        if (this.isLoading) {
          this.isLoading = false; // Clear loading flag
          this.updateButtonState('retry', 'Retry');
        }
      }
    }, 30000);
    
    // Try to trigger caption loading
    if (window.captionFetcher && window.captionFetcher.init) {
      const videoId = this.extractVideoId();
      console.log('SeekSpeak: DEBUG - Extracted video ID:', videoId, 'from URL:', window.location.href);
      
      if (videoId) {
        console.log('SeekSpeak: Starting caption fetch for video:', videoId);
        
        window.captionFetcher.init(videoId).then(async (result) => {
          console.log('SeekSpeak: Caption fetch completed with result:', result);
          
          if (result && result.segments && result.segments.length > 0) {
            console.log('SeekSpeak: Captions loaded successfully, count:', result.segments.length);
            
            // Build search index with the caption data
            if (window.searchEngine) {
              console.log('SeekSpeak: Building search index for', result.segments.length, 'segments');
              try {
                const indexBuilt = await window.searchEngine.buildIndex(result);
                if (indexBuilt) {
                  console.log('SeekSpeak: Search index built successfully');
                  this.updateButtonState('ready');
                } else {
                  console.warn('SeekSpeak: Failed to build search index');
                  this.updateButtonState('retry', 'Retry');
                }
              } catch (indexError) {
                console.error('SeekSpeak: Error building search index:', indexError);
                this.updateButtonState('retry', 'Retry');
              }
            } else {
              console.error('SeekSpeak: Search engine not available');
              this.updateButtonState('retry', 'Retry');
            }
          } else {
            console.log('SeekSpeak: No captions available for this video');
            this.updateButtonState('disabled', 'No Captions');
          }
          
          this.isLoading = false; // Clear loading flag
          clearTimeout(loadingTimeout);
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
          }
        }).catch((error) => {
          console.error('SeekSpeak: Caption fetch failed with error:', error);
          this.isLoading = false; // Clear loading flag
          clearTimeout(loadingTimeout);
          if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
          }
          this.updateButtonState('retry', 'Retry');
        });
      } else {
        console.error('SeekSpeak: Could not extract video ID from URL:', window.location.href);
        this.isLoading = false; // Clear loading flag
        clearTimeout(loadingTimeout);
        this.updateButtonState('disabled', 'No Video');
      }
    } else {
      console.error('SeekSpeak: CaptionFetcher not available - window.captionFetcher:', !!window.captionFetcher);
      this.isLoading = false; // Clear loading flag
      clearTimeout(loadingTimeout);
      this.updateButtonState('retry', 'Retry');
    }
  }

  // Check if captions have become ready (called periodically during loading)
  checkCaptionReadiness() {
    if (!this.isLoading) return;
    
    if (window.uiController && typeof window.uiController.getCaptionStatus === 'function') {
      const status = window.uiController.getCaptionStatus();
      
      if (status && status.available && status.segmentCount > 4) { // Real captions
        console.log('SeekSpeak: Captions became ready during loading check');
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
        this.updateButtonState('ready');
      }
    }
  }

  updateButtonState(state, message = '') {
    if (!this.button) return;

    const textSpan = this.button.querySelector('span:last-child');
    if (!textSpan) return;

    // Remove all previous state classes
    this.button.classList.remove('loading', 'disabled', 'retry');

    switch (state) {
      case 'loading':
        this.button.className = 'seekspeak-button loading';
        textSpan.innerHTML = 'Loading<span class="seekspeak-loading-dots"></span>';
        this.isLoading = true;
        this.captionsReady = false;
        this.button.title = 'Loading captions, please wait...';
        break;
        
      case 'ready':
        this.button.className = 'seekspeak-button';
        textSpan.innerHTML = 'Search Captions';
        this.isLoading = false;
        this.captionsReady = true;
        this.button.title = 'Search video captions with SeekSpeak';
        break;
        
      case 'disabled':
        this.button.className = 'seekspeak-button disabled';
        textSpan.innerHTML = message || 'No Captions';
        this.isLoading = false;
        this.captionsReady = false;
        this.button.title = 'No captions available for this video';
        break;
        
      case 'retry':
        this.button.className = 'seekspeak-button retry';
        textSpan.innerHTML = message || 'Retry';
        this.isLoading = false;
        this.captionsReady = false;
        this.button.title = 'Click to retry loading captions';
        break;
    }
  }

  openSeekSpeakSearch() {
    console.log('SeekSpeak: Opening caption search interface');
    
    // Handle retry state - user clicked to retry loading captions
    if (this.button && this.button.classList.contains('retry')) {
      console.log('SeekSpeak: Retry button clicked, attempting to reload captions');
      this.checkExistingCaptions();
      return;
    }
    
    // Prevent clicking if loading or disabled
    if (this.isLoading || !this.captionsReady) {
      console.log('SeekSpeak: Button click ignored - not ready:', { 
        isLoading: this.isLoading, 
        captionsReady: this.captionsReady,
        buttonClass: this.button ? this.button.className : 'no button'
      });
      return;
    }
    
    // Check if search overlay is already open and toggle it
    if (window.uiController && window.uiController.isVisible) {
      window.uiController.hideSearchOverlay();
      return;
    }
    
    // Open search interface
    if (window.uiController && window.uiController.showSearchOverlay) {
      window.uiController.showSearchOverlay();
    } else {
      // Fallback: trigger keyboard shortcut
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'F',
        ctrlKey: true,
        shiftKey: true
      }));
    }
  }

  // Extract video ID from current URL
  extractVideoId() {
    const url = window.location.href;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  async init() {
    console.log('SeekSpeak: Initializing button UI');
    
    // Wait for ChromeAPIHelper to be ready first
    if (window.chromeAPIHelper) {
      console.log('SeekSpeak: Waiting for ChromeAPIHelper to be ready...');
      await window.chromeAPIHelper.readyPromise;
      console.log('SeekSpeak: ChromeAPIHelper is ready for custom UI');
    } else {
      console.warn('SeekSpeak: ChromeAPIHelper not available, continuing with limited functionality');
    }
    
    // Create button with retry logic
    await this.createButtonWithRetry();
    
    // Set up automatic retry when extension becomes ready
    this.setupExtensionReadyListener();
    
    // Set up observer to watch for subscribe button appearing
    this.setupSubscribeButtonObserver();
    
    // Listen for badge status updates to sync button state with proper error handling
    try {
      if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.type === 'BADGE_STATUS_UPDATE') {
            console.log('SeekSpeak: Received badge status update:', message.status);
            this.syncButtonWithBadgeStatus(message.status);
          }
        });
        console.log('SeekSpeak: Badge status listener registered successfully');
      } else {
        console.warn('SeekSpeak: Chrome runtime not available for badge sync');
      }
    } catch (error) {
      console.error('SeekSpeak: Error setting up badge status listener:', error);
    }
    
    // Re-add button on navigation with proper cleanup
    document.addEventListener('yt-navigate-finish', () => {
      setTimeout(async () => {
        // Clean up old button and intervals
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
        if (this.button && this.button.parentNode) {
          this.button.remove();
        }
        this.button = null;
        this.captionsReady = false;
        this.isLoading = false;
        
        // Create new button with retry logic
        await this.createButtonWithRetry();
      }, 1000);
    });
  }

  setupExtensionReadyListener() {
    // Check periodically if extension becomes ready and button is in retry state
    const readyCheckInterval = setInterval(() => {
      if (this.button && this.button.classList.contains('retry') && this.isExtensionReady()) {
        console.log('SeekSpeak: Extension became ready, auto-retrying caption loading');
        clearInterval(readyCheckInterval);
        this.checkExistingCaptions();
      }
    }, 2000);
    
    // Also check if button needs to be created (for first video load)
    const buttonCheckInterval = setInterval(() => {
      if (!this.button) {
        console.log('SeekSpeak: Button missing, attempting to create...');
        this.createButtonWithRetry();
      }
    }, 3000);
    
    // Stop checking after 2 minutes
    setTimeout(() => {
      clearInterval(readyCheckInterval);
      clearInterval(buttonCheckInterval);
    }, 120000);
  }

  async createButtonWithRetry() {
    // Skip if button already exists
    if (this.button) {
      console.log('SeekSpeak: Button already exists, skipping retry');
      return true;
    }
    
    const maxAttempts = 15; // Try for up to 30 seconds (15 attempts * 2 second intervals)
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      try {
        const success = await this.createButton();
        if (success) {
          console.log('SeekSpeak: Button created successfully on attempt', attempt + 1);
          return true;
        }
      } catch (error) {
        console.warn(`SeekSpeak: Button creation attempt ${attempt + 1} failed:`, error);
      }
      
      attempt++;
      const delay = attempt <= 5 ? 1000 : 2000; // Shorter delays for first 5 attempts
      console.log(`SeekSpeak: Button creation attempt ${attempt} failed, retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.error('SeekSpeak: Failed to create button after', maxAttempts, 'attempts');
    return false;
  }

  setupSubscribeButtonObserver() {
    // Use MutationObserver to watch for subscribe button appearing
    const observer = new MutationObserver((mutations) => {
      // Only proceed if we don't have a button yet
      if (this.button) return;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if subscribe button was added
              const subscribeButton = node.querySelector ? 
                node.querySelector('ytd-subscribe-button-renderer') :
                (node.matches && node.matches('ytd-subscribe-button-renderer') ? node : null);
              
              if (subscribeButton) {
                console.log('SeekSpeak: Subscribe button detected via observer, creating SeekSpeak button');
                setTimeout(() => this.createButtonWithRetry(), 500); // Small delay to ensure it's fully rendered
                return;
              }
            }
          }
        }
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Stop observing after 2 minutes
    setTimeout(() => {
      observer.disconnect();
    }, 120000);
    
    console.log('SeekSpeak: Subscribe button observer set up');
  }

  syncButtonWithBadgeStatus(badgeStatus) {
    console.log('SeekSpeak: Syncing button with badge status:', badgeStatus);
    
    switch (badgeStatus) {
      case 'loading':
        this.updateButtonState('loading');
        break;
      case 'found':
        this.updateButtonState('ready');
        break;
      case 'warning':
        // No captions available
        this.updateButtonState('disabled', 'No Captions');
        break;
      case 'error':
        this.updateButtonState('disabled', 'No Captions');
        break;
      case 'ready':
        // Don't change button state on 'ready' - let normal flow handle it
        break;
    }
  }

  // Methods for compatibility with caption fetcher
  showLoadingOverlay() { /* Removed - no more overlay */ }
  updateLoadingProgress() { /* Removed - no more overlay */ }
  hideLoadingOverlay() { /* Removed - no more overlay */ }
}

// Create global instance
window.seekSpeakCustomUI = new SeekSpeakCustomUI();
console.log('SeekSpeak: Button UI loaded');
