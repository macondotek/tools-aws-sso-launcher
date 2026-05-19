(() => {
  class AWSSessionDetector {
    constructor() {
      this.maxRetries = 3;
      this.retryDelay = 1000; // 1 second
      this.detectionMethods = [
        this.detectFromAWSCSessionMeta.bind(this),
        this.detectFromURL.bind(this),
        this.detectFromAWSConsoleData.bind(this),
        this.detectFromBreadcrumbs.bind(this),
        this.detectFromCurrentSession.bind(this),
        this.detectFromAccountSelector.bind(this),
        this.detectFromHeaderElements.bind(this),
        this.detectFromTextContent.bind(this),
        this.detectFromPageMetadata.bind(this),
        this.detectFromGlobalVariables.bind(this),
        this.detectFromNetworkRequests.bind(this),
        this.detectFromCookies.bind(this)
      ];
    }

    async detectSession() {
      // Try each detection method with retry logic
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        for (const method of this.detectionMethods) {
          try {
            const result = await method();
            if (result && result.accountId) {
              return {
                ...result,
                timestamp: Date.now(),
                detectionMethod: method.name,
                source: 'content-script'
              };
            }
          } catch (error) {
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }

      return null;
    }

    detectFromAWSCSessionMeta() {
      // Method 0: Check AWS Console's session meta tag (most reliable)
      
      try {
        const metaTag = document.querySelector('meta[name="awsc-session-data"]');
        if (metaTag && metaTag.content) {
          
          // Parse the JSON content
          let sessionData;
          try {
            sessionData = JSON.parse(metaTag.content);
          } catch (parseError) {
            return null;
          }
          
          // Extract account information
          const accountId = sessionData.accountId;
          const sessionARN = sessionData.sessionARN;
          const displayName = sessionData.displayName;
          
          if (accountId && /^\d{12}$/.test(accountId)) {
            
            // Extract role name from sessionARN
            let roleName = null;
            if (sessionARN) {
              const arnMatch = sessionARN.match(/arn:aws:sts::\d{12}:assumed-role\/([^\/]+)\//);
              if (arnMatch) {
                roleName = arnMatch[1];
              }
            }
            
            // Extract region from infrastructureRegion
            const region = sessionData.infrastructureRegion || this.getRegionFromPage();
            
            return {
              accountId: accountId,
              roleName: roleName,
              region: region,
              sessionValid: true,
              sessionId: sessionData.sessionId,
              sessionARN: sessionARN,
              displayName: displayName
            };
          }
        }
      } catch (error) {
      }
      
      return null;
    }

    detectFromURL() {
      // Method 0: Check URL for account context
      
      const url = window.location.href;
      
      // Check for account ID in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const accountIdParam = urlParams.get('account_id') || urlParams.get('accountId') || urlParams.get('account');
      
      if (accountIdParam && /^\d{12}$/.test(accountIdParam)) {
        return {
          accountId: accountIdParam,
          roleName: null, // Role usually not in URL
          region: this.getRegionFromPage(),
          sessionValid: true
        };
      }
      
      // Check for account ID in URL path or hash
      const urlMatch = url.match(/\/(\d{12})\//);
      if (urlMatch) {
        return {
          accountId: urlMatch[1],
          roleName: null,
          region: this.getRegionFromPage(),
          sessionValid: true
        };
      }
      
      // Check hash fragment for SSO parameters
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccountId = hashParams.get('account_id') || hashParams.get('accountId');
        
        if (hashAccountId && /^\d{12}$/.test(hashAccountId)) {
          return {
            accountId: hashAccountId,
            roleName: hashParams.get('role_name') || hashParams.get('roleName'),
            region: hashParams.get('region') || this.getRegionFromPage(),
            sessionValid: true
          };
        }
      }
      
      // Check if we're on an AWS Console page and look for the current account in the page title or meta
      if (url.includes('console.aws.amazon.com')) {
        
        // Check page title for account context
        const title = document.title;
        const titleMatch = title.match(/(\d{12})/);
        if (titleMatch) {
          return {
            accountId: titleMatch[1],
            roleName: null,
            region: this.getRegionFromPage(),
            sessionValid: true
          };
        }
      }
      
      return null;
    }

    detectFromAWSConsoleData() {
      // Method 1: Check AWS Console's internal data structures
      
      try {
        // Check for AWS Console's internal configuration
        const awsConsoleConfig = window.awsConsoleConfig || window.AWS_CONSOLE_CONFIG;
        if (awsConsoleConfig && awsConsoleConfig.accountId) {
          return {
            accountId: awsConsoleConfig.accountId,
            roleName: awsConsoleConfig.roleName || awsConsoleConfig.assumedRoleName,
            region: awsConsoleConfig.region || this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
        // Check for AWS Console's session data
        const sessionData = window.awsConsoleSession || window.AWS_CONSOLE_SESSION;
        if (sessionData && sessionData.accountId) {
          return {
            accountId: sessionData.accountId,
            roleName: sessionData.roleName || sessionData.assumedRoleName,
            region: sessionData.region || this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
        // Check for AWS Console's user context
        const userContext = window.awsConsoleUserContext || window.AWS_CONSOLE_USER_CONTEXT;
        if (userContext && userContext.accountId) {
          return {
            accountId: userContext.accountId,
            roleName: userContext.roleName || userContext.assumedRoleName,
            region: userContext.region || this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
        // Check for AWS Console's current account data
        const currentAccount = window.awsConsoleCurrentAccount || window.AWS_CONSOLE_CURRENT_ACCOUNT;
        if (currentAccount && currentAccount.accountId) {
          return {
            accountId: currentAccount.accountId,
            roleName: currentAccount.roleName || currentAccount.assumedRoleName,
            region: currentAccount.region || this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
        // Check for AWS Console's navigation data
        const navData = window.awsConsoleNav || window.AWS_CONSOLE_NAV;
        if (navData && navData.currentAccount) {
          return {
            accountId: navData.currentAccount,
            roleName: navData.currentRole || navData.assumedRoleName,
            region: navData.currentRegion || this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
        // Check for AWS Console's page data
        const pageData = window.awsConsolePageData || window.AWS_CONSOLE_PAGE_DATA;
        if (pageData && pageData.accountId) {
          return {
            accountId: pageData.accountId,
            roleName: pageData.roleName || pageData.assumedRoleName,
            region: pageData.region || this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
      } catch (error) {
      }
      
      return null;
    }

    detectFromBreadcrumbs() {
      // Method 1: Check AWS Console breadcrumbs for current account
      
      const breadcrumbSelectors = [
        // AWS Console breadcrumb navigation
        '[data-testid*="breadcrumb"]',
        '.awsui-breadcrumb',
        '.breadcrumb',
        '[aria-label*="breadcrumb"]',
        
        // AWS Console navigation context
        '[data-testid*="nav"]',
        '.awsui-navigation',
        '.navigation',
        
        // AWS Console page header
        '[data-testid*="page-header"]',
        '.awsui-page-header',
        '.page-header'
      ];
      
      for (const selector of breadcrumbSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent || element.innerText || '';
            
            // Look for account ID in breadcrumb text
            const accountMatch = text.match(/(\d{12})/);
            if (accountMatch) {
              // Check if this looks like current context (not historical)
              const isCurrentContext = text.toLowerCase().includes('current') ||
                                     text.toLowerCase().includes('active') ||
                                     text.toLowerCase().includes('logged') ||
                                     element.closest('[data-testid*="breadcrumb"]') ||
                                     element.closest('.awsui-breadcrumb');
              
              if (isCurrentContext) {
                
                // Try to extract role from breadcrumb context
                let roleName = null;
                const rolePatterns = [
                  /Role:\s*(\w+)/i,
                  /role[:\s]+(\w+)/i,
                  /assumed-role[\/](\w+)/i,
                  /(\w+)\s*\(\d{12}\)/,
                  /(\w+@\w+)/
                ];
                
                for (const pattern of rolePatterns) {
                  const match = text.match(pattern);
                  if (match) {
                    roleName = match[1];
                    break;
                  }
                }
                
                return {
                  accountId: accountMatch[1],
                  roleName: roleName,
                  region: this.getRegionFromPage(),
                  sessionValid: true
                };
              }
            }
          }
        } catch (error) {
        }
      }
      
      return null;
    }

    detectFromCurrentSession() {
      // Method 0: Look for current session information in AWS Console
      
      // Look for AWS Console's current session indicators
      const currentSessionSelectors = [
        // AWS Console header with current account
        '[data-testid="account-detail-menu"] span',
        '[data-testid="nav-accountMenuButton"] span',
        '.awsui-context-info-main span',
        '.awsui-context-info span',
        
        // Look for "Current account" or similar text
        '*:contains("Current account")',
        '*:contains("current account")',
        '*:contains("Logged in as")',
        '*:contains("logged in as")',
        
        // AWS Console breadcrumb or context
        '[data-testid*="breadcrumb"] span',
        '[data-testid*="context"] span'
      ];
      
      for (const selector of currentSessionSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent || element.innerText || '';
            
            // Look for account ID in current session context
            const accountMatch = text.match(/(\d{12})/);
            if (accountMatch) {
              // Check if this looks like current session (not historical data)
              const isCurrentSession = text.toLowerCase().includes('current') ||
                                     text.toLowerCase().includes('logged') ||
                                     text.toLowerCase().includes('session') ||
                                     element.closest('[data-testid*="account"]') ||
                                     element.closest('.awsui-context-info');
              
              if (isCurrentSession) {
                
                // Try to extract role from nearby elements or parent context
                let roleName = null;
                const parent = element.closest('[data-testid*="account"], .awsui-context-info, header, nav');
                if (parent) {
                  const parentText = parent.textContent || '';
                  const rolePatterns = [
                    /Role:\s*(\w+)/i,
                    /role[:\s]+(\w+)/i,
                    /assumed-role[\/](\w+)/i,
                    /(\w+)\s*\(\d{12}\)/,
                    /(\w+@\w+)/
                  ];
                  
                  for (const pattern of rolePatterns) {
                    const match = parentText.match(pattern);
                    if (match) {
                      roleName = match[1];
                      break;
                    }
                  }
                }
                
                return {
                  accountId: accountMatch[1],
                  roleName: roleName,
                  region: this.getRegionFromPage(),
                  sessionValid: true
                };
              }
            }
          }
        } catch (error) {
        }
      }
      
      // Also check for AWS Console's internal session data
      try {
        // Look for AWS Console's internal session data in window object
        if (window.awsConsoleConfig && window.awsConsoleConfig.accountId) {
          return {
            accountId: window.awsConsoleConfig.accountId,
            roleName: window.awsConsoleConfig.roleName || null,
            region: this.getRegionFromPage(),
            sessionValid: true
          };
        }
        
        // Check for other AWS Console session indicators
        const sessionIndicators = [
          'window.AWS_CONSOLE_SESSION',
          'window.awsConsoleSession',
          'window.CURRENT_SESSION',
          'window.currentSession'
        ];
        
        for (const indicator of sessionIndicators) {
          try {
            const value = this.getNestedProperty(window, indicator.replace('window.', ''));
            if (value && value.accountId) {
              return {
                accountId: value.accountId,
                roleName: value.roleName || null,
                region: this.getRegionFromPage(),
                sessionValid: true
              };
            }
          } catch (error) {
            // Ignore errors for non-existent properties
          }
        }
      } catch (error) {
      }
      
      return null;
    }

    detectFromAccountSelector() {
      // Method 1: Check for AWS Console's account selector dropdown
      const selectors = [
        // New AWS Console selectors
        '[data-testid="account-detail-menu"]',
        '[data-testid="nav-accountMenuButton"]',
        '[data-testid="account-detail-menu-button"]',
        '[data-testid="account-menu"]',
        '[data-testid="header-account-menu"]',
        
        // AWS UI Library selectors
        '.awsui-dropdown-trigger[aria-label*="account"]',
        '.awsui-context-info-main',
        '.awsui-context-info',
        '.awsui-header',
        
        // Generic selectors
        '[aria-label*="account"]',
        '[aria-label*="Account"]',
        '[title*="account"]',
        '[title*="Account"]',
        
        // Text-based selectors
        'button:contains("account")',
        'div:contains("account")',
        'span:contains("account")',
        
        // Console-specific selectors
        '.console-nav-account',
        '.nav-account',
        '.account-selector',
        '.account-dropdown',
        
        // Legacy selectors
        '#nav-usernameMenu',
        '#nav-accountMenuButton',
        '.nav-accountMenuButton'
      ];

      for (const selector of selectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            const accountInfo = this.parseAccountFromElement(element);
            if (accountInfo) {
              return accountInfo;
            }
          }
        } catch (error) {
        }
      }

      // Fallback: search for any element containing account ID pattern
      return this.detectFromTextContent();
    }

    detectFromTextContent() {
      // Search entire document for AWS account ID pattern, prioritizing header areas
      const prioritySelectors = [
        'header', 'nav', '.awsui-header', '.awsui-context-info',
        '[data-testid*="account"]', '[aria-label*="account"]'
      ];
      
      // First, check priority areas (header/navigation)
      for (const selector of prioritySelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const accountInfo = this.parseAccountFromElement(element);
          if (accountInfo) {
            return accountInfo;
          }
        }
      }
      
      // Fallback: search entire document but be more selective
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const accountIdPattern = /\b(\d{12})\b/g;
      let node;
      let bestMatch = null;
      let bestScore = 0;
      
      while (node = walker.nextNode()) {
        const text = node.textContent;
        if (text && accountIdPattern.test(text)) {
          // Found potential account ID, try to extract context
          const matches = text.match(accountIdPattern);
          if (matches) {
            const accountId = matches[0];
            
            // Score this match based on context
            let score = 0;
            let roleName = null;
            
            // Check if this is in a navigation or header context
            let currentElement = node.parentElement;
            while (currentElement && currentElement !== document.body) {
              const tagName = currentElement.tagName.toLowerCase();
              const className = currentElement.className.toLowerCase();
              
              if (tagName === 'header' || tagName === 'nav' || 
                  className.includes('header') || className.includes('nav') ||
                  className.includes('account') || className.includes('menu')) {
                score += 10;
                break;
              }
              currentElement = currentElement.parentElement;
            }
            
            // Look for role patterns in the text
            const rolePatterns = [
              /Role:\s*(\w+)/i,
              /role[:\s]+(\w+)/i,
              /assumed-role[\/](\w+)/i,
              /(\w+)\s*\(\d{12}\)/,
              /(\w+@\w+)/
            ];
            
            for (const pattern of rolePatterns) {
              const match = text.match(pattern);
              if (match) {
                roleName = match[1];
                score += 5; // Bonus for having role info
                break;
              }
            }
            
            // Check if this looks like a current session (not just a reference)
            if (text.toLowerCase().includes('current') || 
                text.toLowerCase().includes('logged') ||
                text.toLowerCase().includes('session')) {
              score += 15;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = {
                accountId: accountId,
                roleName: roleName,
                region: this.getRegionFromPage(),
                sessionValid: true
              };
            }
          }
        }
      }
      
      if (bestMatch) {
        return bestMatch;
      }
      
      return null;
    }
    
    detectFromHeaderElements() {
      // Method 2: Check for AWS Console's header elements
      const headerSelectors = [
        '.awsui-context-info-main',
        '[data-testid="account-detail-menu-button"]',
        '.awsui-header',
        '[role="banner"] .awsui-context-info'
      ];

      for (const selector of headerSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const accountInfo = this.parseAccountFromElement(element);
          if (accountInfo) return accountInfo;
        }
      }

      return null;
    }

    detectFromPageMetadata() {
      // Method 3: Check for meta tags or script tags with account info
      const metaSelectors = [
        'meta[name="aws-account-id"]',
        'meta[property="aws:account-id"]',
        'script[data-aws-account]',
        'script[type="application/json"][data-aws-context]'
      ];

      for (const selector of metaSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const accountInfo = this.parseAccountFromMeta(element);
          if (accountInfo) return accountInfo;
        }
      }

      return null;
    }

    detectFromCookies() {
      // Method 4: Check for AWS session cookies (fallback method)
      try {
        const cookies = document.cookie.split(';');
        const awsCookies = cookies.filter(cookie => {
          const name = cookie.trim().split('=')[0].toLowerCase();
          return name.includes('aws') || name.includes('session');
        });

        if (awsCookies.length > 0) {
          // Extract account info from cookie values
          const cookieText = awsCookies.join(' ');
          const accountMatch = cookieText.match(/(\d{12})/);
          
          if (accountMatch) {
            return {
              accountId: accountMatch[1],
              roleName: null,
              region: this.getRegionFromPage(),
              sessionValid: true
            };
          }
        }
      } catch (error) {
      }

      return null;
    }

    detectFromGlobalVariables() {
      // Method 5: Check for AWS Console global variables
      try {
        // Check for common AWS Console global variables
        const globalVars = [
          'window.AWS_CONSOLE_CONFIG',
          'window.awsConsoleConfig',
          'window.AWS_ACCOUNT_ID',
          'window.awsAccountId',
          'window.ACCOUNT_ID',
          'window.accountId',
          'window.AWS_USER_ARN',
          'window.awsUserArn',
          'window.USER_ARN',
          'window.userArn'
        ];

        for (const varPath of globalVars) {
          try {
            const value = this.getNestedProperty(window, varPath.replace('window.', ''));
            if (value) {
              
              // Extract account ID from various formats
              let accountId = null;
              let roleName = null;
              
              if (typeof value === 'string') {
                // Check if it's an ARN
                if (value.includes('arn:aws:sts::')) {
                  const arnMatch = value.match(/arn:aws:sts::(\d{12}):assumed-role\/(\w+)/);
                  if (arnMatch) {
                    accountId = arnMatch[1];
                    roleName = arnMatch[2];
                  }
                } else if (/^\d{12}$/.test(value)) {
                  accountId = value;
                }
              } else if (typeof value === 'object' && value !== null) {
                // Check object properties
                accountId = value.accountId || value.account_id || value.AccountId;
                roleName = value.roleName || value.role_name || value.RoleName;
                
                if (value.arn && typeof value.arn === 'string') {
                  const arnMatch = value.arn.match(/arn:aws:sts::(\d{12}):assumed-role\/(\w+)/);
                  if (arnMatch) {
                    accountId = arnMatch[1];
                    roleName = arnMatch[2];
                  }
                }
              }
              
              if (accountId && /^\d{12}$/.test(accountId)) {
                return {
                  accountId: accountId,
                  roleName: roleName,
                  region: this.getRegionFromPage(),
                  sessionValid: true
                };
              }
            }
          } catch (error) {
            // Ignore errors for non-existent properties
          }
        }
      } catch (error) {
      }

      return null;
    }

    getNestedProperty(obj, path) {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    }

    detectFromNetworkRequests() {
      // Method 6: Check for account info in network requests or responses
      try {
        // Look for account information in any data attributes or global state
        const dataAttributes = document.querySelectorAll('[data-account-id], [data-aws-account], [data-account]');
        
        for (const element of dataAttributes) {
          const accountId = element.getAttribute('data-account-id') || 
                           element.getAttribute('data-aws-account') || 
                           element.getAttribute('data-account');
          
          if (accountId && /^\d{12}$/.test(accountId)) {
            return {
              accountId: accountId,
              roleName: null,
              region: this.getRegionFromPage(),
              sessionValid: true
            };
          }
        }
      } catch (error) {
      }

      return null;
    }

    parseAccountFromElement(element) {
      const text = element.textContent || element.getAttribute('aria-label') || '';
      
      // Look for AWS account ID (12 digits)
      const accountMatch = text.match(/(\d{12})/);
      if (!accountMatch) return null;

      // Look for role name (various patterns)
      const rolePatterns = [
        /(\w+@\w+)/,                    // user@account
        /Role:\s*(\w+)/i,               // Role: AdminRole
        /role[:\s]+(\w+)/i,             // role: AdminRole
        /assumed-role[\/](\w+)/i,       // assumed-role/AdminRole
        /(\w+)\s*\(\d{12}\)/            // AdminRole (123456789012)
      ];

      let roleName = null;
      for (const pattern of rolePatterns) {
        const match = text.match(pattern);
        if (match) {
          roleName = match[1];
          break;
        }
      }

      return {
        accountId: accountMatch[1],
        roleName: roleName,
        region: this.getRegionFromPage(),
        sessionValid: true
      };
    }

    parseAccountFromMeta(element) {
      if (element.tagName === 'META') {
        const accountId = element.content;
        if (/^\d{12}$/.test(accountId)) {
          return {
            accountId: accountId,
            roleName: null,
            region: this.getRegionFromPage(),
            sessionValid: true
          };
        }
      } else if (element.tagName === 'SCRIPT') {
        try {
          const data = JSON.parse(element.textContent);
          if (data.accountId || data.account) {
            return {
              accountId: data.accountId || data.account,
              roleName: data.roleName || data.role,
              region: data.region || this.getRegionFromPage(),
              sessionValid: true
            };
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      return null;
    }

    getRegionFromPage() {
      // Extract region from URL
      const urlMatch = window.location.href.match(/[?&]region=([^&]+)/);
      if (urlMatch) {
        return decodeURIComponent(urlMatch[1]);
      }

      // Extract region from page elements
      const regionSelectors = [
        '[data-testid="region-selector"]',
        '.awsui-select-trigger[aria-label*="region"]',
        '[aria-label*="region"]',
        '.awsui-select-trigger .awsui-select-selected-option'
      ];

      for (const selector of regionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const region = element.textContent.trim();
          if (region && region.length > 0) {
            return region;
          }
        }
      }

      // Default region
      return 'us-east-1';
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Initialize session detection
  const detector = new AWSSessionDetector();
  
  // Add debug function to window for manual testing
  window.awsSSODebug = {
    detectSession: () => detector.detectSession(),
    debugPage: () => {
      const info = {
        url: window.location.href,
        title: document.title,
        elements: {},
        globalVars: {},
        accountIds: []
      };

      ['[data-testid*="account"]', '[aria-label*="account"]', '[title*="account"]',
       '.awsui-context-info', '.nav-account', '#nav-usernameMenu'].forEach(sel => {
        const count = document.querySelectorAll(sel).length;
        if (count) info.elements[sel] = count;
      });

      ['AWS_CONSOLE_CONFIG', 'awsConsoleConfig', 'AWS_ACCOUNT_ID', 'awsAccountId'].forEach(v => {
        if (window[v] !== undefined) info.globalVars[v] = window[v];
      });

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      const seen = new Set();
      let node;
      while (node = walker.nextNode()) {
        const matches = node.textContent.match(/\b(\d{12})\b/g);
        if (matches) matches.forEach(id => seen.add(id));
      }
      info.accountIds = Array.from(seen);

      return info;
    }
  };
  
  // Message handler for background script communication
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    
    switch (msg.type) {
      case "PING":
        // Simple ping to test if content script is responsive
        sendResponse({ success: true, ready: true, url: window.location.href });
        break;

      case "DETECT_SESSION":
        detector.detectSession().then(sessionInfo => {
          if (sessionInfo) {
            chrome.runtime.sendMessage({
              type: "AWS_ACCOUNT_INFO",
              payload: sessionInfo
            }, (response) => {
              sendResponse({ success: true, sessionInfo });
            });
          } else {
            sendResponse({ success: false, error: "No session detected" });
          }
        });
        return true; // Keep message channel open for async response

      case "REFRESH_SESSION":
        detector.detectSession().then(sessionInfo => {
          if (sessionInfo) {
            chrome.runtime.sendMessage({
              type: "REFRESH_SESSION",
              payload: sessionInfo
            }, (response) => {
              sendResponse({ success: true });
            });
          } else {
            sendResponse({ success: false });
          }
        });
        return true; // Keep message channel open for async response

      default:
        sendResponse({ error: "Unknown message type" });
    }
  });
  
  detector.detectSession().then(sessionInfo => {
    if (sessionInfo) {
      chrome.runtime.sendMessage({ type: "AWS_ACCOUNT_INFO", payload: sessionInfo }).catch(() => {});
    }
  }).catch(() => {});

  // Also run detection when page content changes (for SPA navigation)
  let lastUrl = window.location.href;
  let detectionTimeout = null;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      
      // Clear any pending detection
      if (detectionTimeout) {
        clearTimeout(detectionTimeout);
      }
      
      // Debounce detection calls
      detectionTimeout = setTimeout(() => {
        detector.detectSession().then(sessionInfo => {
          if (sessionInfo) {
            chrome.runtime.sendMessage({ type: "AWS_ACCOUNT_INFO", payload: sessionInfo }).catch(() => {});
          }
        });
      }, 1000);
    }
  });

  // Start observing when DOM is ready
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
})();