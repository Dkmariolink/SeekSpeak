/**
 * SeekSpeak Options Page Script
 */

class OptionsController {
  constructor() {
    this.settings = {
      cachingMode: 'always',
      minLengthMinutes: 10,
      maxCachedVideos: 50, // Default limit of 50 videos
      cacheExpirationDays: 7, // Default 1 week expiration
      searchShortcut: 'Ctrl+Shift+F', // Default keyboard shortcut
      autoFocusSearch: true,
      showContext: true
    };
    
    this.isRecordingShortcut = false;
    this.init();
  }

  async init() {
    console.log('SeekSpeak Options: Initializing');
    
    // Load current settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
    
    // Load storage info
    this.updateStorageInfo();

    // Set up modal close handlers
    this.setupModalHandlers();
  }

  setupModalHandlers() {
    // Close modal when clicking close button
    document.getElementById('close-cache-browser').addEventListener('click', () => {
      this.hideCacheBrowser();
    });

    // Close modal when clicking outside
    document.getElementById('cache-browser-modal').addEventListener('click', (e) => {
      if (e.target.id === 'cache-browser-modal') {
        this.hideCacheBrowser();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideCacheBrowser();
      }
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        cachingMode: 'always',
        minLengthMinutes: 10,
        maxCachedVideos: 50, // Default limit of 50 videos
        cacheExpirationDays: 7, // Default 1 week expiration
        searchShortcut: 'Ctrl+Shift+F', // Default keyboard shortcut
        autoFocusSearch: true,
        showContext: true
      });
      
      this.settings = result;
      console.log('SeekSpeak Options: Settings loaded:', this.settings);
    } catch (error) {
      console.error('SeekSpeak Options: Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
      console.log('SeekSpeak Options: Settings saved:', this.settings);
      this.showToast('Settings saved successfully!');
      
      // Notify content scripts that settings have changed
      try {
        // Send message to background script
        await chrome.runtime.sendMessage({
          type: 'SETTINGS_UPDATED',
          settings: this.settings
        });
        console.log('SeekSpeak Options: Settings update message sent to background');
      } catch (bgError) {
        console.warn('SeekSpeak Options: Could not send to background script:', bgError);
      }
      
      // Also try to send directly to all YouTube tabs
      try {
        const tabs = await chrome.tabs.query({
          url: ['*://www.youtube.com/watch*', '*://youtube.com/watch*']
        });
        
        for (const tab of tabs) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              settings: this.settings
            });
            console.log('SeekSpeak Options: Settings update sent to tab:', tab.id);
          } catch (tabError) {
            console.warn('SeekSpeak Options: Could not send to tab', tab.id, ':', tabError);
          }
        }
      } catch (tabsError) {
        console.warn('SeekSpeak Options: Could not query tabs:', tabsError);
      }
      
    } catch (error) {
      console.error('SeekSpeak Options: Error saving settings:', error);
      this.showToast('Error saving settings', 'error');
    }
  }

  setupEventListeners() {
    // Caching mode radio buttons
    const cachingRadios = document.querySelectorAll('input[name="caching-mode"]');
    cachingRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.settings.cachingMode = radio.value;
        this.updateLengthSettingVisibility();
      });
    });

    // Minimum length input
    const minLengthInput = document.getElementById('min-length');
    minLengthInput.addEventListener('input', () => {
      this.settings.minLengthMinutes = parseInt(minLengthInput.value) || 10;
    });

    // Maximum cached videos input
    const maxVideosInput = document.getElementById('max-videos');
    maxVideosInput.addEventListener('input', () => {
      this.settings.maxCachedVideos = parseInt(maxVideosInput.value) || 50;
    });

    // Cache expiration dropdown
    const cacheExpirationSelect = document.getElementById('cache-expiration');
    cacheExpirationSelect.addEventListener('change', () => {
      const value = cacheExpirationSelect.value;
      if (value === 'never') {
        this.settings.cacheExpirationDays = 'never';
      } else {
        this.settings.cacheExpirationDays = parseInt(value) || 7;
      }
    });

    // Keyboard shortcut input
    const shortcutInput = document.getElementById('search-shortcut');
    shortcutInput.addEventListener('click', () => {
      this.startShortcutRecording();
    });

    shortcutInput.addEventListener('keydown', (e) => {
      if (this.isRecordingShortcut) {
        e.preventDefault();
        this.recordShortcut(e);
      }
    });

    shortcutInput.addEventListener('blur', () => {
      this.stopShortcutRecording();
    });

    // Clear shortcut button
    const clearShortcutButton = document.getElementById('clear-shortcut');
    clearShortcutButton.addEventListener('click', () => {
      this.settings.searchShortcut = '';
      this.updateUI();
    });

    // Save button
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Reset button
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Clear cache button
    document.getElementById('clear-cache').addEventListener('click', () => {
      this.clearCache();
    });
  }

  updateUI() {
    // Set caching mode
    const cachingRadio = document.querySelector(`input[value="${this.settings.cachingMode}"]`);
    if (cachingRadio) {
      cachingRadio.checked = true;
    }

    // Set minimum length
    document.getElementById('min-length').value = this.settings.minLengthMinutes;

    // Set maximum cached videos
    document.getElementById('max-videos').value = this.settings.maxCachedVideos;

    // Set cache expiration
    const cacheExpirationSelect = document.getElementById('cache-expiration');
    if (this.settings.cacheExpirationDays === 'never') {
      cacheExpirationSelect.value = 'never';
    } else {
      cacheExpirationSelect.value = this.settings.cacheExpirationDays.toString();
    }

    // Set keyboard shortcut
    document.getElementById('search-shortcut').value = this.settings.searchShortcut || '';

    // Update length setting visibility
    this.updateLengthSettingVisibility();
  }

  updateLengthSettingVisibility() {
    const lengthSetting = document.getElementById('length-setting');
    lengthSetting.style.display = this.settings.cachingMode === 'length-based' ? 'block' : 'none';
  }

  async updateStorageInfo() {
    try {
      // Get all stored data
      const allData = await chrome.storage.local.get(null);
      
      // Count caption entries
      const captionKeys = Object.keys(allData).filter(key => key.startsWith('captions_'));
      const cachedCount = captionKeys.length;
      
      // Calculate storage size (approximate)
      const dataString = JSON.stringify(allData);
      const sizeBytes = new Blob([dataString]).size;
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
      
      const cachedCountElement = document.getElementById('cached-count');
      cachedCountElement.textContent = cachedCount;
      
      // Add click handler if not already added
      if (!cachedCountElement.dataset.clickHandlerAdded) {
        cachedCountElement.addEventListener('click', () => {
          this.showCacheBrowser();
        });
        cachedCountElement.dataset.clickHandlerAdded = 'true';
      }
      
      document.getElementById('storage-used').textContent = `${sizeMB} MB`;
      
    } catch (error) {
      console.error('SeekSpeak Options: Error getting storage info:', error);
      document.getElementById('cached-count').textContent = 'Error';
      document.getElementById('storage-used').textContent = 'Error';
    }
  }

  async clearCache() {
    if (!confirm('Are you sure you want to clear all cached captions? This cannot be undone.')) {
      return;
    }

    try {
      // Get all stored data
      const allData = await chrome.storage.local.get(null);
      
      // Find caption keys
      const captionKeys = Object.keys(allData).filter(key => key.startsWith('captions_'));
      
      // Remove caption data
      if (captionKeys.length > 0) {
        await chrome.storage.local.remove(captionKeys);
        this.showToast(`Cleared ${captionKeys.length} cached captions`);
      } else {
        this.showToast('No cached captions to clear');
      }
      
      // Update storage info
      this.updateStorageInfo();
      
    } catch (error) {
      console.error('SeekSpeak Options: Error clearing cache:', error);
      this.showToast('Error clearing cache', 'error');
    }
  }

  resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    this.settings = {
      cachingMode: 'always',
      minLengthMinutes: 10,
      maxCachedVideos: 50, // Default limit of 50 videos
      cacheExpirationDays: 7, // Default 1 week expiration
      searchShortcut: 'Ctrl+Shift+F', // Default keyboard shortcut
      autoFocusSearch: true,
      showContext: true
    };

    this.updateUI();
    this.saveSettings();
  }

  startShortcutRecording() {
    const shortcutInput = document.getElementById('search-shortcut');
    this.isRecordingShortcut = true;
    shortcutInput.value = '';
    shortcutInput.placeholder = 'Press key combination...';
    shortcutInput.classList.add('recording');
    shortcutInput.focus();
  }

  stopShortcutRecording() {
    const shortcutInput = document.getElementById('search-shortcut');
    this.isRecordingShortcut = false;
    shortcutInput.classList.remove('recording');
    shortcutInput.placeholder = 'Click to set shortcut';
    
    if (!shortcutInput.value) {
      shortcutInput.value = this.settings.searchShortcut || '';
    }
  }

  recordShortcut(event) {
    const keys = [];
    
    // Add modifier keys
    if (event.ctrlKey || event.metaKey) {
      keys.push(event.metaKey ? 'Cmd' : 'Ctrl');
    }
    if (event.altKey) {
      keys.push('Alt');
    }
    if (event.shiftKey) {
      keys.push('Shift');
    }
    
    // Add the main key (not modifier keys)
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      let key = event.key;
      
      // Handle special keys
      if (key === ' ') {
        key = 'Space';
      } else if (key.length === 1) {
        key = key.toUpperCase();
      }
      
      keys.push(key);
    }
    
    // Need at least one modifier + one regular key, OR just a function key/special key
    const hasModifier = keys.includes('Ctrl') || keys.includes('Cmd') || keys.includes('Alt') || keys.includes('Shift');
    const hasRegularKey = keys.some(k => !['Ctrl', 'Cmd', 'Alt', 'Shift'].includes(k));
    
    if ((hasModifier && hasRegularKey) || (hasRegularKey && keys.length === 1 && ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(keys[0]))) {
      const shortcut = keys.join('+');
      this.settings.searchShortcut = shortcut;
      
      // Update the input but don't stop recording yet - let user see the result
      const input = document.getElementById('search-shortcut');
      input.value = shortcut;
      
      // Stop recording after a short delay
      setTimeout(() => {
        this.stopShortcutRecording();
      }, 100);
      
      console.log('SeekSpeak: Recorded shortcut:', shortcut);
    } else {
      // Show current combination but don't save yet
      const input = document.getElementById('search-shortcut');
      input.value = keys.join('+') + (keys.length > 0 ? '+' : '') + '...';
    }
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.style.display = 'block';
    
    if (type === 'error') {
      toast.style.background = '#ea4335';
    } else {
      toast.style.background = '#323232';
    }
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  async showCacheBrowser() {
    const modal = document.getElementById('cache-browser-modal');
    const content = document.getElementById('cache-browser-content');
    
    // Show modal with loading state
    modal.style.display = 'flex';
    content.innerHTML = '<div class="loading">Loading cached videos...</div>';
    
    try {
      // Get all cached videos
      const allData = await chrome.storage.local.get(null);
      const cachedVideos = Object.keys(allData)
        .filter(key => key.startsWith('captions_'))
        .map(key => ({
          videoId: key.replace('captions_', ''),
          data: allData[key]
        }))
        .filter(item => item.data && item.data.cachedAt)
        .sort((a, b) => b.data.cachedAt - a.data.cachedAt); // Most recent first

      if (cachedVideos.length === 0) {
        content.innerHTML = '<div class="loading">No cached videos found.</div>';
        return;
      }

      // Build HTML for cached videos
      let html = '';
      for (const video of cachedVideos) {
        const videoData = video.data;
        const videoId = video.videoId;
        const cachedDate = new Date(videoData.cachedAt).toLocaleDateString();
        const segmentCount = videoData.segments ? videoData.segments.length : 0;
        
        // Get video title from the data or use video ID as fallback
        const title = videoData.videoTitle || videoData.title || `Video ${videoId}`;
        
        html += `
          <div class="cache-video-item">
            <img 
              class="cache-video-thumbnail" 
              src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" 
              alt="Video thumbnail"
              onerror="this.style.display='none'"
            />
            <div class="cache-video-info">
              <div class="cache-video-title">${this.escapeHtml(title)}</div>
              <div class="cache-video-meta">
                Cached: ${cachedDate} • ${segmentCount} caption segments
              </div>
              <div class="cache-video-meta">
                Video ID: ${videoId}
              </div>
            </div>
            <div class="cache-video-actions">
              <button class="watch-btn" data-video-id="${videoId}">
                Watch
              </button>
              <button class="remove-btn" data-video-id="${videoId}">
                Remove
              </button>
            </div>
          </div>
        `;
      }

      content.innerHTML = html;
      
      // Add event listeners for buttons
      content.addEventListener('click', (e) => {
        if (e.target.classList.contains('watch-btn')) {
          const videoId = e.target.dataset.videoId;
          window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
        } else if (e.target.classList.contains('remove-btn')) {
          const videoId = e.target.dataset.videoId;
          this.removeCachedVideo(videoId);
        }
      });
      
    } catch (error) {
      console.error('SeekSpeak Options: Error loading cached videos:', error);
      content.innerHTML = '<div class="loading">Error loading cached videos.</div>';
    }
  }

  hideCacheBrowser() {
    document.getElementById('cache-browser-modal').style.display = 'none';
  }

  async removeCachedVideo(videoId) {
    if (!confirm('Are you sure you want to remove this cached video?')) {
      return;
    }

    try {
      await chrome.storage.local.remove([`captions_${videoId}`]);
      this.showToast('Cached video removed successfully');
      
      // Refresh the cache browser
      this.showCacheBrowser();
      
      // Update storage info
      this.updateStorageInfo();
      
    } catch (error) {
      console.error('SeekSpeak Options: Error removing cached video:', error);
      this.showToast('Error removing cached video', 'error');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.optionsController = new OptionsController();
});
