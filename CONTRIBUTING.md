# Contributing to Wifi-Watch

Thank you for your interest in improving **Wifi-Watch**! We welcome contributions from developers, network security researchers, system administrators, and technical writers.

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rogerfarolix/wifi-watch.git
   cd wifi-watch/desktop-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm start
   ```

4. **Validate syntax and run tests**:
   ```bash
   node -c src/main.js src/preload.js src/data/database.js src/network/*.js src/renderer/js/*.js
   ```

5. **Build portable release**:
   ```bash
   npm run dist
   ```

## Code Guidelines

- **Vanilla JavaScript**: We prioritize vanilla JavaScript without heavy frontend frameworks to maintain high performance, instant startup time (< 1s), and minimal memory overhead.
- **Context Isolation**: Never expose direct Node.js primitives to the renderer process. All interactions must pass through `preload.js` via sanitized IPC channels.
- **Internationalization (i18n)**: All UI strings must be added to both `fr` and `en` dictionaries in `desktop-app/src/renderer/js/i18n.js` and tagged with `data-i18n` attributes.
- **Non-Intrusive Networking**: Avoid external C/C++ native bindings that break portability or require administrator kernel drivers. Leverage native Windows tools (`arp`, `netsh`, `route`, `ping`, native Node `dns.promises`).

## Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Commit your changes with clear, descriptive commit messages.
3. Test your changes on Windows 10 and/or Windows 11.
4. Verify that the portable build compiles cleanly via `npm run dist`.
5. Open a Pull Request with a detailed description of the changes, screenshots (if UI changes are involved), and verification steps.

Thank you for helping keep enterprise networks safe and transparent!
