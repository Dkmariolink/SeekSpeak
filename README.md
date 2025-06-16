# SeekSpeak - YouTube Caption Search Extension

Search YouTube video captions and jump to specific moments instantly.

SeekSpeak is a Chrome extension that allows users to search through YouTube video captions in real-time and navigate directly to any moment by clicking search results.

## Features

- **Instant Caption Search**: Real-time search through video captions
- **Smart Matching**: Fuzzy search handles typos and variations  
- **Quick Navigation**: Click any result to jump to that timestamp
- **Keyboard Shortcuts**: Press `Ctrl+Shift+F` to open search
- **Dark/Light Themes**: Automatically matches YouTube's theme
- **Mobile Responsive**: Works on different screen sizes
- **Accessibility**: Full keyboard navigation support

## Installation

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

## How to Use

1. **Open any YouTube video** that has captions available
2. **Activate search** using one of these methods:
   - Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
   - Click the SeekSpeak extension icon and click "Search Captions"
3. **Type your search query** - results appear in real-time
4. **Navigate results** using arrow keys or mouse
5. **Jump to timestamp** by clicking any result or pressing Enter

## Technical Details

- **Chrome Extensions Manifest V3**: Modern extension architecture
- **Vanilla JavaScript**: No external dependencies for performance
- **YouTube APIs**: Caption data access and player control
- **Responsive CSS**: Works across different screen sizes

## Contributing

SeekSpeak is open source! Contributions are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## Support

- **GitHub Issues**: Report bugs or request features
- **Buy Me a Coffee**: [Support the developer](https://buymeacoffee.com/dkmariolink)

## License

MIT License - see [LICENSE](https://github.com/Dkmariolink/SeekSpeak/tree/master?tab=MIT-1-ov-file#readme) for details

# SeekSpeak - YouTube Caption Search Extension

**🚀 Coming SOON to Chrome Web Store!**

Search YouTube video captions instantly and jump to any moment with a click. SeekSpeak transforms how you navigate video content by making every spoken word searchable.


## ✨ Features

- **🔍 Real-time Caption Search**: Find any word or phrase as you type
- **🎯 Smart Fuzzy Matching**: Handles typos and variations automatically  
- **⚡ Instant Navigation**: Click any result to jump directly to that timestamp
- **⌨️ Keyboard Shortcuts**: Press `Ctrl+Shift+F` to open search overlay
- **🎨 YouTube Integration**: Seamlessly integrated next to Subscribe button
- **🔄 Multi-source Captions**: Works with auto-generated and manual captions
- **🛡️ Robust Error Handling**: Reliable performance on fresh installs
- **📱 Responsive Design**: Works on all screen sizes
- **♿ Accessibility**: Full keyboard navigation support

## 📦 Installation

### From Chrome Web Store (Recommended)
1. Visit the [SeekSpeak Chrome Web Store page](https://chrome.google.com/webstore)
2. Click "Add to Chrome"
3. Navigate to any YouTube video and start searching!

### For Developers
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dkmariolink/SeekSpeak.git
   cd SeekSpeak
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" 
   - Click "Load unpacked" 
   - Select the `src` folder

## 🎯 How to Use

1. **Go to any YouTube video** with captions
2. **Look for the "Search Captions" button** next to the Subscribe button
3. **Open search** by:
   - Clicking the "Search Captions" button
   - Using keyboard shortcut: `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
   - Clicking the extension icon in toolbar
4. **Type your search** - results appear instantly
5. **Navigate with keyboard** (↑/↓ arrows, Enter) or click results
6. **Jump to any moment** - video seeks to exact timestamp

## 🔧 Technical Architecture

- **Manifest V3**: Modern Chrome extension with enhanced security
- **Vanilla JavaScript**: Zero dependencies for optimal performance  
- **Multi-tier Caption Fetching**: YouTube Timedtext API → Player Data → Transcript Panel
- **Fuzzy Search Engine**: Real-time indexing with smart word matching
- **Robust Error Handling**: Graceful degradation and retry logic
- **YouTube SPA Compatible**: Handles dynamic navigation and UI changes

## 🛠️ Development

### Project Structure
```
SeekSpeak/
├── src/                    # Extension source code
│   ├── manifest.json      # Extension configuration
│   ├── content/           # Content scripts for YouTube
│   ├── background/        # Service worker
│   ├── popup/            # Extension popup
│   └── options/          # Settings page
├──
```

### Building & Testing
```bash
# No build step required - uses vanilla JavaScript
# Load src/ folder directly in Chrome for development

# Test on various YouTube videos:
# - Videos with auto-generated captions
# - Videos with manual captions  
# - Different video lengths
# - Fresh extension installs
```

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly on fresh Chrome installs
4. Ensure compatibility with YouTube's dynamic interface
5. Submit pull request with detailed description

## 🐛 Troubleshooting

**Extension not working on first install?**
- Reload the YouTube page after installing
- Check if captions are available for the video
- Try the keyboard shortcut `Ctrl+Shift+F`

**Button not appearing?**
- Ensure you're on a YouTube video page (not homepage)
- Look next to the Subscribe button
- Refresh the page if needed

**Search not finding results?**
- Verify the video has captions (CC button available)
- Try different search terms - use actual spoken words
- Some videos may have limited caption availability

## 📞 Support & Feedback

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/Dkmariolink/SeekSpeak/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/Dkmariolink/SeekSpeak/discussions)
- **☕ Support Development**: [Buy Me a Coffee](https://buymeacoffee.com/dkmariolink)

## 📄 License

MIT License - see [LICENSE](https://github.com/Dkmariolink/SeekSpeak/tree/master?tab=MIT-1-ov-file#readme) for details

## 🙏 Acknowledgments

Built with ❤️ for the YouTube community. Special thanks to all beta testers who helped make v1.0 rock-solid reliable.

---

**⭐ Enjoying SeekSpeak? Star the repo and leave a Chrome Web Store review!**