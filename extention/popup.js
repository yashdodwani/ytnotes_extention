const API_URL = 'https://ytnotes-ed38.onrender.com';

let currentVideoId = '';
let currentTimestamp = 0;

// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (tab.url && tab.url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(new URL(tab.url).search);
    currentVideoId = urlParams.get('v');

    // Get video info from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, (response) => {
      if (response) {
        document.getElementById('videoTitle').textContent = response.title || 'YouTube Video';
        currentTimestamp = response.currentTime || 0;
        document.getElementById('timestamp').textContent = `Timestamp: ${formatTime(currentTimestamp)}`;
      }
    });

    // Load existing notes
    loadNotes();
  } else {
    document.getElementById('videoInfo').innerHTML = '<div style="color: red;">Please open a YouTube video to take notes.</div>';
  }
});

// Save note
document.getElementById('saveBtn').addEventListener('click', async () => {
  const noteText = document.getElementById('noteText').value.trim();

  if (!noteText) {
    showStatus('Please write a note first!', 'error');
    return;
  }

  if (!currentVideoId) {
    showStatus('No video detected!', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: currentVideoId,
        timestamp: currentTimestamp,
        note_text: noteText
      })
    });

    if (response.ok) {
      showStatus('Note saved successfully!', 'success');
      document.getElementById('noteText').value = '';
      loadNotes();
    } else {
      const error = await response.json();
      showStatus(`Error: ${error.detail || 'Failed to save note'}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
});

// Load notes
document.getElementById('loadBtn').addEventListener('click', loadNotes);

async function loadNotes() {
  if (!currentVideoId) return;

  try {
    const response = await fetch(`${API_URL}/notes/${currentVideoId}`);

    if (response.ok) {
      const notes = await response.json();
      displayNotes(notes);
    } else {
      showStatus('No notes found for this video', 'error');
    }
  } catch (error) {
    showStatus(`Error loading notes: ${error.message}`, 'error');
  }
}

function displayNotes(notes) {
  const notesList = document.getElementById('notesList');

  if (notes.length === 0) {
    notesList.innerHTML = '<p style="color: #666; font-size: 12px;">No notes yet for this video.</p>';
    return;
  }

  notesList.innerHTML = notes.map(note => `
    <div class="note-item">
      <div class="note-timestamp" data-time="${note.timestamp}">
        ⏱️ ${formatTime(note.timestamp)}
      </div>
      <div style="margin-top: 5px;">${escapeHtml(note.note_text)}</div>
      <div style="color: #666; font-size: 10px; margin-top: 5px;">
        ${new Date(note.created_at).toLocaleString()}
      </div>
    </div>
  `).join('');

  // Add click handlers to timestamps
  document.querySelectorAll('.note-timestamp').forEach(el => {
    el.addEventListener('click', () => {
      const time = parseFloat(el.dataset.time);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'seekTo',
          time: time
        });
      });
    });
  });
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}