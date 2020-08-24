var plate = 0; // 1 - learnmore, 2 - getlauren
var h;
var videoPlaying = false;
var videoEnded = false;
var sceneSetup = false;
var assetsLoaded = false;

var dotInterval;
var homeOpen = false;
var links;

var hideRecord = true; // window.location.hash.indexOf('!') !== -1 || window.location.hash.indexOf('s') !== -1;
var hideVideo = true; // window.location.hash.indexOf('?') !== -1;
if (hideVideo) videoPlaying = false;

function toggleHomes(val) {
  links = document.querySelector('#links').getChildren();
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
  var currentHome = $('#links').find('[data-src="' + currentId + '"]')[0].children[0].getChildren()[0];
  currentHome.emit('close');
  $('#closeHome').hide();
  if (!force) toggleHomes(true);
  homeOpen = false;
}

function getLauren(val) {
  toggleHomes(!val);
  var sky = document.querySelector('#image-360');
  if (val) {
    $('#closeHome').hide();
    sky.setAttribute('material', 'shader: standard; src: #lauren-listening');
    $('#lauren-listening')[0].play();
    sky.emit('stopRotateSky');
    sky.emit('rotateRecordSky');
    document.querySelector('#camera').emit('rotateRecordCamera');
    if (!hideRecord) document.querySelector('#passthroughVideo-sphere').emit('scaleIn');
    if ($('#getlauren-thankyou').is(':visible')) {
      resetForm();
    }
  } else {
    var opac = videoPlaying ? 0 : 1;
    sky.setAttribute('material', 'shader: flat; src: #lauren-video; opacity:'+opac);
    sky.emit('startRotateSky');
    document.querySelector('#camera').emit('unrotateRecordCamera');
    document.querySelector('#passthroughVideo-sphere').emit('scaleOut');
  }
}


function resetForm() {
  recordRTC = null;
  countdownInterval = null;
  submission_file = null;
  $('#input_name').val('');
  $('#input_email').val('');
  $('#input_city').val('');
  $('#input_idfa').prop('checked', false);
  $('#input_response').val('');
  $('#record').text('RECORD');
  $('#submit-record').hide();
  $('#time').hide();
  $('#getlauren-content').show();
  $('#getlauren-thankyou').hide();
  $('#passthroughVideo')[0].srcObject = passthroughStream;
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
      idfa: $('#input_idfa').prop('checked'),
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

  document.querySelector('a-assets').addEventListener('loaded', function (e) {
    console.log('LAUREN: ASSETS LOADED');
    assetsLoaded = true;
    if (sceneSetup) {
      prepareEnter();
    }
  });


  let rot = 0;
  links = document.querySelector('#links').getChildren();
  // temp
  // if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
  //   window.location = './simple.html';
  // }

  if( window.history && window.history.pushState ){

    history.pushState("nohb", null, "");
    $(window).on("popstate", function(event){

      if (homeOpen) {
        closeHome();
      } else if (plate !== 0) {
        $('.close').click();
      }
      if( !event.originalEvent.state ){
        history.pushState("nohb", null, "");
        return;
      }
    });
  }

  var dots = 0;
  dotInterval = setInterval(function() {
    dots++;
    if (dots > 3) dots = 0;
    var s = '';
    for (var i=0; i<dots; i++) {
      s += '.';
    }
    $('#loadingdots').text(s);
  }, 500);

  $(document).bind('mousewheel', function(e){
    let delta = e.originalEvent.wheelDelta;
    rot += delta * 0.1 % 360;

    document.querySelector('#links').setAttribute('rotation', '0 '+ rot +' 0');
  });

  $('video').on('error', function(e) {
    $(this)[0].load();
  });

  $('#lauren').click(function() { 
    if (homeOpen) {
      closeHome();
    } else if (plate !== 0) {
      $('.close').click();
    }
  });


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
  $(window).resize(function() {
    resizeDOM();
  });


  resizeDOM();

  if (hideRecord || !hasGetUserMedia() || document.documentElement.clientWidth <= 600) {
    $('#write-content').show();
    $('#record-content').hide();
    $('#record-switch').hide();
  }

});

function prepareEnter() {
  setTimeout(function() { 
    $('#loading').html('Press to Enter');
    document.body.style.cursor = "pointer";

    $('#js-lauren-hall').click(function(e) {
      if (sceneSetup && assetsLoaded) {
        $('#js-lauren-hall').hide();
        $('#loading').hide();
        clearInterval(dotInterval); 
        $('#lauren-video')[0].play();
        startPassthrough();
      }
    })
  }, 5000);
}

function resizeDOM() {
  var vertCrop = $(window).width()/$(window).height() < 2;
  if (vertCrop) {
    var h = $(window).height();
    $('iframe').height(h);
    var w = h*2;
    var off = -0.5 * (w - $(window).width());
    $('iframe').width(w);
    $('iframe').css('left', off);
    $('iframe').css('top', 0);
  } else {
    var w = $(window).width();
    $('iframe').width(w);
    var h = w*0.5;
    var off = -0.5 * (h - $(window).height());
    $('iframe').height(h);
    $('iframe').css('top', off);
    $('iframe').css('left', 0);
  }

  var lw = $('#learnmore-plate').width();
  $('#learnmore-plate').css('left', ($(window).width() - lw)/2);
  $('#learnmore-plate').css('top', -$('#learnmore-plate').height());
  $('#getlauren-plate').css('top', -$('#getlauren-plate').height());

}

