# SeekSpeak - YouTube Caption Search Extension

🔍 **Search YouTube video captions and jump to specific moments instantly**

SeekSpeak is a Chrome extension that allows users to search through YouTube video captions in real-time and navigate directly to any moment by clicking search results.

## Features

- **Instant Caption Search**: Real-time search through video captions
- **Smart Matching**: Fuzzy search handles typos and variations  
- **Quick Navigation**: Click any result to jump to that timestamp
- **Keyboard Shortcuts**: Press `Ctrl+Shift+F` to open search
- **Dark/Light Themes**: Automatically matches YouTube's theme
- **Mobile Responsive**: Works on different screen sizes
- **Accessibility**: Full keyboard navigation support

## Installation (Development)

### Prerequisites
- Google Chrome browser
- YouTube videos with captions

### Setup Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dkmariolink/SeekSpeak.git
   cd SeekSpeak
   ```

2. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" 
   - Select the `src` folder from this project

3. **Test the extension**:
   - Go to any YouTube video with captions
   - Press `Ctrl+Shift+F` or click the SeekSpeak extension icon
   - Type to search captions instantly!

## How to Use

1. **Open any YouTube video** that has captions available
2. **Activate search** using one of these methods:
   - Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
   - Click the SeekSpeak extension icon and click "Search Captions"
3. **Type your search query** - results appear in real-time
4. **Navigate results** using arrow keys or mouse
5. **Jump to timestamp** by clicking any result or pressing Enter

## Development Status

### ✅ Phase 1: Core Functionality (95% Complete)
- [x] Chrome Extension Manifest V3 setup
- [x] YouTube page detection and integration
- [x] Caption fetching from YouTube APIs
- [x] Real-time search with fuzzy matching
- [x] Search overlay UI with responsive design
- [x] Timestamp navigation and player control
- [x] Extension popup interface
- [x] Dark/light theme support
- [x] Keyboard shortcuts and accessibility
- [ ] Testing and bug fixes

### 🔄 Next: Testing & Refinement
- Load testing with various YouTube videos
- Performance optimization for long videos
- Edge case handling and error recovery
- User experience improvements

## Technical Architecture

### Core Components
- **Background Service Worker**: Extension lifecycle and message coordination
- **Content Scripts**: YouTube integration and functionality injection
- **Search Engine**: Advanced text indexing and fuzzy matching
- **UI Controller**: Search overlay and user interaction handling

### Key Technologies
- **Chrome Extensions Manifest V3**: Modern extension architecture
- **Vanilla JavaScript**: No external dependencies for performance
- **CSS3**: Responsive design with theme support
- **YouTube APIs**: Caption data access and player control

## Contributing

SeekSpeak is open source! Contributions are welcome.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Update documentation if needed
5. Submit a pull request

### Testing Guidelines
- Test on videos with different caption types (auto-generated vs manual)
- Verify functionality across different video lengths
- Check responsive design on various screen sizes
- Test keyboard navigation and accessibility features

## Support

- **GitHub Issues**: Report bugs or request features
- **Buy Me a Coffee**: [Support the developer](https://buymeacoffee.com/dkmariolink)

## License

MIT License - see LICENSE file for details

---

**Made with ❤️ for YouTube users who want to find specific moments instantly**