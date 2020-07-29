var plate = 0; // 1 - learnmore, 2 - getlauren
var h;

function toggleHomes(val) {
  var links = document.querySelector('#links').getChildren();
  for (var i=0; i<links.length; i++) {
    if(links[i].tagName === 'A-ENTITY') {
      var obj = links[i].getChildren()[0];
      if (val) {
        obj.emit('scaleIn');
        obj.getChildren()[0].emit('scaleIn');
      } else {
        obj.emit('scaleOut');
        obj.getChildren()[0].emit('scaleOut');
      }
    }
  }
}

function closeHome(force) {
  var sky = document.querySelector('#image-360');
  var currentId = sky.getAttribute('src');
  var currentHome = $('#links').find('[data-src='' + currentId + '']')[0].children[0].getChildren()[0];
  currentHome.emit('close');
  $('#closeHome').hide();
  if (!force) toggleHomes(true);

}

function getLauren(val) {
  toggleHomes(!val);
  var sky = document.querySelector('#image-360');
  if (val) {
    $('#closeHome').hide();
    sky.setAttribute('material', 'shader: standard; src: #lauren-listening');
    sky.emit('stopRotateSky');
    sky.emit('rotateRecordSky');
    document.querySelector('#camera').emit('rotateRecordCamera');
    document.querySelector('#passthroughVideo-sphere').emit('scaleIn');
    if ($('#getlauren-thankyou').is(':visible')) {
      resetForm();
    }
  } else {
    sky.setAttribute('material', 'shader: flat; src: #lauren-video');
    sky.emit('startRotateSky');
    document.querySelector('#camera').emit('unrotateRecordCamera');
    document.querySelector('#passthroughVideo-sphere').emit('scaleOut');
  }
}

function hideVideo() {
  $('#video-top').hide();
  $('#overlay').hide();
  $('nav').show();
  $('#overlay-gradient').show();
  $('a-scene').removeClass('blur');
  $('#video').animate({ top: -h }, function() {
    $('#video').remove();
  });
}

function resetForm() {
  recordRTC = null;
  countdownInterval = null;
  submission_file = null;
  $('#input_name').val('');
  $('#input_email').val('');
  $('#input_city').val('');
  $('#input_response').val('');
  $('#record').text('RECORD');
  $('#submit-record').hide();
  $('#time').hide();
  $('#getlauren-content').show();
  $('#getlauren-thankyou').hide();
  $('#passthroughVideo')[0].src = window.URL ? window.URL.createObjectURL(passthroughStream) : passthroughStream;
}

function submit() {
  if (validate()) {
    $('#getlauren-content').hide();
    $('#getlauren-thankyou').show();
    var video_url = submitRecording();
    var s = {
      name: $('#input_name').val(),
      email: $('#input_email').val(),
      city: $('#input_city').val(),
      written: $('#input_response').val(),
      video: video_url 
    }
    $.post('https://lauren-server.herokuapp.com/submit', s, function(res) {
      console.log(res);
    });
  }
}

function validate() {
  if (!$('#input_name').val()) {
    alert('Please enter your name.');
  }
  else if (!$('#input_email').val()) {
    alert('Please enter your email.');
  }
  else if (!$('#input_city').val()) {
    alert('Please enter the city you live in.');
  }
  else if (!$('#input_response').val() && !submission_file) {
    alert('Please write or record a response explaining why you want to get LAUREN.');
  } else {
    return true;
  }
}

$(document).ready(function() {

  $('video').on('error', function() {
    $(this)[0].load();
  });

  // hideVideo();
  // setTimeout(function() { $('#getlauren').trigger('click'); }, 1000);
  startPassthrough();

  $('#lauren').click(function() { window.location = './'; });

  $('#learnmore').click(function() {
    if (plate == 1) {
      $('#learnmore-plate').animate({ top: -$('#learnmore-plate').height() });
      plate = 0;
    } else {
      if (plate == 2) {
        getLauren(false);
        $('#getlauren-plate').animate({ top: -$('#getlauren-plate').height() });
      }
      $('#learnmore-plate').animate({ top:'5%' });
      plate = 1;
    }
  });

  $('#getlauren').click(function() {
    if (plate == 2) {
      $('#getlauren-plate').animate({ top: -$('#getlauren-plate').height() });
      getLauren(false);
      plate = 0;
    } else {
      getLauren(true);
      if (plate == 1) {
        $('#learnmore-plate').animate({ top: -$('#getlauren-plate').height() });
      }
      $('#getlauren-plate').animate({ top:'5%' });
      plate = 2;
    }
  });

  $('#write-switch').click(function() {
    $('#write-content').show();
    $('#record-content').hide();
  });

  $('#record-switch').click(function() {
    $('#record-content').show();
    $('#write-content').hide();
  });


  $('#record').click(function() {
    if (!recordRTC) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  $('#submit-record').click(function() {
    submit();
  });
  $('#submit-write').click(function() {
    submit();
  });

  $('.close').click(function() {
    if (plate == 1) {
      $('#learnmore-plate').animate({ top: -$('#learnmore-plate').height() });
    }
    else if (plate == 2) {
      $('#getlauren-plate').animate({ top: -$('#getlauren-plate').height() });
      getLauren(false);
    }
    plate = 0;
  });

  $('#closeHome').click(function() {
    closeHome();
  });

  // VIMEO STUFF
  var iframe = document.querySelector('iframe');
  var player = new Vimeo.Player(iframe);

  player.on('ended', function() {
    console.log('ended the video!');
    hideVideo();
  });

  $(window).resize(function() {
    resizeDOM();
  });

  $('#video-close-button').click(function() {
    hideVideo();
  });

  $('#video-close').mousemove(function() {
    if ($('.popper').is(':hidden')) $('.popper').show(0).delay(1000).hide(0);
  });

  $('#video-close').mouseout(function() {
    $('.popper').stop().hide(0);
  });

  $('#overlay').click(function() { 
    if ($('.popper').is(':hidden')) $('.popper').show(0).delay(1000).hide(0);
  });

  swipedetect($('#video')[0], function(swipedir){
    hideVideo();
  });

  // $('#overlay').click(function() {
  //   hideVideo();
  // });

  function resizeDOM() {
    var w = document.documentElement.clientWidth;
    $('iframe').width(w);
    h = w*320/640;
    $('iframe').height(h);

    $('#video-close').css('top', $('iframe').height()*0.65);
    $('#video-close').css('height', Math.min($('iframe').height()*0.35, window.innerHeight - $('iframe').height()*0.65));
    $('#video-close-button').css('margin-top', $('#video-close').height() - $('#video-close-button').height());

    var lw = $('#learnmore-plate').width();
    $('#learnmore-plate').css('left', (window.innerWidth - lw)/2);
  }

  resizeDOM();

  if (!hasGetUserMedia() || document.documentElement.clientWidth <= 600) {
    $('#write-content').show();
    $('#record-content').hide();
    $('#record-switch').hide();
  }

});

function swipedetect(el, callback){
  
  var touchsurface = el,
  swipedir,
  startX,
  startY,
  distX,
  distY,
  threshold = 150, //required min distance traveled to be considered swipe
  restraint = 100, // maximum distance allowed at the same time in perpendicular direction
  allowedTime = 300, // maximum time allowed to travel that distance
  elapsedTime,
  startTime,
  handleswipe = callback || function(swipedir){}

  touchsurface.addEventListener('touchstart', function(e){
    var touchobj = e.changedTouches[0]
    swipedir = 'none'
    dist = 0
    startX = touchobj.pageX
    startY = touchobj.pageY
    startTime = new Date().getTime() // record time when finger first makes contact with surface
    e.preventDefault()
  }, false)

  touchsurface.addEventListener('touchmove', function(e){
    e.preventDefault() // prevent scrolling when inside DIV
  }, false)

  touchsurface.addEventListener('touchend', function(e){
    var touchobj = e.changedTouches[0]
    distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
    distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
    elapsedTime = new Date().getTime() - startTime // get time elapsed
    if (elapsedTime <= allowedTime){ // first condition for awipe met
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
        swipedir = (distX < 0)? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
      }
      else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
        swipedir = (distY < 0)? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
      }
    }
    handleswipe(swipedir)
    e.preventDefault()
  }, false)
}
