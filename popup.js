const roleInput = document.getElementById("roleInput");
const roleSelect = document.getElementById("roleSelect");
const regionInput = document.getElementById("regionInput");
const destInput = document.getElementById("destInput");
const openBtn = document.getElementById("openBtn");
const searchInput = document.getElementById("searchInput");
const currentInfo = document.getElementById("currentInfo");
const groupsContainer = document.getElementById("groupsContainer");
const orgSelect = document.getElementById("orgSelect");
const optionsLink = document.getElementById("optionsLink");

let cfg = null;
let allAccounts = [];
let selectedAccount = null;

function buildDefaultDestination(region) {
  const r = (region || "us-east-1").trim();
  // Use the AWS Management Console URL format that AWS SSO expects
  // This is the standard format for AWS Management Console URLs
  return `https://console.aws.amazon.com/console/home?region=${r}`;
}

function buildAllAccountsList() {
  allAccounts = [];
  
  // Handle both array format (legacy) and object format (new two-field)
  const groups = cfg?.groups || {};
  const groupsArray = Array.isArray(groups) ? groups : Object.values(groups);
  
  groupsArray.forEach((group, groupIndex) => {
    if (group && group.accounts && Array.isArray(group.accounts)) {
      group.accounts.forEach((account, accountIndex) => {
        allAccounts.push({
          ...account,
          groupName: group.name,
          groupIndex,
          accountIndex,
          fullPath: `${group.name} > ${account.alias || account.name || account.accountId}`
        });
      });
    }
  });
}

function populateOrganizations() {
  orgSelect.innerHTML = '<option value="">All</option>';
  
  if (cfg?.organizations && Object.keys(cfg.organizations).length > 0) {
    Object.keys(cfg.organizations).forEach(orgName => {
      const option = document.createElement('option');
      option.value = orgName;
      option.textContent = orgName;
      orgSelect.appendChild(option);
    });
  } else {
    // If no organizations defined, hide the dropdown
    orgSelect.style.display = 'none';
    orgSelect.previousElementSibling.style.display = 'none';
  }
}

function populateGroups(searchTerm = "", selectedOrg = "") {
  groupsContainer.innerHTML = "";
  
  // Handle both array format (legacy) and object format (new two-field)
  const groups = cfg?.groups || {};
  const groupsArray = Array.isArray(groups) ? groups : Object.values(groups);
  
  if (!groupsArray || groupsArray.length === 0) {
    groupsContainer.innerHTML = '<div class="no-results">No groups configured. Please set up your account groups in Options.</div>';
    return;
  }

  const term = searchTerm.toLowerCase();
  let hasVisibleAccounts = false;

  groupsArray.forEach((group, groupIndex) => {
    // Filter accounts in this group by search term and organization
    const filteredAccounts = group.accounts.filter(account => {
      const matchesSearch = account.accountId.includes(term) ||
        (account.alias || "").toLowerCase().includes(term) ||
        (account.name || "").toLowerCase().includes(term) ||
        group.name.toLowerCase().includes(term);
      
      const matchesOrg = !selectedOrg || account.organization === selectedOrg;
      
      return matchesSearch && matchesOrg;
    });

    if (filteredAccounts.length === 0 && (term || selectedOrg)) {
      return; // Skip groups with no matching accounts when searching or filtering by org
    }

    hasVisibleAccounts = true;

    // Create group container
    const groupDiv = document.createElement("div");
    groupDiv.className = "group";
    groupDiv.setAttribute("data-group-index", groupIndex);

    // Create group header
    const groupHeader = document.createElement("div");
    groupHeader.className = "group-header";
    
    const groupTitle = document.createElement("div");
    groupTitle.className = "group-title";
    groupTitle.textContent = group.name;
    
    const groupCount = document.createElement("div");
    groupCount.className = "group-count";
    groupCount.textContent = filteredAccounts.length;
    
    const groupArrow = document.createElement("div");
    groupArrow.className = "group-arrow";
    groupArrow.textContent = "▶";
    
    // Create a container for the count and arrow
    const rightContainer = document.createElement("div");
    rightContainer.className = "group-right-container";
    rightContainer.appendChild(groupCount);
    rightContainer.appendChild(groupArrow);
    
    groupHeader.appendChild(groupTitle);
    groupHeader.appendChild(rightContainer);
    
    // Create accounts container
    const accountsContainer = document.createElement("div");
    accountsContainer.className = "group-accounts";
    
    // Add accounts
    filteredAccounts.forEach((account, accountIndex) => {
      const accountDiv = document.createElement("div");
      accountDiv.className = "account";
      accountDiv.setAttribute("data-account-id", account.accountId);
      accountDiv.setAttribute("data-group-index", groupIndex);
      accountDiv.setAttribute("data-account-index", accountIndex);
      
      const accountInfo = document.createElement("div");
      accountInfo.className = "account-info";
      
      const accountName = document.createElement("div");
      accountName.className = "account-name";
      accountName.textContent = account.alias || account.name || account.accountId;
      
      const accountId = document.createElement("div");
      accountId.className = "account-id";
      accountId.textContent = account.accountId;
      
      accountInfo.appendChild(accountName);
      accountInfo.appendChild(accountId);
      
      // Add default role if available
      if (account.defaultRole) {
        const accountRole = document.createElement("div");
        accountRole.className = "account-role";
        accountRole.textContent = `Role: ${account.defaultRole}`;
        accountInfo.appendChild(accountRole);
      }
      
      // Create action buttons container
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "account-actions";
      
      // Create Open button
      const openBtn = document.createElement("button");
      openBtn.className = "account-open-btn";
      openBtn.innerHTML = "▶";
      openBtn.title = "Open with defaults";
      openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openAccountWithDefaults(account);
      });
      
      // Create Copy button
      const copyBtn = document.createElement("button");
      copyBtn.className = "account-copy-btn";
      copyBtn.innerHTML = "📋";
      copyBtn.title = "Copy account ID";
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        copyAccountId(account.accountId);
      });
      
      // Create Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "account-edit-btn";
      editBtn.innerHTML = "⚙";
      editBtn.title = "Edit settings";
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectAccount(account, groupIndex, accountIndex);
        showAccountForm();
      });
      
      actionsContainer.appendChild(openBtn);
      actionsContainer.appendChild(copyBtn);
      actionsContainer.appendChild(editBtn);
      
      accountDiv.appendChild(accountInfo);
      accountDiv.appendChild(actionsContainer);
      
      // Add click handler for the main account area (for selection without opening)
      accountInfo.addEventListener("click", () => selectAccount(account, groupIndex, accountIndex));
      
      accountsContainer.appendChild(accountDiv);
    });
    
    // Add group header click handler
    groupHeader.addEventListener("click", () => toggleGroup(groupDiv, groupArrow));
    
    // Assemble group
    groupDiv.appendChild(groupHeader);
    groupDiv.appendChild(accountsContainer);
    
    // Auto-expand only if searching (not by default)
    if (term) {
      groupDiv.querySelector(".group-accounts").classList.add("expanded");
      groupArrow.classList.add("expanded");
      groupHeader.classList.add("active");
    }
    
    groupsContainer.appendChild(groupDiv);
  });

  if (!hasVisibleAccounts && term) {
    groupsContainer.innerHTML = '<div class="no-results">No accounts found matching your search.</div>';
  }
}

function toggleGroup(groupDiv, arrow) {
  const accountsContainer = groupDiv.querySelector(".group-accounts");
  const isExpanded = accountsContainer.classList.contains("expanded");
  
  // Close all other groups
  document.querySelectorAll(".group").forEach(g => {
    if (g !== groupDiv) {
      g.querySelector(".group-accounts").classList.remove("expanded");
      g.querySelector(".group-arrow").classList.remove("expanded");
      g.querySelector(".group-header").classList.remove("active");
    }
  });
  
  // Toggle current group
  if (isExpanded) {
    accountsContainer.classList.remove("expanded");
    arrow.classList.remove("expanded");
    groupDiv.querySelector(".group-header").classList.remove("active");
  } else {
    accountsContainer.classList.add("expanded");
    arrow.classList.add("expanded");
    groupDiv.querySelector(".group-header").classList.add("active");
  }
}

function expandGroupForAccount(accountId) {
  // Find the account element and its group
  const accountElement = document.querySelector(`[data-account-id="${accountId}"]`);
  if (accountElement) {
    const groupDiv = accountElement.closest('.group');
    if (groupDiv) {
      const accountsContainer = groupDiv.querySelector(".group-accounts");
      const groupArrow = groupDiv.querySelector(".group-arrow");
      const groupHeader = groupDiv.querySelector(".group-header");
      
      // Close all other groups first
      document.querySelectorAll(".group").forEach(g => {
        if (g !== groupDiv) {
          g.querySelector(".group-accounts").classList.remove("expanded");
          g.querySelector(".group-arrow").classList.remove("expanded");
          g.querySelector(".group-header").classList.remove("active");
        }
      });
      
      // Expand the group containing the account
      accountsContainer.classList.add("expanded");
      groupArrow.classList.add("expanded");
      groupHeader.classList.add("active");
    }
  }
}

function openAccountWithDefaults(account) {
  // Get organization defaults if account references an organization
  let orgDefaults = {};
  if (account?.defaults && cfg?.organizations?.[account.defaults]) {
    orgDefaults = cfg.organizations[account.defaults];
  }
  
  // Get SSO Base URL from organization or config
  const ssoBaseUrl = (orgDefaults?.ssoBaseUrl || cfg?.ssoBaseUrl || "").trim().replace(/\/+$/, "");
  if (!ssoBaseUrl) {
    showError("Missing SSO Base URL in Options. Please configure your SSO URL first.");
    return;
  }

  // Validate URL format
  if (!isValidUrl(ssoBaseUrl)) {
    showError("Invalid SSO Base URL format. Please check your configuration.");
    return;
  }

  // Use defaults with fallback chain
  const roleName = (account?.defaultRole || orgDefaults?.roleName || cfg?.defaults?.roleName || "FC-Admin").trim();
  const region = (account?.defaultRegion || orgDefaults?.region || cfg?.defaults?.region || "us-east-1").trim();
  const destinationUrl = buildDefaultDestination(region);

  // console.log('Quick Open Debug:', {
  //   accountId: account.accountId,
  //   accountDefaults: account.defaults,
  //   orgDefaults: orgDefaults,
  //   finalRoleName: roleName,
  //   finalRegion: region,
  //   ssoBaseUrl: ssoBaseUrl,
  //   destinationUrl: destinationUrl
  // });

  // Send message to background script
  chrome.runtime.sendMessage({
    type: "OPEN_AWS_SSO",
    payload: {
      accountId: account.accountId,
      roleName: roleName,
      region: region,
      ssoBaseUrl: ssoBaseUrl,
      destinationUrl: destinationUrl
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      showError(`Account sign in error: ${chrome.runtime.lastError.message}`);
    } else if (response && response.ok) {
      showSuccess(`Opening ${account.alias || account.name || account.accountId}...`);
      // Close popup after successful launch
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      showError("Failed to open AWS Console. Please try again.");
    }
  });
}

function showAccountForm() {
  // Show the form controls section
  const controls = document.querySelector('.controls');
  if (controls) {
    controls.style.display = 'block';
    controls.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // Show the Open Console button
  const openBtn = document.getElementById('openBtn');
  if (openBtn) {
    openBtn.style.display = 'block';
  }
}

function populateRoleDropdown(account) {
  // Get organization defaults if account references an organization
  let orgDefaults = {};
  if (account?.defaults && cfg?.organizations?.[account.defaults]) {
    orgDefaults = cfg.organizations[account.defaults];
  }
  
  // console.log('populateRoleDropdown debug:', {
  //   accountName: account?.name || account?.aws_account_id,
  //   accountDefaults: account?.defaults,
  //   orgDefaults,
  //   hasAltRoles: orgDefaults?.altRoles,
  //   altRolesArray: orgDefaults?.altRoles,
  //   altRolesLength: orgDefaults?.altRoles?.length
  // });
  
  // Temporarily remove event listener to prevent loops
  roleSelect.removeEventListener("change", handleRoleSelection);
  
  // Clear existing options
  roleSelect.innerHTML = '<option value="">Select Role...</option>';
  
  // Check if organization has altRoles
  if (orgDefaults?.altRoles && Array.isArray(orgDefaults.altRoles) && orgDefaults.altRoles.length > 0) {
    // console.log('Showing role dropdown with altRoles');
    
    // Show dropdown and hide input
    roleSelect.style.display = 'block';
    roleInput.style.display = 'none';
    
    // Add default role as first option
    const defaultRole = orgDefaults.roleName || account?.defaultRole || cfg?.defaults?.roleName || "FC-Admin";
    const defaultOption = document.createElement('option');
    defaultOption.value = defaultRole;
    defaultOption.textContent = `${defaultRole} (Default)`;
    roleSelect.appendChild(defaultOption);
    
    // Add alternative roles
    orgDefaults.altRoles.forEach(role => {
      if (role !== defaultRole) { // Don't duplicate the default role
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleSelect.appendChild(option);
      }
    });
    
    // Add "Other" option for custom input
    const otherOption = document.createElement('option');
    otherOption.value = 'OTHER';
    otherOption.textContent = 'Other (custom)...';
    roleSelect.appendChild(otherOption);
    
    // Set default selection
    roleSelect.value = defaultRole;
    roleInput.value = defaultRole;
    
  } else {
    // console.log('No altRoles found, showing input field');
    // Hide dropdown and show input
    roleSelect.style.display = 'none';
    roleInput.style.display = 'block';
  }
  
  // Re-add event listener
  roleSelect.addEventListener("change", handleRoleSelection);
}

function handleRoleSelection() {
  // console.log('Role selection changed to:', roleSelect.value);
  if (roleSelect.value === 'OTHER') {
    // Show input field for custom role
    roleSelect.style.display = 'none';
    roleInput.style.display = 'block';
    roleInput.value = '';
    roleInput.focus();
  } else if (roleSelect.value && roleSelect.value !== '') {
    // Hide input and use selected role
    roleInput.style.display = 'none';
    roleInput.value = roleSelect.value;
  }
}


function selectAccount(account, groupIndex, accountIndex) {
  // Remove previous selection
  document.querySelectorAll(".account.selected").forEach(el => {
    el.classList.remove("selected");
  });
  
  // Add selection to clicked account
  const accountElement = document.querySelector(`[data-account-id="${account.accountId}"]`);
  if (accountElement) {
    accountElement.classList.add("selected");
  }
  
  // Store selected account
  selectedAccount = account;
  
  // Get organization defaults if account references an organization
  let orgDefaults = {};
  if (account?.defaults && cfg?.organizations?.[account.defaults]) {
    orgDefaults = cfg.organizations[account.defaults];
  }
  
  // Update form fields with proper fallback chain
  const effectiveRole = account?.defaultRole || orgDefaults?.roleName || cfg?.defaults?.roleName || "FC-Admin";
  const effectiveRegion = account?.defaultRegion || orgDefaults?.region || cfg?.defaults?.region || "us-east-1";
  roleInput.value = effectiveRole;
  regionInput.value = effectiveRegion;
  destInput.value = "";
  
  // Enable the open button and show the form
  openBtn.disabled = false;
  showAccountForm();
  
  // Populate role dropdown based on organization altRoles (after form is visible)
  populateRoleDropdown(account);
}

// Event listeners
searchInput.addEventListener("input", () => {
  populateGroups(searchInput.value, orgSelect.value);
});

orgSelect.addEventListener("change", () => {
  populateGroups(searchInput.value, orgSelect.value);
});

roleSelect.addEventListener("change", handleRoleSelection);

optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

openBtn.addEventListener("click", async () => {
  // Get organization defaults if account references an organization
  let orgDefaults = {};
  if (selectedAccount?.defaults && cfg?.organizations?.[selectedAccount.defaults]) {
    orgDefaults = cfg.organizations[selectedAccount.defaults];
  }
  
  // Get SSO Base URL from organization or config
  const ssoBaseUrl = (orgDefaults?.ssoBaseUrl || cfg?.ssoBaseUrl || "").trim().replace(/\/+$/, "");
  if (!ssoBaseUrl) {
    showError("Missing SSO Base URL in Options. Please configure your SSO URL first.");
    return;
  }

  // Validate URL format
  if (!isValidUrl(ssoBaseUrl)) {
    showError("Invalid SSO Base URL format. Please check your configuration.");
    return;
  }

  if (!selectedAccount) {
    showError("No account selected. Please select an account from the list.");
    return;
  }

  // Get role from dropdown if visible, otherwise from input
  const selectedRole = roleSelect.style.display !== 'none' && roleSelect.value && roleSelect.value !== 'OTHER' 
    ? roleSelect.value 
    : roleInput.value;
  const roleName = (selectedRole || selectedAccount.defaultRole || orgDefaults?.roleName || cfg?.defaults?.roleName || "FC-Admin").trim();
  const region = (regionInput.value || selectedAccount.defaultRegion || orgDefaults?.region || cfg?.defaults?.region || "us-east-1").trim();
  const destinationUrl = (destInput.value || "").trim() || buildDefaultDestination(region);

  // console.log('SSO Launch Debug:', {
  //   accountId: selectedAccount.accountId,
  //   accountDefaults: selectedAccount.defaults,
  //   orgDefaults: orgDefaults,
  //   finalRoleName: roleName,
  //   finalRegion: region,
  //   ssoBaseUrl: ssoBaseUrl,
  //   destinationUrl: destinationUrl
  // });

  // Validate role name
  if (!roleName) {
    showError("Role name cannot be empty.");
    return;
  }

  // Show loading state
  const originalText = openBtn.textContent;
  openBtn.textContent = "Launching...";
  openBtn.disabled = true;

  try {
    // Send message to background script
    chrome.runtime.sendMessage({
      type: "OPEN_AWS_SSO",
      payload: { ssoBaseUrl, accountId: selectedAccount.accountId, roleName, destinationUrl }
    }, (response) => {
      // Reset button state
      openBtn.textContent = originalText;
      openBtn.disabled = false;

      if (chrome.runtime.lastError) {
        showError(`Failed to launch SSO: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (response && response.ok) {
        showSuccess(`SSO launched for account ${selectedAccount.accountId}`);
        // Refresh session info after a short delay
        setTimeout(() => {
          highlightCurrentAccountFromSession();
        }, 2000);
      } else {
        showError("Failed to launch SSO. Please try again.");
      }
    });
  } catch (error) {
    // Reset button state
    openBtn.textContent = originalText;
    openBtn.disabled = false;
    showError(`Error launching SSO: ${error.message}`);
  }
});

// Utility functions for user feedback
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    background: #f8d7da;
    color: #721c24;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 8px 0;
    font-size: 13px;
    border: 1px solid #f5c6cb;
  `;
  errorDiv.textContent = message;
  
  // Insert before the button
  openBtn.parentNode.insertBefore(errorDiv, openBtn);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    background: #d4edda;
    color: #155724;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 8px 0;
    font-size: 13px;
    border: 1px solid #c3e6cb;
  `;
  successDiv.textContent = message;
  
  // Insert before the button
  openBtn.parentNode.insertBefore(successDiv, openBtn);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function copyAccountId(accountId) {
  // Use the modern Clipboard API if available
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(accountId).then(() => {
      showSuccess(`Account ID ${accountId} copied to clipboard`);
    }).catch(err => {
      // console.error('Failed to copy to clipboard:', err);
      fallbackCopyToClipboard(accountId);
    });
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyToClipboard(accountId);
  }
}

function fallbackCopyToClipboard(text) {
  // Create a temporary textarea element
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showSuccess(`Account ID ${text} copied to clipboard`);
    } else {
      showError("Failed to copy account ID to clipboard");
    }
  } catch (err) {
    // console.error('Fallback copy failed:', err);
    showError("Failed to copy account ID to clipboard");
  }
  
  document.body.removeChild(textArea);
}

// Keepalive mechanism for popup
let popupKeepAliveInterval = null;

function startPopupKeepAlive() {
  if (popupKeepAliveInterval) {
    clearInterval(popupKeepAliveInterval);
  }
  
  // Ping background script every 10 seconds to keep service worker alive
  popupKeepAliveInterval = setInterval(() => {
    chrome.runtime.sendMessage({ type: "PING" }, (response) => {
      if (chrome.runtime.lastError) {
        // console.warn('Keepalive ping failed:', chrome.runtime.lastError.message);
      }
    });
  }, 10000);
}

function stopPopupKeepAlive() {
  if (popupKeepAliveInterval) {
    clearInterval(popupKeepAliveInterval);
    popupKeepAliveInterval = null;
  }
}

// Initialize the popup
// Check both sync and local storage, prioritize the most recent one
chrome.storage.sync.get(["awsSsoLauncherConfig"], (syncRes) => {
  chrome.storage.local.get([
    "awsSsoLauncherConfig", 
    "awsSsoLauncherConfig_org", 
    "awsSsoLauncherConfig_accounts"
  ], (localRes) => {
    let storedConfig = null;
    let configSource = "none";
    
    // Check if we have split storage in local (most recent format)
    if (localRes.awsSsoLauncherConfig_org || localRes.awsSsoLauncherConfig_accounts) {
      // Split storage format - reconstruct the config
      storedConfig = {
        ...localRes.awsSsoLauncherConfig,
        originalOrgConfigText: localRes.awsSsoLauncherConfig_org,
        originalConfigText: localRes.awsSsoLauncherConfig_accounts,
        orgConfigText: localRes.awsSsoLauncherConfig_org,
        configText: localRes.awsSsoLauncherConfig_accounts
      };
      configSource = "local-split";
    } else if (localRes.awsSsoLauncherConfig) {
      // Single local storage config
      storedConfig = localRes.awsSsoLauncherConfig;
      configSource = "local-single";
    } else if (syncRes.awsSsoLauncherConfig) {
      // Fallback to sync storage
      storedConfig = syncRes.awsSsoLauncherConfig;
      configSource = "sync";
    }
    
    // If we have both sync and local, use the most recent one
    if (syncRes.awsSsoLauncherConfig && localRes.awsSsoLauncherConfig) {
      const syncTimestamp = syncRes.awsSsoLauncherConfig.lastUpdated || 0;
      const localTimestamp = localRes.awsSsoLauncherConfig.lastUpdated || 0;
      
      if (localTimestamp > syncTimestamp) {
        storedConfig = localRes.awsSsoLauncherConfig;
        configSource = "local-newer";
      } else {
        storedConfig = syncRes.awsSsoLauncherConfig;
        configSource = "sync-newer";
      }
    }
    
    // console.log('Popup: Using config from', configSource, 'storage');
    initializeWithConfig(storedConfig);
  });
});

function initializeWithConfig(storedConfig) {
  // console.log('Initializing with config:', storedConfig);
  // console.log('Config format:', storedConfig?.format);
  // console.log('Has parsedConfig:', !!storedConfig?.parsedConfig);
  // if (storedConfig?.parsedConfig) {
  //   console.log('Parsed config details:', {
  //     organizationsCount: Object.keys(storedConfig.parsedConfig.organizations || {}).length,
  //     groupsCount: Object.keys(storedConfig.parsedConfig.groups || {}).length,
  //     accountsCount: Object.keys(storedConfig.parsedConfig.accounts || {}).length
  //   });
  // }
  
  if (storedConfig) {
    // Handle different configuration formats
    if (storedConfig.format === 'two-field' && storedConfig.parsedConfig) {
      // New two-field format with parsed configuration
      cfg = storedConfig.parsedConfig;
      cfg.ssoBaseUrl = storedConfig.ssoBaseUrl;
    } else if (storedConfig.format === 'aws-credentials-style' && storedConfig.parsedConfig) {
      // Legacy single-field format with parsed configuration
      cfg = storedConfig.parsedConfig;
      cfg.ssoBaseUrl = storedConfig.ssoBaseUrl;
    } else {
      // Old JSON format - convert to new format
      cfg = {
        ssoBaseUrl: storedConfig.ssoBaseUrl || "",
        groups: storedConfig.groups || [],
        defaults: storedConfig.defaults || {},
        format: 'legacy-json'
      };
    }
  } else {
    // Default configuration
    cfg = { 
      ssoBaseUrl: "", 
      groups: [], 
      defaults: {},
      format: 'default'
    };
  }
  
  // console.log('Configuration loaded:', cfg);
  // console.log('Organizations config:', cfg?.organizations);
  // if (cfg?.organizations) {
  //   Object.keys(cfg.organizations).forEach(orgName => {
  //     console.log(`Organization ${orgName}:`, cfg.organizations[orgName]);
  //   });
  // }
  
  buildAllAccountsList();
  populateOrganizations();
  populateGroups();
  highlightCurrentAccountFromSession();
  
  // Start keepalive mechanism
  startPopupKeepAlive();
  
        // Initially disable the open button and hide the form
        openBtn.disabled = true;
        openBtn.style.display = 'none';
        document.querySelector('.controls').style.display = 'none';
        
        // Hide role dropdown initially
        roleSelect.style.display = 'none';
        roleInput.style.display = 'block';
}

// Cleanup when popup closes
window.addEventListener('beforeunload', () => {
  stopPopupKeepAlive();
});

function highlightCurrentAccountFromSession() {
  currentInfo.textContent = "Checking AWS session...";
  
  // Try to get session status from background script with retry logic
  getSessionStatusWithRetry(0);
}

function getSessionStatusWithRetry(attempt = 0) {
  const maxAttempts = 3;
  
  chrome.runtime.sendMessage({ type: "GET_SESSION_STATUS" }, (status) => {
    if (chrome.runtime.lastError) {
      // console.warn(`Background script communication failed (attempt ${attempt + 1}):`, chrome.runtime.lastError.message);
      
      if (attempt < maxAttempts - 1) {
        // Retry after a short delay
        setTimeout(() => {
          getSessionStatusWithRetry(attempt + 1);
        }, 500);
      } else {
        // All retries failed, try alternative approach
        // console.warn('All background script communication attempts failed, trying content script detection');
        showNoSessionDetected("Service worker not responding");
        triggerSessionDetection();
      }
      return;
    }

    if (status && status.hasSession && status.accountInfo) {
      const info = status.accountInfo;
      const sessionStatus = status.isValid ? "✓" : "⚠";
      const expiryWarning = status.isNearExpiry ? " (expiring soon)" : "";
      
      // Look up account alias/name and organization from configuration
      let accountDisplay = info.accountId;
      let accountAlias = "";
      let organizationName = "";
      
      if (cfg && cfg.accounts) {
        // Find account by ID in the configuration
        for (const [accountName, accountData] of Object.entries(cfg.accounts)) {
          if (accountData.aws_account_id === info.accountId) {
            accountAlias = accountName;
            
            // Get organization name if account references one
            if (accountData.defaults && cfg.organizations && cfg.organizations[accountData.defaults]) {
              organizationName = accountData.defaults;
              accountDisplay = `${organizationName} - ${accountName} (${info.accountId})`;
            } else {
              accountDisplay = `${accountName} (${info.accountId})`;
            }
            break;
          }
        }
      }
      
      // Format role name - remove first and last parts before/after underscores
      let formattedRoleName = info.roleName || "Unknown";
      if (info.roleName && info.roleName.includes('_')) {
        const roleParts = info.roleName.split('_');
        if (roleParts.length >= 3) {
          // Remove first and last parts, keep middle parts
          formattedRoleName = roleParts.slice(1, -1).join('_');
        }
      }
      
      currentInfo.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="color: ${status.isValid ? '#2d5a27' : '#d73a49'}; font-weight: bold;">
            ${sessionStatus} ${accountDisplay}
          </div>
          <a href="https://console.aws.amazon.com/console/home" target="_blank" style="color: #007cba; text-decoration: none; font-size: 16px; margin-left: 8px;" title="Open AWS Console">
            🌐
          </a>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 2px;">
          Role: ${formattedRoleName}${expiryWarning}
        </div>
      `;
      
      // Expand the group containing the current account
      expandGroupForAccount(info.accountId);
    } else {
      // No session in background script, try to trigger detection in content script
      triggerSessionDetection();
    }
  });
}

function triggerSessionDetection() {
  // Find AWS Console tabs and trigger session detection
  chrome.tabs.query({ url: "https://*.console.aws.amazon.com/*" }, (tabs) => {
    if (tabs.length === 0) {
      showNoSessionDetected("No AWS Console tabs found");
      return;
    }

    const activeTab = tabs.find(tab => tab.active) || tabs[0];
    
    // Try to inject and trigger detection
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    }).then(() => {
      // Wait for script to initialize, then trigger detection
      setTimeout(() => {
        chrome.tabs.sendMessage(activeTab.id, { type: "DETECT_SESSION" }, (response) => {
          if (chrome.runtime.lastError) {
            // console.warn('Content script communication failed:', chrome.runtime.lastError.message);
            showNoSessionDetected("Content script not ready");
            return;
          }

          if (response && response.success && response.sessionInfo) {
            // Update the display with the detected session
            setTimeout(() => {
              highlightCurrentAccountFromSession();
            }, 500);
          } else {
            showNoSessionDetected("No session found on page");
          }
        });
      }, 1000);
    }).catch((error) => {
      // console.log('Content script injection failed or already loaded:', error);
      // Try to send message anyway
      chrome.tabs.sendMessage(activeTab.id, { type: "DETECT_SESSION" }, (response) => {
        if (chrome.runtime.lastError) {
          showNoSessionDetected("Content script not available");
          return;
        }

        if (response && response.success && response.sessionInfo) {
          setTimeout(() => {
            highlightCurrentAccountFromSession();
          }, 500);
        } else {
          showNoSessionDetected("No session found on page");
        }
      });
    });
  });
}

function showNoSessionDetected(reason = null) {
  const reasonText = reason ? ` (${reason})` : '';
  currentInfo.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="color: #d73a49;">
        ⚠ No active AWS Console session detected${reasonText}
      </div>
      <a href="https://console.aws.amazon.com/console/home" target="_blank" style="color: #007cba; text-decoration: none; font-size: 16px; margin-left: 8px;" title="Open AWS Console">
        🌐
      </a>
    </div>
    <div style="font-size: 12px; color: #666; margin-top: 2px;">
      Open an AWS Console tab and try the debug button for troubleshooting
    </div>
  `;
  
  // Close all groups when no session is detected
  document.querySelectorAll(".group").forEach(g => {
    g.querySelector(".group-accounts").classList.remove("expanded");
    g.querySelector(".group-arrow").classList.remove("expanded");
    g.querySelector(".group-header").classList.remove("active");
  });
}