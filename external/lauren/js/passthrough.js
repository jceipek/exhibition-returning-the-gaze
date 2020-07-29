var passthroughStream;
var recordRTC;
var countdownInterval;
var submission_file;

function startPassthrough() {
  if (hasGetUserMedia() && !hideRecord) {
    var video = document.createElement('video');
    video.setAttribute('id', 'passthroughVideo');
    video.setAttribute('autoplay', false);
    video.setAttribute('width', '1280');
    video.setAttribute('height', '720');
    video.volume = 0;
    // video.setAttribute('src', '');

    var assets = document.getElementsByTagName('a-assets')[0];
    assets.appendChild(video);

    var sphere = document.querySelector('#passthroughVideo-sphere');
    sphere.setAttribute('src', '#passthroughVideo');
    sphere.setAttribute('material', 'src', '#passthroughVideo');

    var mediaConstraints = {
      video: {
        width: {min: 1280, ideal: 1280, max: 1280},
        height: {min: 720, ideal: 720, max: 720}
      },
      audio: true
    }

    function successCallback(stream) {
      passthroughStream = stream;
      video.srcObject = stream;
    }

    function errorCallback(error) {
      console.log('An error has occurred!', error);
    }

    navigator.mediaDevices.getUserMedia(mediaConstraints).then(successCallback).catch(errorCallback);
  }
}


function endPassthrough() {
  if (passthroughStream) {
    var track = passthroughStream.getTracks()[0];
    track.stop();
    $('#video').remove();
  }
}

function startRecording() {
  $('#record').text('STOP');
  $('#remaining').text('20');
  $('#time').show();

  $('#passthroughVideo')[0].volume = 0;
  $('#passthroughVideo')[0].srcObject = passthroughStream;

  var record_options = {
    mimeType: 'video/webm', // or video/webm\;codecs=h264 or video/webm\;codecs=vp9
    videoBitsPerSecond: 512000,
    audioBitsPerSecond: 128000,
    video: {
      width: 1280,
      height: 720
    },
    canvas: {
      width: 1280,
      height: 720
    }
  };
  recordRTC = RecordRTC(passthroughStream, record_options);
  recordRTC.startRecording();
  setTimeout(stopRecording, 20000);
  countdownInterval = setInterval(function() {
    var cur = parseInt($('#remaining').text(), 10);
    $('#remaining').text(Math.max(cur - 1, 0));
  }, 1000);
}

function stopRecording() {
  if (recordRTC) {
    $('#record').text('RERECORD');
    $('#time').hide();
    $('#submit-record').show();
    clearInterval(countdownInterval);
    recordRTC.stopRecording(function (audioVideoWebMURL) {
      $('#passthroughVideo').attr('src', audioVideoWebMURL);
      $('#passthroughVideo')[0].volume = 1;
      $('#passthroughVideo')[0].play();

      var recordedBlob = recordRTC.getBlob();
      recordRTC.getDataURL(function(dataURL) { });
      recordRTC = null;

      submission_file = new File([recordedBlob], 'LAUREN_'+new Date().getTime() +'.webm', { type: 'video/webm' });
    });
  }
}

function submitRecording() {
  if (submission_file) {
    s3_upload(submission_file, submission_file.name, function(err1) {
     if (err1) {
        alert('Problem uploading video: '+err1+'. Please try again.');
        return;
      }
    });
    return 'https://lmccart-lauren.s3.amazonaws.com/'+submission_file.name;
  }
}


function s3_upload(s3_file, s3_object_name, cb){
  var s3upload = new S3Upload({
    file: s3_file,
    s3_object_name: s3_object_name,
    s3_sign_put_url: 'https://lauren-server.herokuapp.com/sign_s3',
    onProgress: function(percent, message) {
      console.log('Upload progress: ' + percent + '% ' + message);
      $('#percent').html(percent + '%');
    },
    onFinishS3Put: function(public_url) {
      console.log('Upload completed. Uploaded to: '+ public_url);
      if (cb) cb()
    },
    onError: function(status) {
      console.log(status);
      if (cb) cb(status)
    }
  });
}

function hasGetUserMedia() {
  return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia);
}
