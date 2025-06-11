# SeekSpeak Project Brief

## Core Mission
SeekSpeak is a Chrome extension that enables instant caption search within YouTube videos, allowing users to jump to specific moments by searching transcript text.

## Target Problem
Users watching long-form YouTube content (30+ minutes) struggle to find specific topics or moments. Current YouTube transcript feature requires multiple clicks, manual scrolling, and awkward searching in small popups.

## Solution Scope
- **What**: Chrome extension for YouTube caption search with instant navigation
- **Target Users**: Viewers of long-form content (podcasts, educational videos, video essays)
- **Core Value Proposition**: Jump to any moment by searching transcript text
- **Technical Approach**: Client-side only, zero server costs, uses YouTube's existing APIs

## Key Design Decisions

### UI Approach: Popup Overlay ✓
- Modal-style overlay triggered by button/keyboard shortcut
- Non-intrusive for short videos where search isn't needed
- Dedicated space for search functionality
- Easily dismissible
- Perfect balance of accessibility and minimal footprint

**Rejected Alternatives:**
- Floating search bar (too intrusive)
- Integrated sidebar (requires too much screen space)

### Architecture: Client-Side Only
- All processing happens in browser
- No server infrastructure costs
- User privacy preserved (no data leaves browser)
- Fast response times
- Works offline once captions are loaded

### Monetization Model
- **Free Core Features**: All essential functionality available free
- **Donation Support**: "Buy Me a Coffee" link (dkmariolink)
- **Open Source**: Public GitHub repository for community contributions
- **Focus**: User adoption over revenue generation

## Project Constraints
- Chrome Extension Manifest V3 compliance
- YouTube's frequently changing UI
- No external servers or data storage
- Must handle large caption datasets (30+ min videos)
- Performance-sensitive (real-time search)

## Success Definition
Users can search and navigate to any moment in YouTube videos faster than current manual transcript browsing, with an interface that feels native to YouTube.
