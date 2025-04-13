// selectionOperations.js

function createSelectionBox(x, y) {
    clearSelectionBox(); // Clear any existing selection box
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.style.left = `${x}px`;
    selectionBox.style.top = `${y}px`;
    canvas.appendChild(selectionBox);
}

function updateSelectionBox(x, y) {
    if (!selectionBox) return;
    const width = Math.abs(x - mouseDownPos.x);
    const height = Math.abs(y - mouseDownPos.y);
    const left = Math.min(x, mouseDownPos.x);
    const top = Math.min(y, mouseDownPos.y);
    
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
}

function highlightSelection() {    
    const selectionRect = selectionBox.getBoundingClientRect();
    const notes = document.querySelectorAll('.note');
    notes.forEach(note => {
        const noteRect = note.getBoundingClientRect();
        if (rectsIntersect(selectionRect, noteRect)) {
            selectedNotes.add(note);
            note.classList.add('selected');
        } else if (!isMultiSelect) {  // Only remove if not multi-selecting
            selectedNotes.delete(note);
            note.classList.remove('selected');
        }
    });
}

function finalizeSelection() {
    if (!selectionBox) return;
    
    highlightSelection();
    clearSelectionBox();
}

function clearSelectionBox() {
    // Make sure selectionBox is defined before trying to use it
    if (typeof selectionBox !== 'undefined' && selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
}

function selectNote(note) {
    selectedNotes.add(note);
    note.classList.add('selected');
}

function clearSelection() {
    selectedNotes.forEach(note => note.classList.remove('selected'));
    selectedNotes.clear();
}

function toggleNoteSelection(note, isMultiSelect) {
    if (selectedNotes.has(note)) {
        if (isMultiSelect) {
            selectedNotes.delete(note);
            note.classList.remove('selected');
        }
    } else {
        if (!isMultiSelect) {
            clearSelection();
        }
        selectNote(note);
    }
}

// Helper function to check if two rectangles intersect
function rectsIntersect(rect1, rect2) {
    return !(rect2.left > rect1.right || 
             rect2.right < rect1.left || 
             rect2.top > rect1.bottom ||
             rect2.bottom < rect1.top);
}

// Horizontal selection line feature
let horizontalLine = null;
// Using existing EDGE_PROXIMITY from main.js

function createHorizontalLine() {
    if (!horizontalLine) {
        horizontalLine = document.createElement('div');
        horizontalLine.className = 'horizontal-selection-line';
        document.body.appendChild(horizontalLine);
    }
}

function showHorizontalLine(y) {
    if (!horizontalLine) {
        createHorizontalLine();
    }
    horizontalLine.style.top = `${y}px`;
    horizontalLine.style.opacity = '1';
}

function hideHorizontalLine() {
    if (horizontalLine) {
        horizontalLine.style.opacity = '0';
    }
}

function handleHorizontalSelection(y) {
    // Select all notes that are below the horizontal line and not to the left of the viewport
    const notes = document.querySelectorAll('.note');
    clearSelection();
    
    // Get scroll offsets for accurate comparison
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const linePositionWithScroll = y + scrollTop;
    
    notes.forEach(note => {
        const noteRect = note.getBoundingClientRect();
        const noteTop = noteRect.top + scrollTop;
        const noteLeft = noteRect.left + scrollLeft;
        
        // Check if note is below or at the same level as the horizontal line
        // AND the note's left edge is not scrolled out of view (to the left of the viewport)
        if (noteTop >= linePositionWithScroll && noteLeft >= scrollLeft) {
            selectNote(note);
        }
    });
}

// Vertical selection line feature
let verticalLine = null;
// Using constants from main.js

function createVerticalLine() {
    if (!verticalLine) {
        verticalLine = document.createElement('div');
        verticalLine.className = 'vertical-selection-line';
        document.body.appendChild(verticalLine);
    }
}

function showVerticalLine(x) {
    if (!verticalLine) {
        createVerticalLine();
    }
    verticalLine.style.left = `${x}px`;
    verticalLine.style.opacity = '1';
}

function hideVerticalLine() {
    if (verticalLine) {
        verticalLine.style.opacity = '0';
    }
}

function handleVerticalSelection(x) {
    // Select all notes that are to the right of the vertical line
    const notes = document.querySelectorAll('.note');
    clearSelection();
    
    // Get scroll offset for accurate comparison
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const linePositionWithScroll = x + scrollLeft;
    
    notes.forEach(note => {
        const noteRect = note.getBoundingClientRect();
        const noteLeft = noteRect.left + scrollLeft;
        
        // Check if note is to the right of or at the same position as the vertical line
        if (noteLeft >= linePositionWithScroll) {
            selectNote(note);
        }
    });
}