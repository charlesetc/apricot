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
      .then(async response => 
        {
          return response.json()
})
      .then(project => {
        console.log(project)
        const titleElement = document.getElementById('canvas-title');
        if (titleElement) {
          titleElement.textContent = project.name;
        }
      })
      .catch(error => console.error('Error loading canvas title:', error));
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
  
  // Set up the export button link
  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.href = `/export.html?id=${canvasId}`;
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
