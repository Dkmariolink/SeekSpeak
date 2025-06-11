# SeekSpeak System Patterns

## Chrome Extension Architecture (Manifest V3)

### Extension Structure
```
SeekSpeak/
├── manifest.json (V3)
├── background/
│   └── service-worker.js
├── content/
│   ├── youtube-injector.js
│   ├── caption-fetcher.js
│   ├── search-engine.js
│   └── ui-controller.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── assets/
│   └── icons/
└── memory-bank/
```

### Core Components

#### 1. Service Worker (Background Script)
```javascript
// background/service-worker.js
class BackgroundService {
  // Handle extension lifecycle
  onInstalled()
  onStartup()
  
  // Coordinate between content scripts
  handleMessage(message, sender, sendResponse)
  
  // Manage extension state
  updateBadge(tabId, status)
}
```

#### 2. Content Script Injection
```javascript
// content/youtube-injector.js
class YouTubeInjector {
  // Detect YouTube video pages
  detectVideoPage()
  
  // Inject search UI into page
  injectSearchInterface()
  
  // Monitor page changes (SPA navigation)
  observePageChanges()
}
```

#### 3. Caption Data Management
```javascript
// content/caption-fetcher.js
class CaptionFetcher {
  // Fetch captions from YouTube APIs
  async fetchCaptions(videoId)
  
  // Parse caption data formats
  parseCaptionData(rawData)
  
  // Cache for session performance
  cacheCaption(videoId, captions)
  
  // Handle multiple languages
  detectAvailableLanguages()
}
```

#### 4. Search Engine Implementation
```javascript
// content/search-engine.js
class SearchEngine {
  // Build searchable index
  buildIndex(captions) {
    // Create inverted index for fast lookup
    // Structure: { word: [timestamp1, timestamp2, ...] }
  }
  
  // Perform search with options
  search(query, options = {
    fuzzy: true,
    caseSensitive: false,
    exactPhrase: false
  })
  
  // Return formatted results
  formatResults(matches, contextSize = 3)
  
  // Handle fuzzy matching
  fuzzyMatch(query, text, threshold = 0.8)
}
```

#### 5. UI Controller
```javascript
// content/ui-controller.js
class UIController {
  // Create and inject search overlay
  createSearchOverlay()
  
  // Handle user interactions
  handleSearchInput(query)
  handleResultClick(timestamp)
  
  // YouTube player integration
  jumpToTimestamp(seconds)
  
  // Keyboard shortcuts
  setupKeyboardShortcuts()
}
```

### Data Flow Patterns

#### Page Load Sequence
1. Content script detects YouTube video page
2. Extract video ID from URL/page data
3. Fetch captions via YouTube's internal APIs
4. Build search index from caption data
5. Inject search UI (hidden initially)
6. Listen for search activation events

#### Search Process Flow
1. User activates search (shortcut/button)
2. Show search overlay with focus
3. User types query → real-time search
4. Display results with context snippets
5. User clicks result → jump to timestamp
6. Maintain search state for continued use

#### YouTube Integration Patterns
- **URL Detection**: Monitor for YouTube video URLs
- **SPA Navigation**: Handle YouTube's single-page app routing
- **Player API**: Use YouTube's embedded player methods
- **DOM Integration**: Inject UI without breaking YouTube's layout

### Performance Patterns

#### Caption Processing
- **Lazy Loading**: Fetch captions only when search is activated
- **Caching Strategy**: Store processed captions in session storage
- **Index Optimization**: Use inverted index for O(1) word lookups
- **Web Workers**: Offload heavy processing to background threads

#### Search Optimization
- **Debounced Input**: Prevent excessive search calls during typing
- **Result Limiting**: Show top N results to maintain performance
- **Context Caching**: Cache formatted result snippets
- **Memory Management**: Clear old caches when switching videos

#### UI Performance
- **Virtual Scrolling**: Handle large result sets efficiently
- **CSS Animations**: Use transform/opacity for smooth transitions
- **Event Delegation**: Minimize event listeners
- **DOM Reuse**: Reuse elements instead of creating new ones

### Error Handling Patterns

#### Caption Fetch Errors
- **Graceful Degradation**: Show message when captions unavailable
- **Retry Logic**: Attempt multiple caption sources
- **Fallback Methods**: Try different YouTube API endpoints
- **User Feedback**: Clear error messages and suggested actions

#### YouTube Integration Errors
- **DOM Changes**: Detect when YouTube updates break selectors
- **API Changes**: Handle YouTube's internal API modifications
- **Extension Conflicts**: Avoid conflicts with other YouTube extensions
- **Browser Compatibility**: Handle cross-browser differences

### Security Patterns

#### Content Security Policy (CSP)
- **Inline Script Restrictions**: No inline JavaScript execution
- **External Resource Limits**: Only load from approved domains
- **Eval Restrictions**: No dynamic code execution
- **Manifest V3 Compliance**: Follow all security requirements

#### Data Privacy
- **No External Requests**: All processing stays client-side
- **No Data Collection**: No user data stored or transmitted
- **Session-Only Storage**: Clear data when tab closes
- **Permission Minimization**: Request only necessary permissions
