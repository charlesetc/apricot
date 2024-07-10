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
    const width = Math.abs(x - selectionStart.x);
    const height = Math.abs(y - selectionStart.y);
    const left = Math.min(x, selectionStart.x);
    const top = Math.min(y, selectionStart.y);
    
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
}

function clearSelectionBox() {
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
}

function finalizeSelection() {
    if (!selectionBox) return;
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

    clearSelectionBox();
}

function clearSelectionBox() {
    if (selectionBox) {
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

// Make all functions global
window.createSelectionBox = createSelectionBox;
window.updateSelectionBox = updateSelectionBox;
window.finalizeSelection = finalizeSelection;
window.clearSelectionBox = clearSelectionBox;
window.selectNote = selectNote;
window.clearSelection = clearSelection;
window.toggleNoteSelection = toggleNoteSelection;
window.rectsIntersect = rectsIntersect;