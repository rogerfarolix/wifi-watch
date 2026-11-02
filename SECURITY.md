# Security Policy

## Supported Versions

Only the latest stable release of **Wifi-Watch** receives active security updates and vulnerability patches.

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

The Wifi-Watch team takes the security and integrity of enterprise networks and defensive tools seriously. If you identify a security vulnerability, we ask that you follow responsible disclosure guidelines.

### How to Report

1. **Do NOT open a public GitHub issue** to disclose security vulnerabilities.
2. Report it privately through [GitHub Private Vulnerability Reporting](https://github.com/rogerfarolix/wifi-watch/security/advisories/new) (or by email: rogergnanih66@gmail.com) with:
   - Type of issue (e.g., buffer overflow, IPC injection, privilege escalation, unquoted search path).
   - Full steps to reproduce the vulnerability.
   - Proof of Concept (PoC) code or script if available.
   - Impact assessment on the host operating system or network.
3. You will receive an initial response acknowledging your report within 48 hours.
4. We will coordinate a remediation timeline and release an updated build before public disclosure.

## Security Principles of Wifi-Watch

- **Zero Kernel Drivers**: Wifi-Watch never installs kernel drivers (such as Npcap or WinPcap) to minimize attack surfaces and avoid kernel-level panics or exploits.
- **Local Isolation**: All device inventory and scan history are stored locally in an embedded local JSON data store. No telemetry is collected. The only outbound requests are the optional lookups you trigger (public-IP/ISP, MAC vendor, Shodan InternetDB, ThreatFox, AbuseIPDB, speed test) and the webhook you configure yourself; each sends only the IP/MAC being checked. API keys you enter are stored unencrypted in the local data file.
- **Context Isolation**: The Electron frontend operates with `contextIsolation: true` and `nodeIntegration: false`, communicating strictly via typed IPC channels defined in `preload.js`.
- **Defensive Scope**: Active intervention features (such as firewall isolation) use native Windows `netsh advfirewall` rules scoped specifically to the identified offending IP address.
