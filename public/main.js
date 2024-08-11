// Global variables
var canvas, isDragging, isSelecting, currentNote, offsetX, offsetY, canvasId;
var selectedNotes, dragStartTime, selectionBox, selectionStart, mouseDownPos;
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


function initializeApp() {
    canvas = document.getElementById('canvas');
    isDragging = false;
    isSelecting = false;
    currentNote = null;
    selectedNotes = new Set();
    selectionStart = { x: 0, y: 0 };
    mouseDownPos = { x: 0, y: 0 };

    canvasId = globals 
    // canvasId = urlParams.get('id');


    if (!canvasId) {
        window.location.href = '/notfound.html';
    }

    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    window.addEventListener('resize', updateCanvasSize);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);

    window.addEventListener("mousemove", function(event) {
        clientX = event.clientX;
        clientY = event.clientY;
    });

    loadNotes();
}

// Make functions global
window.initializeApp = initializeApp;

// Call initializeApp when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
