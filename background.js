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
      // console.log('Session data loaded from storage:', data);
    }
  } catch (error) {
    // console.warn('Failed to load session data:', error);
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
    // console.log('Session data saved to storage');
  } catch (error) {
    // console.warn('Failed to save session data:', error);
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
    
    // console.log(`Session updated: ${payload.accountId} (${payload.roleName || 'unknown role'})`);
  }
}

function startSessionValidation() {
  if (validationTimer) {
    clearInterval(validationTimer);
  }

  validationTimer = setInterval(() => {
    if (lastAccountInfo && isSessionNearExpiry(lastAccountInfo)) {
      // console.log('Session near expiry, attempting refresh...');
      refreshSession();
    }
  }, SESSION_CONFIG.VALIDATION_INTERVAL);
}

function refreshSession() {
  // Find active AWS Console tabs and request fresh session info
  chrome.tabs.query({ url: "https://*.console.aws.amazon.com/*" }, (tabs) => {
    if (tabs.length === 0) {
      // console.log('No active AWS Console tabs found for session refresh');
      return;
    }

    // Send refresh request to the most recent AWS Console tab
    const activeTab = tabs.find(tab => tab.active) || tabs[0];
    
    chrome.tabs.sendMessage(activeTab.id, { type: "REFRESH_SESSION" }, (response) => {
      if (chrome.runtime.lastError) {
        // console.warn('Failed to refresh session:', chrome.runtime.lastError.message);
      } else if (response && response.success) {
        // console.log('Session refreshed successfully');
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
  
  // console.log('Session cleared');
}

// Message handler with async support
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // console.log('Background script received message:', msg?.type);
  
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
          handleSSOLaunch(msg.payload);
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
          // console.warn('Unknown message type:', msg?.type);
          return { error: 'Unknown message type' };
      }
    } catch (error) {
      // console.error('Error handling message:', error);
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
      // console.error('Error handling sync message:', error);
      sendResponse({ error: error.message });
    }
  }
});

function handleSSOLaunch(payload) {
  const { ssoBaseUrl, accountId, roleName, destinationUrl } = payload;
  
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

  // console.log('Generated SSO URL:', ssoUrlString);
  // console.log('Destination URL:', destinationUrl);
  // console.log('Encoded destination:', destinationEncoded);

  // Create new tab with SSO URL
  chrome.tabs.create({ 
    url: ssoUrlString,
    active: true // Focus the new tab
  });

  // console.log(`SSO launched for account ${accountId} with role ${roleName}`);
}

// Initialize service worker
async function initializeServiceWorker() {
  // console.log('AWS SSO Launcher service worker starting...');
  
  // Load session data from storage
  await loadSessionData();
  
  // Start keepalive mechanism
  startKeepAlive();
  
  // Start session validation if we have session data
  if (lastAccountInfo) {
    startSessionValidation();
  }
  
  // console.log('AWS SSO Launcher service worker initialized');
}

// Cleanup on extension startup
chrome.runtime.onStartup.addListener(async () => {
  // console.log('AWS SSO Launcher started');
  await initializeServiceWorker();
});

// Initialize when service worker starts
chrome.runtime.onInstalled.addListener(async () => {
  // console.log('AWS SSO Launcher installed/updated');
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
          // console.debug('Content script not ready for session detection');
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
            // console.log('All AWS Console tabs closed, clearing session');
            clearSession();
          }
        });
      }, 5000); // Wait 5 seconds before clearing
    }
  });
});