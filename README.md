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

2. **Create extension icons**:
   - Create PNG icons: 16x16, 32x32, 48x48, 128x128 pixels
   - Save as `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - Place in `src/assets/icons/` folder

3. **Load the extension in Chrome**:
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

MIT License - see LICENSE file for details