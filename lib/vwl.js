(function(global) {

var vwl = {};

var receivePoster;
var receiveEntry;
var receiveLoadedList;

// vwl.init - advertise VWL info and register for VWL messages
//
// Parameters:
//   left - (optional) url of this world's initial left entry image
//   right - (optional) url of this world's initial right entry image
//   receivePosterFunc - (optional) function to handle poster images from other
//     worlds
//   receiveEntryFunc - (optional) function to handle entry images from other
//     worlds
//   recevieLoadedListFunc - (optional) function to handle list of loaded worlds
vwl.init = function(left, right,
                    receivePosterFunc,
                    receiveEntryFunc,
                    receiveLoadedListFunc) {
  receivePoster = receivePosterFunc;
  receiveEntry = receiveEntryFunc;
  receiveLoadedList = receiveLoadedListFunc;

  receiveEntry && window.addEventListener('message', function(message) {

    if (message.source != window || message.origin != window.location.origin)
      return;

    if (message.data.tabInfo) {
      var left = null;
      var right = null;
      if (message.data.tabInfo.info && message.data.tabInfo.info.entry_image) {
        left = message.data.tabInfo.info.entry_image.left_src;
        right = message.data.tabInfo.info.entry_image.right_src;
      }
      receiveEntry(message.data.tabInfo.url, message.data.tabInfo.loaded,
                   left, right);
    }

    if (message.data.loadedList !== undefined) {
      receiveLoadedList(message.data.loadedList);
    }

  }, false);
  window.postMessage({info:{entry_image:{
    left_src:left, right_src:right}}}, '*');
}

// vwl.getInfo - get info (entry image and poster image) on a specific world
//
// Parameters:
//   url - url of worlds to get info on
//   getPoster - (optional) if true get the poster image
vwl.getInfo = function(url, getPoster) {
  if (receivePoster && getPoster) {
    var request = new XMLHttpRequest();
    var dir = url.substr(0, url.lastIndexOf('/') + 1);
    request.open('GET', dir + 'vwl_info.json');
    request.onreadystatechange = function() {
      if (request.readyState == 4 && request.status == 200) {
        var poster = JSON.parse(request.responseText).poster_image;
        receivePoster(url,
                      poster.left_src ? dir + poster.left_src : null,
                      poster.right_src ? dir + poster.right_src : null,
                      poster._2d_src ? dir + poster._2d_src : null);
      }
      else {
        receivePoster(url);
      }
    }
    request.send(null);
  }
  receiveEntry && window.postMessage({getInfo:url}, '*');
}

// vwl.getLoadedList - get the list of loaded worlds
vwl.getLoadedList = function() {
  window.postMessage({getLoadedList:true}, '*');
}

// vwl.open - load world
//
// Parameters:
//   url - url of world to open
vwl.open = function(url) {
  window.postMessage({open:url}, '*');
}

// vwl.navigate - navigate to a world
//
// Parameters:
//   left - (optional) new left entry image for current world
//   right - (optional) new right entry image for current world
//   url - url of world to navigate to 
vwl.navigate = function(left, right, url) {
  var message = {navigate:url};
  if (left && right) {
    message.info = {entry_image:{left_src:left, right_src:right}};
  }
  window.postMessage(message, '*');
}

global.vwl = vwl;

}) (window);
