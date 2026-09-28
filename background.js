chrome.action.onClicked.addListener(() => {
  // open a new tab
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});