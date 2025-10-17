# AWS SSO Launcher - Configuration Format

## Overview

The AWS SSO Launcher now uses an AWS credentials file-style configuration format that's more intuitive and flexible than the previous JSON format. This format supports:

- **Section-based organization** with `[SectionName]` headers
- **Inheritance** using `defaults = SectionName` references
- **Comments** with `#` prefix
- **Multiple organizations** and account groups
- **Flexible role and region management**

## Configuration Format

### Basic Structure

```ini
### Organization Defaults
[Corpay] 
region = us-east-1
roleName = FC-Admin

### Account Sections
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[Fuels Dev]
aws_account_id = 924615357380
defaults = Corpay
group = Fuels
```

## Section Types

### 1. Defaults Sections
Define common settings that can be inherited by accounts:

```ini
[Corpay] 
region = us-east-1
roleName = FC-Admin

[Development]
region = us-west-2
roleName = Developer
```

**Supported Properties:**
- `region` - AWS region (e.g., us-east-1, us-west-2)
- `roleName` or `role` - IAM role name
- `alias` - Account alias (optional)
- `name` - Display name (optional)

### 2. Account Sections
Define individual AWS accounts:

```ini
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[Fuels QA]
aws_account_id = 812998806105
defaults = Corpay
group = Fuels
region = us-west-2  # Override default region
```

**Required Properties:**
- `aws_account_id` - 12-digit AWS account ID

**Optional Properties:**
- `defaults` - Reference to a defaults section
- `group` - Group name for organization
- `region` - AWS region (inherited from defaults if not specified)
- `roleName` or `role` - IAM role (inherited from defaults if not specified)
- `alias` - Account alias
- `name` - Display name

## Inheritance

Accounts can inherit settings from defaults sections:

```ini
### Defaults
[Corpay] 
region = us-east-1
roleName = FC-Admin

### Accounts inherit from Corpay defaults
[Account A]
aws_account_id = 123456789012
defaults = Corpay
group = Production

[Account B]
aws_account_id = 987654321098
defaults = Corpay
group = Production
roleName = ReadOnly  # Override inherited role
```

## Groups

Accounts are organized into groups using the `group` property:

```ini
### Production Accounts
[Prod Main]
aws_account_id = 123456789012
defaults = Corpay
group = Production

[Prod Backup]
aws_account_id = 234567890123
defaults = Corpay
group = Production

### Development Accounts
[Dev Sandbox]
aws_account_id = 345678901234
defaults = Development
group = Development
```

## Comments

Use `#` for comments:

```ini
# Organization defaults
[Corpay] 
region = us-east-1
roleName = FC-Admin

# Production accounts
[Prod Main]
aws_account_id = 123456789012
defaults = Corpay
group = Production
```

## Complete Example

```ini
### Organization Defaults
[Corpay] 
region = us-east-1
roleName = FC-Admin

[Development]
region = us-west-2
roleName = Developer

### CorpayComplete Accounts
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[CorpayComplete Main]
aws_account_id = 123456789012
defaults = Corpay
group = CorpayComplete

### Fuels Accounts
[Fuels Dev]
aws_account_id = 924615357380
defaults = Corpay
group = Fuels

[Fuels QA]
aws_account_id = 812998806105
defaults = Corpay
group = Fuels

[Fuels Prod]
aws_account_id = 987654321098
defaults = Corpay
group = Fuels
roleName = ReadOnly  # Override default role

### Development Accounts
[Dev Sandbox]
aws_account_id = 111111111111
region = us-west-2
roleName = Developer
group = Development

[Test Environment]
aws_account_id = 222222222222
defaults = Development
group = Development
```

## Migration from JSON

The extension automatically converts old JSON configurations to the new format. You can also manually convert using the "Convert from JSON" button in the options page.

### Old JSON Format:
```json
{
  "defaults": { "roleName": "FC-Admin", "region": "us-east-1" },
  "groups": [
    { "name": "Prod", "accounts": [{ "alias": "Main Prod", "accountId": "812998806105" }] }
  ]
}
```

### New Format:
```ini
### Defaults
[Default]
roleName = FC-Admin
region = us-east-1

### Prod Accounts
[Main Prod]
aws_account_id = 812998806105
defaults = Default
group = Prod
```

## Validation

The configuration parser validates:

- **AWS Account IDs**: Must be exactly 12 digits
- **Section References**: Defaults sections must exist
- **Required Fields**: Account sections must have aws_account_id
- **Syntax**: Proper section headers and key-value pairs

## Benefits

### **Intuitive Format**
- Familiar AWS credentials file style
- Easy to read and edit
- Supports comments and organization

### **Flexible Inheritance**
- Define defaults once, use everywhere
- Override specific settings per account
- Easy to manage multiple organizations

### **Better Organization**
- Clear section-based structure
- Logical grouping of related accounts
- Easy to maintain and update

### **Backward Compatibility**
- Automatic conversion from old JSON format
- Seamless migration path
- No data loss during upgrade

## Usage in Extension

1. **Open Options**: Click the extension icon → Options
2. **Edit Configuration**: Use the new text-based format
3. **Validate**: Click "Validate" to check for errors
4. **Save**: Click "Save Configuration"
5. **Use**: The extension popup will show your organized account groups

The new format makes it much easier to manage large numbers of AWS accounts across multiple organizations while maintaining clear organization and reducing duplication.
