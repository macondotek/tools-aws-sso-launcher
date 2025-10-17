# Storage Quota Guide

## Issue: Chrome Storage Quota Exceeded

### Error Message

```
Unchecked runtime.lastError: Resource::kQuotaBytesPerItem quota exceeded
```

### What This Means

Chrome's `chrome.storage.sync` has a limit of **8,192 bytes (8KB)** per item. Your AWS SSO configuration is too large to fit in this limit.

### Solution Implemented

The extension now automatically handles this by:

1. **Size Detection**: Checks if configuration exceeds 8KB limit
2. **Compression**: Removes comments and whitespace to reduce size
3. **Storage Fallback**: Uses `chrome.storage.local` for large configurations
4. **Dual Loading**: Checks both sync and local storage when loading

### Storage Types

#### `chrome.storage.sync` (8KB limit)

- **Pros**: Syncs across devices, persists across browser restarts
- **Cons**: Small size limit
- **Use**: Small configurations only

#### `chrome.storage.local` (No practical limit)

- **Pros**: Large size limit, fast access
- **Cons**: Device-specific, lost if browser data is cleared
- **Use**: Large configurations

### Configuration Size Optimization

#### Automatic Compression

The extension automatically compresses configurations by:

- Removing comments (lines starting with `#`)
- Removing empty lines
- Trimming whitespace

#### Manual Optimization Tips

1. **Remove Comments**: Delete unnecessary comment lines
2. **Minimize Whitespace**: Use single spaces instead of multiple
3. **Short Names**: Use shorter account aliases
4. **Split Configuration**: Consider splitting into multiple organizations

### Example Size Reduction

**Before Compression (Large):**

```ini
###################################################
### ORG Defaults to support multiple Orgs later on
##################################################
[Corpay] 
organization = true
region = us-east-1
roleName = FC-Admin
baseURL = https://d-906755a708.awsapps.com
default = true

#########################################
### CorpayComplete#######################
#########################################
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete
```

**After Compression (Smaller):**

```ini
[Corpay]
organization = true
region = us-east-1
roleName = FC-Admin
baseURL = https://d-906755a708.awsapps.com
default = true
[Accrulify]
aws_account_id = 415867864530
defaults = Corpay
group = CorpayComplete
```

### Status Messages

 The extension will show different status messages:

- `Configuration saved successfully ✓ (5KB)` - Small config, synced
- `Configuration saved successfully ✓ (12KB, using local storage)` - Large config, local storage
- `Configuration saved successfully ✓ (10KB, using local storage (compressed))` - Compressed large config

### Migration Handling

The extension automatically:

1. Tries to load from `chrome.storage.sync` first
2. Falls back to `chrome.storage.local` if sync is empty
3. Handles both old and new configuration formats
4. Migrates legacy configurations automatically

### Best Practices

1. **Keep Organizations Minimal**: Only include necessary organization properties
2. **Use Short Aliases**: Shorter account names reduce configuration size
3. **Remove Unused Accounts**: Delete accounts you no longer need
4. **Monitor Size**: Check the status message to see actual configuration size

### Troubleshooting

If you still encounter issues:

1. **Check Configuration Size**: Look at the status message after saving
2. **Try Manual Compression**: Remove comments and extra whitespace
3. **Split Organizations**: Consider using multiple organization configurations
4. **Clear Storage**: Use Chrome DevTools to clear storage if corrupted

### Technical Details

- **Sync Storage Limit**: 8,192 bytes per item
- **Local Storage Limit**: ~10MB total (practically unlimited for configs)
- **Compression Ratio**: Typically 30-50% size reduction
- **Fallback Logic**: Automatic detection and switching between storage types
