/* global AFRAME */

/**
 * Component that listens to an event, fades out an entity, swaps the texture, and fades it
 * back in.
 */
AFRAME.registerComponent('set-image', {
  schema: {
    on: {type: 'string'},
    target: {type: 'selector'},
    src: {type: 'string'},
    dur: {type: 'number', default: 300}
  },

  init: function () {
    var data = this.data;
    var el = this.el;

    el.addEventListener('record', function () {
      data.target.setAttribute('material', 'src', data.src);
    });

    el.addEventListener(data.on, function () {
      homeOpen = true;
      data.target.setAttribute('src', data.src);
      data.target.emit('stopRotateSky');
      data.target.emit('startRotateHome');
      toggleHomes(false);
      $('#closeHome').show();
      if ($('#volume').attr('src') === 'img/volume-off.png') el.setAttribute('sound', 'volume', '0');
      else el.setAttribute('sound', 'volume', '5');
      var opac = videoPlaying ? 0 : 1;
      data.target.setAttribute('material', 'shader: flat; opacity: '+opac+'; src: '+data.src);
      if (videoPlaying) setTimeout(function() { data.target.setAttribute('material', 'opacity', '1.0'); }, 300);
    
      setTimeout(function() {
        if (homeOpen) {
          closeHome();
        } 
      }, 30*1000);
    });

    el.addEventListener('close', function() {
      console.log('CLOSE')
      el.components.sound.stopSound();
      var opac = videoPlaying ? 0 : 1;
      data.target.setAttribute('material', 'shader: standard; src: #lauren-video; opacity:'+opac);
      data.target.emit('stopRotateHome');
      data.target.emit('startRotateSky');
    });
  }
});