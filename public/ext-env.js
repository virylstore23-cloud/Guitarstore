/** Sets a global flag telling us if we’re running inside a Chrome extension. */
window.__IS_EXTENSION__ =
  typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id ||
  location.protocol === 'chrome-extension:';
