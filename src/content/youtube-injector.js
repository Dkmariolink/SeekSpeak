/**
 * SeekSpeak YouTube Injector
 * Detects YouTube video pages and coordinates extension functionality
 */

class YouTubeInjector {
  constructor() {
    this.currentVideoId = null;
    this.isYouTubePage = false;
    this.extensionSetup = false; // Track if extension setup has run for current video
    this.searchOverlay = null;
    
    this.init();
  }

  async init() {
    console.log('SeekSpeak: YouTube Injector initializing...');
    
    // Wait for document to be ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }
    
    // Wait for all components to be loaded
    await this.waitForComponents();
    
    // Set up initialization with multiple triggers for YouTube SPA
    this.setupInitialization();
  }

  setupInitialization() {
    // Try immediate initialization
    this.tryInitialize();
    
    // Set up event listeners for YouTube's SPA navigation
    this.observePageChanges();
    
    // Retry initialization after a delay in case YouTube is still loading
    setTimeout(() => this.tryInitialize(), 2000);
    setTimeout(() => this.tryInitialize(), 5000);
  }

  tryInitialize() {
    // Check if we're on a YouTube video page
    this.isYouTubePage = this.detectVideoPage();
    console.log('SeekSpeak: Is YouTube page?', this.isYouTubePage);
    
    if (this.isYouTubePage) {
      console.log('SeekSpeak: YouTube video page detected');
      
      // Get current video ID
      const videoId = this.extractVideoId();
      console.log('SeekSpeak: Video ID:', videoId);
      
      if (videoId && videoId !== this.currentVideoId) {
        const previousVideoId = this.currentVideoId;
        this.currentVideoId = videoId;
        this.extensionSetup = false; // Reset flag for new video
        console.log('SeekSpeak: Video ID changed from', previousVideoId, 'to', videoId);
        this.setupExtension();
        this.setupMessageListeners();
        this.extensionSetup = true;
      } else if (videoId && !this.extensionSetup) {
        // First time on this video and extension not yet set up
        console.log('SeekSpeak: Setting up extension for current video:', videoId);
        this.extensionSetup = true;
        this.setupExtension();
        this.setupMessageListeners();
      }
    } else {
      console.log('SeekSpeak: Not a YouTube video page');
    }
  }

  async waitForComponents() {
    console.log('SeekSpeak: Waiting for components to load...');
    
    const maxWait = 15000; // 15 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (window.chromeAPIHelper && 
          window.captionFetcher && 
          window.searchEngine && 
          window.uiController) {
        console.log('SeekSpeak: All components including ChromeAPIHelper loaded successfully');
        
        // Wait longer for ChromeAPIHelper to initialize and become ready
        console.log('SeekSpeak: Waiting for ChromeAPIHelper to be fully ready...');
        try {
          await window.chromeAPIHelper.readyPromise;
          console.log('SeekSpeak: ChromeAPIHelper is ready');
          
          // Additional wait to ensure Chrome APIs are stable
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('SeekSpeak: Additional stabilization delay complete');
          
          return;
        } catch (error) {
          console.warn('SeekSpeak: ChromeAPIHelper readiness check failed:', error);
          // Continue anyway, but with degraded functionality
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('SeekSpeak: Some components may not have loaded:', {
      chromeAPIHelper: !!window.chromeAPIHelper,
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
      await window.chromeAPIHelper.sendMessage({
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
              
              // Update badge to show ready/found
              await window.chromeAPIHelper.sendMessage({
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
                await window.chromeAPIHelper.sendMessage({
                  type: 'UPDATE_BADGE',
                  status: 'error'
                });
                return false;
              }
            } else {
              console.warn('SeekSpeak: Failed to build search index');
              await window.chromeAPIHelper.sendMessage({
                type: 'UPDATE_BADGE',
                status: 'error'
              });
              return false;
            }
          } else {
            console.error('SeekSpeak: Search engine not available');
            await window.chromeAPIHelper.sendMessage({
              type: 'UPDATE_BADGE',
              status: 'error'
            });
            return false;
          }
        } else {
          console.warn('SeekSpeak: No caption data available');
          await window.chromeAPIHelper.sendMessage({
            type: 'UPDATE_BADGE',
            status: 'warning'
          });
          
          // Still initialize UI controller for no-caption videos
          if (window.uiController) {
            console.log('SeekSpeak: Initializing UI controller (no captions)');
            await window.uiController.init();
          }
          
          return false;
        }
      } else {
        console.error('SeekSpeak: Caption fetcher not available');
        await window.chromeAPIHelper.sendMessage({
          type: 'UPDATE_BADGE',
          status: 'error'
        });
        return false;
      }
      
    } catch (error) {
      console.error('SeekSpeak setup error:', error);
      
      await window.chromeAPIHelper.sendMessage({
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
          this.tryInitialize(); // Use tryInitialize instead of handlePageChange
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
      setTimeout(() => this.tryInitialize(), 200);
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
    // Use a single listener to avoid conflicts
    if (this.messageListenerSetup) {
      console.log('SeekSpeak: Message listeners already set up');
      return;
    }
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('SeekSpeak: YouTubeInjector received message:', message.type);
      
      // Handle messages synchronously and immediately
      try {
        switch (message.type) {
          case 'PING':
            sendResponse({ pong: true });
            break;
            
          case 'GET_CURRENT_VIDEO':
            sendResponse({
              videoId: this.currentVideoId,
              url: window.location.href,
              videoTitle: this.extractVideoTitle()
            });
            break;
            
          case 'GET_CAPTION_STATUS':
            if (window.uiController && window.uiController.getCaptionStatus) {
              const status = window.uiController.getCaptionStatus();
              sendResponse(status);
            } else {
              sendResponse({ available: false, loading: true });
            }
            break;
            
          case 'OPEN_SEARCH':
            if (window.uiController) {
              // Use setTimeout to avoid blocking the response
              setTimeout(() => window.uiController.showSearchOverlay(), 0);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'UI controller not ready' });
            }
            break;
            
          default:
            sendResponse({ error: 'Unknown message type' });
            break;
        }
      } catch (error) {
        console.error('SeekSpeak: Error handling message:', error);
        sendResponse({ error: error.message });
      }
      
      // Return false to indicate synchronous response
      return false;
    });
    
    this.messageListenerSetup = true;
    console.log('SeekSpeak: Message listeners set up');
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

// Enhanced initialization system for new tab compatibility and first-time loading
console.log('SeekSpeak: YouTube Injector script loaded on:', window.location.href);
console.log('SeekSpeak: Document ready state at load:', document.readyState);

// Enhanced initialization with comprehensive error handling and robust retry system
async function initializeSeekSpeak() {
  try {
    console.log('SeekSpeak: Attempting initialization on', window.location.href);
    console.log('SeekSpeak: Document ready state:', document.readyState);
    console.log('SeekSpeak: Body exists:', !!document.body);
    console.log('SeekSpeak: Is watch page:', window.location.href.includes('/watch'));
    
    // Check if already initialized
    if (window.seekSpeakInjector) {
      console.log('SeekSpeak: Already initialized, checking if still valid');
      
      // Re-initialize if URL changed (for new tabs)
      const currentVideoId = extractVideoIdFromUrl();
      if (currentVideoId && currentVideoId !== window.seekSpeakInjector.currentVideoId) {
        console.log('SeekSpeak: Video ID changed, re-initializing for new video');
        window.seekSpeakInjector.currentVideoId = currentVideoId;
        window.seekSpeakInjector.handlePageChange();
      }
      return;
    }
    
    // Only initialize on watch pages
    if (!window.location.href.includes('/watch')) {
      console.log('SeekSpeak: Not a watch page, skipping initialization');
      return;
    }
    
    // Add initialization lock to prevent concurrent initialization
    if (window.seekSpeakInitializing) {
      console.log('SeekSpeak: Already initializing, skipping duplicate attempt');
      return;
    }
    window.seekSpeakInitializing = true;
    
    // Verify all components are loaded
    const componentsLoaded = window.chromeAPIHelper &&
                           window.captionFetcher && 
                           window.searchEngine && 
                           window.uiController &&
                           window.seekSpeakCustomUI;
    
    if (!componentsLoaded) {
      console.log('SeekSpeak: Components not all loaded yet, will retry');
      console.log('SeekSpeak: chromeAPIHelper:', !!window.chromeAPIHelper);
      console.log('SeekSpeak: captionFetcher:', !!window.captionFetcher);
      console.log('SeekSpeak: searchEngine:', !!window.searchEngine);  
      console.log('SeekSpeak: uiController:', !!window.uiController);
      console.log('SeekSpeak: seekSpeakCustomUI:', !!window.seekSpeakCustomUI);
      
      // Clear initialization lock
      window.seekSpeakInitializing = false;
      
      // More aggressive retry for first-time loading
      setTimeout(() => {
        if (!window.seekSpeakInjector) {
          console.log('SeekSpeak: Retrying initialization after component load delay');
          initializeSeekSpeak();
        }
      }, 500);
      return;
    }
    
    console.log('SeekSpeak: All components loaded, creating YouTubeInjector');
    
    // Initialize custom UI first (now async)
    if (window.seekSpeakCustomUI && window.seekSpeakCustomUI.init) {
      console.log('SeekSpeak: Initializing custom UI...');
      await window.seekSpeakCustomUI.init();
      console.log('SeekSpeak: Custom UI initialized successfully');
    } else {
      console.warn('SeekSpeak: Custom UI not available');
    }
    
    window.seekSpeakInjector = new YouTubeInjector();
    console.log('SeekSpeak: YouTubeInjector created successfully');
    
    // Mark as successfully initialized
    window.seekSpeakInitialized = true;
    window.seekSpeakInitializing = false; // Clear initialization lock
    
  } catch (error) {
    console.error('SeekSpeak: Failed to initialize:', error);
    console.error('SeekSpeak: Error stack:', error.stack);
    
    // Clear initialization lock on error
    window.seekSpeakInitializing = false;
    
    // More aggressive retry after error
    setTimeout(() => {
      console.log('SeekSpeak: Retrying initialization after error...');
      if (!window.seekSpeakInjector) {
        initializeSeekSpeak();
      }
    }, 1000);
  }
}

// Helper function to extract video ID
function extractVideoIdFromUrl() {
  const url = window.location.href;
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

// Multiple initialization strategies for maximum compatibility with first-time loading
console.log('SeekSpeak: Setting up enhanced initialization strategies');

// Strategy 1: Immediate initialization if page already loaded (with delay for Chrome APIs)
if (document.readyState === 'loading') {
  console.log('SeekSpeak: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('SeekSpeak: DOMContentLoaded fired, waiting for Chrome APIs to stabilize');
    setTimeout(initializeSeekSpeak, 2000); // 2 second delay for fresh installs
  });
} else {
  // Page already loaded
  console.log('SeekSpeak: Document already loaded, waiting for Chrome APIs to stabilize');
  setTimeout(initializeSeekSpeak, 2000); // 2 second delay for fresh installs
}

// Strategy 2: Single safety net for first-time loading
setTimeout(() => {
  if (!window.seekSpeakInjector && !window.seekSpeakInitializing && window.location.href.includes('/watch')) {
    console.log('SeekSpeak: Safety net initialization triggered (5s)');
    initializeSeekSpeak();
  }
}, 5000);

// Strategy 3: Listen for YouTube navigation events
document.addEventListener('yt-navigate-finish', () => {
  console.log('SeekSpeak: YouTube navigation finished, checking if initialization needed');
  setTimeout(() => {
    if (window.location.href.includes('/watch') && !window.seekSpeakInjector && !window.seekSpeakInitializing) {
      console.log('SeekSpeak: Post-navigation initialization triggered');
      initializeSeekSpeak();
    }
  }, 200);
});

// Strategy 4: Enhanced visibility change detection (for new tabs and first-time loading)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.location.href.includes('/watch')) {
    console.log('SeekSpeak: Page became visible, checking initialization');
    setTimeout(() => {
      if (!window.seekSpeakInjector && !window.seekSpeakInitializing) {
        console.log('SeekSpeak: Visibility-based initialization triggered');
        initializeSeekSpeak();
      }
    }, 100);
  }
});

// Strategy 5: MutationObserver for DOM changes (detect when YouTube fully loads)
const initObserver = new MutationObserver((mutations) => {
  if (!window.seekSpeakInjector && !window.seekSpeakInitializing && window.location.href.includes('/watch')) {
    // Check if critical YouTube elements are now present
    const playerElement = document.getElementById('movie_player');
    const subscribeButton = document.querySelector('ytd-subscribe-button-renderer');
    
    if (playerElement && subscribeButton) {
      console.log('SeekSpeak: YouTube player and UI detected via MutationObserver');
      initObserver.disconnect(); // Stop observing once we initialize
      setTimeout(initializeSeekSpeak, 200);
    }
  }
});

// Start observing once document is available
if (document.body) {
  initObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

console.log('SeekSpeak: All initialization strategies set up with enhanced first-time loading support');