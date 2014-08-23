(function(global) {

var webVRHelper = {};

// hmd - the WebVR hmd object
webVRHelper.hmd = null;

var sensor;


// init( func ) - init VR devices, must be called first
//
// func - function that will be called on init complete

webVRHelper.init = function(func) {
  navigator.getVRDevices().then(function(vrDevs) {

    // get HMD
    for (var i = 0; i < vrDevs.length; i++) {
      if (vrDevs[i] instanceof HMDVRDevice) {
        webVRHelper.hmd = vrDevs[i];
        break;
      }
    }
    if (!webVRHelper.hmd) {
      alert('Cannot find HMD');
      return;
    }

    // get HMD's sensor
    for (var i = 0; i < vrDevs.length; i++) {
      if (vrDevs[i] instanceof PositionSensorVRDevice &&
          vrDevs[i].hardwareUnitId == webVRHelper.hmd.hardwareUnitId) {
        sensor = vrDevs[i];
        break;
      }
    }
    if (!sensor) {
      alert('Cannot find position sensor for HMD ' +
            webVRHelper.hmd.hardwareUnitId);
      return;
    }

    // call callback
    func();
  });
}


// resetHmdSensor() - reset the HMD's position and orientation sensors

webVRHelper.resetHmdSensor = function() {sensor.resetSensor();}


// createEyeCameras( view ) - create the cameras that capture the avatar's view
//
// view - THREE.Object3D that represents the avatar's view or head

webVRHelper.createEyeCameras = function(view) {
  if (!THREE.PerspectiveCamera) {
    console.log('three.js not found');
    return;
  }
  if (!(view instanceof THREE.Object3D)) {
    console.log('Invalid parameters');
    return;
  }
  if (!webVRHelper.hmd) {
    console.log('VR devices not initialized');
    return;
  }

  createCamera('left');
  createCamera('right');

  function createCamera(eye) {
    var camera = new THREE.PerspectiveCamera(75, 4/3, 0.1, 1000);
    camera.name = eye + 'Camera';
    camera.projectionMatrix =
      FovToProjection(webVRHelper.hmd.getRecommendedEyeFieldOfView(eye));
    var eyePos = webVRHelper.hmd.getEyeTranslation(eye);
    camera.position.sub(eyePos);
    view.add(camera);
  }
}


// animate( scene, view, perFrame, stereoMaps ) - start the main animation loop
//
// scene - the THREE.Scene to be animated
// view - the THREE.Object3D that represents the avatar's view or head
// perFrame - your game's logic function to be called on every frame
// stereoMaps - array of stereoMap objects, for stereoscopic images in the scene

webVRHelper.animate = function(scene, view, perFrame, stereoMaps) {
  if (!THREE.WebGLRenderer || !THREE.PerspectiveCamera) {
    console.log('three.js not found');
    return;
  }
  if (!(scene instanceof THREE.Scene || !(view instanceof THREE.Object3D))) {
    console.log('Invalid parameters');
    return;
  }
  if (!webVRHelper.hmd || !sensor) {
    console.log('VR devices not initialized');
    return;
  }

  var eyeCameras = [view.getObjectByName('leftCamera'),
                    view.getObjectByName('rightCamera')];

  // create renderer
  var renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.enableScissorTest(true);
  document.body.appendChild(renderer.domElement);

  // put image on VR display when clicked (Chrome won't let us go fullscreen
  // without a click)
  document.addEventListener('click', function() {
    renderer.domElement.webkitRequestFullscreen({vrDisplay: webVRHelper.hmd});
  });
  document.addEventListener('webkitfullscreenchange', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, false);

  // and we're off!
  animate();


  // animation function called every frame

  var devPos = new THREE.Vector3();
  var devRot = new THREE.Quaternion();

  function animate() {
    requestAnimationFrame(animate);

    // undo device's last position/orientation
    view.position.sub(devPos);
    view.quaternion.multiply(devRot.inverse());

    // save device's current position/orientation
    var state = sensor.getState();
    devPos.set(state.position.x, state.position.y, state.position.z);
    devRot.set(state.orientation.x, state.orientation.y,
               state.orientation.z, state.orientation.w);

    // apply device's current position/orientation
    view.position.add(devPos);
    view.quaternion.multiply(devRot);

    // if user provided a game logic function, call it now
    if (typeof perFrame === 'function') {
      perFrame();
    }

    // set left stereo maps and render
    if (stereoMaps) {
      for (var index = 0; index < stereoMaps.length; index++) {
        stereoMaps[index].material.map = stereoMaps[index].eyeTextures[0];
      }
    }
    renderer.setScissor(0, 0, window.innerWidth/2, window.innerHeight);
    renderer.setViewport(0, 0, window.innerWidth/2, window.innerHeight);
    renderer.render(scene, eyeCameras[0]);

    // set right stereo maps and render
    if (stereoMaps) {
      for (var index = 0; index < stereoMaps.length; index++) {
        stereoMaps[index].material.map = stereoMaps[index].eyeTextures[1];
      }
    }
    renderer.setScissor(window.innerWidth/2, 0,
                        window.innerWidth/2, window.innerHeight);
    renderer.setViewport(window.innerWidth/2, 0,
                         window.innerWidth/2, window.innerHeight);
    renderer.render(scene, eyeCameras[1]);

  }

}

global.webVRHelper = webVRHelper;

}) (window);
