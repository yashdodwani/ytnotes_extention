// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    const video = document.querySelector('video');
    const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent ||
                  document.querySelector('h1.title')?.textContent ||
                  'YouTube Video';

    sendResponse({
      title: title,
      currentTime: video ? video.currentTime : 0,
      duration: video ? video.duration : 0
    });
  } else if (request.action === 'seekTo') {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = request.time;
      video.play();
    }
    sendResponse({ success: true });
  }

  return true;
});

// Optional: Add a floating note button on the video player
function addNoteButton() {
  const player = document.querySelector('.ytp-right-controls');
  if (player && !document.getElementById('yt-note-btn')) {
    const btn = document.createElement('button');
    btn.id = 'yt-note-btn';
    btn.className = 'ytp-button';
    btn.innerHTML = '📝';
    btn.title = 'Take a note';
    btn.style.fontSize = '20px';

    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    player.insertBefore(btn, player.firstChild);
  }
}

// Wait for YouTube to load
setTimeout(addNoteButton, 2000);

// Observe for navigation changes
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(addNoteButton, 1000);
  }
}).observe(document.body, { subtree: true, childList: true });