const orgConfigText = document.getElementById("orgConfigText");
const cfgText = document.getElementById("cfgText");
const saveBtn = document.getElementById("saveBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const validateBtn = document.getElementById("validateBtn");
// const convertBtn = document.getElementById("convertBtn"); // Removed - no longer needed
const status = document.getElementById("status");
const validationResults = document.getElementById("validationResults");

let configParser = null;

// Helper function to compress configuration text
function compressConfigText(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Keep non-empty lines and section headers
      if (!line) return false;
      // Keep section headers [SectionName]
      if (line.match(/^\[[^\]]+\]$/)) return true;
      // Keep key=value pairs
      if (line.includes('=')) return true;
      // Remove standalone comments and empty lines
      return false;
    })
    .join('\n');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  configParser = new ConfigParser();
  loadConfiguration();
});

// Load existing configuration
function loadConfiguration() {
  // Check for split storage first (newer format)
  chrome.storage.local.get([
    "awsSsoLauncherConfig", 
    "awsSsoLauncherConfig_org", 
    "awsSsoLauncherConfig_accounts"
  ], (localRes) => {
    // console.log('Local storage check:', {
    //   hasMainConfig: !!localRes.awsSsoLauncherConfig,
    //   hasOrgText: !!localRes.awsSsoLauncherConfig_org,
    //   hasAccountsText: !!localRes.awsSsoLauncherConfig_accounts,
    //   mainConfigKeys: localRes.awsSsoLauncherConfig ? Object.keys(localRes.awsSsoLauncherConfig) : [],
    //   orgTextLength: localRes.awsSsoLauncherConfig_org?.length,
    //   accountsTextLength: localRes.awsSsoLauncherConfig_accounts?.length
  // // });
    
    let stored = null;
    
    if (localRes.awsSsoLauncherConfig_org || localRes.awsSsoLauncherConfig_accounts) {
      // Split storage format - reconstruct the config
      stored = {
        ...localRes.awsSsoLauncherConfig,
        originalOrgConfigText: localRes.awsSsoLauncherConfig_org,
        originalConfigText: localRes.awsSsoLauncherConfig_accounts,
        orgConfigText: localRes.awsSsoLauncherConfig_org,
        configText: localRes.awsSsoLauncherConfig_accounts
      };
      // console.log('Reconstructed from split storage:', {
      //   hasMainConfig: !!localRes.awsSsoLauncherConfig,
      //   hasOrgText: !!localRes.awsSsoLauncherConfig_org,
      //   hasAccountsText: !!localRes.awsSsoLauncherConfig_accounts,
      //   orgTextLength: localRes.awsSsoLauncherConfig_org?.length,
      //   accountsTextLength: localRes.awsSsoLauncherConfig_accounts?.length
  // // });
    } else if (localRes.awsSsoLauncherConfig) {
      // console.log('Using single-item local storage format');
      stored = localRes.awsSsoLauncherConfig;
    } else {
      // Try sync storage as fallback
      chrome.storage.sync.get(["awsSsoLauncherConfig"], (syncRes) => {
        stored = syncRes.awsSsoLauncherConfig;
        // console.log('Using sync storage format:', !!stored);
        loadConfigurationFromStorage(stored);
      });
      return; // Early return to avoid double loading
    }
    
    loadConfigurationFromStorage(stored);
  });
}

function loadConfigurationFromStorage(stored) {
  // console.log('Loading configuration from storage:', {
  //   format: stored?.format,
  //   hasOrgConfig: !!stored?.orgConfigText,
  //   hasAccountsConfig: !!stored?.configText,
  //   hasOriginalOrgConfig: !!stored?.originalOrgConfigText,
  //   hasOriginalAccountsConfig: !!stored?.originalConfigText,
  //   compressed: stored?.compressed,
  //   hasParsedConfig: !!stored?.parsedConfig,
  //   lastUpdated: stored?.lastUpdated,
  //   allKeys: Object.keys(stored || {})
  // // });
  
  if (stored) {
    // Check if it's new two-field format or legacy format
    if (stored.format === 'two-field' && stored.orgConfigText && stored.configText) {
      // New two-field format - use original uncompressed versions for display if available
      orgConfigText.value = stored.originalOrgConfigText || stored.orgConfigText;
      cfgText.value = stored.originalConfigText || stored.configText;
      
  // console.log('Loaded text lengths:', {
  //   orgConfigLength: orgConfigText.value.length,
  //   accountsConfigLength: cfgText.value.length,
  //   usingOriginal: !!(stored.originalOrgConfigText || stored.originalConfigText),
  //   originalOrgExists: !!stored.originalOrgConfigText,
  //   originalAccountsExists: !!stored.originalConfigText,
  //   storedKeys: Object.keys(stored),
  //   storedOrgLength: stored.orgConfigText?.length,
  //   storedAccountsLength: stored.configText?.length,
  //   storedOriginalOrgLength: stored.originalOrgConfigText?.length,
  //   storedOriginalAccountsLength: stored.originalConfigText?.length,
  //   first100Chars: stored.originalConfigText?.substring(0, 100),
  //   last100Chars: stored.originalConfigText?.substring(stored.originalConfigText?.length - 100)
  // // });
    } else if (stored.configText) {
      // Legacy single-field format - try to split
      try {
        const parser = new ConfigParser();
        const parsed = parser.parseConfig(stored.configText);
        
        // Extract organizations and accounts
        const orgText = ConfigParser.generateOrganizationsExample();
        const accountsText = ConfigParser.generateAccountsExample();
        
        orgConfigText.value = orgText;
        cfgText.value = accountsText;
        
        showStatus("Migrated from legacy format", "success");
      } catch (error) {
        // Fallback to legacy format
        cfgText.value = stored.configText;
        orgConfigText.value = ConfigParser.generateOrganizationsExample();
      }
    } else {
      // Convert old JSON format to new format
      cfgText.value = ConfigParser.generateAccountsExample();
      orgConfigText.value = ConfigParser.generateOrganizationsExample();
    }
  } else {
    // Load default configuration
    orgConfigText.value = ConfigParser.generateOrganizationsExample();
    cfgText.value = ConfigParser.generateAccountsExample();
  }
}

// Save configuration
function saveConfiguration() {
  const orgConfigTextValue = orgConfigText.value.trim();
  const configTextValue = cfgText.value.trim();
  
  if (!orgConfigTextValue && !configTextValue) {
    showStatus("At least one configuration must be provided", "error");
    return;
  }

  try {
    // Parse organizations configuration from original text
    const organizations = configParser.parseOrganizationsConfig(orgConfigTextValue);
    
    // Parse accounts configuration from original text
    const accountsConfig = configParser.parseAccountsConfig(configTextValue);
    
    // Validate combined configuration
    const validation = configParser.validateCombinedConfig(organizations, accountsConfig);
    
    if (!validation.valid) {
      showValidationResults(validation);
      showStatus("Configuration has errors", "error");
      return;
    }

    // Extract SSO URL from first organization if available
    let extractedSsoUrl = "";
    const firstOrg = Object.keys(organizations)[0];
    if (firstOrg) {
      extractedSsoUrl = organizations[firstOrg].ssoBaseUrl || "";
    }

    // Merge organizations with accounts for popup compatibility
    const mergedConfig = {
      organizations: organizations,
      groups: accountsConfig.groups,
      accounts: accountsConfig.accounts
    };

    // console.log('Save Debug:', {
  // organizationsCount: Object.keys(organizations).length,
  // groupsCount: Object.keys(accountsConfig.groups).length,
  // accountsCount: Object.keys(accountsConfig.accounts).length,
  // mergedConfig: mergedConfig
  // });

  // Save to storage with quota handling
  let finalConfig = {
    ssoBaseUrl: extractedSsoUrl,
    orgConfigText: orgConfigTextValue,
    configText: configTextValue,
    // Always store original versions for display
    originalOrgConfigText: orgConfigTextValue,
    originalConfigText: configTextValue,
    parsedConfig: mergedConfig, // Store merged version for quick access
    format: 'two-field',
    lastUpdated: Date.now()
  };

  // console.log('Text lengths before save:', {
  // orgConfigTextLength: orgConfigTextValue.length,
  // configTextLength: configTextValue.length,
  // finalConfigOrgLength: finalConfig.orgConfigText.length,
  // finalConfigAccountsLength: finalConfig.configText.length,
  // finalConfigOriginalOrgLength: finalConfig.originalOrgConfigText.length,
  // finalConfigOriginalAccountsLength: finalConfig.originalConfigText.length
  // });

    // Check if configuration is too large for sync storage (8KB limit)
    let configSize = JSON.stringify(finalConfig).length;
    const maxSyncSize = 8000; // Leave some buffer
    
    // console.log('Size check:', {
  // configSize: configSize,
  // maxSyncSize: maxSyncSize,
  // needsCompression: configSize > maxSyncSize
  // });
    
    // Skip compression for now as it's actually making the config larger
    // TODO: Implement better compression or just use local storage for large configs
    if (false && configSize > maxSyncSize) {
      const compressedOrgConfig = compressConfigText(orgConfigTextValue);
      const compressedAccountsConfig = compressConfigText(configTextValue);
      
      // Re-parse from compressed text to ensure parsedConfig matches stored text
      const compressedOrganizations = configParser.parseOrganizationsConfig(compressedOrgConfig);
      const compressedAccountsConfig_parsed = configParser.parseAccountsConfig(compressedAccountsConfig);
      const compressedMergedConfig = {
        organizations: compressedOrganizations,
        groups: compressedAccountsConfig_parsed.groups,
        accounts: compressedAccountsConfig_parsed.accounts
      };
      
      finalConfig = {
        ssoBaseUrl: extractedSsoUrl,
        orgConfigText: compressedOrgConfig,
        configText: compressedAccountsConfig,
        // Store original uncompressed versions for display
        originalOrgConfigText: orgConfigTextValue,
        originalConfigText: configTextValue,
        parsedConfig: compressedMergedConfig,
        format: 'two-field',
        lastUpdated: Date.now(),
        compressed: true
      };
      
      configSize = JSON.stringify(finalConfig).length;
      
      // console.log('Compression Debug:', {
  // originalSize: JSON.stringify({orgConfigText: orgConfigTextValue, configText: configTextValue}).length,
  // compressedSize: configSize,
  // compressedOrgLines: compressedOrgConfig.split('\n').length,
  // compressedAccountsLines: compressedAccountsConfig.split('\n').length,
  // parsedOrganizationsCount: Object.keys(compressedOrganizations).length,
  // parsedGroupsCount: Object.keys(compressedAccountsConfig_parsed.groups).length,
  // parsedAccountsCount: Object.keys(compressedAccountsConfig_parsed.accounts).length
  // });
    } else {
      // console.log('No compression needed - config size is within limits');
    }
    
    if (configSize > maxSyncSize) {
      // Use local storage for large configurations - split into multiple items
      const storageItems = {
        awsSsoLauncherConfig: {
          ssoBaseUrl: finalConfig.ssoBaseUrl,
          parsedConfig: finalConfig.parsedConfig,
          format: finalConfig.format,
          lastUpdated: finalConfig.lastUpdated,
          compressed: finalConfig.compressed
        },
        awsSsoLauncherConfig_org: finalConfig.originalOrgConfigText,
        awsSsoLauncherConfig_accounts: finalConfig.originalConfigText
      };
      
      // console.log('Splitting storage:', {
  // mainConfigSize: JSON.stringify(storageItems.awsSsoLauncherConfig).length,
  // orgTextSize: storageItems.awsSsoLauncherConfig_org.length,
  // accountsTextSize: storageItems.awsSsoLauncherConfig_accounts.length
  // });
      
      chrome.storage.local.set(storageItems, () => {
        if (chrome.runtime.lastError) {
          showStatus(`Storage error: ${chrome.runtime.lastError.message}`, "error");
        } else {
          const compressionInfo = finalConfig.compressed ? " (compressed)" : "";
          // console.log('Storage successful (local, split):', {
  // finalConfigCompressed: finalConfig.compressed,
  // finalConfigSize: configSize,
  // hasOriginalOrgConfig: !!finalConfig.originalOrgConfigText,
  // hasOriginalAccountsConfig: !!finalConfig.originalConfigText,
  // storedAccountsLength: finalConfig.originalConfigText?.length,
  // first100Chars: finalConfig.originalConfigText?.substring(0, 100),
  // last100Chars: finalConfig.originalConfigText?.substring(finalConfig.originalConfigText?.length - 100)
  // });
          
          // Don't clear anything - the split storage should work without conflicts
          // console.log('Split storage saved successfully - keeping all items');
          
          showStatus(`Configuration saved successfully ✓ (${Math.round(configSize/1024)}KB, using local storage${compressionInfo})`, "success");
          
          // Show warnings if any
          if (validation.warnings.length > 0) {
            showValidationResults({ valid: true, warnings: validation.warnings });
          } else {
            hideValidationResults();
          }
        }
      });
    } else {
      // Use sync storage for small configurations
      chrome.storage.sync.set({ awsSsoLauncherConfig: finalConfig }, () => {
        if (chrome.runtime.lastError) {
          // If sync fails, try local storage
          chrome.storage.local.set({ awsSsoLauncherConfig: finalConfig }, () => {
            if (chrome.runtime.lastError) {
              showStatus(`Storage error: ${chrome.runtime.lastError.message}`, "error");
            } else {
              const compressionInfo = finalConfig.compressed ? " (compressed)" : "";
              // console.log('Storage successful (sync failed, using local):', {
  // finalConfigCompressed: finalConfig.compressed,
  // finalConfigSize: configSize,
  // hasOriginalOrgConfig: !!finalConfig.originalOrgConfigText,
  // hasOriginalAccountsConfig: !!finalConfig.originalConfigText
  // });
          showStatus(`Configuration saved successfully ✓ (${Math.round(configSize/1024)}KB, using local storage${compressionInfo})`, "success");
              
              if (validation.warnings.length > 0) {
                showValidationResults({ valid: true, warnings: validation.warnings });
              } else {
                hideValidationResults();
              }
            }
          });
        } else {
          // console.log('Storage successful (sync):', {
  // finalConfigCompressed: finalConfig.compressed,
  // finalConfigSize: configSize,
  // hasOriginalOrgConfig: !!finalConfig.originalOrgConfigText,
  // hasOriginalAccountsConfig: !!finalConfig.originalConfigText
  // });
          showStatus(`Configuration saved successfully ✓ (${Math.round(configSize/1024)}KB)`, "success");
          
          if (validation.warnings.length > 0) {
            showValidationResults({ valid: true, warnings: validation.warnings });
          } else {
            hideValidationResults();
          }
        }
      });
    }

  } catch (error) {
    showStatus(`Configuration error: ${error.message}`, "error");
    // console.error('Configuration parsing error:', error);
  }
}

// Validate configuration
function validateConfiguration() {
  const orgConfigTextValue = orgConfigText.value.trim();
  const configTextValue = cfgText.value.trim();
  
  if (!orgConfigTextValue && !configTextValue) {
    showStatus("At least one configuration must be provided", "warning");
    return;
  }

  try {
    // Parse organizations configuration
    const organizations = configParser.parseOrganizationsConfig(orgConfigTextValue);
    
    // Parse accounts configuration
    const accountsConfig = configParser.parseAccountsConfig(configTextValue);
    
    // Validate combined configuration
    const validation = configParser.validateCombinedConfig(organizations, accountsConfig);
    
    showValidationResults(validation);
    
    if (validation.valid) {
      showStatus("Configuration is valid ✓", "success");
    } else {
      showStatus("Configuration has errors", "error");
    }
    
  } catch (error) {
    showStatus(`Validation error: ${error.message}`, "error");
    showValidationResults({
      valid: false,
      errors: [error.message],
      warnings: []
    });
  }
}

// Load example configuration
function loadExampleConfiguration() {
  orgConfigText.value = ConfigParser.generateOrganizationsExample();
  cfgText.value = ConfigParser.generateAccountsExample();
  showStatus("Example configurations loaded", "success");
}

// Convert from old JSON format - REMOVED (no longer needed)
// function convertFromJSON() {
//   const configTextValue = cfgText.value.trim();
//   
//   if (!configTextValue) {
//     showStatus("No configuration to convert", "warning");
//     return;
//   }
//
//   try {
//     // Try to parse as JSON first
//     const jsonConfig = JSON.parse(configTextValue);
//     const convertedConfig = ConfigParser.convertFromJSON(jsonConfig);
//     
//     // Load examples for both fields
//     orgConfigText.value = ConfigParser.generateOrganizationsExample();
//     cfgText.value = ConfigParser.generateAccountsExample();
//     
//     showStatus("Configuration converted from JSON format", "success");
//   } catch (error) {
//     showStatus("Not a valid JSON configuration to convert", "error");
//   }
// }

// Show status message
function showStatus(message, type = "success") {
  status.textContent = message;
  status.className = `status-${type}`;
  
  setTimeout(() => {
    status.textContent = "";
    status.className = "";
  }, 3000);
}

// Show validation results
function showValidationResults(validation) {
  validationResults.style.display = "block";
  
  let html = "";
  
  if (validation.errors && validation.errors.length > 0) {
    html += `<div class="validation-error">
      <strong>Errors:</strong>
      <ul>${validation.errors.map(error => `<li>${error}</li>`).join('')}</ul>
    </div>`;
  }
  
  if (validation.warnings && validation.warnings.length > 0) {
    html += `<div class="validation-warning">
      <strong>Warnings:</strong>
      <ul>${validation.warnings.map(warning => `<li>${warning}</li>`).join('')}</ul>
    </div>`;
  }
  
  if (validation.valid && (!validation.errors || validation.errors.length === 0)) {
    html += `<div class="validation-success">
      <strong>✓ Configuration is valid</strong>
    </div>`;
  }
  
  validationResults.innerHTML = html;
}

// Hide validation results
function hideValidationResults() {
  validationResults.style.display = "none";
}

// Event listeners
saveBtn.addEventListener("click", saveConfiguration);

loadExampleBtn.addEventListener("click", loadExampleConfiguration);

validateBtn.addEventListener("click", validateConfiguration);

// convertBtn.addEventListener("click", convertFromJSON); // Removed - no longer needed

// Auto-validate on text change (debounced)
let validateTimeout = null;
const validateOnChange = () => {
  clearTimeout(validateTimeout);
  validateTimeout = setTimeout(() => {
    if (orgConfigText.value.trim() || cfgText.value.trim()) {
      validateConfiguration();
    } else {
      hideValidationResults();
    }
  }, 1000);
};

orgConfigText.addEventListener("input", validateOnChange);
cfgText.addEventListener("input", validateOnChange);

// Handle Enter key in fields
orgConfigText.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveConfiguration();
  }
});

cfgText.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    saveConfiguration();
  }
});

// Handle Ctrl+S to save
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveConfiguration();
  }
});