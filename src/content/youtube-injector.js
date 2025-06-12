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
    
    // Wait for all components to be loaded
    await this.waitForComponents();
    
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

  async waitForComponents() {
    console.log('SeekSpeak: Waiting for components to load...');
    
    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (window.captionFetcher && window.searchEngine && window.uiController) {
        console.log('SeekSpeak: All components loaded successfully');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('SeekSpeak: Some components may not have loaded:', {
      captionFetcher: !!window.captionFetcher,
      searchEngine: !!window.searchEngine,
      uiController: !!window.uiController
    });
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

  extractVideoTitle() {
    // Try multiple selectors to get the video title
    const titleSelectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.title.style-scope.ytd-video-primary-info-renderer',
      'h1.style-scope.ytd-watch-metadata',
      '.ytd-watch-metadata h1',
      '#container h1'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }
    
    // Fallback to page title
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'YouTube') {
      // Remove " - YouTube" suffix if present
      return pageTitle.replace(/ - YouTube$/, '').trim();
    }
    
    return 'YouTube Video';
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
        console.log('SeekSpeak: Initializing caption fetcher');
        const captionData = await window.captionFetcher.init(this.currentVideoId);
        
        if (captionData && captionData.segments && captionData.segments.length > 0) {
          console.log('SeekSpeak: Caption data received, initializing search engine');
          // Initialize search engine with caption data
          if (window.searchEngine) {
            const indexBuilt = await window.searchEngine.buildIndex(captionData);
            if (indexBuilt) {
              console.log('SeekSpeak: Search index built successfully');
              
              // Update badge to show ready
              chrome.runtime.sendMessage({
                type: 'UPDATE_BADGE',
                status: 'found'
              });
              
              // Initialize UI controller
              if (window.uiController) {
                console.log('SeekSpeak: Initializing UI controller');
                await window.uiController.init();
                
                console.log('SeekSpeak: Extension setup complete for video', this.currentVideoId);
                return true; // Success
              } else {
                console.error('SeekSpeak: UI controller not available');
                return false;
              }
            } else {
              console.warn('SeekSpeak: Failed to build search index');
              return false;
            }
          } else {
            console.error('SeekSpeak: Search engine not available');
            return false;
          }
        } else {
          console.warn('SeekSpeak: No caption data available');
          chrome.runtime.sendMessage({
            type: 'UPDATE_BADGE',
            status: 'warning'
          });
          return false;
        }
      } else {
        console.error('SeekSpeak: Caption fetcher not available');
        return false;
      }
      
    } catch (error) {
      console.error('SeekSpeak setup error:', error);
      
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        status: 'error'
      });
      
      return false;
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
    let changeTimeout = null;
    
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      
      if (currentUrl !== lastUrl) {
        console.log('SeekSpeak: URL changed from', lastUrl, 'to', currentUrl);
        lastUrl = currentUrl;
        
        // Debounce rapid navigation changes
        if (changeTimeout) {
          clearTimeout(changeTimeout);
        }
        
        changeTimeout = setTimeout(() => {
          this.handlePageChange();
        }, 500); // Wait 500ms for YouTube to settle
      }
    };
    
    // Method 1: MutationObserver for DOM changes
    const observer = new MutationObserver(handleUrlChange);
    observer.observe(document, {
      subtree: true,
      childList: true
    });
    
    // Method 2: Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(handleUrlChange, 100);
    });
    
    // Method 3: Listen for YouTube's navigation events
    document.addEventListener('yt-navigate-start', () => {
      console.log('SeekSpeak: YouTube navigation started');
    });
    
    document.addEventListener('yt-navigate-finish', () => {
      console.log('SeekSpeak: YouTube navigation finished');
      setTimeout(handleUrlChange, 200);
    });
    
    // Method 4: Poll for URL changes as fallback (less efficient but reliable)
    setInterval(() => {
      handleUrlChange();
    }, 2000); // Check every 2 seconds as fallback
    
    console.log('SeekSpeak: Page change monitoring initialized');
  }

  async handlePageChange() {
    const newVideoId = this.extractVideoId();
    
    console.log('SeekSpeak: Handling page change - Current:', this.currentVideoId, 'New:', newVideoId);
    
    if (newVideoId && newVideoId !== this.currentVideoId) {
      console.log('SeekSpeak: Video changed from', this.currentVideoId, 'to', newVideoId);
      
      // Clean up previous video state
      this.cleanup();
      
      // Set up for new video with retry mechanism
      this.currentVideoId = newVideoId;
      
      // Wait a bit for YouTube to stabilize, then try setup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          console.log(`SeekSpeak: Setup attempt ${attempts + 1} for video ${newVideoId}`);
          
          // Try to set up the extension
          const success = await this.setupExtension();
          
          if (success) {
            console.log('SeekSpeak: Setup successful for video', newVideoId);
            break;
          } else {
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`SeekSpeak: Setup failed, retrying in 2 seconds (attempt ${attempts + 1}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.warn('SeekSpeak: Setup failed after', maxAttempts, 'attempts');
            }
          }
        } catch (error) {
          console.error(`SeekSpeak: Setup error on attempt ${attempts + 1}:`, error);
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    } else if (!newVideoId) {
      console.log('SeekSpeak: No video ID found, might not be a video page');
      // Navigated away from video page
      this.cleanup();
      this.currentVideoId = null;
    } else {
      console.log('SeekSpeak: Same video ID, no action needed');
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
            url: window.location.href,
            videoTitle: this.extractVideoTitle()
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