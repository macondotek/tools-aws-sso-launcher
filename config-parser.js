// AWS SSO Launcher Configuration Parser
// Supports AWS credentials file-style format with sections and inheritance

class ConfigParser {
  constructor() {
    this.sections = {};
    this.defaults = {};
    this.groups = {};
    this.accounts = {};
    this.organizations = {};
  }

  // Parse organizations configuration (all entries are organizations)
  parseOrganizationsConfig(configText) {
    if (!configText || typeof configText !== 'string') {
      return {};
    }

    const organizations = {};
    const lines = configText.split('\n');
    let currentSection = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for section header [SectionName]
      const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        organizations[currentSection] = {};
        continue;
      }

      // Parse key = value pairs
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim();

        // Handle organization properties
        if (key === 'region') {
          organizations[currentSection][key] = value;
        } else if (key === 'roleName' || key === 'role') {
          organizations[currentSection]['roleName'] = value;
        } else if (key === 'ssoBaseUrl' || key === 'baseURL' || key === 'baseUrl') {
          organizations[currentSection]['ssoBaseUrl'] = value;
            } else if (key === 'default') {
              organizations[currentSection][key] = value === 'true' || value === true;
            } else if (key === 'altRoles' || key === 'alternative_roles') {
              // Parse comma-separated list of alternative roles
              const altRoles = value.split(',').map(role => role.trim()).filter(role => role.length > 0);
              organizations[currentSection]['altRoles'] = altRoles;
            } else {
              // Generic key-value pair
              organizations[currentSection][key] = value;
            }
      }
    }

    return organizations;
  }

  // Parse accounts configuration
  parseAccountsConfig(configText) {
    if (!configText || typeof configText !== 'string') {
      return { accounts: {}, groups: {} };
    }

    // Reset state
    this.sections = {};
    this.defaults = {};
    this.groups = {};
    this.accounts = {};

    const lines = configText.split('\n');
    let currentSection = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for section header [SectionName]
      const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        this.sections[currentSection] = {};
        continue;
      }

      // Parse key = value pairs
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim();

        // Handle account properties
        if (key === 'aws_account_id' || key === 'accountId') {
          // Validate AWS account ID (12 digits)
          if (!/^\d{12}$/.test(value)) {
            throw new Error(`Invalid AWS account ID on line ${lineNumber}: ${value}`);
          }
          this.sections[currentSection][key] = value;
        } else if (key === 'defaults') {
          // Reference to organization for defaults
          this.sections[currentSection][key] = value;
        } else if (key === 'group') {
          // Group assignment
          this.sections[currentSection][key] = value;
        } else if (key === 'region') {
          // AWS region
          this.sections[currentSection][key] = value;
        } else if (key === 'roleName' || key === 'role') {
          // Role name
          this.sections[currentSection][key] = value;
        } else if (key === 'alias' || key === 'name') {
          // Account alias/name
          this.sections[currentSection][key] = value;
        } else {
          // Generic key-value pair
          this.sections[currentSection][key] = value;
        }
      }
    }

    // Process sections and build final configuration
    this.processAccountsSections();
    
    return {
      groups: this.groups,
      accounts: this.accounts
    };
  }

  // Legacy method for backward compatibility
  parseConfig(configText) {
    if (!configText || typeof configText !== 'string') {
      throw new Error('Configuration text is required');
    }

    // Reset state
    this.sections = {};
    this.defaults = {};
    this.groups = {};
    this.accounts = {};
    this.organizations = {};

    const lines = configText.split('\n');
    let currentSection = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for section header [SectionName]
      const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        this.sections[currentSection] = {};
        continue;
      }

      // Parse key = value pairs
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim();

        // Handle different value types
        if (key === 'aws_account_id' || key === 'accountId') {
          // Validate AWS account ID (12 digits)
          if (!/^\d{12}$/.test(value)) {
            throw new Error(`Invalid AWS account ID on line ${lineNumber}: ${value}`);
          }
          this.sections[currentSection][key] = value;
        } else if (key === 'defaults') {
          // Reference to another section for defaults
          this.sections[currentSection][key] = value;
        } else if (key === 'group') {
          // Group assignment
          this.sections[currentSection][key] = value;
        } else if (key === 'region') {
          // AWS region
          this.sections[currentSection][key] = value;
        } else if (key === 'roleName' || key === 'role') {
          // Role name
          this.sections[currentSection][key] = value;
        } else if (key === 'alias' || key === 'name') {
          // Account alias/name
          this.sections[currentSection][key] = value;
        } else if (key === 'ssoBaseUrl' || key === 'baseURL' || key === 'baseUrl') {
          // SSO Base URL (multiple formats supported)
          this.sections[currentSection]['ssoBaseUrl'] = value;
          this.sections[currentSection][key] = value; // Keep original key too
        } else if (key === 'organization') {
          // Organization flag
          this.sections[currentSection][key] = value === 'true' || value === true;
        } else if (key === 'default') {
          // Default flag
          this.sections[currentSection][key] = value === 'true' || value === true;
        } else {
          // Generic key-value pair
          this.sections[currentSection][key] = value;
        }
      }
    }

    // Process sections and build final configuration
    this.processSections();
    
    return {
      organizations: this.organizations,
      defaults: this.defaults,
      groups: this.groups,
      accounts: this.accounts,
      sections: this.sections
    };
  }

  // Process accounts sections (for separate accounts parsing)
  processAccountsSections() {
    this.groups = {};
    this.accounts = {};

    // All sections in accounts config are accounts
    for (const [sectionName, sectionData] of Object.entries(this.sections)) {
      this.accounts[sectionName] = sectionData;

      // Add to group
      const groupName = sectionData.group || 'Default';
      if (!this.groups[groupName]) {
        this.groups[groupName] = {
          name: groupName,
          accounts: []
        };
      }

      // Create account object
      const account = {
        alias: sectionName,
        accountId: sectionData.aws_account_id || sectionData.accountId,
        defaultRole: sectionData.roleName || sectionData.role,
        defaultRegion: sectionData.region,
        name: sectionData.name || sectionData.alias || sectionName,
        organization: sectionData.defaults || 'Default',
        defaults: sectionData.defaults
      };

      this.groups[groupName].accounts.push(account);
    }
  }

  processSections() {
    this.organizations = {};
    this.defaults = {};
    this.groups = {};
    this.accounts = {};

    // First pass: identify section types
    for (const [sectionName, sectionData] of Object.entries(this.sections)) {
      if (sectionData.aws_account_id || sectionData.accountId) {
        // This is an account section
        this.accounts[sectionName] = sectionData;
      } else if (sectionData.organization === true || sectionData.organization === 'true') {
        // This is an organization section
        this.organizations[sectionName] = sectionData;
      } else if (sectionData.region || sectionData.roleName || sectionData.role) {
        // This is a defaults section
        this.defaults[sectionName] = sectionData;
      }
    }

    // Second pass: resolve inheritance and build groups
    for (const [accountName, accountData] of Object.entries(this.accounts)) {
      // Resolve defaults inheritance
      let resolvedDefaults = {};
      
      if (accountData.defaults) {
        // Check if defaults is an organization first
        if (this.organizations[accountData.defaults]) {
          resolvedDefaults = this.organizations[accountData.defaults];
        } else if (this.defaults[accountData.defaults]) {
          resolvedDefaults = this.defaults[accountData.defaults];
        }
      }
      
      // Apply defaults (account data takes precedence)
      accountData.region = accountData.region || resolvedDefaults.region;
      accountData.roleName = accountData.roleName || accountData.role || resolvedDefaults.roleName || resolvedDefaults.role;

      // Add to group
      const groupName = accountData.group || 'Default';
      if (!this.groups[groupName]) {
        this.groups[groupName] = {
          name: groupName,
          accounts: []
        };
      }

      // Create account object
      const account = {
        alias: accountName,
        accountId: accountData.aws_account_id || accountData.accountId,
        defaultRole: accountData.roleName || accountData.role,
        defaultRegion: accountData.region,
        name: accountData.name || accountData.alias || accountName,
        organization: this.findAccountOrganization(accountData)
      };

      this.groups[groupName].accounts.push(account);
    }
  }

  findAccountOrganization(accountData) {
    // Find which organization this account belongs to
    if (accountData.defaults) {
      // Direct organization reference
      if (this.organizations[accountData.defaults]) {
        return accountData.defaults;
      }
      
      // Check if the defaults section references an organization
      const defaultSection = this.defaults[accountData.defaults];
      if (defaultSection && defaultSection.defaults && this.organizations[defaultSection.defaults]) {
        return defaultSection.defaults;
      }
    }
    
    return 'Default';
  }

  // Convert old JSON format to new format - REMOVED (no longer needed)
  // static convertFromJSON(oldConfig) {
  //   let configText = '';
  //   
  //   // Add defaults section if present
  //   if (oldConfig.defaults) {
  //     configText += '### Defaults\n';
  //     configText += '[Default]\n';
  //     if (oldConfig.defaults.roleName) {
  //       configText += `roleName = ${oldConfig.defaults.roleName}\n`;
  //     }
  //     if (oldConfig.defaults.region) {
  //       configText += `region = ${oldConfig.defaults.region}\n`;
  //     }
  //     configText += '\n';
  //   }
  //
  //   // Add groups and accounts
  //   if (oldConfig.groups) {
  //     for (const group of oldConfig.groups) {
  //       configText += `### ${group.name} Accounts\n`;
  //       
  //       for (const account of group.accounts) {
  //         configText += `[${account.alias || account.name || account.accountId}]\n`;
  //         configText += `aws_account_id = ${account.accountId}\n`;
  //         
  //         if (account.defaultRole) {
  //           configText += `roleName = ${account.defaultRole}\n`;
  //         }
  //         if (account.defaultRegion) {
  //           configText += `region = ${account.defaultRegion}\n`;
  //         }
  //         
  //         configText += `group = ${group.name}\n`;
  //         
  //         if (oldConfig.defaults && (oldConfig.defaults.roleName || oldConfig.defaults.region)) {
  //           configText += 'defaults = Default\n';
  //         }
  //         
  //         configText += '\n';
  //       }
  //     }
  //   }
  //
  //   return configText;
  // }

  // Generate example organizations configuration
  static generateOrganizationsExample() {
    return `[OrganizationName] 
region = us-east-1
roleName = Administrator
baseURL = https://d-XXXXXX.awsapps.com
altRoles = Developer, PowerUser
default = true

[AnotherOrg]
region = us-west-2
roleName = Developer
baseURL = https://d-123456.awsapps.com`;
  }

  // Generate example accounts configuration
  static generateAccountsExample() {
    return `[AccountName]
aws_account_id = 123456789012
defaults = OrganizationName
group = GroupName

[AnotherAccount]
aws_account_id = 123456789012
defaults = OrganizationName
group = GroupName
region = us-west-2
roleName = Developer

[AnotherAccount2]
aws_account_id = 123456789012
defaults = OrganizationName
group = Group2`;
  }

  // Generate legacy example configuration
  static generateExample() {
    return `### Organizations
[Corpay]
organization = true
region = us-east-1
roleName = FC-Admin

[AnotherOrg]
organization = true
region = us-west-2
roleName = Admin

### Defaults (can reference organizations)
[CorpayDefaults]
defaults = Corpay
group = CorpayAccounts

[AnotherOrgDefaults]
defaults = AnotherOrg
group = AnotherOrgAccounts

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

### Another Organization Accounts
[AnotherOrg Dev]
aws_account_id = 111111111111
defaults = AnotherOrg
group = Development

[AnotherOrg Prod]
aws_account_id = 222222222222
defaults = AnotherOrg
group = Production

### Development Accounts
[Dev Sandbox]
aws_account_id = 333333333333
region = us-west-2
roleName = Developer
group = Development`;
  }

  // Validate organizations configuration
  validateOrganizationsConfig(organizations) {
    const errors = [];
    const warnings = [];

    if (!organizations || Object.keys(organizations).length === 0) {
      warnings.push('No organizations defined');
      return { valid: true, errors, warnings };
    }

    for (const [orgName, orgData] of Object.entries(organizations)) {
      if (!orgData.ssoBaseUrl) {
        errors.push(`Organization '${orgName}' missing baseURL (SSO URL)`);
      }
      
      if (!orgData.roleName) {
        warnings.push(`Organization '${orgName}' missing roleName`);
      }
      
      if (!orgData.region) {
        warnings.push(`Organization '${orgName}' missing region`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate accounts configuration with organizations
  validateAccountsConfig(accountsConfig, organizations) {
    const errors = [];
    const warnings = [];

    if (!accountsConfig.accounts || Object.keys(accountsConfig.accounts).length === 0) {
      errors.push('No accounts defined');
      return { valid: false, errors, warnings };
    }

    // Validate accounts
    for (const [accountName, accountData] of Object.entries(accountsConfig.accounts)) {
      if (!accountData.aws_account_id && !accountData.accountId) {
        errors.push(`Account '${accountName}' missing aws_account_id`);
      }

      if (accountData.aws_account_id && !/^\d{12}$/.test(accountData.aws_account_id)) {
        errors.push(`Account '${accountName}' has invalid aws_account_id: ${accountData.aws_account_id}`);
      }

      // Validate defaults inheritance
      if (accountData.defaults) {
        if (!organizations[accountData.defaults]) {
          errors.push(`Account '${accountName}' references undefined organization '${accountData.defaults}'`);
        }
      } else {
        warnings.push(`Account '${accountName}' missing defaults (organization reference)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate combined configuration
  validateCombinedConfig(organizations, accountsConfig) {
    const orgValidation = this.validateOrganizationsConfig(organizations);
    const accountsValidation = this.validateAccountsConfig(accountsConfig, organizations);

    return {
      valid: orgValidation.valid && accountsValidation.valid,
      errors: [...orgValidation.errors, ...accountsValidation.errors],
      warnings: [...orgValidation.warnings, ...accountsValidation.warnings]
    };
  }

  // Legacy validate configuration method
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Check for required sections
    if (!config.accounts || Object.keys(config.accounts).length === 0) {
      errors.push('No accounts defined');
    }

    // Validate accounts
    for (const [accountName, accountData] of Object.entries(config.accounts)) {
      if (!accountData.aws_account_id && !accountData.accountId) {
        errors.push(`Account '${accountName}' missing aws_account_id`);
      }

      if (accountData.aws_account_id && !/^\d{12}$/.test(accountData.aws_account_id)) {
        errors.push(`Account '${accountName}' has invalid aws_account_id: ${accountData.aws_account_id}`);
      }
    }

    // Validate defaults inheritance
    for (const [accountName, accountData] of Object.entries(config.accounts)) {
      if (accountData.defaults) {
        // Check if it's a valid organization or defaults section
        const isValidDefaults = config.defaults[accountData.defaults] || config.organizations[accountData.defaults];
        if (!isValidDefaults) {
          warnings.push(`Account '${accountName}' references undefined defaults/organization '${accountData.defaults}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigParser;
} else if (typeof window !== 'undefined') {
  window.ConfigParser = ConfigParser;
}
