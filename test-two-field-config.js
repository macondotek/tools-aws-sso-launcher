// Test script for the new two-field configuration format
// Run this in the browser console to test the new format

console.log('🧪 Testing Two-Field Configuration Format');

// Test organizations configuration
const orgConfig = `[Corpay] 
region = us-east-1
roleName = FC-Admin
baseURL = https://d-906755a708.awsapps.com
default = true

[AnotherOrg]
region = us-west-2
roleName = AdminRole
baseURL = https://d-123456789.awsapps.com`;

// Test accounts configuration
const accountsConfig = `[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete

[Accrulify_CPC_Prod]
aws_account_id = 211125448765
defaults = Corpay
group = CorpayComplete

[Fuels Dev]
aws_account_id = 924615357380
defaults = Corpay
group = Fuels

[Fuels QA]
aws_account_id = 812998806105
defaults = Corpay
group = Fuels

[AnotherOrg Dev]
aws_account_id = 111111111111
defaults = AnotherOrg
group = Development`;

// Test the parser
const parser = new ConfigParser();

try {
  console.log('\n📋 Testing Organizations Parser...');
  const organizations = parser.parseOrganizationsConfig(orgConfig);
  console.log('✅ Organizations parsed successfully!');
  console.log('Organizations:', organizations);
  
  // Validate organizations
  const orgValidation = parser.validateOrganizationsConfig(organizations);
  console.log('Organizations validation:', orgValidation);
  
  console.log('\n📋 Testing Accounts Parser...');
  const accountsResult = parser.parseAccountsConfig(accountsConfig);
  console.log('✅ Accounts parsed successfully!');
  console.log('Groups:', accountsResult.groups);
  console.log('Accounts:', accountsResult.accounts);
  
  // Validate combined configuration
  const combinedValidation = parser.validateCombinedConfig(organizations, accountsResult);
  console.log('\n📋 Testing Combined Validation...');
  console.log('Combined validation:', combinedValidation);
  
  if (combinedValidation.valid) {
    console.log('✅ Combined configuration is valid!');
  } else {
    console.log('❌ Combined configuration has errors:', combinedValidation.errors);
  }
  
  if (combinedValidation.warnings.length > 0) {
    console.log('⚠️ Warnings:', combinedValidation.warnings);
  }
  
  // Test account organization resolution
  console.log('\n📋 Testing Account-Organization Resolution...');
  Object.values(accountsResult.accounts).forEach((account, index) => {
    console.log(`Account ${index + 1}: ${account.defaults} -> Organization: ${account.organization || 'Default'}`);
  });
  
  // Test SSO URL extraction
  console.log('\n📋 Testing SSO URL Extraction...');
  const firstOrg = Object.keys(organizations)[0];
  if (firstOrg) {
    const ssoUrl = organizations[firstOrg].ssoBaseUrl;
    console.log(`✅ SSO URL extracted: ${ssoUrl}`);
  }
  
  console.log('\n🎉 All tests completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}

// Test example generation
console.log('\n📋 Testing Example Generation...');
console.log('Organizations Example:');
console.log(ConfigParser.generateOrganizationsExample());
console.log('\nAccounts Example:');
console.log(ConfigParser.generateAccountsExample());
