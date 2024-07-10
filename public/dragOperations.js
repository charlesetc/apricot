// dragOperations.js

function startDragging(e) {
    isDragging = true;
    currentNote = e.target.closest('.note');
    
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    offsetX = e.clientX + scrollLeft - currentNote.offsetLeft;
    offsetY = e.clientY + scrollTop - currentNote.offsetTop;

    // If the clicked note is not in the selection, clear selection and select only this note
    if (!selectedNotes.has(currentNote)) {
        clearSelection();
        selectNote(currentNote);
    }

    e.stopPropagation();
}

function dragSelectedNotes(e) {
    if (!isDragging) return;
    
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    const newX = e.clientX + scrollLeft - offsetX;
    const newY = e.clientY + scrollTop - offsetY;
    
    const dx = newX - currentNote.offsetLeft;
    const dy = newY - currentNote.offsetTop;

    selectedNotes.forEach(note => {
        note.style.left = `${note.offsetLeft + dx}px`;
        note.style.top = `${note.offsetTop + dy}px`;
    });
    
    updateCanvasSize();
}

function stopDragging() {
    if (!isDragging) return;
    isDragging = false;
    selectedNotes.forEach(sendToBackend);
}

// Make functions global
window.startDragging = startDragging;
window.dragSelectedNotes = dragSelectedNotes;
window.stopDragging = stopDragging;
function rectsIntersect(rect1, rect2) {
    return !(rect2.left > rect1.right || 
             rect2.right < rect1.left || 
             rect2.top > rect1.bottom ||
             rect2.bottom < rect1.top);
}

function updateCanvasSize() {
    const notes = document.querySelectorAll('.note');
    let maxRight = 0;
    let maxBottom = 0;

    notes.forEach(note => {
        const right = note.offsetLeft + note.offsetWidth;
        const bottom = note.offsetTop + note.offsetHeight;
        maxRight = Math.max(maxRight, right);
        maxBottom = Math.max(maxBottom, bottom);
    });

    canvas.style.width = `${Math.max(maxRight + 100, window.innerWidth)}px`;
    canvas.style.height = `${Math.max(maxBottom + 100, window.innerHeight)}px`;
}

window.startDragging = startDragging;
window.dragSelectedNotes = dragSelectedNotes;