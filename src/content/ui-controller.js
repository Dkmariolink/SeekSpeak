/**
 * SeekSpeak UI Controller
 * Manages the search overlay interface and user interactions
 */

class UIController {
  constructor() {
    this.overlay = null;
    this.isVisible = false;
    this.currentResults = [];
    this.selectedResultIndex = -1;
    this.searchTimeout = null;
    this.themeDetector = null;
    this.captionsAvailable = false; // Track caption availability
  }

  async init() {
    console.log('SeekSpeak: UI Controller initialized');
    
    // Create search overlay
    this.createSearchOverlay();
    
    // Set up theme detection
    this.setupThemeDetection();
    
    // Set up global keyboard shortcuts
    this.setupGlobalKeyboardEvents();
    
    // Wait for captions to be ready
    await this.waitForCaptions();
  }

  async waitForCaptions() {
    console.log('SeekSpeak: UI Controller checking for caption data');
    
    // Check multiple sources for captions
    const captionData = window.captionFetcher?.getCurrentCaptions();
    const searchEngine = window.searchEngine;
    const hasSearchIndex = searchEngine && searchEngine.isReady && searchEngine.isReady();
    
    console.log('SeekSpeak: Caption data from fetcher:', !!captionData);
    console.log('SeekSpeak: Search engine ready:', !!hasSearchIndex);
    
    if (captionData || hasSearchIndex) {
      console.log('SeekSpeak: Caption data available - UI ready');
      this.captionsAvailable = true;
      return;
    }
    
    // Wait a bit more for captions to be fetched
    const maxWait = 8000; // Increased to 8 seconds
    const startTime = Date.now();
    
    const checkCaptions = () => {
      const captionData = window.captionFetcher?.getCurrentCaptions();
      const searchEngine = window.searchEngine;
      const hasSearchIndex = searchEngine && searchEngine.isReady && searchEngine.isReady();
      
      console.log('SeekSpeak: Checking - Captions:', !!captionData, 'Search:', !!hasSearchIndex);
      
      if (captionData || hasSearchIndex) {
        console.log('SeekSpeak: Caption data now available - UI ready');
        this.captionsAvailable = true;
        return;
      } else if (Date.now() - startTime < maxWait) {
        setTimeout(checkCaptions, 500);
      } else {
        console.warn('SeekSpeak: UI Controller timed out waiting for captions');
        this.captionsAvailable = false;
      }
    };
    
    checkCaptions();
  }

  // Method for popup to check caption availability
  getCaptionStatus() {
    const captionData = window.captionFetcher?.getCurrentCaptions();
    const searchEngine = window.searchEngine;
    const hasSearchIndex = searchEngine && searchEngine.isReady && searchEngine.isReady();
    
    if (captionData || hasSearchIndex) {
      this.captionsAvailable = true;
      
      // Calculate segment count more reliably
      let segmentCount = 0;
      if (captionData) {
        // Handle both array and object with segments property
        if (Array.isArray(captionData)) {
          segmentCount = captionData.length;
        } else if (captionData.segments && Array.isArray(captionData.segments)) {
          segmentCount = captionData.segments.length;
        }
      } else if (searchEngine && searchEngine.getSegmentCount) {
        segmentCount = searchEngine.getSegmentCount();
      }
      
      return {
        available: true,
        source: captionData ? 'caption-fetcher' : 'search-engine',
        segmentCount: segmentCount || 0
      };
    } else {
      this.captionsAvailable = false;
      return {
        available: false,
        source: null,
        segmentCount: 0
      };
    }
  }

  // Method to get caption data for popup display
  getCaptionData() {
    return window.captionFetcher?.getCurrentCaptions() || null;
  }

  createSearchOverlay() {
    // Remove existing overlay if present
    const existing = document.getElementById('seekspeak-root');
    if (existing) {
      existing.remove();
    }

    // Create overlay structure
    this.overlay = document.createElement('div');
    this.overlay.id = 'seekspeak-root';
    this.overlay.className = 'seekspeak-overlay';
    
    this.overlay.innerHTML = `
      <div class="seekspeak-modal">
        <div class="seekspeak-header">
          <h2>Search Video Captions</h2>
          <button class="seekspeak-close" title="Close (Esc)">&times;</button>
        </div>
        
        <div class="seekspeak-search-container">
          <input type="text" 
                 class="seekspeak-input" 
                 placeholder="Type to search captions..."
                 autocomplete="off"
                 spellcheck="false">
          <div class="seekspeak-search-info">
            <span class="seekspeak-shortcut">Tip: Use ↑↓ to navigate, Enter to jump</span>
          </div>
        </div>
        
        <div class="seekspeak-results-container">
          <div class="seekspeak-results"></div>
          <div class="seekspeak-no-results" style="display: none;">
            <div class="seekspeak-no-results-icon">🔍</div>
            <div class="seekspeak-no-results-text">No results found</div>
            <div class="seekspeak-no-results-hint">Try different keywords or check spelling</div>
          </div>
          <div class="seekspeak-loading" style="display: none;">
            <div class="seekspeak-spinner"></div>
            <div>Searching captions...</div>
          </div>
        </div>
        
        <div class="seekspeak-footer">
          <div class="seekspeak-status">Ready to search</div>
          <div class="seekspeak-credits">
            <a href="https://buymeacoffee.com/dkmariolink" target="_blank" title="Support SeekSpeak">☕ Support</a>
          </div>
        </div>
      </div>
    `;

    // Append to body
    document.body.appendChild(this.overlay);
    
    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    const input = this.overlay.querySelector('.seekspeak-input');
    const closeBtn = this.overlay.querySelector('.seekspeak-close');
    const results = this.overlay.querySelector('.seekspeak-results');

    // Search input with debouncing
    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });

    // Close overlay events
    closeBtn.addEventListener('click', () => this.hideSearchOverlay());

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.hideSearchOverlay();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigateResults(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.navigateResults(-1);
          break;
        case 'Enter':
          e.preventDefault();
          this.activateSelectedResult();
          break;
      }
    });

    // Result clicks
    results.addEventListener('click', (e) => {
      const resultItem = e.target.closest('.seekspeak-result-item');
      if (resultItem) {
        const timestamp = parseInt(resultItem.dataset.timestamp);
        this.jumpToTimestamp(timestamp);
      }
    });
  }

  setupGlobalKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      // Global shortcut: Ctrl+Shift+F (or Cmd+Shift+F on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        this.toggleSearchOverlay();
      }
    });
  }

  setupThemeDetection() {
    this.themeDetector = {
      current: this.detectTheme(),
      
      detect: () => {
        const html = document.documentElement;
        if (html.hasAttribute('dark') || 
            document.body.classList.contains('dark')) {
          return 'dark';
        }
        return 'light';
      },
      
      observe: () => {
        const observer = new MutationObserver(() => {
          const newTheme = this.themeDetector.detect();
          if (newTheme !== this.themeDetector.current) {
            this.themeDetector.current = newTheme;
            this.updateTheme(newTheme);
          }
        });
        
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['dark']
        });
      }
    };
    
    this.updateTheme(this.themeDetector.current);
    this.themeDetector.observe();
  }

  detectTheme() {
    const html = document.documentElement;
    if (html.hasAttribute('dark') || 
        document.body.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  }

  updateTheme(theme) {
    if (this.overlay) {
      this.overlay.className = `seekspeak-overlay seekspeak-theme-${theme}`;
    }
  }

  showSearchOverlay() {
    if (!this.overlay) {
      this.createSearchOverlay();
    }
    
    this.overlay.classList.add('show');
    this.isVisible = true;
    
    // Focus the search input
    const input = this.overlay.querySelector('.seekspeak-input');
    setTimeout(() => input.focus(), 100);
    
    // Reset state
    this.selectedResultIndex = -1;
    this.currentResults = [];
    
    console.log('SeekSpeak: Search overlay shown');
  }

  hideSearchOverlay() {
    if (this.overlay) {
      this.overlay.classList.remove('show');
      this.isVisible = false;
      
      // Clear search
      const input = this.overlay.querySelector('.seekspeak-input');
      input.value = '';
      this.clearResults();
      
      console.log('SeekSpeak: Search overlay hidden');
    }
  }

  toggleSearchOverlay() {
    if (this.isVisible) {
      this.hideSearchOverlay();
    } else {
      this.showSearchOverlay();
    }
  }

  async performSearch(query) {
    if (!query || query.length < 2) {
      this.clearResults();
      this.updateStatus('Ready to search');
      return;
    }

    // Show loading state
    this.showLoading();
    this.updateStatus('Searching...');

    try {
      // Perform search
      const results = window.searchEngine.search(query, {
        fuzzy: true,
        maxResults: 15
      });

      this.currentResults = results;
      this.displayResults(results, query);
      this.updateStatus(`Found ${results.length} result${results.length !== 1 ? 's' : ''}`);

    } catch (error) {
      console.error('SeekSpeak: Search error:', error);
      this.showError('Search failed. Please try again.');
    }
  }

  displayResults(results, query) {
    const container = this.overlay.querySelector('.seekspeak-results');
    const noResults = this.overlay.querySelector('.seekspeak-no-results');
    const loading = this.overlay.querySelector('.seekspeak-loading');
    
    // Hide loading and no-results
    loading.style.display = 'none';
    noResults.style.display = 'none';
    
    if (results.length === 0) {
      container.innerHTML = '';
      noResults.style.display = 'block';
      return;
    }

    // Build results HTML
    container.innerHTML = results.map((result, index) => {
      const highlightedText = this.highlightSearchTerms(result.context.matchText, query);
      const timeStr = this.formatTimestamp(result.timestamp);
      
      return `
        <div class="seekspeak-result-item" 
             data-index="${index}" 
             data-timestamp="${result.timestamp}">
          <div class="seekspeak-result-time">${timeStr}</div>
          <div class="seekspeak-result-text">${highlightedText}</div>
          ${result.context.beforeText || result.context.afterText ? 
            `<div class="seekspeak-result-context">...${result.context.beforeText} <strong>${result.context.matchText}</strong> ${result.context.afterText}...</div>` 
            : ''}
        </div>
      `;
    }).join('');

    // Reset selection
    this.selectedResultIndex = -1;
  }

  highlightSearchTerms(text, query) {
    if (!query) return text;
    
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    let highlighted = text;
    
    for (const term of terms) {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
    
    return highlighted;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  navigateResults(direction) {
    if (this.currentResults.length === 0) return;
    
    // Remove current selection
    if (this.selectedResultIndex >= 0) {
      const currentItem = this.overlay.querySelector(`[data-index="${this.selectedResultIndex}"]`);
      if (currentItem) {
        currentItem.classList.remove('selected');
      }
    }
    
    // Calculate new index
    this.selectedResultIndex += direction;
    
    if (this.selectedResultIndex < 0) {
      this.selectedResultIndex = this.currentResults.length - 1;
    } else if (this.selectedResultIndex >= this.currentResults.length) {
      this.selectedResultIndex = 0;
    }
    
    // Apply new selection
    const newItem = this.overlay.querySelector(`[data-index="${this.selectedResultIndex}"]`);
    if (newItem) {
      newItem.classList.add('selected');
      newItem.scrollIntoView({ block: 'nearest' });
    }
  }

  activateSelectedResult() {
    if (this.selectedResultIndex >= 0 && this.currentResults[this.selectedResultIndex]) {
      const result = this.currentResults[this.selectedResultIndex];
      this.jumpToTimestamp(result.timestamp);
    }
  }

  jumpToTimestamp(seconds) {
    try {
      console.log('SeekSpeak: Attempting to jump to', this.formatTimestamp(seconds), `(${seconds}s)`);
      
      // Multiple approaches to find and control the YouTube player
      let success = false;
      
      // Method 1: Try movie_player (most common)
      const moviePlayer = document.getElementById('movie_player');
      if (moviePlayer && moviePlayer.seekTo) {
        console.log('SeekSpeak: Using movie_player.seekTo()');
        moviePlayer.seekTo(seconds, true);
        success = true;
      }
      
      // Method 2: Try html5-video-player
      if (!success) {
        const html5Player = document.querySelector('.html5-video-player');
        if (html5Player && html5Player.seekTo) {
          console.log('SeekSpeak: Using html5-video-player.seekTo()');
          html5Player.seekTo(seconds, true);
          success = true;
        }
      }
      
      // Method 3: Try direct video element
      if (!success) {
        const videoElement = document.querySelector('video');
        if (videoElement) {
          console.log('SeekSpeak: Using video.currentTime');
          videoElement.currentTime = seconds;
          success = true;
        }
      }
      
      // Method 4: Try YouTube's internal player API
      if (!success && window.ytInitialPlayerResponse) {
        console.log('SeekSpeak: Trying YouTube internal player API');
        try {
          // Look for the player in global scope
          if (window.player && window.player.seekTo) {
            window.player.seekTo(seconds, true);
            success = true;
          }
        } catch (apiError) {
          console.log('SeekSpeak: YouTube API method failed:', apiError.message);
        }
      }
      
      // Method 5: Try to simulate user interaction with progress bar
      if (!success) {
        console.log('SeekSpeak: Trying progress bar simulation');
        try {
          const progressBar = document.querySelector('.ytp-progress-bar') || 
                            document.querySelector('.html5-progress-bar');
          const videoElement = document.querySelector('video');
          
          if (progressBar && videoElement && videoElement.duration) {
            const duration = videoElement.duration;
            const progressPercent = (seconds / duration) * 100;
            
            // Calculate click position on progress bar
            const rect = progressBar.getBoundingClientRect();
            const clickX = rect.left + (rect.width * progressPercent / 100);
            
            // Simulate click on progress bar
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              clientX: clickX,
              clientY: rect.top + rect.height / 2
            });
            
            progressBar.dispatchEvent(clickEvent);
            success = true;
            console.log('SeekSpeak: Simulated progress bar click');
          }
        } catch (simError) {
          console.log('SeekSpeak: Progress bar simulation failed:', simError.message);
        }
      }
      
      if (success) {
        console.log('SeekSpeak: Successfully jumped to', this.formatTimestamp(seconds));
        
        // Optional: Hide overlay after jumping (can be made user configurable)
        // this.hideSearchOverlay();
        
      } else {
        console.warn('SeekSpeak: All video seeking methods failed - YouTube player not accessible');
        // Show user feedback
        this.updateStatus(`Unable to jump to ${this.formatTimestamp(seconds)} - player not accessible`);
      }
      
    } catch (error) {
      console.error('SeekSpeak: Error jumping to timestamp:', error);
      this.updateStatus(`Error jumping to timestamp: ${error.message}`);
    }
  }

  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  showLoading() {
    const loading = this.overlay.querySelector('.seekspeak-loading');
    const results = this.overlay.querySelector('.seekspeak-results');
    const noResults = this.overlay.querySelector('.seekspeak-no-results');
    
    loading.style.display = 'flex';
    results.innerHTML = '';
    noResults.style.display = 'none';
  }

  showError(message) {
    this.updateStatus(`Error: ${message}`);
    this.clearResults();
  }

  clearResults() {
    const container = this.overlay.querySelector('.seekspeak-results');
    const noResults = this.overlay.querySelector('.seekspeak-no-results');
    const loading = this.overlay.querySelector('.seekspeak-loading');
    
    container.innerHTML = '';
    noResults.style.display = 'none';
    loading.style.display = 'none';
    
    this.currentResults = [];
    this.selectedResultIndex = -1;
  }

  updateStatus(message) {
    const status = this.overlay.querySelector('.seekspeak-status');
    if (status) {
      status.textContent = message;
    }
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'OPEN_SEARCH':
        this.showSearchOverlay();
        break;
        
      case 'CLOSE_SEARCH':
        this.hideSearchOverlay();
        break;
        
      default:
        // Unknown message
        break;
    }
  }

  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    this.isVisible = false;
    this.currentResults = [];
    this.selectedResultIndex = -1;
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }
}

// Create global instance
window.uiController = new UIController();