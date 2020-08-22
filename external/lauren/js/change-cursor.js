AFRAME.registerComponent('cursor-pointer', {
  schema: {
    on: {type: 'string'}
  },

  init: function () {
    var data = this.data;
    var el = this.el;

    el.addEventListener(data.on, function () {
      $('.a-canvas.a-grab-cursor:hover').css('cursor', 'pointer');
      $('.a-canvas.a-grab-cursor:active').css('cursor', 'pointer');
      $('.a-canvas.a-grab-cursor').css('cursor', 'pointer');
    });
  }
});

AFRAME.registerComponent('cursor-grabber', {
  schema: {
    on: {type: 'string'}
  },

  init: function () {
    var data = this.data;
    var el = this.el;

    el.addEventListener(data.on, function () {
      $('.a-canvas.a-grab-cursor:hover').css('cursor', '');
      $('.a-canvas.a-grab-cursor:active').css('cursor', '');
      $('.a-canvas.a-grab-cursor').css('cursor', '');
    });
  }
});