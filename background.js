// Session management constants
const SESSION_CONFIG = {
  MAX_AGE: 60 * 60 * 1000, // 1 hour in milliseconds
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  VALIDATION_INTERVAL: 2 * 60 * 1000, // Check every 2 minutes
  STORAGE_KEY: 'awsSsoSessionData'
};

// Keepalive mechanism for service worker
let keepAliveInterval = null;
let lastAccountInfo = null;
let sessionTimestamp = null;
let validationTimer = null;

// Initialize keepalive mechanism
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  // Ping every 20 seconds to keep service worker alive
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker alive
    });
  }, 20000);
}

// Load session data from storage
async function loadSessionData() {
  try {
    const result = await chrome.storage.local.get([SESSION_CONFIG.STORAGE_KEY]);
    const data = result[SESSION_CONFIG.STORAGE_KEY];
    
    if (data) {
      lastAccountInfo = data.lastAccountInfo;
      sessionTimestamp = data.sessionTimestamp;
    }
  } catch (error) {
  }
}

// Save session data to storage
async function saveSessionData() {
  try {
    const data = {
      lastAccountInfo,
      sessionTimestamp,
      lastSaved: Date.now()
    };
    
    await chrome.storage.local.set({ [SESSION_CONFIG.STORAGE_KEY]: data });
  } catch (error) {
  }
}

// Session validation functions
function validateSession(sessionInfo) {
  if (!sessionInfo || !sessionInfo.timestamp) {
    return false;
  }

  const sessionAge = Date.now() - sessionInfo.timestamp;
  return sessionAge < SESSION_CONFIG.MAX_AGE;
}

function isSessionNearExpiry(sessionInfo) {
  if (!sessionInfo || !sessionInfo.timestamp) {
    return true;
  }

  const sessionAge = Date.now() - sessionInfo.timestamp;
  return sessionAge > SESSION_CONFIG.REFRESH_THRESHOLD;
}

async function updateSessionInfo(payload) {
  if (payload && payload.accountId) {
    lastAccountInfo = {
      ...payload,
      timestamp: payload.timestamp || Date.now(),
      lastUpdated: Date.now()
    };
    sessionTimestamp = lastAccountInfo.timestamp;
    
    // Save to storage
    await saveSessionData();
    
    // Start validation timer if not already running
    startSessionValidation();
    
  }
}

function startSessionValidation() {
  if (validationTimer) {
    clearInterval(validationTimer);
  }

  validationTimer = setInterval(() => {
    if (lastAccountInfo && isSessionNearExpiry(lastAccountInfo)) {
      refreshSession();
    }
  }, SESSION_CONFIG.VALIDATION_INTERVAL);
}

function refreshSession() {
  // Find active AWS Console tabs and request fresh session info
  chrome.tabs.query({ url: "https://*.console.aws.amazon.com/*" }, (tabs) => {
    if (tabs.length === 0) {
      return;
    }

    // Send refresh request to the most recent AWS Console tab
    const activeTab = tabs.find(tab => tab.active) || tabs[0];
    
    chrome.tabs.sendMessage(activeTab.id, { type: "REFRESH_SESSION" }, (response) => {
      if (chrome.runtime.lastError) {
      } else if (response && response.success) {
      }
    });
  });
}

function clearSession() {
  lastAccountInfo = null;
  sessionTimestamp = null;
  
  if (validationTimer) {
    clearInterval(validationTimer);
    validationTimer = null;
  }
  
}

// Message handler with async support
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  
  // Handle async operations
  const handleAsync = async () => {
    try {
      switch (msg?.type) {
        case "AWS_ACCOUNT_INFO":
          await updateSessionInfo(msg.payload);
          return { 
            ok: true, 
            sessionValid: validateSession(lastAccountInfo),
            timestamp: sessionTimestamp 
          };

        case "GET_CURRENT_ACCOUNT_INFO":
          // Load fresh data from storage if needed
          if (!lastAccountInfo) {
            await loadSessionData();
          }
          const currentSession = validateSession(lastAccountInfo) ? lastAccountInfo : null;
          return currentSession || {};

        case "OPEN_AWS_SSO":
          await handleSSOLaunch(msg.payload);
          return { ok: true };

        case "REFRESH_SESSION":
          // This is sent from content script when it detects a session refresh
          await updateSessionInfo(msg.payload);
          return { success: true };

        case "CLEAR_SESSION":
          clearSession();
          return { ok: true };

        case "GET_SESSION_STATUS":
          // Load fresh data from storage if needed
          if (!lastAccountInfo) {
            await loadSessionData();
          }
          return {
            hasSession: !!lastAccountInfo,
            isValid: validateSession(lastAccountInfo),
            isNearExpiry: isSessionNearExpiry(lastAccountInfo),
            timestamp: sessionTimestamp,
            accountInfo: lastAccountInfo
          };

        case "PING":
          // Keepalive ping
          return { pong: true, timestamp: Date.now() };

        default:
          return { error: 'Unknown message type' };
      }
    } catch (error) {
      return { error: error.message };
    }
  };

  // Handle async response
  if (msg?.type && ['AWS_ACCOUNT_INFO', 'GET_CURRENT_ACCOUNT_INFO', 'REFRESH_SESSION', 'GET_SESSION_STATUS'].includes(msg.type)) {
    handleAsync().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true; // Keep message channel open for async response
  } else {
    // Handle sync operations
    try {
      const result = handleAsync();
      if (result && typeof result.then === 'function') {
        result.then(sendResponse).catch(error => sendResponse({ error: error.message }));
        return true;
      } else {
        sendResponse(result);
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
});

async function handleSSOLaunch(payload) {
  const { ssoBaseUrl, accountId, roleName, destinationUrl, openInNewTab = true, sourceTabId } = payload;
  
  // Validate required parameters
  if (!ssoBaseUrl || !accountId || !roleName) {
    throw new Error('Missing required parameters for SSO launch');
  }

  // Build SSO URL with proper encoding
  const baseUrl = ssoBaseUrl.replace(/\/+$/, '');
  
  // Manually construct the URL to avoid double-encoding the destination parameter
  // AWS SSO expects the destination parameter to be URL-encoded only once
  const destinationEncoded = encodeURIComponent(destinationUrl);
  const ssoUrlString = `${baseUrl}/start/#/console?account_id=${accountId}&role_name=${encodeURIComponent(roleName)}&destination=${destinationEncoded}`;


  if (openInNewTab) {
    // Create new tab with SSO URL
    chrome.tabs.create({
      url: ssoUrlString,
      active: true // Focus the new tab
    });
  } else {
    // Reuse current active tab for same-tab quick-open behavior
    if (sourceTabId) {
      chrome.tabs.update(sourceTabId, {
        url: ssoUrlString,
        active: true
      });
    } else {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (activeTab?.id) {
        chrome.tabs.update(activeTab.id, {
          url: ssoUrlString,
          active: true
        });
      } else {
        // Fallback if no active tab is available
        chrome.tabs.create({ url: ssoUrlString, active: true });
      }
    }
  }

}

// Initialize service worker
async function initializeServiceWorker() {
  
  // Load session data from storage
  await loadSessionData();
  
  // Start keepalive mechanism
  startKeepAlive();
  
  // Start session validation if we have session data
  if (lastAccountInfo) {
    startSessionValidation();
  }
  
}

// Cleanup on extension startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeServiceWorker();
});

// Initialize when service worker starts
chrome.runtime.onInstalled.addListener(async () => {
  await initializeServiceWorker();
});

// Initialize immediately if service worker is already running
initializeServiceWorker();

// Handle tab updates to refresh session info when navigating AWS Console
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('console.aws.amazon.com')) {
    
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: "DETECT_SESSION" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be ready yet, ignore
        }
      });
    }, 1000);
  }
});

// Handle tab removal to clean up sessions
chrome.tabs.onRemoved.addListener((tabId) => {
  // If the last AWS Console tab was closed, clear session after a delay
  chrome.tabs.query({ url: "https://*.console.aws.amazon.com/*" }, (tabs) => {
    if (tabs.length === 0 && lastAccountInfo) {
      setTimeout(() => {
        chrome.tabs.query({ url: "https://*.console.aws.amazon.com/*" }, (remainingTabs) => {
          if (remainingTabs.length === 0) {
            clearSession();
          }
        });
      }, 5000); // Wait 5 seconds before clearing
    }
  });
});