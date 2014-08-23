
var vwlWindowId = null;
var vwlBookmarkFolderId = null;

// information about each VWL tab
var tabInfoArray = [];

// tab ID of tab that is creating a child tab
var createTabId = null;

//
// main loop: process messages from tabs/extensions
//

chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onMessageExternal.addListener(handleMessage);
function handleMessage(message, sender) {

  // in the future, we may verify exension ID here
  if (sender.tab.windowId != vwlWindowId)
    return;

  var tabInfo = tabInfoArray[sender.tab.index - 1];

  // message.info -- object (tab info)
  //   tab is advestising its info
  if (typeof message.info === 'object') {

    // save tab info
    tabInfo.info = message.info;

    for (var index = 0; index < tabInfoArray.length; index++) {
      var curTabInfo = tabInfoArray[index];
      var toSend = {};

      // send tab info to any tab that has requested it
      if (curTabInfo.urlAttachTbl[tabInfo.url]) {
        toSend.tabInfo = {url:tabInfo.url, loaded:true, info:tabInfo.info};
      }

      // send updated loaded list to any tab that has requested it
      if (curTabInfo.getLoadedList) {
        toSend.loadedList = buildLoadedList(curTabInfo.url);
      }

      if (toSend) {
        sendMessageToTab(curTabInfo, toSend);
      }
    }
  }

  // message.getInfo -- string (url)
  //   tab is requesting info on another tab
  if (typeof message.getInfo === 'string') {

    // save that this tab wants updates on the requested tab
    tabInfo.urlAttachTbl[message.getInfo] = true;

    // send the requested tab info
    var targetTabInfo = null;
    for (var index = 0; index < tabInfoArray.length; index++) {
      if (tabInfoArray[index].url == message.getInfo) {
        targetTabInfo = tabInfoArray[index];
        break;
      }
    }
    if (targetTabInfo) {
      sendMessageToTab(tabInfo, 
                       {tabInfo:{url:targetTabInfo.url, loaded:true,
                                 info:targetTabInfo.info}});
    }
  }

  // message.getLoadedList -- boolean (tab wants loaded list updates)
  //   tab is requesting the list of loaded tabs
  if (typeof message.getLoadedList === 'boolean') {

    // save whether the tab wants updates on the loaded list
    tabInfo.getLoadedList = message.getLoadedList;

    // send loaded list to tab
    if (message.getLoadedList) {
      sendMessageToTab(tabInfo,
                       {loadedList:buildLoadedList(tabInfo.url)});
    }
  }

  // message.open -- string (url)
  //   tab wants to open a child tab
  //   only allowed if tab is active and not a child
  if (sender.tab.active && !tabInfo.parent && createTabId == null &&
      typeof message.open === 'string') {

    // close current child if it exists
    for (var index = 0; index < tabInfoArray.length; index++) {
      if (tabInfoArray[index].parent == tabInfo.id) {
        closeTab(tabInfoArray[index].id);
        break;
      }
    }

    // create child
    createTabId = tabInfo.id;
    chrome.tabs.create({windowId:vwlWindowId, url:message.open, active:false});
  }

  // message.navigate -- string (url)
  //   tab is requesting to change active tab
  //   only allowed if tab is active
  if (sender.tab.active && typeof message.navigate === 'string') {

    // activate tab if it exists
    var id;
    for (var index = 0; index < tabInfoArray.length; index++) {
      if (tabInfoArray[index].url == message.navigate) {
        id = tabInfoArray[index].id;
        break;
      }
    }
    if (id) {
      chrome.tabs.update(id, {active:true});
    }
  }
}

chrome.browserAction.onClicked.addListener(function() {

  // create VWL window
  chrome.windows.create({url:'ctrl/ctrl.html'}, function(win) {
    vwlWindowId == win.id;
    tabInfoArray = [];
  });

});

chrome.tabs.onCreated.addListener(function(tab) {
  if (tab.windowId == vwlWindowId && tab.index != 0) {

    // cache tab info
    var tabInfo = {id:tab.id, url:tab.url, info:null,
                   getLoadedList:false, urlAttachTbl:{},
                   parent:createTabId};
    tabInfoArray.push(tabInfo);
    createTabId = null;

    // run message relay script in tab
    if (tab.url.indexOf('chrome-extension:') != 0) {
      chrome.tabs.executeScript(
        tab.id,
        {file:'message-relay.js', runAt:'document_start'},
        // in the future, VWL will have a permanent extension ID, but for now we
        // must send it to the tab every time
        function() {
          sendMessageToTab(tabInfo, {vwlId:chrome.runtime.id});
        });
    }
  }
});
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  if (removeInfo.windowId == vwlWindowId) {
    closeTab(tabId);
  }
});

// in the future, we will not need this
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.windowId == vwlWindowId && tab.index != 0 &&
      tab.url.indexOf('chrome-extension:') == 0 &&
      changeInfo.status == 'complete') {
    for (var tabIndex = 0; tabIndex < tabInfoArray.length; tabIndex++) {
      if (tabInfoArray[tabIndex].id == tabId) {
        sendMessageToTab(tabInfoArray[tabIndex], {vwlId:chrome.runtime.id});
      }
      break;
    }
  }
});

// get VWL bookmark list
chrome.bookmarks.getTree(function(bookmarkTree) {
  for (var index = 0; index < bookmarkTree.length; index++) {
    searchNode(bookmarkTree[index]);
    if (vwlBookmarkFolderId) {
      return;
    }
  }
  function searchNode(node) {
    if (node.title == 'vwl_worlds' && node.children) {
      vwlBookmarkFolderId = node.id;
      return;
    }
    if (!node.children)
      return;
    for (var index = 0; index < node.children.length; index++) {
      searchNode(node.children[index]);
      if (vwlBookmarkFolderId)
        return;
    }
  }
});

chrome.bookmarks.onCreated.addListener(function(id, bookmark) {

  // tab is no longer a child
  if (bookmark.parentId == vwlBookmarkFolderId) {
    for (var index = 0; index < tabInfoArray.length; index++) {
      if (tabInfoArray[index].url == bookmark.url) {
        tabInfoArray[index].parent = null;
      }
    }
  }
});

// helper functions

function sendMessageToTab(tabInfo, message) {
  if (tabInfo.url.indexOf('chrome-extension:') == 0) {
    chrome.runtime.sendMessage(
      tabInfo.url.substr(19, tabInfo.url.indexOf('/', 19) - 19), message);
  }
  else {
    chrome.tabs.sendMessage(tabInfo.id, message);
  }
}

function closeTab(tabId) {
  var tabIndex;
  var tabInfo;
  for (tabIndex = 0; tabIndex < tabInfoArray.length; tabIndex++) {
    if (tabInfoArray[tabIndex].id == tabId) {
      tabInfo = tabInfoArray[tabIndex];
      tabInfoArray.splice(tabIndex, 1);
      break;
    }
  }

  // close child tab
  for (var index = 0; index < tabInfoArray.length; index++) {
    if (tabInfoArray[index].parent == tabInfo.id) {
      closeTab(tabInfoArray[index].id);
      break;
    }
  }

  // inform other tabs that this tab is gone
  for (var index = 0; index < tabInfoArray.length; index++) {
    var curTabInfo = tabInfoArray[index];
    var message = {};
    if (curTabInfo.urlAttachTbl[tabInfo.url] === true) {
      message.tabInfo = {url:tabInfo.url, loaded:false};
    }
    if (curTabInfo.getLoadedList === true) {
      message.loadedList = buildLoadedList(curTabInfo.url);
    }
    if (message) {
      sendMessageToTab(curTabInfo, message);
    }
  }
}

function buildLoadedList(url) {
  var loadedList = [];
  for (var index = 0; index < tabInfoArray.length; index++) {
    if (tabInfoArray[index].url !== url) {
      loadedList.push(tabInfoArray[index].url);
    }
  }
  return loadedList;
}
