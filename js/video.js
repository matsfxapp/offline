document.addEventListener('DOMContentLoaded', function() {
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  let firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});

let player;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('video-player', {
    videoId: 'cdLcLiV0fn4',
    playerVars: {
      'autoplay': 1,
      'controls': 0,
      'showinfo': 0,
      'rel': 0,
      'mute': 1,
      'playsinline': 1,
      'loop': 1,
      'playlist': 'cdLcLiV0fn4'
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  event.target.playVideo();

  const muteButton = document.getElementById('muteButton');
  
  if (muteButton) {
    let isMuted = true;

    muteButton.addEventListener('click', () => {
      if (isMuted) {
        player.unMute();
        player.setVolume(100);
      } else {
        player.mute();
      }
      isMuted = !isMuted;

      muteButton.innerHTML = isMuted ? 
        '<svg viewBox="0 0 24 24"><path d="M6.717 3.55A.5.5 0 017 3h6a.5.5 0 01.5.5v13a.5.5 0 01-.5.5H7a.5.5 0 01-.283-.086L2.94 13H1.5a.5.5 0 01-.5-.5v-5a.5.5 0 01.5-.5h1.44l3.777-3.914zM16 7.25v5.5a.75.75 0 001.5 0v-5.5a.75.75 0 00-1.5 0zm3.5 0v5.5a.75.75 0 001.5 0v-5.5a.75.75 0 00-1.5 0z"/></svg>' :
        '<svg viewBox="0 0 24 24"><path d="M6.717 3.55A.5.5 0 017 3h6a.5.5 0 01.5.5v13a.5.5 0 01-.5.5H7a.5.5 0 01-.283-.086L2.94 13H1.5a.5.5 0 01-.5-.5v-5a.5.5 0 01.5-.5h1.44l3.777-3.914z"/></svg>';
    });
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    player.playVideo();
  }
}
