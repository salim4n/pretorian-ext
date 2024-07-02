chrome.webNavigation.onCompleted.addListener(function(details) {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['content.js']
    });
}, { url: [{ urlMatches: '<all_urls>' }] });

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
    }
});
