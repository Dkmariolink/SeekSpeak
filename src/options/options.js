/**
 * SeekSpeak Options Page Script
 */

class OptionsController {
  constructor() {
    this.settings = {
      cachingMode: 'always',
      minLengthMinutes: 10,
      autoFocusSearch: true,
      showContext: true
    };
    
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
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        cachingMode: 'always',
        minLengthMinutes: 10,
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
      
      document.getElementById('cached-count').textContent = cachedCount;
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
      autoFocusSearch: true,
      showContext: true
    };

    this.updateUI();
    this.saveSettings();
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
