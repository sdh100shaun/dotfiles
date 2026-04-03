# KeePassXC TUI

A Terminal User Interface for interacting with KeePassXC password manager.

## Requirements

- Node.js 18+
- KeePassXC with Browser Integration enabled
- Linux: `xclip` or `xsel` for clipboard support
- macOS: Uses native `pbcopy`

## Installation

```bash
cd tools/keepassxc-tui
npm install
npm run build
```

## Usage

```bash
npm start
# or after build
node dist/index.js
```

## Setup KeePassXC

1. Open KeePassXC
2. Go to Tools > Settings > Browser Integration
3. Enable "Enable browser integration"
4. The TUI will associate with your database on first connection

## Keyboard Shortcuts

### Navigation
- `j / ↓` - Move down
- `k / ↑` - Move up
- `Enter` - Select / View entry details
- `Escape` - Close dialog / Cancel
- `q` - Quit application

### Search & Browse
- `/` - Open search dialog
- `b` - Browse database groups
- `r` - Refresh current search

### Clipboard Operations
- `c / p` - Copy password
- `u` - Copy username
- `t` - Copy TOTP code

### Database Operations
- `g` - Generate new password
- `l` - Lock database

### Other
- `?` - Show help screen

## Configuration

Configuration is stored in `~/.config/keepassxc-tui/config.json`

## Architecture

```
src/
├── api/           # KeePassXC protocol implementation
│   ├── client.ts  # Main API client
│   ├── socket.ts  # Unix socket communication
│   └── connection.ts # Connection management with retries
├── ui/            # Terminal UI components
│   ├── app.ts     # Main application
│   ├── theme.ts   # Color theme
│   └── components/
└── utils/         # Utilities
    ├── crypto.ts  # TweetNaCl encryption
    ├── config.ts  # Configuration management
    └── clipboard.ts # Clipboard operations
```

## License

MIT
