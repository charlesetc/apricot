// Global variables
var canvas, isDragging, isSelecting, currentNote, offsetX, offsetY, canvasId;
var selectedNotes, dragStartTime, selectionBox, mouseDownPos;
var CLICK_THRESHOLD = 5; // pixels
let isMultiSelect = false;
let tabsEnabled = false;

let dragStartPos = { x: 0, y: 0 };
const DRAG_THRESHOLD = 5; // pixels
const EDGE_PROXIMITY = 20; // Pixels from left edge to show horizontal selection line
const TOP_PROXIMITY = 20; // Pixels from top edge to show vertical selection line
const MIN_X_POSITION = 200; // Minimum pixels from left to show vertical line

let clientX = 0;
let clientY = 0;

// Track notes moved by command-click and the new note created
let lastCommandClickData = null;

function isImageMarkdown(text) {
  const imageRegex = /!\[.*?\]\((.*?)\)/;
  return imageRegex.test(text);
}

function loadTitle() {
  fetch(`/api/canvases/${canvasId}`)
    .then(async response => {
      return response.json()
    })
    .then(project => {
      console.log(project)
      const titleElement = document.getElementById('canvas-title');
      if (titleElement) {
        titleElement.textContent = project.name;

        // Set document title to be the canvas name
        document.title = project.name;

        // Add click handler to make title editable
        titleElement.addEventListener('click', editCanvasTitle);
      }
    })
    .catch(error => console.error('Error loading canvas title:', error));
}

function editCanvasTitle(e) {
  const titleElement = document.getElementById('canvas-title');

  // If we're already editing, don't create another input
  if (titleElement.querySelector('.title-edit-input')) {
    return;
  }

  const currentName = titleElement.textContent;

  // Create input element
  const inputElement = document.createElement('input');
  inputElement.type = 'text';
  inputElement.value = currentName;
  inputElement.className = 'title-edit-input';
  inputElement.style.width = Math.max(120, currentName.length * 9) + 'px';

  // Replace title with input
  titleElement.textContent = '';
  titleElement.appendChild(inputElement);

  // Create and show settings popup
  showSettingsPopup();

  // Focus input and select all text
  inputElement.focus();
  inputElement.select();

  // Prevent the click inside input from triggering title edit again
  inputElement.addEventListener('mousedown', function (e) {
    e.stopPropagation();
  });

  // Save changes on blur or Enter key
  inputElement.addEventListener('blur', function (e) {
    // Small delay to allow clicking on popup buttons
    setTimeout(() => {
      saveCanvasTitle({ currentName });
      hideSettingsPopup();
    }, 200);
  });

  inputElement.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save immediately on Enter key press, don't wait for blur timeout
      saveCanvasTitle({ currentName });
      hideSettingsPopup();
    } else if (e.key === 'Escape') {
      titleElement.textContent = currentName;
      hideSettingsPopup();
    }
  });
}

function showSettingsPopup() {
  // Remove existing popup if any
  hideSettingsPopup();

  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'settings-popup';
  popup.className = 'settings-popup';

  // Move export button to popup
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export';
  exportBtn.className = 'popup-button';
  exportBtn.addEventListener('click', function () {
    window.open(`/export.html?id=${canvasId}`, '_blank');
  });

  // Add share button
  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Share';
  shareBtn.className = 'popup-button';
  shareBtn.addEventListener('click', function (e) {
    e.preventDefault();
    hideSettingsPopup(); // Hide popup when sharing
    shareCanvas();
  });

  // Add tabs toggle button
  const tabsToggleBtn = document.createElement('button');
  tabsToggleBtn.textContent = tabsEnabled ? 'Disable tabs' : 'Enable tabs';
  tabsToggleBtn.className = 'popup-button';
  tabsToggleBtn.addEventListener('click', function (e) {
    e.preventDefault();
    toggleTabs();
    tabsToggleBtn.textContent = tabsEnabled ? 'Disable tabs' : 'Enable tabs';
  });

  // Add duplicate button
  const duplicateBtn = document.createElement('button');
  duplicateBtn.textContent = 'Duplicate';
  duplicateBtn.className = 'popup-button';
  duplicateBtn.addEventListener('click', function (e) {
    e.preventDefault();
    hideSettingsPopup(); // Hide popup when duplicating
    duplicateCanvas();
  });

  // Add buttons to popup
  popup.appendChild(exportBtn);
  popup.appendChild(shareBtn);
  popup.appendChild(tabsToggleBtn);
  popup.appendChild(duplicateBtn);

  // Add popup to document
  document.body.appendChild(popup);

  // Position popup below the title
  const titleRect = document.getElementById('canvas-title').getBoundingClientRect();
  popup.style.top = (titleRect.bottom + 5) + 'px';
  popup.style.left = titleRect.left + 'px';
}

function hideSettingsPopup() {
  const existingPopup = document.getElementById('settings-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
}

function saveCanvasTitle({ currentName }) {
  const titleElement = document.getElementById('canvas-title');
  const inputElement = titleElement.querySelector('input');
  const newName = inputElement.value.trim();

  if (newName === currentName) {
    // If the name hasn't changed, just revert to original title
    titleElement.textContent = currentName;
    return;
  }

  if (newName && newName !== '') {
    // Save to server
    fetch(`/api/canvases/${canvasId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName })
    })
      .then(response => response.json())
      .then(data => {
        titleElement.textContent = newName;
        // Update document title to match new canvas name
        document.title = newName;
        // Show success toast
        successToast('Canvas renamed successfully');
      })
      .catch(error => {
        console.error('Error updating canvas title:', error);
        titleElement.textContent = inputElement.defaultValue;
      });
  } else {
    // Revert to original name if empty
    titleElement.textContent = inputElement.defaultValue;
  }
}

function showToast(message, type, duration) {
  // Remove any existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'toast';

  // Add type-specific class
  toast.classList.remove('success');
  toast.classList.remove('error');
  toast.classList.remove('normal');
  toast.classList.add(type);

  toast.textContent = message;
  document.body.appendChild(toast);

  // Show the toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Hide and remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

function normalToast(message, duration = 3000) {
  showToast(message, 'normal', duration);
}

function successToast(message, duration = 3000) {
  showToast(message, 'success', duration);
}

function errorToast(message, duration = 3000) {
  showToast(message, 'error', duration);
}

async function shareCanvas() {
  try {
    // First get the canvas name
    const canvasResponse = await fetch(`/api/canvases/${canvasId}`);
    const canvasData = await canvasResponse.json();

    // Show loading toast
    normalToast('Generating share link...');

    try {
      // Get the read-only canvas HTML content with embedded CSS
      const readonlyUrl = `/api/readonly-canvas/${canvasId}`;
      const readonlyResponse = await fetch(readonlyUrl);
      const htmlContent = await readonlyResponse.text();

      // Send the HTML content to the server for uploading to Cloudflare
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          canvasId: canvasId,
          name: canvasData.name,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to share canvas');
      }

      const result = await response.json();

      // Copy the URL to clipboard
      const textArea = document.createElement('textarea');
      textArea.value = result.shareUrl;
      textArea.style.position = 'fixed';  // Avoid scrolling to bottom
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        // Show success toast
        successToast('Share link copied to clipboard!');
      } else {
        // Show URL toast if copy fails
        successToast('Share link created: ' + result.shareUrl);
      }

    } catch (error) {
      errorToast('Error sharing canvas: ' + error.message, 5000);
      console.error('Error sharing canvas:', error);
    }
  } catch (error) {
    console.error('Error sharing canvas:', error);
    errorToast('Failed to share canvas: ' + error.message, 5000);
  }
}

function loadTabsEnabledState() {
  const saved = localStorage.getItem(`tabs-enabled-${canvasId}`);
  return saved !== null ? saved === 'true' : false;
}

function saveTabsEnabledState() {
  localStorage.setItem(`tabs-enabled-${canvasId}`, tabsEnabled.toString());
}

async function initializeApp() {
  canvas = document.getElementById("canvas");
  isDragging = false;
  isSelecting = false;
  currentNote = null;
  selectedNotes = new Set();
  mouseDownPos = { x: 0, y: 0 };

  const urlParams = new URLSearchParams(window.location.search);
  canvasId = urlParams.get("id");

  if (!canvasId) {
    window.location.href = "/index.html";
  }

  // Load tabs enabled state for this canvas
  tabsEnabled = loadTabsEnabledState();

  // Hide the original export button as we'll show it in the settings popup
  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.style.display = 'none';
  }

  // Initialize tab system
  initializeSidebar();
  createCurrentTabDisplay();

  // Load tabs and set current tab
  await loadTabs();

  // Initialize selection lines
  createHorizontalLine();
  createVerticalLine();

  canvas.addEventListener("mousedown", handleCanvasMouseDown);
  canvas.addEventListener("mousemove", handleCanvasMouseMove);
  canvas.addEventListener("mouseup", handleCanvasMouseUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("resize", updateCanvasSize);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("paste", handlePaste);

  window.addEventListener("mousemove", function (event) {
    clientX = event.clientX;
    clientY = event.clientY;
  });

  loadTitle();
  await loadNotes();
  updateCurrentTabDisplay();
}

function createCurrentTabDisplay() {
  // Remove existing display if any
  const existingDisplay = document.getElementById('current-tab-name');
  if (existingDisplay) {
    existingDisplay.remove();
  }

  // Only create the tab display if tabs are enabled
  if (!tabsEnabled) {
    return null;
  }

  // Create current tab display element as a button
  const tabDisplay = document.createElement('button');
  tabDisplay.id = 'current-tab-name';
  tabDisplay.textContent = 'Loading...';
  tabDisplay.title = 'Toggle sidebar (Cmd+Shift+S)';

  // Add click handler to toggle sidebar
  tabDisplay.addEventListener('click', toggleSidebar);

  // Add double-click handler to open sidebar and edit current tab name
  tabDisplay.addEventListener('dblclick', handleCurrentTabDoubleClick);

  document.getElementById('header-container').appendChild(tabDisplay);
  return tabDisplay;
}

function handleCurrentTabDoubleClick(e) {
  e.stopPropagation();

  // Show the sidebar first
  showSidebar();

  // Wait a bit for the sidebar to be visible, then find and edit the current tab
  setTimeout(() => {
    const currentTab = getCurrentTab();
    if (currentTab) {
      editTabName(currentTab);
    }
  }, 100);
}

function toggleTabs() {
  tabsEnabled = !tabsEnabled;
  
  // Save the state to localStorage
  saveTabsEnabledState();
  
  // Recreate the current tab display to show/hide it
  createCurrentTabDisplay();
  
  // Update the current tab display if tabs are now enabled
  if (tabsEnabled) {
    updateCurrentTabDisplay();
  }
}

async function duplicateCanvas() {
  try {
    // Show loading toast
    successToast('Duplicating canvas...');

    // First get the current canvas details
    const canvasResponse = await fetch(`/api/canvases/${canvasId}`);
    const canvasData = await canvasResponse.json();

    // Check if name starts with a date in format yyyy-mm-dd
    let newName = canvasData.name;
    const dateRegex = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/;
    const dateMatch = canvasData.name.match(dateRegex);

    if (dateMatch) {
      // Get current date in yyyy-mm-dd format
      const today = new Date();
      const currentDate = today.toISOString().split('T')[0]; // Format: yyyy-mm-dd

      // If current date is different from the prefix date, update it
      if (currentDate !== dateMatch[1]) {
        newName = `${currentDate} ${dateMatch[2]}`;
      } else {
        // Date is the same, add " copy"
        newName = `${canvasData.name} copy`;
      }
    } else {
      // No date prefix, add " copy"
      newName = `${canvasData.name} copy`;
    }

    const createResponse = await fetch('/api/canvases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName })
    });

    const newCanvas = await createResponse.json();
    const newCanvasId = newCanvas.id;

    // Get all notes from the current canvas
    const notesResponse = await fetch(`/api/notes/${canvasId}`);
    const notes = await notesResponse.json();

    // Create duplicates of all notes in the new canvas
    for (const note of notes) {
      const newNote = {
        id: Date.now() + Math.random().toString(36).substring(2, 10), // Generate a unique ID
        canvas_id: newCanvasId,
        text: note.text,
        x: note.x,
        y: note.y
      };

      await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNote)
      });
    }

    // Navigate to the new canvas
    window.location.href = `/canvas.html?id=${newCanvasId}`;

  } catch (error) {
    console.error('Error duplicating canvas:', error);
    errorToast('Failed to duplicate canvas: ' + error.message, 5000);
  }
}

// Make functions global
window.initializeApp = initializeApp;

// Call initializeApp when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
