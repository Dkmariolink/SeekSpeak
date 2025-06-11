# UI Components and YouTube Integration

## Search Overlay Design

### Modal Overlay Structure
```html
<div class="seekspeak-overlay" id="seekspeak-root">
  <div class="seekspeak-backdrop"></div>
  <div class="seekspeak-modal">
    <div class="seekspeak-header">
      <h2>Search Video Captions</h2>
      <button class="seekspeak-close">&times;</button>
    </div>
    
    <div class="seekspeak-search">
      <input type="text" 
             class="seekspeak-input" 
             placeholder="Search captions..."
             autocomplete="off">
      <div class="seekspeak-suggestions"></div>
    </div>
    
    <div class="seekspeak-results">
      <div class="seekspeak-result-item">
        <div class="seekspeak-timestamp">14:32</div>
        <div class="seekspeak-context">...</div>
      </div>
    </div>
    
    <div class="seekspeak-footer">
      <div class="seekspeak-status">Found 5 results</div>
    </div>
  </div>
</div>
```

### CSS Architecture
```css
/* Base container - isolation from YouTube styles */
.seekspeak-overlay {
  all: initial;
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  font-size: 14px;
  line-height: 1.4;
  color: #212121;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.seekspeak-overlay.show {
  opacity: 1;
  visibility: visible;
}

/* Modal window */
.seekspeak-modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  width: min(600px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

## Component Interaction Patterns

### Search Input Component
```javascript
class SearchInput {
  constructor(container) {
    this.input = container.querySelector('.seekspeak-input');
    this.suggestions = container.querySelector('.seekspeak-suggestions');
    this.searchHistory = [];
    this.debounceTimer = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Debounced search input
    this.input.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.performSearch(e.target.value);
      }, 300);
    });
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        this.focusFirstResult();
      } else if (e.key === 'Escape') {
        this.closeOverlay();
      }
    });
  }
  
  performSearch(query) {
    if (query.length < 2) return;
    
    const results = searchEngine.search(query);
    this.displayResults(results);
    this.updateSearchHistory(query);
  }
}
```

### Results Display Component
```javascript
class ResultsDisplay {
  constructor(container) {
    this.container = container.querySelector('.seekspeak-results');
    this.selectedIndex = -1;
  }
  
  displayResults(results) {
    this.container.innerHTML = '';
    
    results.forEach((result, index) => {
      const resultElement = this.createResultElement(result, index);
      this.container.appendChild(resultElement);
    });
    
    this.updateStatus(results.length);
  }
  
  createResultElement(result, index) {
    const element = document.createElement('div');
    element.className = 'seekspeak-result-item';
    element.dataset.index = index;
    element.dataset.timestamp = result.timestamp;
    
    element.innerHTML = `
      <div class="seekspeak-timestamp">${formatTimestamp(result.timestamp)}</div>
      <div class="seekspeak-context">${highlightQuery(result.context, result.query)}</div>
    `;
    
    element.addEventListener('click', () => {
      this.jumpToTimestamp(result.timestamp);
    });
    
    return element;
  }
}
```

## Keyboard Navigation Patterns

### Full Keyboard Support
```javascript
class KeyboardController {
  constructor(overlay) {
    this.overlay = overlay;
    this.focusableElements = [];
    this.currentFocus = 0;
    
    this.setupKeyboardEvents();
  }
  
  setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (!this.overlay.classList.contains('show')) return;
      
      switch (e.key) {
        case 'Escape':
          this.closeOverlay();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.focusNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.focusPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          this.activateCurrentItem();
          break;
        case 'Tab':
          e.preventDefault();
          e.shiftKey ? this.focusPrevious() : this.focusNext();
          break;
      }
    });
  }
  
  focusNext() {
    this.currentFocus = (this.currentFocus + 1) % this.focusableElements.length;
    this.updateFocus();
  }
  
  focusPrevious() {
    this.currentFocus = this.currentFocus === 0 
      ? this.focusableElements.length - 1 
      : this.currentFocus - 1;
    this.updateFocus();
  }
}
```

## YouTube Theme Integration

### Theme Detection
```javascript
class ThemeDetector {
  constructor() {
    this.currentTheme = this.detectTheme();
    this.observeThemeChanges();
  }
  
  detectTheme() {
    // Check YouTube's theme indicators
    const html = document.documentElement;
    const body = document.body;
    
    if (html.hasAttribute('dark') || 
        body.classList.contains('dark') ||
        html.getAttribute('data-cast-api-enabled') === 'true') {
      return 'dark';
    }
    
    return 'light';
  }
  
  observeThemeChanges() {
    const observer = new MutationObserver(() => {
      const newTheme = this.detectTheme();
      if (newTheme !== this.currentTheme) {
        this.currentTheme = newTheme;
        this.updateUITheme(newTheme);
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dark', 'data-cast-api-enabled']
    });
  }
  
  updateUITheme(theme) {
    const overlay = document.getElementById('seekspeak-root');
    if (overlay) {
      overlay.className = `seekspeak-overlay seekspeak-theme-${theme}`;
    }
  }
}
```

### Theme-Aware CSS
```css
/* Light theme (default) */
.seekspeak-theme-light .seekspeak-modal {
  background: #ffffff;
  color: #212121;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.seekspeak-theme-light .seekspeak-input {
  background: #f8f9fa;
  border: 1px solid #dadce0;
  color: #212121;
}

.seekspeak-theme-light .seekspeak-result-item:hover {
  background: #f8f9fa;
}

/* Dark theme */
.seekspeak-theme-dark .seekspeak-modal {
  background: #212121;
  color: #ffffff;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.seekspeak-theme-dark .seekspeak-input {
  background: #303030;
  border: 1px solid #5f6368;
  color: #ffffff;
}

.seekspeak-theme-dark .seekspeak-result-item:hover {
  background: #303030;
}

.seekspeak-theme-dark .seekspeak-timestamp {
  color: #aaa;
}
```

## Animation and Interaction Patterns

### Smooth Transitions
```css
.seekspeak-overlay {
  transition: opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1),
              visibility 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.seekspeak-modal {
  transform: scale(0.95);
  transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.seekspeak-overlay.show .seekspeak-modal {
  transform: scale(1);
}

.seekspeak-result-item {
  transition: background-color 0.15s ease,
              transform 0.15s ease;
}

.seekspeak-result-item:hover {
  transform: translateX(4px);
}
```

### Loading States
```javascript
class LoadingState {
  showCaptionLoading() {
    const status = document.querySelector('.seekspeak-status');
    status.innerHTML = `
      <div class="seekspeak-loading">
        <div class="seekspeak-spinner"></div>
        Loading captions...
      </div>
    `;
  }
  
  showSearching() {
    const results = document.querySelector('.seekspeak-results');
    results.innerHTML = `
      <div class="seekspeak-searching">
        <div class="seekspeak-spinner"></div>
        Searching...
      </div>
    `;
  }
  
  showNoResults(query) {
    const results = document.querySelector('.seekspeak-results');
    results.innerHTML = `
      <div class="seekspeak-no-results">
        No results found for "${query}"
        <div class="seekspeak-suggestions">
          Try different keywords or check spelling
        </div>
      </div>
    `;
  }
}
```

## Responsive Design Patterns

### Mobile Considerations
```css
@media (max-width: 768px) {
  .seekspeak-modal {
    width: 95vw;
    max-height: 85vh;
    margin: 20px;
  }
  
  .seekspeak-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .seekspeak-result-item {
    padding: 16px 12px;
  }
  
  .seekspeak-timestamp {
    font-size: 12px;
  }
}

@media (max-height: 600px) {
  .seekspeak-modal {
    max-height: 90vh;
  }
  
  .seekspeak-results {
    max-height: 300px;
  }
}
```

### Touch Interaction
```javascript
class TouchController {
  constructor() {
    this.setupTouchEvents();
  }
  
  setupTouchEvents() {
    // Prevent body scroll when modal is open
    document.addEventListener('touchmove', (e) => {
      if (document.getElementById('seekspeak-root').classList.contains('show')) {
        if (!e.target.closest('.seekspeak-results')) {
          e.preventDefault();
        }
      }
    }, { passive: false });
    
    // Enhanced touch targets for mobile
    const resultItems = document.querySelectorAll('.seekspeak-result-item');
    resultItems.forEach(item => {
      item.style.minHeight = '44px'; // Minimum touch target size
    });
  }
}
```
