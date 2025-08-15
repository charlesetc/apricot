// dragOperations.js

// Variable to store positions at the start of a drag for undo functionality
let dragStartPositions = [];

function startDragging(note, e) {
    isDragging = true;
    if (note === null) throw new Error("Invalid note");
    currentNote = note;

    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    offsetX = e.clientX + scrollLeft - note.offsetLeft;
    offsetY = e.clientY + scrollTop - note.offsetTop;

    // Store original positions for undo
    dragStartPositions = [];
    selectedNotes.forEach(note => {
        dragStartPositions.push({
            noteId: note.getAttribute('data-id'),
            oldPosition: {
                x: parseInt(note.style.left),
                y: parseInt(note.style.top)
            }
        });
    });

    // If the clicked note is not in the selection, clear selection and select only this note
    if (!selectedNotes.has(note)) {
        clearSelection();
        selectNote(note);
        
        // Update dragStartPositions for the newly selected note
        dragStartPositions = [{
            noteId: note.getAttribute('data-id'),
            oldPosition: {
                x: parseInt(note.style.left),
                y: parseInt(note.style.top)
            }
        }];
    }

    e.stopPropagation();
}


function dragSelectedNotes(e) {
    if (!isDragging) return;
    if (currentNote === null) return;

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


const snapGridSize = 20;

function evenNumber(a, b) {
    return a - (a % b);
}

function stopDragging() {
    if (!isDragging) return;
    isDragging = false;

    selectedNotes.forEach(note => {
        note.style.left = `${evenNumber(note.offsetLeft + 10, snapGridSize)}px`
        note.style.top = `${evenNumber(note.offsetTop + 10, snapGridSize)}px`
    });

    selectedNotes.forEach(sendToBackend);
    
    // Record move actions for undo/redo
    if (dragStartPositions && dragStartPositions.length > 0) {
        const movements = dragStartPositions.map(item => {
            const note = document.querySelector(`.note[data-id="${item.noteId}"]`);
            if (note) {
                return {
                    noteId: item.noteId,
                    oldPosition: item.oldPosition,
                    newPosition: {
                        x: parseInt(note.style.left),
                        y: parseInt(note.style.top)
                    }
                };
            }
            return null;
        }).filter(Boolean);
        
        if (movements.length > 0) {
            if (movements.length === 1) {
                const note = document.querySelector(`.note[data-id="${movements[0].noteId}"]`);
                if (note) {
                    recordMoveAction(note, movements[0].oldPosition);
                }
            } else {
                recordMultiMoveAction(movements);
            }
        }
    }
    
    // Clear the stored positions
    dragStartPositions = [];
}

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
        maxRight = Math.max(maxRight, note.offsetLeft);
        maxBottom = Math.max(maxBottom, note.offsetTop);
    });

    canvas.style.width = `${Math.max(maxRight + 40000, window.innerWidth)}px`;
    canvas.style.height = `${Math.max(maxBottom + 40000, window.innerHeight)}px`;
}

// Make functions global
window.startDragging = startDragging;
window.dragSelectedNotes = dragSelectedNotes;
window.stopDragging = stopDragging;
window.snapGridSize = snapGridSize;