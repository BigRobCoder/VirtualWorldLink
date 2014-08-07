// init vr.js
vr.load(function(error) {
  if (error) {
    window.alert('VR error:\n' + error.toString());
  }
});

// global vars
var state = new vr.State();
var unityEmbed;
window.addEventListener('load', function() {
  unityEmbed = document.getElementById('UnityEmbed');
  unityEmbed.focus();
}, false);
var pendingImageReqs = {};
var loadedListHdlr;

function unityMessageProcess(messageStr) {
  var currIndex;
  var nextSep;

  // sometimes Unity sends multiple messages concatenated together with ';' as
  // the seperator, so we need to go through the concatenated messages one by
  // one
  for (currIndex = 0; currIndex < messageStr.length; currIndex = nextSep+1) {
    nextSep = messageStr.length;
    var vwlSep = messageStr.indexOf(';VWL', currIndex);
    if (vwlSep != -1 && vwlSep < nextSep)
      nextSep = vwlSep;
    var ovrSep = messageStr.indexOf(';OVR', currIndex);
    if (ovrSep != -1 && ovrSep < nextSep)
      nextSep = ovrSep;
    // console.log(messageStr.substring(currIndex, nextSep));

    // VWL_Init(left, right) - call vwl.init
    //   left - url of left entry image
    //   right - url of right entry image
    if (messageStr.indexOf('VWL_Init(', currIndex) == currIndex) {
      var args = messageStr.substring(currIndex+9, nextSep-1).split('|');
      var dir = document.URL.substr(0, document.URL.lastIndexOf('/') + 1);
      vwl.init(dir + args[0], dir + args[1],
      function(url, left, right, _2d) {
        callback(pendingImageReqs[url] + '.ReceivePoster', [left, right, _2d]);
      }, function(id, loaded, left, right) {
        if (loaded) {
          callback(pendingImageReqs[id] + '.ReceiveEntryImage', [left, right]);
        }
        else {
          callback(pendingImageReqs[id] + '.RemoveImage', []);
        }
      }, function(loadedList) {
        if (loadedListHdlr) {
          callback(loadedListHdlr + '.ReceiveLoadedList', loadedList);
        }
      });
    }

    // VWL_GetInfo(url, gameObject) - call vwl.getInfo
    //   url - url of world to get info about
    //   gameObject - gameObject which must implement the following functions:
    //     ReceivePoster(left, right, _2d)
    //     ReceiveEntryImage(left, right)
    //     RemoveImage()
    else if (messageStr.indexOf('VWL_GetInfo(', currIndex) == currIndex) {
      var args = messageStr.substring(currIndex+12, nextSep-1).split('|');
      pendingImageReqs[args[0]] = args[1];
      vwl.getInfo(args[0], true);
    }

    // VWL_GetLoadedList(gameObject) - call vwl.getLoadedList
    //   gameObject - gameObject which must implement
    //     ReceiveLoadedList(loadedList)
    else if (messageStr.indexOf('VWL_GetLoadedList(', currIndex) == currIndex) {
      var arg = messageStr.substring(currIndex+18, nextSep-1);
      loadedListHdlr = arg;
      vwl.getLoadedList();
    }

    // VWL_Open(url) - call vwl.open
    //   url - url of world to open
    else if (messageStr.indexOf('VWL_Open(', currIndex) == currIndex) {
      var arg = messageStr.substring(currIndex+9, nextSep-1);
      vwl.open(arg);
    }

    // VWL_Navigate(left, right, url) - call vwl.navigate
    //   left - left entry image url
    //   right - right entry imaghe url
    //   url - url to navigate to
    else if (messageStr.indexOf('VWL_Navigate(', currIndex) == currIndex) {
      var args = messageStr.substring(currIndex+13, nextSep-1).split('|');
      vwl.navigate(args[0], args[1], args[2]);
    }

    // OVR_Init() - get HMD info
    else if (messageStr.indexOf('OVR_Init(', currIndex) == currIndex) {
      if (!vr.pollState(state)) {
        console.log('NPVR plugin not found/error polling');
      }
      else if (!state.hmd.present) {
        console.log('HMD not present');
      }
      else {
        var hmdInfo = vr.getHmdInfo();
        if (!hmdInfo) {
          console.log('Could not get HMD info');
        }
        else {
          callback('OVRCameraController.Init_Callback',
                   [hmdInfo.deviceName,
                    hmdInfo.resolutionHorz,
                    hmdInfo.resolutionVert,
                    hmdInfo.screenSizeHorz,
                    hmdInfo.screenSizeVert,
                    hmdInfo.screenCenterVert,
                    hmdInfo.eyeToScreenDistance,
                    hmdInfo.lensSeparationDistance,
                    hmdInfo.distortionK[0],
                    hmdInfo.distortionK[1],
                    hmdInfo.distortionK[2],
                    hmdInfo.distortionK[3]]);
        }
      }
    }

    // OVR_Update() - check if HMD is still present
    else if (messageStr.indexOf('OVR_Update(', currIndex) == currIndex) {
      var ok = 0;

      if (!vr.pollState(state)) {
        console.log('NPVR plugin not found/error polling');
      }
      else if (!state.hmd.present) {
        console.log('HMD not present');
      }
      else {
        ok = 1;
      }

      // for now, don't check for latency tester
      callback('OVRCameraController.Update_Callback', [ok, ok, 0]);
    }

    // OVR_GetSensorOrientation(sensor, callback) - get HMD rotation
    //   sensor - sensor ID
    //   callback - callback function for HMD rotation
    //      params - sensorId, status, rotation
    else if (messageStr.indexOf('OVR_GetSensorOrientation(',
                                currIndex) == currIndex) {
      var args = messageStr.substring(currIndex+25, nextSep-1).split('|');
      var ok = false;

      if (args[0] == 0) {
        if (!vr.pollState(state, (args[1] == 'True'))) {
          console.log('NPVR plugin not found/error polling');
        }
        else if (!state.hmd.present) {
          console.log('HMD not present');
        }
        else {
          ok = true;
        }
      }

      if (!ok) {
        callback(args[2], [args[0], false]);
      }
      else {
        callback(args[2], [args[0], true,
                 state.hmd.rotation[3], state.hmd.rotation[0],
                 state.hmd.rotation[1], state.hmd.rotation[2]]);
      }
    }

    // OVR_SetSensorPredictionTime(sensor, time) - set HMD prediction time
    //   sensor - sensor ID
    //   time - prediction time
    else if (messageStr.indexOf('OVR_SetSensorPredictionTime(',
                                currIndex) == currIndex) {
      var args = messageStr.substring(currIndex+28, nextSep-1).split('|');
      if (args[0] == 0) {
        vr.setHmdPredictionTime(args[1]);
      }
    }

    // OVR_SetSensorAccelGain(sensor, gain) - set HMD acceleration gain
    //   sensor - sensor ID
    //   gain - acceleration gain
    else if (messageStr.indexOf('OVR_SetSensorAccelGain(',
                                currIndex) == currIndex) {
      var args = messageStr.substring(currIndex+23, nextSep-1).split('|');
      if (args[0] == 0) {
        vr.setHmdAccelGain(args[1]);
      }
    }

    else {
      console.log('unknown message \"' +
                  messageStr.substr(currIndex, nextSep) + '\"');
    }
  }
}

// helper functions

function callback(message, args, stringify) {
  message += '(';
  for (var i = 0; i < args.length; i++ ) {
    if (stringify && stringify[i])
      message += JSON.stringify(args[i]);
    else
      message += args[i];
    if (i != args.length-1) {
      message += '|';
    }
  }
  message += ')';
  // console.log('callback ' + message);
  unityEmbed.postMessage(message);
}
