# Changelog

All notable changes to the AWS SSO Launcher Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Config export: download full configuration as a dated JSON file from the Options page
- Config import: restore configuration from a previously exported JSON file

### Fixed
- Popup action buttons (Open Console, Open SSO Home) were hidden below the fold when an account was selected; popup now uses a flex layout so buttons always stay in view

### Changed
- Region dropdown expanded from 5 entries to all 30+ commercial AWS regions, grouped by geography (US, Canada, South America, Europe, Asia Pacific, Middle East & Africa)
- Removed all commented-out debug `console.log` lines from production code; `window.awsSSODebug.debugPage()` now returns a proper diagnostic object

### Removed
- Dead code: `allAccounts` array, `buildAllAccountsList()`, duplicate `extractAccountFromElement` (identical to `parseAccountFromElement`), and the unused `DEBUG_SESSION` message handler in the content script

---

## [1.1.6] - 2026-05-18

### Added
- GitHub Actions CI/CD workflow (`publish.yml`) — pushing a version tag automatically packages the extension and uploads it to the Chrome Web Store
- `version.sh` now pushes the tag to origin after committing, triggering the CI/CD pipeline as a single-step publish flow

### Fixed
- Removed unnecessary `scripting` permission from `manifest.json` (only `storage` and `tabs` are needed)
- `altRoles` in organization config now correctly parsed as a comma-separated string (was previously expected as a JSON array)
- Organization filter dropdown now correctly hides itself when no organizations are configured
- Account selection now uses a composite group+index key to correctly handle duplicate account IDs across different groups

### Changed
- MacondoTek logo added to Options page header
- Privacy Policy link added to Options page footer, pointing to the published policy at macondotek.com

> Note: versions 1.1.1–1.1.5 were internal CI/CD pipeline iterations establishing the GitHub Actions → Chrome Web Store publish flow (OAuth client type, CLI flag changes in `chrome-webstore-upload-cli@4`, `PUBLISHER_ID` secret, GitHub Release permissions).

---

## [1.1.0] - 2026-03-02

### Changed
- Region input in popup replaced with a dropdown (`<select>`) with the most common regions pre-filled and an "Other…" fallback for custom regions

### Fixed
- Popup configuration loading now correctly prioritizes local storage over sync storage for large configs

---

## [1.0.0] - 2025-10-17

### Added
- Initial release of the AWS SSO Launcher Chrome Extension
- Multi-organization AWS SSO support with INI-style configuration
- Account grouping system — organize accounts into named groups shown in the popup
- One-click SSO launch (same tab or new tab) with role and region selection
- Alternative roles support (`altRoles`) — dropdown appears in the edit form when configured
- Secure session detection without `localStorage` — 12 different DOM/URL/cookie detection methods
- Session status display in popup header with expiry warning
- Real-time search across all groups and accounts
- Organization filter dropdown to narrow the account list
- Copy account ID to clipboard button on each account row
- Collapsible group sections (accordion) with account count badges
- MacondoTek branding with logo on the Options page
- Two-field configuration (organizations + accounts) parsed by `ConfigParser`
- Configuration inheritance: accounts use `defaults = OrgName` to inherit region, role, and SSO URL
- Chrome Extension Manifest V3, service worker background script
- Storage quota handling — falls back to `chrome.storage.local` when config exceeds sync limits

---

## Links

- [GitHub Repository](https://github.com/macondotek/tools-aws-sso-launcher)
- [MacondoTek Website](https://www.macondotek.com)
- [Chrome Web Store](https://chromewebstore.google.com/detail/mtk-awslauncher/copkcllbbkddonhallnciffiiedddkjk)
