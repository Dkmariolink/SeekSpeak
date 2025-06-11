# YouTube Integration Patterns and Constraints

## YouTube Caption API Investigation

### Primary Caption Source: YouTube's Internal API
**Endpoint Pattern**: Used by YouTube's native transcript feature
```
https://www.youtube.com/api/timedtext?v={VIDEO_ID}&lang={LANG}&fmt=json3
```

**Response Format**:
```json
{
  "events": [
    {
      "tStartMs": 0,
      "dDurationMs": 3000,
      "segs": [{"utf8": "Caption text here"}]
    }
  ]
}
```

**Key Properties**:
- `tStartMs`: Start time in milliseconds
- `dDurationMs`: Duration of caption segment
- `segs`: Array of text segments (may contain multiple parts)

### Alternative Caption Sources
1. **Player API Data**: Extract from YouTube's player configuration
2. **DOM Parsing**: Parse transcript from YouTube's transcript panel
3. **Subtitle Track**: Access browser's native subtitle API

## YouTube Page Detection Patterns

### URL Patterns to Monitor
```javascript
const YOUTUBE_PATTERNS = [
  'https://www.youtube.com/watch?v=*',
  'https://www.youtube.com/watch?*&v=*',
  'https://m.youtube.com/watch?v=*',
  'https://youtu.be/*'
];
```

### Video ID Extraction
```javascript
function extractVideoId(url) {
  const patterns = [
    /[?&]v=([^&]+)/,           // youtube.com/watch?v=ID
    /youtu\.be\/([^?]+)/,      // youtu.be/ID
    /embed\/([^?]+)/           // youtube.com/embed/ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

### SPA Navigation Handling
YouTube uses single-page application routing, requiring:
- **URL Change Detection**: Monitor `popstate` and `pushstate` events
- **DOM Observer**: Watch for video player element changes
- **React Component Detection**: YouTube uses React, monitor component updates

## YouTube Player Integration

### Player API Access
```javascript
// Access YouTube's embedded player
function getYouTubePlayer() {
  return document.getElementById('movie_player') || 
         document.querySelector('.html5-video-player');
}

// Navigate to timestamp
function seekToTimestamp(seconds) {
  const player = getYouTubePlayer();
  if (player && player.seekTo) {
    player.seekTo(seconds, true); // allowSeekAhead = true
  }
}
```

### Player State Monitoring
```javascript
// Monitor player state changes
function setupPlayerObserver() {
  const player = getYouTubePlayer();
  if (player) {
    player.addEventListener('onStateChange', (state) => {
      // Handle play, pause, seeking events
      if (state === 1) { // Playing
        // Update search UI if needed
      }
    });
  }
}
```

## YouTube UI Integration Constraints

### Safe Injection Points
1. **Video Container**: Append to `#secondary` or `#primary-inner`
2. **Player Controls**: Add button near existing controls
3. **Overlay Approach**: Create modal over entire video area

### CSS Isolation Strategies
```css
/* Prevent conflicts with YouTube's styles */
.seekspeak-container {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  position: fixed !important;
  z-index: 9999 !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.seekspeak-container * {
  box-sizing: border-box;
}
```

### Theme Compatibility
- **Dark Mode**: Detect and adapt to YouTube's dark theme
- **Light Mode**: Default styling for standard YouTube
- **Color Variables**: Use CSS custom properties for theme switching

## Known YouTube Limitations and Workarounds

### Caption Availability Issues
- **No Captions**: ~30% of videos lack captions entirely
- **Auto-Generated Only**: May have accuracy issues
- **Language Mismatches**: Video language vs available caption languages
- **Private/Restricted Videos**: Caption API access may be limited

### API Rate Limiting
- **Request Frequency**: Unknown limits on caption API calls
- **Caching Strategy**: Store captions in sessionStorage
- **Fallback Timing**: Implement exponential backoff for failed requests

### YouTube Update Resilience
- **Selector Changes**: YouTube frequently updates CSS classes
- **API Endpoint Changes**: Internal APIs may change without notice
- **Player Updates**: YouTube player functionality may be modified
- **Layout Changes**: UI injection points may become invalid
