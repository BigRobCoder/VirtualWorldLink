// in the future, VWL should have a permanent extension ID, but for now we must
// find it every time
var vwlId = undefined;

// listen for messages from extension
chrome.runtime.onMessage.addListener(handleExtensionMessage);
if (chrome.runtime.onMessageExternal) {
  chrome.runtime.onMessageExternal.addListener(handleExtensionMessage);
}
function handleExtensionMessage(request, sender) {
  // in the future, we will not need this
  if (!vwlId && request.vwlId) {
    vwlId = request.vwlId;
    return;
  }

  if (sender.id != vwlId)
    return;

  request.fromExtension = true;
  window.postMessage(request, '*');
}

// listen for messages from page
window.addEventListener('message', function(message) {
  // only accept messages from this page
  if (message.source != window || message.data.fromExtension)
    return;

  // send message to extension
  chrome.runtime.sendMessage(vwlId, message.data);
});
