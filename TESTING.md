# SeekSpeak Testing Checklist

## Pre-Testing Setup
- [ ] Chrome browser with Developer mode enabled
- [ ] SeekSpeak extension loaded as unpacked extension
- [ ] Extension icon visible in Chrome toolbar

## Basic Functionality Tests

### 1. Extension Loading
- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] Extension icon appears in Chrome toolbar
- [ ] No console errors on extension load

### 2. YouTube Page Detection
- [ ] Navigate to YouTube homepage - extension should not activate
- [ ] Open a YouTube video - extension should detect video page
- [ ] Extension popup shows video information
- [ ] Badge updates to show status

### 3. Caption Availability
Test with these video types:
- [ ] **Video with manual captions**: Extension should detect captions
- [ ] **Video with auto-generated captions**: Should work with auto captions
- [ ] **Video without captions**: Should show "no captions available"
- [ ] **Very short video** (< 2 minutes): Should handle gracefully
- [ ] **Very long video** (> 1 hour): Should handle large datasets

### 4. Search Overlay Activation
- [ ] Press `Ctrl+Shift+F` opens search overlay
- [ ] Click extension icon and "Search Captions" opens overlay
- [ ] Overlay appears centered and properly styled
- [ ] Search input is automatically focused

### 5. Search Functionality
- [ ] **Basic search**: Type common word, see results
- [ ] **Case insensitive**: "HELLO" finds "hello"
- [ ] **Partial words**: "prog" finds "programming" 
- [ ] **Fuzzy matching**: "progamming" finds "programming"
- [ ] **Phrase search**: "hello world" finds exact phrase
- [ ] **No results**: Search for nonsense shows "no results"
- [ ] **Real-time search**: Results update as you type

### 6. Search Results
- [ ] Results show timestamp in correct format (MM:SS or H:MM:SS)
- [ ] Results show context around matched text
- [ ] Search terms are highlighted in results
- [ ] Multiple results display for common words
- [ ] Results are ranked sensibly (exact matches first)

### 7. Navigation
- [ ] Click a result jumps video to correct timestamp
- [ ] Video plays from the selected moment
- [ ] Timestamp navigation is accurate (±2 seconds acceptable)
- [ ] Multiple result clicks work correctly

### 8. Keyboard Navigation
- [ ] `↑` and `↓` arrows navigate between results
- [ ] Selected result is visually highlighted
- [ ] `Enter` key activates selected result
- [ ] `Escape` key closes overlay
- [ ] `Tab` key moves through interface elements

### 9. UI/UX Testing
- [ ] **Theme matching**: Dark mode matches YouTube dark theme
- [ ] **Responsive design**: Overlay works on different window sizes
- [ ] **Mobile simulation**: Use Chrome DevTools mobile view
- [ ] **Animation smoothness**: Overlay opens/closes smoothly
- [ ] **Loading states**: Shows loading when fetching captions

### 10. Error Handling
- [ ] **No captions**: Clear message when captions unavailable
- [ ] **Network issues**: Graceful handling of failed caption fetch
- [ ] **Invalid videos**: Handles private/deleted videos
- [ ] **Extension conflicts**: Works with other extensions installed

## Advanced Testing

### 11. Performance Testing
- [ ] **Large videos**: 2+ hour videos load and search quickly
- [ ] **Memory usage**: Extension doesn't cause excessive memory use
- [ ] **Search speed**: Results appear within 500ms of typing
- [ ] **Caption caching**: Subsequent searches on same video are fast

### 12. Edge Cases
- [ ] **YouTube navigation**: Works with YouTube's SPA routing
- [ ] **Multiple tabs**: Each tab works independently
- [ ] **Page refresh**: Extension re-initializes correctly
- [ ] **Video quality changes**: Captions remain available
- [ ] **Playlist navigation**: Works when video changes in playlist

### 13. Browser Compatibility
- [ ] **Chrome stable**: Latest stable version
- [ ] **Chrome beta**: If available
- [ ] **Different operating systems**: Windows/Mac/Linux if possible

## Bug Documentation Template

When you find a bug, document it like this:

```
**Bug**: Brief description
**Steps to reproduce**: 
1. Step one
2. Step two
3. Step three

**Expected**: What should happen
**Actual**: What actually happened
**Video URL**: Link to test video (if relevant)
**Console errors**: Any errors in browser console
**Screenshots**: If helpful
```

## Test Videos Recommendations

Good videos for testing:
- **TED Talks**: Usually have high-quality manual captions
- **YouTube Originals**: Often have multiple language captions
- **Educational channels**: Good variety of content and caption quality
- **Podcasts**: Long-form content for performance testing
- **Music videos**: Often have auto-generated captions (different format)

## Success Criteria

✅ **Phase 1 Complete** when:
- Extension loads without errors
- Captions are reliably detected and fetched
- Search returns accurate results quickly
- Navigation jumps to correct timestamps
- UI is responsive and accessible
- No major bugs or crashes

---

**Next Phase**: Once testing is complete and bugs are fixed, we'll move to Phase 2 (Enhanced Search Features) and eventually Chrome Web Store submission.