// Global variables
var canvas, isDragging, isSelecting, currentNote, offsetX, offsetY, canvasId;
var selectedNotes, dragStartTime, selectionBox, selectionStart, mouseDownPos;
var CLICK_THRESHOLD = 5; // pixels
let isMultiSelect = false;
function initializeApp() {
    canvas = document.getElementById('canvas');
    isDragging = false;
    isSelecting = false;
    currentNote = null;
    selectedNotes = new Set();
    selectionStart = { x: 0, y: 0 };
    mouseDownPos = { x: 0, y: 0 };

    const urlParams = new URLSearchParams(window.location.search);
    canvasId = urlParams.get('id');

    if (!canvasId) {
        window.location.href = '/index.html';
    }

    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    window.addEventListener('resize', updateCanvasSize);
    document.addEventListener('keydown', handleKeyDown);

    loadNotes();
}

// Make functions global
window.initializeApp = initializeApp;

// Call initializeApp when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
