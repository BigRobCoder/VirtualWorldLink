webVRHelper.init(function() {

  var scene = new THREE.Scene();

  //
  // create room
  //

  var length = 4;
  var gridColor = new THREE.Color(0x406000);
  createWall(0, 0.5, -0.5, 0, 0, 0); // front
  createWall(0.5, 0.5, 0, 0, -0.5, 0); // right
  createWall(0, 0.5, 0.5, 0, 1.0, 0); // back
  createWall(-0.5, 0.5, 0, 0, 0.5, 0); // left
  createWall(0, 1, 0, 0.5, 0, 0); // ceiling

  function createWall(posX, posY, posZ, rotX, rotY, rotZ) {
    var grid = new THREE.GridHelper(length/2, length/16);
    grid.setColors(gridColor, gridColor);
    grid.position.set(posX*length, posY*length, posZ*length);
    grid.rotation.set((rotX+0.5)*Math.PI, rotZ*Math.PI, rotY*Math.PI);
    scene.add(grid);
  }

  // create floor
  /* black smear is ruining this floor :(
  var geometry = new THREE.PlaneGeometry(length, length);
  var material = new THREE.MeshBasicMaterial({color:0x060900});
  var mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(-0.5 * Math.PI, 0, 0);
  scene.add(mesh);
  */
  createWall(0, 0, 0, -0.5, 0, 0);

  //
  // create screen
  //

  var ctrlCanvas = document.createElement('canvas');
  ctrlCanvas.width = 320;
  ctrlCanvas.height = 400;
  var ctrlContext = ctrlCanvas.getContext('2d');
  var ctrlTexture = new THREE.Texture(ctrlCanvas);
  var geometry = new THREE.PlaneGeometry(1, 1);
  var material = new THREE.MeshBasicMaterial({map:ctrlTexture});
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 1.35, -1.0);
  scene.add(mesh);

  // init vars
  var bookmarkFolderId = undefined;
  chrome.bookmarks.getTree(function(bookmarkTree) {
    for (var index = 0; index < bookmarkTree.length; index++) {
      searchNode(bookmarkTree[index]);
      if (bookmarkFolderId) {
        registerScreenUpdates();
        return;
      }
    }
    updateScreen('Could not find bookmark folder \'vwl_worlds\'');

    function searchNode(node) {
      if (node.title == 'vwl_worlds' && node.children) {
        bookmarkFolderId = node.id;
        return;
      }
      if (!node.children)
        return;
      for (var index = 0; index < node.children.length; index++) {
        searchNode(node.children[index]);
        if (bookmarkFolderId)
          return;
      }
    }
  });
  var minus1 = document.createElement('img');
  minus1.src = 'minus1.png';
  var minus1Loaded = false;
  minus1.onload = function () {
    minus1Loaded = true;
    registerScreenUpdates();
  };
  var minus2 = document.createElement('img');
  minus2.src = 'minus2.png';
  var minus2Loaded = false;
  minus2.onload = function() {
    minus2Loaded = true;
    registerScreenUpdates();
  };
  var plus1 = document.createElement('img');
  plus1.src = 'plus1.png';
  var plus1Loaded = false;
  plus1.onload = function() {
    plus1Loaded = true;
    registerScreenUpdates();
  };
  var plus2 = document.createElement('img');
  plus2.src = 'plus2.png';
  var plus2Loaded = false;
  plus2.onload = function() {
    plus2Loaded = true;
    registerScreenUpdates();
  };
  var arrow1 = document.createElement('img');
  arrow1.src = 'arrow1.png';
  var arrow1Loaded = false;
  arrow1.onload = function() {
    arrow1Loaded = true;
    registerScreenUpdates();
  };
  var arrow2 = document.createElement('img');
  arrow2.src = 'arrow2.png';
  var arrow2Loaded = false;
  arrow2.onload = function() {
    arrow2Loaded = true;
    registerScreenUpdates();
  };
  var star1 = document.createElement('img');
  star1.src = 'star1.png';
  var star1Loaded = false;
  star1.onload = function() {
    star1Loaded = true;
    registerScreenUpdates();
  };
  var star2 = document.createElement('img');
  star2.src = 'star2.png';
  var star2Loaded = false;
  star2.onload = function() {
    star2Loaded = true;
    registerScreenUpdates();
  };

  var ctrlScreenTabId = undefined;
  chrome.tabs.getCurrent(function(tab) {
    ctrlScreenTabId = tab.id;
  });
  var activeTabId = undefined;

  // which item is selected
  var select = {x:0, y:0, action:null, cookie:null, cameFromActiveTab:false};
  var selectAction = {
    open : function() {chrome.tabs.create({url:select.cookie, active:false});},
    close : function() {chrome.tabs.remove(select.cookie);},
    goTo : function() {chrome.tabs.update(select.cookie, {active:true});},
    bookmark : function() {
      chrome.bookmarks.create({parentId:bookmarkFolderId,
                               title:select.cookie.title,
                               url:select.cookie.url});
    }
  };

  function registerScreenUpdates() {
    if (!(bookmarkFolderId &&
          minus1Loaded && minus2Loaded && plus1Loaded && plus2Loaded &&
          arrow1Loaded && arrow2Loaded && star1Loaded && star2Loaded))
      return;

    // all vars are ready, show screen
    updateScreen();

    // listen for all events that should cause screen update
    chrome.tabs.onCreated.addListener(function() {updateScreen()});
    chrome.tabs.onRemoved.addListener(function() {updateScreen()});
    chrome.tabs.onUpdated.addListener(function() {updateScreen()});
    chrome.tabs.onActivated.addListener(function(activeInfo) {
      if (ctrlScreenTabId != activeInfo.tabId) {
        activeTabId = activeInfo.tabId;
        updateScreen();
      }
    });
    chrome.bookmarks.onCreated.addListener(function() {updateScreen()});
    document.addEventListener(
      "webkitfullscreenchange", function() {updateScreen()}, false);

    // listen for key controls
    window.addEventListener('keydown', function(event) {
      switch(event.keyCode) {
      case 37: // Left
        select.x--;
        updateScreen();
        break;
      case 38: // Up
        select.y--;
        updateScreen();
        break;
      case 39: // Right
        select.x++;
        updateScreen();
        break;
      case 40: // Down
        select.y++;
        updateScreen();
        break;
      case 13: // Enter
      case 32: // Spacebar
        if (select.action) select.action();
      }
    });

    // listen for extension commands
    chrome.commands.onCommand.addListener(function(command) {
      if (command == 'toggle-control') {
        chrome.tabs.query({windowId:chrome.windows.WINDOW_ID_CURRENT,
                           active:true},
        function(tabs) {
          if (tabs[0].index == 0) {
            chrome.tabs.update(activeTabId, {active:true});
          }
          else {
            select.cameFromActiveTab = true;
            chrome.tabs.update(ctrlScreenTabId, {active:true});
          }
        });
      }
      else if (command == 'add-bookmark') {
        chrome.tabs.query({windowId:chrome.windows.WINDOW_ID_CURRENT,
                           active:true},
        function(tabs) {
          if (tabs[0].index != 0) {
            chrome.bookmarks.getChildren(bookmarkFolderId, function(marks) {
              for (var index = 0; index < marks.length; index++) {
                if (marks[index].url == tabs[0].url) {
                  break;
                }
              }
              if (index == marks.length) {
                chrome.bookmarks.create({parentId:bookmarkFolderId,
                                         title:tabs[0].title,
                                         url:tabs[0].url});
              }
            });
          }
        });
      }
      else if (command == 'reset-hmd-sensor') {
        webVRHelper.resetHmdSensor();
      }
    });
  }

  function updateScreen(message) {
    // init
    ctrlContext.fillStyle = 'black';
    ctrlContext.fillRect(0, 0, ctrlCanvas.width, ctrlCanvas.height);
    ctrlContext.strokeStyle = '#00CC00';
    ctrlContext.strokeRect(0, 0, ctrlCanvas.width, ctrlCanvas.height);
    ctrlContext.fillStyle = '#00CC00';
    ctrlContext.textAlign = 'left';
    ctrlContext.textBaseline = 'top';
    var textLine = 12;
    ctrlContext.font = '12px Lucida Console';

    if (message || !document.webkitFullscreenElement) {
      ctrlContext.fillText(message || 'Click me for VR!', 6, textLine);
      ctrlTexture.needsUpdate = true;
      return;
    }

    // get info for display
    var tabs = undefined;
    chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, {populate:true},
    function(win) {
      tabs = win.tabs;
      tabs.splice(0,1);
      fillTable();
    });
    var bookmarks = undefined;
    chrome.bookmarks.getChildren(bookmarkFolderId, function(marks) {
      bookmarks = marks;
      fillTable();
    });

    function fillTable() {
      if (!(tabs && bookmarks)) return;

      // create table to display
      var table = [];
      var name = [];
      for (var index = 0; index < bookmarks.length; index++) {
        var bookmark = bookmarks[index];
        var row = [{action:selectAction.open, cookie:bookmark.url}];
        table.push(row);
        name.push(bookmark.title);
      }
      for (var index = 0; index < tabs.length; index++) {
        var tab = tabs[index];
        var row = [
          {action:selectAction.close, cookie:tab.id},
          {action:selectAction.goTo, cookie:tab.id}
        ];
        for (var bookIndex = 0; bookIndex < bookmarks.length; bookIndex++) {
          var bookmark = bookmarks[bookIndex];
          if (bookmark.url == tabs.url) {
            row.push({action:selectAction.bookmark,
                      cookie:{title:tab.title, url:tab.url}});
            break;
          }
        }
        table.push(row);
        name.push(tab.status == 'loading' ? '(loading)' : tab.title);
      }

      // fix select position
      if (select.cameFromActiveTab) {
        for (var index = 0; index < table.length; index++) {
          if (table[index][1] && table[index][1].cookie == activeTabId) {
            select.x = 1;
            select.y = index;
            select.cameFromActiveTab = false;
            break;
          }
        }
      }
      if (select.y < 0)
        select.y = 0;
      else if (select.y > table.length-1)
        select.y = table.length-1;
      if (select.x < 0)
        select.x = 0;
      else if (select.x > table[select.y].length - 1)
        select.x = table[select.y].length - 1;
      select.action = table[select.y][select.x].action;
      select.cookie = table[select.y][select.x].cookie;
      table[select.y][select.x].selected = true;

      //
      // display table
      //

      // display bookmark header
      ctrlContext.fillText(document.title, 6, textLine);
      textLine += 12;
      textLine += 2;
      ctrlContext.beginPath();
      ctrlContext.moveTo(6, textLine);
      ctrlContext.lineTo(215, textLine);
      ctrlContext.stroke();
      textLine += 4;

      // display icons
      var x, y;
      var lastAction = null;
      for (y = 0; y < table.length; y++) {
        for (x = 0; x < table[y].length; x++) {
          var elt = table[y][x];
          var img = null;
          switch(elt.action) {
          case selectAction.open:
            img = (elt.selected ? plus2 : plus1);
            break;
          case selectAction.close:
            if (lastAction === selectAction.open) {
              //display loaded header
              textLine += 2;
              ctrlContext.beginPath();
              ctrlContext.moveTo(6, textLine);
              ctrlContext.lineTo(215, textLine);
              ctrlContext.stroke();
              textLine += 4;
            }
            img = (elt.selected ? minus2 : minus1);
            break;
          case selectAction.goTo:
            img = (elt.selected ? arrow2 : arrow1);
            break;
          case selectAction.bookmark:
            img = (elt.selected ? star2 : star1);
            break;
          }
          ctrlContext.drawImage(img, 6 + 12*x, textLine-1);
          lastAction = elt.action;
        }
        ctrlContext.fillText(name[y], 6 + 12*x, textLine);
        textLine += 12;
      }
      ctrlTexture.needsUpdate = true;
    }
  }

  // render
  var view = new THREE.Object3D();
  webVRHelper.createEyeCameras(view);
  view.position.setY(1.6);
  scene.add(view);
  webVRHelper.animate(scene, view);
});
