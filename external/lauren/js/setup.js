AFRAME.registerComponent('setup', {
  schema: {},
  init: function () {

    document.body.style.cursor = "wait";

    // Register navigating to the next hall
    document.querySelector('#exit-entity').addEventListener('click', function (evt) {
      // Note that "*" as the target allows anyone to embed and get the message
      window.parent.postMessage("leaveLaurenHall", "*");
    });

    document.querySelector('#image-360').emit('startRotateSky');
    if (AFRAME.utils.device.isMobile()) {
      //document.querySelector('scene-wrapper').setAttribute('rotation')
    }
    var links = document.querySelector('#links');
    links.addEventListener('animationcomplete', function () {
      var mult = Math.random() > 0.5 ? 1 : -1;
      var n = (Math.floor(4 * Math.random()) + 2);
      var angle = 40 * mult * n;
      var rot = links.getAttribute('rotation').y + angle;
      links.setAttribute('animation', 'to', '0 '+rot+' 0');
      links.setAttribute('animation', 'dur', 250*n);
      // setTimeout(function() { links.emit('startRotateHomes'); }, 3000 + 250*n);
    });
    // links.emit('startRotateHomes');

    sceneSetup = true;
    if (videoLoaded) {
      prepareEnter();
    }

  }
});