// Global variables
var canvas, isDragging, isSelecting, currentNote, offsetX, offsetY, canvasId;
var selectedNotes, dragStartTime, selectionBox, mouseDownPos;
var CLICK_THRESHOLD = 5; // pixels
let isMultiSelect = false;

let dragStartPos = { x: 0, y: 0 };
const DRAG_THRESHOLD = 5; // pixels

let clientX = 0;
let clientY = 0;

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
          
          // Add click handler to make title editable
          titleElement.addEventListener('click', editCanvasTitle);
        }
      })
      .catch(error => console.error('Error loading canvas title:', error));
}

function editCanvasTitle(e) {
  const titleElement = document.getElementById('canvas-title');
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
  
  // Save changes on blur or Enter key
  inputElement.addEventListener('blur', function(e) {
    // Small delay to allow clicking on popup buttons
    setTimeout(() => {
      saveCanvasTitle();
      hideSettingsPopup();
    }, 200);
  });
  
  inputElement.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputElement.blur();
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
  exportBtn.addEventListener('click', function() {
    window.open(`/export.html?id=${canvasId}`, '_blank');
  });
  
  // Add other settings buttons as needed
  
  // Add buttons to popup
  popup.appendChild(exportBtn);
  
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

function saveCanvasTitle() {
  const titleElement = document.getElementById('canvas-title');
  const inputElement = titleElement.querySelector('input');
  const newName = inputElement.value.trim();
  
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

function initializeApp() {
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
  
  // Hide the original export button as we'll show it in the settings popup
  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.style.display = 'none';
  }

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
  loadNotes();
}

// Make functions global
window.initializeApp = initializeApp;

// Call initializeApp when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
