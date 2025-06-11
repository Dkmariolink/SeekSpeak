# SeekSpeak Technical Context

## Chrome Extension APIs

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "SeekSpeak",
  "version": "1.0.0",
  "description": "Search YouTube video captions and jump to specific moments instantly",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://www.youtube.com/*"
  ],
  "content_scripts": [{
    "matches": ["https://www.youtube.com/watch*"],
    "js": ["content/youtube-injector.js"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background/service-worker.js"
  }
}
```

### Key Chrome APIs in Use
- **chrome.tabs**: Monitor YouTube page navigation
- **chrome.storage.session**: Cache caption data temporarily  
- **chrome.scripting**: Inject content scripts dynamically
- **chrome.runtime**: Message passing between scripts

## YouTube-Specific Technical Constraints

### Caption Data Sources
1. **YouTube's Internal API**: Primary method for fetching captions
   - Endpoint: Used by YouTube's own transcript feature
   - Format: JSON with timestamp and text data
   - Languages: Multiple caption tracks per video
   
2. **Fallback Methods**: When primary API fails
   - Parse transcript from DOM elements
   - Extract from YouTube's player data
   - Handle auto-generated vs manual captions

### YouTube Player Integration
- **Seeking API**: `player.seekTo(seconds, allowSeekAhead)`
- **Event Listeners**: Monitor player state changes
- **URL Parsing**: Extract video ID from various YouTube URL formats
- **SPA Navigation**: Handle YouTube's single-page application routing

### Known YouTube Limitations
- **Rate Limiting**: Caption API may have usage restrictions
- **CORS Restrictions**: Some internal APIs blocked by CORS
- **UI Changes**: YouTube frequently updates selectors and layout
- **Caption Availability**: Not all videos have captions

## JavaScript Libraries and Dependencies

### Core Dependencies (Minimal Approach)
- **No External Libraries**: Keep extension lightweight
- **Vanilla JavaScript**: All functionality in pure JS
- **CSS3**: Modern CSS features for UI styling
- **Web APIs**: Use browser native APIs when possible

### Potential Libraries (If Needed)
- **Fuse.js**: For advanced fuzzy search capabilities
- **date-fns**: If timestamp manipulation becomes complex
- **Lodash**: Only specific utilities if performance critical

### Development Dependencies
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Web Store CLI**: Chrome Web Store publishing
- **Jest**: Unit testing framework (for search algorithms)

## Development and Testing Setup

### Local Development
```bash
# Project structure
SeekSpeak/
├── src/           # Source files
├── dist/          # Built extension files  
├── test/          # Test files
└── docs/          # Documentation

# Development workflow
1. Edit source files
2. Test in Chrome's developer mode
3. Load unpacked extension
4. Test on various YouTube videos
```

### Testing Strategy
- **Manual Testing**: Load extension and test on real YouTube videos
- **Edge Case Testing**: Videos without captions, very long videos
- **Performance Testing**: Large caption datasets (3+ hour videos)
- **Compatibility Testing**: Different YouTube layouts and themes

### Chrome Development Tools
- **Extension Inspector**: Debug background scripts
- **Content Script Debugging**: Use browser DevTools
- **Performance Profiling**: Monitor memory and CPU usage
- **Network Monitoring**: Track caption fetch requests

## Browser Compatibility Considerations

### Chrome-First Approach
- **Target Browser**: Chrome 88+ (Manifest V3 support)
- **Primary Testing**: Latest Chrome stable
- **Feature Detection**: Graceful degradation for older versions

### Potential Browser Expansion
- **Firefox**: Manifest V2 compatibility layer needed
- **Edge**: Chromium-based, likely compatible
- **Safari**: Would require significant adaptation

### API Compatibility
- **Fetch API**: Modern async request handling
- **Intersection Observer**: For UI element visibility
- **MutationObserver**: Monitor YouTube DOM changes
- **Web Storage**: Session and local storage APIs
