# Browser Extensions Troubleshooting Guide

This document explains console errors that may appear when using the Sphyra Wellness PWA with certain browser extensions installed.

## Common Browser Extension Errors

### ❌ Chrome Extension Resource Loading Errors

**Example Error:**
```
Denying load of chrome-extension://gomekmidlodglbbmalcneegieacbdmki/client/gpcWindowSetting.js.
Resources must be listed in the web_accessible_resources manifest key in order to be loaded by pages outside the extension.
```

**What it means:**
A browser extension (often privacy-related extensions like GPC/Global Privacy Control) is trying to inject scripts into the web page but has incorrect configuration in its manifest.

**Impact:** None on the Sphyra Wellness app - this is purely an issue with the extension itself.

**Solution:**
- These errors are harmless to the app
- You can ignore them or disable/update the problematic extension
- Common extensions causing this: Privacy Badger, GPC extensions, various tracking blockers

---

### ❌ Invalid Extension URL Error

**Example Error:**
```
GET chrome-extension://invalid/ net::ERR_FAILED
```

**What it means:**
An extension is trying to load resources from an invalid chrome-extension:// URL.

**Impact:** None on the Sphyra Wellness app.

**Solution:** Same as above - ignore or disable the extension causing the issue.

---

### ❌ Message Port Closed Error

**Example Error:**
```
Unchecked runtime.lastError: The message port closed before a response was received.
```

**What it means:**
Browser extension communication failed. This commonly happens when:
- Extensions are being updated/reloaded
- Extension background scripts restart
- Page navigation interrupts extension messaging

**Impact:** None on the Sphyra Wellness app.

**Solution:** This is a transient error and can be safely ignored.

---

### ❌ Extension Content Script Errors

**Example Error:**
```
jQuery.Deferred exception: Cannot read properties of null (reading 'indexOf')
TypeError: Cannot read properties of null (reading 'indexOf') at contentScript.js:2:965733
```

**What it means:**
A browser extension's content script (often from password managers, ad blockers, or other utility extensions) has a bug.

**Impact:** None on the Sphyra Wellness app - the extension's functionality may be affected but not your app.

**Solution:**
- These are bugs in the extension itself
- Report to the extension developer if it causes issues
- Can be safely ignored if not causing problems

---

## How to Identify Browser Extension Errors

Browser extension errors can be identified by:

1. **Extension IDs in the error**: Look for `chrome-extension://[ID]/` in the error message
2. **File paths**: Errors referencing `contentScript.js`, `background.js`, or other extension-specific files
3. **Source location**: Check the source of the error in DevTools - if it's from a `chrome-extension://` URL, it's not from the app

## Testing Without Extensions

To verify that errors are from extensions and not the app:

1. Open an incognito/private window (extensions are usually disabled there)
2. Or temporarily disable all extensions in Chrome: `chrome://extensions/`
3. Reload the Sphyra Wellness PWA
4. Check if the errors still appear

## Actual App Errors vs Extension Errors

### ✅ Fixed: PouchDB Plugin Import Error

**Previous Error:**
```
Uncaught TypeError: Class extends value [object Object] is not a constructor or null
    at pouchdb-browser.js:427
```

**Fix Applied:**
Changed from dynamic import handling to direct import in `src/utils/pouchdbSync.ts`:

```typescript
// Before (incorrect)
import * as PouchDBFindModule from 'pouchdb-find';
const PouchDBFind = (PouchDBFindModule as any).default || PouchDBFindModule;
PouchDB.plugin(PouchDBFind);

// After (correct)
import PouchDBFind from 'pouchdb-find';
PouchDB.plugin(PouchDBFind);
```

This was an actual app error and has been resolved.

---

## Summary

Most console errors you see are likely from browser extensions, not the Sphyra Wellness app:

- ✅ **Can be ignored**: Extension resource loading errors, invalid extension URLs, message port errors
- ⚠️ **App-related**: Errors from files in `/src/` directory or build artifacts
- 🔧 **Fixed**: PouchDB plugin import issue

When troubleshooting, always check if errors originate from `chrome-extension://` URLs before assuming they're app-related.
