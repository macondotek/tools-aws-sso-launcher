# Changelog

All notable changes to the AWS SSO Launcher Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Deprecated
- Nothing yet

### Removed
- Nothing yet

### Fixed
- Nothing yet

### Security
- Nothing yet

## [1.0.0] - 2025-10-17

### Added
- Initial release of AWS SSO Launcher Chrome Extension
- Multi-organization AWS SSO support
- Account grouping and management system
- Secure session detection without localStorage access
- Professional UI with MacondoTek branding
- Comprehensive configuration system with INI-style format
- Copy account ID functionality with clipboard API
- Smart group expansion based on current session
- 2-column options page layout
- Organization inheritance system
- Alternative roles support
- Session status display with expiry warnings
- Search and filtering capabilities
- Responsive design with modern CSS
- Complete documentation and configuration guides

### Features
- **Organizations**: Define multiple AWS organizations with default settings
- **Accounts**: Group accounts with custom roles and regions
- **Inheritance**: Use `defaults = OrganizationName` for configuration inheritance
- **Session Detection**: Real-time detection of active AWS console sessions
- **UI/UX**: Professional interface with hover effects and animations
- **Configuration**: Two-field configuration system (organizations + accounts)
- **Branding**: MacondoTek logo and website integration
- **Accessibility**: Proper alt text and keyboard navigation support

### Technical
- Chrome Extension Manifest V3
- Modern JavaScript (ES6+)
- CSS Grid and Flexbox layouts
- Clipboard API with fallback support
- Secure content script injection
- Background service worker
- Storage API integration
- Cross-origin request handling

---

## Version Numbering

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner  
- **PATCH** version when you make backwards compatible bug fixes

### Version Types

- **Patch (1.0.1)**: Bug fixes, documentation updates, minor improvements
- **Minor (1.1.0)**: New features, UI improvements, new configuration options
- **Major (2.0.0)**: Breaking changes, major UI redesigns, API changes

### Release Process

1. Update version using `./version.sh [patch|minor|major]`
2. Update this CHANGELOG.md with changes
3. Commit and push changes
4. Create GitHub release with tag
5. Update Chrome Web Store listing

---

## Links

- [GitHub Repository](https://github.com/macondotek/tools-aws-sso-launcher)
- [MacondoTek Website](https://www.macondotek.com)
- [Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
