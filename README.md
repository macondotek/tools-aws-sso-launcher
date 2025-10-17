# AWS SSO Launcher - Chrome Extension

A powerful Chrome extension for managing and launching AWS SSO sessions with support for multiple organizations, secure session detection, and an intuitive interface.

**Developed by [MacondoTek](https://www.macondotek.com) - Your trusted partner for developer tools and cloud solutions.**

## 🚀 Features

### Core Functionality
- **Quick AWS SSO Launch**: One-click access to AWS Console with pre-configured settings
- **Multi-Organization Support**: Manage accounts across different AWS organizations
- **Secure Session Detection**: Real-time detection of current AWS sessions without localStorage
- **Account Management**: Organize accounts into groups with custom roles and regions
- **Copy Account ID**: Quick copy-to-clipboard functionality for account IDs

### User Interface
- **Collapsible Group Sections**: Clean, organized view of account groups
- **Visual Account Selection**: Click-to-select accounts with visual feedback
- **Enhanced Search**: Search across all groups and accounts simultaneously
- **Organization Filtering**: Filter accounts by organization
- **Session Status Display**: Real-time display of current AWS session information

### Security & Reliability
- **Multiple Detection Methods**: 4 different approaches for reliable session detection
- **Session Validation**: Tracks session age and validity
- **Automatic Refresh**: Proactively refreshes sessions before expiry
- **Error Handling**: Comprehensive error handling with user feedback
- **No localStorage Dependency**: Secure session detection without browser storage

## 📦 Installation

1. **Download the Extension**: Clone or download this repository
2. **Load in Chrome**: 
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `aws-sso-launcher` folder
3. **Configure**: Set up your organizations and accounts (see Configuration section)

## ⚙️ Configuration

### Two-Field Configuration Format

The extension uses a clean two-field configuration format that separates organizations from accounts:

#### Field 1: Organizations Configuration
Define your AWS organizations with their default settings:

```ini
[Corpay] 
region = us-east-1
roleName = FC-Admin
baseURL = https://d-906755a708.awsapps.com
default = true

[AnotherOrg]
region = us-west-2
roleName = AdminRole
baseURL = https://d-123456789.awsapps.com
```

#### Field 2: Accounts Configuration
Define your AWS accounts that inherit settings from organizations:

```ini
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[Fuels Dev]
aws_account_id = 924615357380
defaults = Corpay
group = Fuels

[AnotherOrg Dev]
aws_account_id = 111111111111
defaults = AnotherOrg
group = Development
```

### Configuration Properties

#### Organization Properties
- `region` - AWS region (e.g., us-east-1)
- `roleName` - Default role name (e.g., FC-Admin)
- `baseURL` - SSO base URL (e.g., https://d-xxxx.awsapps.com)
- `default` - Mark as default organization (true/false)

#### Account Properties
- `aws_account_id` - 12-digit AWS account ID
- `defaults` - Organization name to inherit settings from
- `group` - Account group for organization in popup
- `region` - Override organization region (optional)
- `roleName` - Override organization role (optional)

### Advanced Configuration

#### Alternative Roles
Organizations can define multiple roles for accounts:

```ini
[Corpay]
region = us-east-1
roleName = FC-Admin
baseURL = https://d-906755a708.awsapps.com
altRoles = ["FC-ReadOnly", "FC-PowerUser", "CustomRole"]
```

#### Account-Specific Overrides
Accounts can override organization defaults:

```ini
[Special Account]
aws_account_id = 123456789012
defaults = Corpay
group = Special
region = us-west-2
roleName = CustomRole
```

## 🎯 Usage

### Basic Usage

1. **Open Extension**: Click the extension icon in your Chrome toolbar
2. **Select Account**: Click on any account to select it
3. **Quick Launch**: Use the ▶ button for quick launch with defaults
4. **Edit Settings**: Use the ⚙ button to customize role, region, and destination
5. **Copy Account ID**: Use the 📋 button to copy account ID to clipboard

### Advanced Usage

#### Organization Filtering
- Use the organization dropdown to filter accounts by organization
- Select "All" to see accounts from all organizations

#### Search Functionality
- Type in the search box to find accounts by name, ID, or group
- Search works across all groups and organizations
- Groups automatically expand when they contain matching results

#### Session Management
- The extension automatically detects your current AWS session
- Session status is displayed at the top of the popup
- Sessions are automatically refreshed before expiry

### Account Actions

Each account has three action buttons:

- **▶ (Open)**: Quick launch with default settings
- **📋 (Copy)**: Copy account ID to clipboard
- **⚙ (Edit)**: Open form to customize settings

## 🔧 Options Page

Access the options page to configure your organizations and accounts:

1. **Right-click** the extension icon and select "Options"
2. **Organizations Field**: Enter your organization configurations
3. **Accounts Field**: Enter your account configurations
4. **Validation**: Real-time validation of your configuration
5. **Examples**: Load example configurations to get started

## 🔍 Session Detection

The extension uses multiple methods to detect your current AWS session:

### Detection Methods
1. **Account Selector Detection**: Analyzes AWS Console's account dropdown
2. **Header Elements Detection**: Checks header elements for account info
3. **Page Metadata Detection**: Reads meta tags and script elements
4. **Cookie-based Detection**: Fallback method using AWS cookies

### Session States
- ✅ **Valid**: Session is active and not near expiry
- ⚠️ **Near Expiry**: Session will expire within 5 minutes
- ❌ **Expired**: Session has expired (older than 1 hour)

## 🎨 User Interface

### Collapsible Group Sections
- Each group is displayed as an expandable section
- Group headers show group name and account count
- Click to expand/collapse groups
- Only one group expanded at a time (accordion style)

### Visual Account Selection
- Accounts displayed as clickable cards
- Visual highlighting for selected account
- Account name, ID, and default role displayed
- Hover effects for better UX

### Enhanced Search
- Search across all groups and accounts simultaneously
- Auto-expand groups with matching results
- Real-time filtering
- Clear "no results" messaging

## 🔒 Security Features

### Secure Session Detection
- **DOM-based detection**: Analyzes AWS Console page elements
- **No localStorage**: Doesn't rely on browser storage
- **Multiple validation methods**: Ensures reliable detection
- **Automatic cleanup**: Clears stale sessions

### Session Management
- **Real-time tracking**: Monitors session age and validity
- **Automatic refresh**: Refreshes sessions before expiry
- **SPA support**: Handles single-page application navigation
- **Error recovery**: Graceful handling of detection failures

## 🚨 Troubleshooting

### Common Issues

#### Session Not Detected
- Ensure you're on an AWS Console page
- Try refreshing the page
- Check that the extension has proper permissions

#### Configuration Errors
- Validate your configuration in the Options page
- Check for typos in organization names
- Ensure account IDs are 12 digits

#### SSO Launch Failures
- Verify your SSO Base URL is correct
- Check that the role name exists in the target account
- Ensure you have proper permissions

### Debug Information
- Check the browser console for error messages
- Use the extension's built-in validation
- Verify your AWS SSO configuration

## 📋 Migration

### From Legacy Format
The extension automatically handles migration from previous formats:

1. **Legacy JSON Format**: Automatically converted to new format
2. **Single-Field Format**: Migrated to two-field format
3. **No Data Loss**: All existing settings preserved

### Manual Migration Steps
If you want to manually migrate:

1. **Add Organization Sections**:
   ```ini
   [YourOrg]
   organization = true
   region = us-east-1
   roleName = YourRole
   ```

2. **Update Account Defaults**:
   ```ini
   [Your Account]
   aws_account_id = 123456789012
   defaults = YourOrg
   group = YourGroup
   ```

## 🧪 Testing

### Configuration Testing
Use the included test script to verify your configuration:

```javascript
// Run in browser console
// Load test-two-field-config.js for comprehensive testing
```

### Session Detection Testing
1. Open AWS Console in a tab
2. Open the extension popup
3. Verify session information is displayed
4. Navigate between AWS Console pages
5. Check that session updates automatically

## 📚 Additional Documentation

- [Organization Features](ORGANIZATION_FEATURES.md) - Detailed organization management
- [Two-Field Configuration](TWO_FIELD_CONFIGURATION.md) - Configuration format details
- [Storage Quota Guide](STORAGE_QUOTA_GUIDE.md) - Managing storage limits
- [Service Worker Fixes](SERVICE_WORKER_FIXES.md) - Technical implementation details
- [Testing Guide](TESTING.md) - Comprehensive testing procedures
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the additional documentation
- Open an issue on GitHub

---

**AWS SSO Launcher** - Making AWS account management simple and secure.

---

### 🌐 About MacondoTek

Visit [MacondoTek.com](https://www.macondotek.com) to discover more developer tools, cloud solutions, and professional services. We specialize in creating tools that make developers' lives easier and more productive.

**© 2025 MacondoTek. All rights reserved.**