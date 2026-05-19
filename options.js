const orgConfigText = document.getElementById("orgConfigText");
const cfgText = document.getElementById("cfgText");
const saveBtn = document.getElementById("saveBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const validateBtn = document.getElementById("validateBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const status = document.getElementById("status");
const validationResults = document.getElementById("validationResults");

let configParser = null;

document.addEventListener('DOMContentLoaded', () => {
  configParser = new ConfigParser();
  loadConfiguration();
});

function loadConfiguration() {
  chrome.storage.local.get([
    "awsSsoLauncherConfig",
    "awsSsoLauncherConfig_org",
    "awsSsoLauncherConfig_accounts"
  ], (localRes) => {
    let stored = null;

    if (localRes.awsSsoLauncherConfig_org || localRes.awsSsoLauncherConfig_accounts) {
      stored = {
        ...localRes.awsSsoLauncherConfig,
        originalOrgConfigText: localRes.awsSsoLauncherConfig_org,
        originalConfigText: localRes.awsSsoLauncherConfig_accounts,
        orgConfigText: localRes.awsSsoLauncherConfig_org,
        configText: localRes.awsSsoLauncherConfig_accounts
      };
    } else if (localRes.awsSsoLauncherConfig) {
      stored = localRes.awsSsoLauncherConfig;
    } else {
      chrome.storage.sync.get(["awsSsoLauncherConfig"], (syncRes) => {
        loadConfigurationFromStorage(syncRes.awsSsoLauncherConfig);
      });
      return;
    }

    loadConfigurationFromStorage(stored);
  });
}

function loadConfigurationFromStorage(stored) {
  if (stored) {
    if (stored.format === 'two-field' && stored.orgConfigText && stored.configText) {
      orgConfigText.value = stored.originalOrgConfigText || stored.orgConfigText;
      cfgText.value = stored.originalConfigText || stored.configText;
    } else if (stored.configText) {
      try {
        orgConfigText.value = ConfigParser.generateOrganizationsExample();
        cfgText.value = stored.configText;
        showStatus("Migrated from legacy format", "success");
      } catch (error) {
        cfgText.value = stored.configText;
        orgConfigText.value = ConfigParser.generateOrganizationsExample();
      }
    } else {
      cfgText.value = ConfigParser.generateAccountsExample();
      orgConfigText.value = ConfigParser.generateOrganizationsExample();
    }
  } else {
    orgConfigText.value = ConfigParser.generateOrganizationsExample();
    cfgText.value = ConfigParser.generateAccountsExample();
  }
}

function saveConfiguration() {
  const orgConfigTextValue = orgConfigText.value.trim();
  const configTextValue = cfgText.value.trim();

  if (!orgConfigTextValue && !configTextValue) {
    showStatus("At least one configuration must be provided", "error");
    return;
  }

  try {
    const organizations = configParser.parseOrganizationsConfig(orgConfigTextValue);
    const accountsConfig = configParser.parseAccountsConfig(configTextValue);
    const validation = configParser.validateCombinedConfig(organizations, accountsConfig);

    if (!validation.valid) {
      showValidationResults(validation);
      showStatus("Configuration has errors", "error");
      return;
    }

    let extractedSsoUrl = "";
    const firstOrg = Object.keys(organizations)[0];
    if (firstOrg) {
      extractedSsoUrl = organizations[firstOrg].ssoBaseUrl || "";
    }

    const mergedConfig = {
      organizations: organizations,
      groups: accountsConfig.groups,
      accounts: accountsConfig.accounts
    };

    const finalConfig = {
      ssoBaseUrl: extractedSsoUrl,
      orgConfigText: orgConfigTextValue,
      configText: configTextValue,
      originalOrgConfigText: orgConfigTextValue,
      originalConfigText: configTextValue,
      parsedConfig: mergedConfig,
      format: 'two-field',
      lastUpdated: Date.now()
    };

    const configSize = JSON.stringify(finalConfig).length;
    const maxSyncSize = 8000;

    if (configSize > maxSyncSize) {
      const storageItems = {
        awsSsoLauncherConfig: {
          ssoBaseUrl: finalConfig.ssoBaseUrl,
          parsedConfig: finalConfig.parsedConfig,
          format: finalConfig.format,
          lastUpdated: finalConfig.lastUpdated
        },
        awsSsoLauncherConfig_org: finalConfig.originalOrgConfigText,
        awsSsoLauncherConfig_accounts: finalConfig.originalConfigText
      };

      chrome.storage.local.set(storageItems, () => {
        if (chrome.runtime.lastError) {
          showStatus(`Storage error: ${chrome.runtime.lastError.message}`, "error");
        } else {
          showStatus(`Configuration saved ✓ (${Math.round(configSize / 1024)}KB, local storage)`, "success");
          validation.warnings.length > 0 ? showValidationResults({ valid: true, warnings: validation.warnings }) : hideValidationResults();
        }
      });
    } else {
      chrome.storage.sync.set({ awsSsoLauncherConfig: finalConfig }, () => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.set({ awsSsoLauncherConfig: finalConfig }, () => {
            if (chrome.runtime.lastError) {
              showStatus(`Storage error: ${chrome.runtime.lastError.message}`, "error");
            } else {
              showStatus(`Configuration saved ✓ (${Math.round(configSize / 1024)}KB, local storage)`, "success");
              validation.warnings.length > 0 ? showValidationResults({ valid: true, warnings: validation.warnings }) : hideValidationResults();
            }
          });
        } else {
          showStatus(`Configuration saved ✓ (${Math.round(configSize / 1024)}KB)`, "success");
          validation.warnings.length > 0 ? showValidationResults({ valid: true, warnings: validation.warnings }) : hideValidationResults();
        }
      });
    }

  } catch (error) {
    showStatus(`Configuration error: ${error.message}`, "error");
  }
}

function validateConfiguration() {
  const orgConfigTextValue = orgConfigText.value.trim();
  const configTextValue = cfgText.value.trim();

  if (!orgConfigTextValue && !configTextValue) {
    showStatus("At least one configuration must be provided", "warning");
    return;
  }

  try {
    const organizations = configParser.parseOrganizationsConfig(orgConfigTextValue);
    const accountsConfig = configParser.parseAccountsConfig(configTextValue);
    const validation = configParser.validateCombinedConfig(organizations, accountsConfig);

    showValidationResults(validation);
    showStatus(validation.valid ? "Configuration is valid ✓" : "Configuration has errors", validation.valid ? "success" : "error");
  } catch (error) {
    showStatus(`Validation error: ${error.message}`, "error");
    showValidationResults({ valid: false, errors: [error.message], warnings: [] });
  }
}

function loadExampleConfiguration() {
  orgConfigText.value = ConfigParser.generateOrganizationsExample();
  cfgText.value = ConfigParser.generateAccountsExample();
  showStatus("Example configurations loaded", "success");
}

function exportConfiguration() {
  const orgText = orgConfigText.value.trim();
  const accountsText = cfgText.value.trim();

  if (!orgText && !accountsText) {
    showStatus("Nothing to export", "warning");
    return;
  }

  const exportData = {
    version: "1",
    exportedAt: new Date().toISOString(),
    organizations: orgText,
    accounts: accountsText
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aws-sso-config-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus("Configuration exported", "success");
}

function importConfiguration(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.organizations !== undefined) orgConfigText.value = data.organizations;
      if (data.accounts !== undefined) cfgText.value = data.accounts;
      showStatus("Configuration imported — review and save when ready", "success");
      validateConfiguration();
    } catch (err) {
      showStatus("Invalid export file — expected JSON from a previous export", "error");
    }
  };
  reader.readAsText(file);
}

function showStatus(message, type = "success") {
  status.textContent = message;
  status.className = `status-${type}`;
  setTimeout(() => {
    status.textContent = "";
    status.className = "";
  }, 3000);
}

function showValidationResults(validation) {
  validationResults.style.display = "block";
  let html = "";

  if (validation.errors && validation.errors.length > 0) {
    html += `<div class="validation-error"><strong>Errors:</strong><ul>${validation.errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
  }
  if (validation.warnings && validation.warnings.length > 0) {
    html += `<div class="validation-warning"><strong>Warnings:</strong><ul>${validation.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
  }
  if (validation.valid && (!validation.errors || validation.errors.length === 0)) {
    html += `<div class="validation-success"><strong>✓ Configuration is valid</strong></div>`;
  }

  validationResults.innerHTML = html;
}

function hideValidationResults() {
  validationResults.style.display = "none";
}

// Event listeners
saveBtn.addEventListener("click", saveConfiguration);
loadExampleBtn.addEventListener("click", loadExampleConfiguration);
validateBtn.addEventListener("click", validateConfiguration);
exportBtn.addEventListener("click", exportConfiguration);
importBtn.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", (e) => {
  importConfiguration(e.target.files[0]);
  importInput.value = ""; // reset so the same file can be re-imported if needed
});

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

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveConfiguration();
  }
});
