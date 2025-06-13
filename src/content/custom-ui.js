/**
 * SeekSpeak Custom UI - Simple Button Integration
 */

class SeekSpeakCustomUI {
  constructor() {
    this.button = null;
    this.captionsReady = false;
    this.isLoading = false;
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById('seekspeak-button-styles')) return;

    const style = document.createElement('style');
    style.id = 'seekspeak-button-styles';
    style.textContent = `
      .seekspeak-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--yt-spec-button-chip-background-hover);
        color: var(--yt-spec-text-primary);
        border: 1px solid var(--yt-spec-10-percent-layer);
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
        background: var(--yt-spec-button-chip-background-hover);
        border-color: var(--yt-spec-call-to-action);
      }

      .seekspeak-button.disabled {
        background: var(--yt-spec-button-chip-background-disabled);
        color: var(--yt-spec-text-disabled);
        border-color: var(--yt-spec-10-percent-layer);
        cursor: not-allowed;
        opacity: 0.6;
      }

      .seekspeak-button.loading {
        background: var(--yt-spec-button-chip-background-hover);
        color: var(--yt-spec-text-secondary);
        cursor: not-allowed;
        pointer-events: none;
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

      /* Loading dots animation */
      .seekspeak-loading-dots {
        display: inline-block;
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
    document.head.appendChild(style);
  }

  createButton() {
    if (this.button) return;

    // Find the subscribe button container more precisely
    const subscribeSelectors = [
      'ytd-subscribe-button-renderer',
      '#subscribe-button ytd-subscribe-button-renderer',
      '#subscribe-button'
    ];

    let subscribeElement = null;
    for (const selector of subscribeSelectors) {
      subscribeElement = document.querySelector(selector);
      if (subscribeElement) break;
    }

    if (!subscribeElement) {
      console.log('SeekSpeak: Subscribe button not found, will retry');
      setTimeout(() => this.createButton(), 2000);
      return;
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
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        const iconUrl = chrome.runtime.getURL('assets/icons/icon16.png');
        iconHTML = `<img src="${iconUrl}" alt="SeekSpeak" style="width: 16px; height: 16px;">`;
      } else {
        // Fallback to search icon if chrome API not available
        iconHTML = `<span style="font-size: 14px;">🔍</span>`;
      }
    } catch (error) {
      console.log('SeekSpeak: Chrome runtime not available, using fallback icon');
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
    if (subscribeElement.nextSibling) {
      container.insertBefore(this.button, subscribeElement.nextSibling);
    } else {
      container.appendChild(this.button);
    }
    
    console.log('SeekSpeak: Button added next to subscribe');
    
    // Set initial loading state
    this.isLoading = true;
    this.captionsReady = false;
    
    // Check if captions are already available after a brief delay
    setTimeout(() => this.checkExistingCaptions(), 1000);
  }

  // Check if captions are already loaded and update button state accordingly
  checkExistingCaptions() {
    console.log('SeekSpeak: Checking for existing captions');
    
    // Check if search engine has captions ready
    if (window.searchEngine && window.searchEngine.isReady && window.searchEngine.isReady()) {
      console.log('SeekSpeak: Found existing captions, updating button to ready state');
      this.updateButtonState('ready');
      return;
    }
    
    // Check if UI controller has captions available
    if (window.uiController && window.uiController.captionsAvailable) {
      console.log('SeekSpeak: UI Controller reports captions available');
      this.updateButtonState('ready');
      return;
    }
    
    // Check if caption fetcher has cached data
    if (window.captionFetcher && window.captionFetcher.getCurrentCaptions) {
      const captions = window.captionFetcher.getCurrentCaptions();
      if (captions && captions.length > 0) {
        console.log('SeekSpeak: Found cached captions');
        this.updateButtonState('ready');
        return;
      }
    }
    
    // If no captions found, trigger loading process
    console.log('SeekSpeak: No existing captions found, starting fetch process');
    this.startCaptionFetching();
  }

  // Start the caption fetching process with loading state
  startCaptionFetching() {
    if (this.isLoading) {
      console.log('SeekSpeak: Already loading captions');
      return;
    }

    this.updateButtonState('loading');
    
    // Try to trigger caption loading
    if (window.captionFetcher && window.captionFetcher.init) {
      const videoId = this.extractVideoId();
      if (videoId) {
        console.log('SeekSpeak: Starting caption fetch for video:', videoId);
        
        window.captionFetcher.init(videoId).then((result) => {
          if (result && result.segments && result.segments.length > 0) {
            console.log('SeekSpeak: Captions loaded successfully');
            this.updateButtonState('ready');
          } else {
            console.log('SeekSpeak: No captions available for this video');
            this.updateButtonState('disabled', 'No Captions');
          }
        }).catch((error) => {
          console.error('SeekSpeak: Error loading captions:', error);
          this.updateButtonState('disabled', 'No Captions');
        });
      } else {
        console.error('SeekSpeak: Could not extract video ID');
        this.updateButtonState('disabled', 'No Captions');
      }
    } else {
      console.error('SeekSpeak: CaptionFetcher not available');
      this.updateButtonState('disabled', 'No Captions');
    }
  }

  updateButtonState(state, message = '') {
    if (!this.button) return;

    const textSpan = this.button.querySelector('span:last-child');
    if (!textSpan) return;

    // Remove all previous state classes
    this.button.classList.remove('loading', 'disabled');

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
        this.button.title = 'Search video captions with SeekSpeak (click again to close)';
        break;
        
      case 'disabled':
        this.button.className = 'seekspeak-button disabled';
        textSpan.innerHTML = message || 'No Captions';
        this.isLoading = false;
        this.captionsReady = false;
        this.button.title = 'No captions available for this video';
        break;
    }
  }

  openSeekSpeakSearch() {
    console.log('SeekSpeak: Opening caption search interface');
    
    // Prevent clicking if loading or disabled
    if (this.isLoading || !this.captionsReady) {
      console.log('SeekSpeak: Button click ignored - not ready:', { 
        isLoading: this.isLoading, 
        captionsReady: this.captionsReady 
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

  init() {
    console.log('SeekSpeak: Initializing button UI');
    
    // Create button
    this.createButton();
    
    // Re-add button on navigation with proper cleanup
    document.addEventListener('yt-navigate-finish', () => {
      setTimeout(() => {
        // Clean up old button
        if (this.button && this.button.parentNode) {
          this.button.remove();
        }
        this.button = null;
        this.captionsReady = false;
        this.isLoading = false;
        
        // Create new button
        this.createButton();
      }, 1000);
    });
  }

  // Methods for compatibility with caption fetcher
  showLoadingOverlay() { /* Removed - no more overlay */ }
  updateLoadingProgress() { /* Removed - no more overlay */ }
  hideLoadingOverlay() { /* Removed - no more overlay */ }
}

// Create global instance
window.seekSpeakCustomUI = new SeekSpeakCustomUI();
console.log('SeekSpeak: Button UI loaded');
