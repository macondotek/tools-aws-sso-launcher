# Organization Management Features

## Overview

The AWS SSO Launcher now supports multiple organizations with automatic SSO URL extraction and account filtering. This makes it easy to manage accounts across different AWS organizations.

## New Organization Features

### 1. **Organization Identification**
Use `organization = true` to mark sections as organizations:

```ini
### Organizations
[Corpay]
organization = true
region = us-east-1
roleName = FC-Admin

[AnotherOrg]
organization = true
region = us-west-2
roleName = Admin
```

### 2. **Automatic SSO URL Extraction**
The SSO Base URL is automatically extracted from the first organization in your configuration:

```ini
[Corpay]
organization = true
ssoBaseUrl = https://d-906755a708.awsapps.com  # Optional: explicit SSO URL
region = us-east-1
roleName = FC-Admin
```

If no `ssoBaseUrl` is specified in organizations, the extension uses the SSO URL from the options page.

### 3. **Organization Dropdown in Popup**
The popup now includes an organization dropdown that filters accounts:

- **"All Organizations"** - Shows accounts from all organizations
- **Organization names** - Shows only accounts from the selected organization
- **Auto-hide** - Dropdown is hidden if no organizations are defined

### 4. **Account Organization Assignment**
Accounts automatically inherit their organization from their defaults:

```ini
### Accounts inherit organization from defaults
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay  # Inherits from Corpay organization
group = CorpayComplete

[AnotherOrg Dev]
aws_account_id = 111111111111
defaults = AnotherOrg  # Inherits from AnotherOrg organization
group = Development
```

## Configuration Examples

### Single Organization Setup
```ini
### Organization
[Corpay]
organization = true
region = us-east-1
roleName = FC-Admin

### Accounts
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[Fuels Dev]
aws_account_id = 924615357380
defaults = Corpay
group = Fuels
```

### Multiple Organizations Setup
```ini
### Organizations
[Corpay]
organization = true
region = us-east-1
roleName = FC-Admin

[ClientOrg]
organization = true
region = us-west-2
roleName = Admin

### Corpay Accounts
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[Fuels Dev]
aws_account_id = 924615357380
defaults = Corpay
group = Fuels

### Client Organization Accounts
[Client Dev]
aws_account_id = 111111111111
defaults = ClientOrg
group = Development

[Client Prod]
aws_account_id = 222222222222
defaults = ClientOrg
group = Production
```

### Complex Inheritance Setup
```ini
### Organizations
[Corpay]
organization = true
region = us-east-1
roleName = FC-Admin

### Defaults that reference organizations
[CorpayDefaults]
defaults = Corpay
group = CorpayAccounts

[ClientDefaults]
defaults = ClientOrg
group = ClientAccounts

### Accounts using defaults
[Account A]
aws_account_id = 123456789012
defaults = CorpayDefaults  # Inherits from Corpay via CorpayDefaults
group = Production

[Account B]
aws_account_id = 987654321098
defaults = ClientDefaults  # Inherits from ClientOrg via ClientDefaults
group = Development
```

## User Interface Changes

### **Options Page**
- **SSO URL Auto-Extraction**: Automatically extracts SSO URL from first organization
- **Enhanced Examples**: Shows organization format in examples
- **Validation**: Validates organization syntax and inheritance

### **Popup Interface**
- **Organization Dropdown**: Filter accounts by organization
- **Smart Filtering**: Combines organization and search filtering
- **Auto-Hide**: Hides dropdown when no organizations are defined

### **Account Display**
- **Organization-Aware**: Accounts show their organization context
- **Filtered Groups**: Only relevant groups appear when organization is selected
- **Search Integration**: Search works within selected organization

## Benefits

### **Multi-Organization Support**
- Manage accounts across different AWS organizations
- Separate SSO URLs per organization
- Clear organization boundaries

### **Improved Organization**
- Logical grouping by organization
- Easy switching between organizations
- Reduced cognitive load

### **Automatic Configuration**
- SSO URLs extracted from configuration
- No manual SSO URL management
- Consistent organization setup

### **Enhanced User Experience**
- Quick organization switching
- Filtered account views
- Cleaner, more focused interface

## Migration from Previous Format

### **Automatic Migration**
The extension automatically handles migration from previous formats:

1. **Old JSON Format**: Automatically converted to new format
2. **Existing Configurations**: Backward compatible
3. **No Data Loss**: All existing settings preserved

### **Manual Migration Steps**
If you want to add organization support to existing configurations:

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
   defaults = YourOrg  # Reference your organization
   group = YourGroup
   ```

3. **Save Configuration**: The extension will automatically extract the SSO URL

## Best Practices

### **Organization Naming**
- Use clear, descriptive organization names
- Avoid special characters and spaces
- Keep names consistent across configurations

### **Default Inheritance**
- Define common settings in organization sections
- Use defaults sections for organization-specific groups
- Override settings at account level when needed

### **Group Organization**
- Group accounts logically within organizations
- Use consistent group naming conventions
- Consider account lifecycle (Dev, QA, Prod)

### **Configuration Maintenance**
- Regularly validate configurations
- Use comments to document organization structure
- Keep organization settings consistent

## Technical Details

### **Configuration Parser**
- Identifies organization sections with `organization = true`
- Resolves inheritance chains automatically
- Assigns accounts to organizations based on defaults

### **Account Filtering**
- Filters accounts by organization in real-time
- Combines with search functionality
- Updates UI dynamically

### **SSO URL Management**
- Extracts SSO URL from first organization
- Falls back to manual SSO URL if not found
- Updates automatically when configuration changes

The organization features make it much easier to manage complex multi-organization AWS environments while maintaining clear separation and organization of accounts.
