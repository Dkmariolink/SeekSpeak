/**
 * SeekSpeak YouTube Injector
 * Detects YouTube video pages and coordinates extension functionality
 */

class YouTubeInjector {
  constructor() {
    this.currentVideoId = null;
    this.isYouTubePage = false;
    this.searchOverlay = null;
    
    this.init();
  }

  async init() {
    console.log('SeekSpeak: YouTube Injector initializing...');
    
    // Check if we're on a YouTube video page
    this.isYouTubePage = this.detectVideoPage();
    console.log('SeekSpeak: Is YouTube page?', this.isYouTubePage);
    
    if (this.isYouTubePage) {
      console.log('SeekSpeak: YouTube video page detected');
      
      // Get current video ID
      this.currentVideoId = this.extractVideoId();
      console.log('SeekSpeak: Video ID:', this.currentVideoId);
      
      if (this.currentVideoId) {
        // Set up the extension for this video
        await this.setupExtension();
        
        // Monitor for page changes (YouTube SPA navigation)
        this.observePageChanges();
        
        // Listen for messages from background script
        this.setupMessageListeners();
      } else {
        console.warn('SeekSpeak: Could not extract video ID');
      }
    } else {
      console.log('SeekSpeak: Not a YouTube video page');
    }
  }

  detectVideoPage() {
    // Check URL patterns for YouTube video pages
    const url = window.location.href;
    const patterns = [
      /youtube\.com\/watch\?.*v=/,
      /m\.youtube\.com\/watch\?.*v=/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  extractVideoId() {
    const url = window.location.href;
    const patterns = [
      /[?&]v=([^&]+)/,           // youtube.com/watch?v=ID
      /youtu\.be\/([^?]+)/       // youtu.be/ID (rare on main site)
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  async setupExtension() {
    try {
      // Update badge to show loading
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        status: 'loading'
      });

      // Wait for video player to be ready
      await this.waitForVideoPlayer();
      
      // Initialize caption fetcher
      if (window.captionFetcher) {
        await window.captionFetcher.init(this.currentVideoId);
      }
      
      // Initialize search engine
      if (window.searchEngine) {
        window.searchEngine.init();
      }
      
      // Initialize UI controller
      if (window.uiController) {
        await window.uiController.init();
      }
      
      // Update badge to show ready
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        status: 'ready'
      });
      
      console.log('SeekSpeak: Extension setup complete for video', this.currentVideoId);
      
    } catch (error) {
      console.error('SeekSpeak setup error:', error);
      
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        status: 'error'
      });
    }
  }

  waitForVideoPlayer() {
    return new Promise((resolve) => {
      const checkPlayer = () => {
        const player = document.getElementById('movie_player') || 
                      document.querySelector('.html5-video-player');
        
        if (player) {
          resolve(player);
        } else {
          setTimeout(checkPlayer, 100);
        }
      };
      
      checkPlayer();
    });
  }

  observePageChanges() {
    // Monitor URL changes for YouTube's SPA navigation
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.handlePageChange();
      }
    });
    
    // Observe changes to the document
    observer.observe(document, {
      subtree: true,
      childList: true
    });
    
    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => this.handlePageChange(), 100);
    });
  }

  async handlePageChange() {
    const newVideoId = this.extractVideoId();
    
    if (newVideoId && newVideoId !== this.currentVideoId) {
      console.log('SeekSpeak: Video changed from', this.currentVideoId, 'to', newVideoId);
      
      // Clean up previous video state
      this.cleanup();
      
      // Set up for new video
      this.currentVideoId = newVideoId;
      await this.setupExtension();
      
    } else if (!newVideoId) {
      // Navigated away from video page
      this.cleanup();
      this.currentVideoId = null;
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'OPEN_SEARCH':
          this.openSearchOverlay();
          break;
          
        case 'GET_CURRENT_VIDEO':
          sendResponse({
            videoId: this.currentVideoId,
            url: window.location.href
          });
          break;
          
        default:
          // Forward to other components
          if (window.uiController) {
            window.uiController.handleMessage(message, sender, sendResponse);
          }
      }
    });
  }

  openSearchOverlay() {
    if (window.uiController) {
      window.uiController.showSearchOverlay();
    } else {
      console.warn('SeekSpeak: UI controller not ready');
    }
  }

  cleanup() {
    // Clean up any UI elements or event listeners
    if (window.uiController) {
      window.uiController.cleanup();
    }
    
    // Remove search overlay if present
    const existingOverlay = document.getElementById('seekspeak-root');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }
}

// Initialize when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeInjector();
  });
} else {
  new YouTubeInjector();
}