/**
 * SEEKSPEAK CUSTOM UI SYSTEM
 * Professional loading overlay and enhanced transcript button
 */

class SeekSpeakCustomUI {
  constructor() {
    this.loadingOverlay = null;
    this.customButton = null;
    this.isLoadingActive = false;
    this.injectCustomStyles();
  }

  // Inject custom CSS styles for loading UI and SeekSpeak button
  injectCustomStyles() {
    // Remove existing styles if present
    const existingStyles = document.getElementById('seekspeak-custom-ui-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    const style = document.createElement('style');
    style.id = 'seekspeak-custom-ui-styles';
    style.textContent = `
      /* SeekSpeak Custom Loading Overlay */
      .seekspeak-loading-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: 'YouTube Sans', 'Roboto', Arial, sans-serif;
        text-align: center;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.1);
        min-width: 300px;
        opacity: 0;
        animation: seekspeak-fade-in 0.3s ease-out forwards;
      }

      /* Fade in animation */
      @keyframes seekspeak-fade-in {
        from {
          opacity: 0;
          transform: translate(-50%, -60%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }

      /* SeekSpeak Logo */
      .seekspeak-logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .seekspeak-logo::before {
        content: "🔍";
        font-size: 28px;
      }

      /* Loading message */
      .seekspeak-loading-message {
        font-size: 16px;
        margin-bottom: 16px;
        opacity: 0.9;
      }

      /* Custom spinner */
      .seekspeak-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        margin: 0 auto;
        animation: seekspeak-spin 1s linear infinite;
      }

      @keyframes seekspeak-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Progress indicator */
      .seekspeak-progress {
        margin-top: 12px;
        font-size: 14px;
        opacity: 0.8;
      }

      /* SeekSpeak Custom Transcript Button */
      .seekspeak-transcript-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ff0000;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 18px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        margin-left: 8px;
        transition: all 0.2s ease;
        font-family: 'YouTube Sans', 'Roboto', Arial, sans-serif;
        text-decoration: none;
        box-shadow: 0 2px 8px rgba(255, 0, 0, 0.2);
      }

      .seekspeak-transcript-button:hover {
        background: #cc0000;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
      }

      .seekspeak-transcript-button:active {
        transform: translateY(0);
      }

      .seekspeak-transcript-button::before {
        content: "⚡";
        font-size: 16px;
      }

      /* Hide during SeekSpeak loading */
      .seekspeak-loading-active .seekspeak-transcript-button {
        opacity: 0.5;
        pointer-events: none;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .seekspeak-loading-overlay {
          width: 90%;
          max-width: 300px;
          padding: 20px;
        }
        
        .seekspeak-transcript-button {
          padding: 6px 10px;
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Show custom loading overlay
  showLoadingOverlay(message = "Storing Captions...") {
    if (this.isLoadingActive) return;
    
    this.isLoadingActive = true;
    document.body.classList.add('seekspeak-loading-active');

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'seekspeak-loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="seekspeak-logo">SeekSpeak</div>
      <div class="seekspeak-loading-message">${message}</div>
      <div class="seekspeak-spinner"></div>
      <div class="seekspeak-progress">Extracting video captions...</div>
    `;

    document.body.appendChild(this.loadingOverlay);
    
    console.log('SeekSpeak: Custom loading overlay shown');
  }

  // Update loading progress
  updateLoadingProgress(message) {
    if (this.loadingOverlay) {
      const progressElement = this.loadingOverlay.querySelector('.seekspeak-progress');
      if (progressElement) {
        progressElement.textContent = message;
      }
    }
  }

  // Hide loading overlay
  hideLoadingOverlay() {
    if (!this.isLoadingActive) return;

    this.isLoadingActive = false;
    document.body.classList.remove('seekspeak-loading-active');

    if (this.loadingOverlay) {
      this.loadingOverlay.style.animation = 'seekspeak-fade-in 0.3s ease-out reverse';
      setTimeout(() => {
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
          this.loadingOverlay.remove();
          this.loadingOverlay = null;
        }
      }, 300);
    }
    
    console.log('SeekSpeak: Custom loading overlay hidden');
  }

  // Add SeekSpeak button next to YouTube's transcript button
  addSeekSpeakButton() {
    // Remove existing button if present
    if (this.customButton) {
      this.customButton.remove();
    }

    // Find YouTube's transcript button
    const transcriptSelectors = [
      'button[aria-label*="Show transcript"]',
      'button[aria-label*="transcript" i]',
      'ytd-button-renderer button[aria-label*="transcript" i]',
      '#description button[aria-label*="transcript" i]'
    ];

    let youtubeButton = null;
    for (const selector of transcriptSelectors) {
      youtubeButton = document.querySelector(selector);
      if (youtubeButton) break;
    }

    if (!youtubeButton) {
      console.log('SeekSpeak: YouTube transcript button not found, will retry');
      // Retry after 2 seconds
      setTimeout(() => this.addSeekSpeakButton(), 2000);
      return;
    }

    // Create SeekSpeak button
    this.customButton = document.createElement('button');
    this.customButton.className = 'seekspeak-transcript-button';
    this.customButton.innerHTML = `
      <img src="${chrome.runtime.getURL('assets/icons/icon16.png')}" 
           alt="SeekSpeak" 
           style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;">
      Search Captions
    `;
    this.customButton.title = 'Open SeekSpeak caption search (click again to close)';

    // Add click handler
    this.customButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openSeekSpeakSearch();
    });

    // Insert after YouTube's button
    const container = youtubeButton.parentNode;
    if (container) {
      // Try to insert in the same container
      if (youtubeButton.nextSibling) {
        container.insertBefore(this.customButton, youtubeButton.nextSibling);
      } else {
        container.appendChild(this.customButton);
      }
      
      console.log('SeekSpeak: Custom transcript button added');
    } else {
      console.log('SeekSpeak: Could not find container for custom button');
    }
  }

  // Open SeekSpeak search interface
  openSeekSpeakSearch() {
    console.log('SeekSpeak: Opening caption search interface');
    
    // Check if search overlay is already open and toggle it
    if (window.uiController && window.uiController.isVisible) {
      window.uiController.hideSearchOverlay();
      return;
    }
    
    // Check if captions are available
    if (window.uiController && window.uiController.captionsAvailable) {
      // Open search overlay directly
      if (window.uiController.showSearchOverlay) {
        window.uiController.showSearchOverlay();
      } else {
        // Fallback: trigger keyboard shortcut
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'F',
          ctrlKey: true,
          shiftKey: true
        }));
      }
    } else {
      // Captions not loaded yet, show loading and fetch them
      this.showLoadingOverlay("Loading captions for search...");
      
      // Trigger caption loading
      if (window.captionFetcher && window.captionFetcher.init) {
        const videoId = this.extractVideoId();
        if (videoId) {
          window.captionFetcher.init(videoId).then(() => {
            this.hideLoadingOverlay();
            // Open search after loading
            setTimeout(() => {
              if (window.uiController && window.uiController.showSearchOverlay) {
                window.uiController.showSearchOverlay();
              }
            }, 500);
          }).catch((error) => {
            this.hideLoadingOverlay();
            console.error('SeekSpeak: Error loading captions:', error);
          });
        }
      }
    }
  }

  // Extract video ID from current URL
  extractVideoId() {
    const url = window.location.href;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  // Initialize custom UI
  init() {
    console.log('SeekSpeak: Initializing custom UI components');
    
    // Add SeekSpeak button
    this.addSeekSpeakButton();
    
    // Re-add button on navigation
    document.addEventListener('yt-navigate-finish', () => {
      setTimeout(() => this.addSeekSpeakButton(), 1000);
    });
  }

  // Clean up
  destroy() {
    if (this.loadingOverlay) {
      this.loadingOverlay.remove();
    }
    if (this.customButton) {
      this.customButton.remove();
    }
    
    const styles = document.getElementById('seekspeak-custom-ui-styles');
    if (styles) {
      styles.remove();
    }
  }
}

// Instantiate and attach to window for global access
window.seekSpeakCustomUI = new SeekSpeakCustomUI();
