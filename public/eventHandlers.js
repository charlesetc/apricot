// eventHandlers.js

function handleCanvasMouseDown(e) {
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (e.target === canvas) {
        mouseDownPos = { 
            x: e.clientX + scrollLeft, 
            y: e.clientY + scrollTop 
        };
        selectionStart = { 
            x: e.clientX + scrollLeft, 
            y: e.clientY + scrollTop 
        };
        clearSelectionBox();
        if (!e.ctrlKey && !e.shiftKey) {
            clearSelection();
        }
    } else if (e.target.closest('.note')) {
        const clickedNote = e.target.closest('.note');

        console.log("woah", e.target)

        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            if (!selectedNotes.has(clickedNote)) {
                if (!e.ctrlKey && !e.shiftKey) {
                    clearSelection();
                }
                selectNote(clickedNote);
            }
            startDragging(e);
            dragStartTime = Date.now();
        } else {
            e.target.focus();
        }
    }
}

function handleCanvasMouseMove(e) {
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (isDragging) {
        dragSelectedNotes(e);
    } else if (e.buttons === 1 && e.target === canvas) {
        const dx = (e.clientX + scrollLeft) - mouseDownPos.x;
        const dy = (e.clientY + scrollTop) - mouseDownPos.y;
        if (Math.sqrt(dx*dx + dy*dy) > CLICK_THRESHOLD) {
            isSelecting = true;
            if (!selectionBox) {
                createSelectionBox(mouseDownPos.x, mouseDownPos.y);
            }
        }
    }
    
    if (isSelecting && selectionBox) {
        updateSelectionBox(e.clientX + scrollLeft, e.clientY + scrollTop);
    }
}

function handleCanvasMouseUp(e) {
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (isSelecting) {
        isSelecting = false;
        finalizeSelection();
    } else if (isDragging) {
        stopDragging();
        const dragEndTime = Date.now();
        const dragDuration = dragEndTime - dragStartTime;
        if (dragDuration < 200 && e.target.closest('.note')) {
            editNote(e);
        }
    } else if (e.target.closest('.note')) {
        editNote(e);
    } else if (e.target === canvas) {
        const dx = (e.clientX + scrollLeft) - mouseDownPos.x;
        const dy = (e.clientY + scrollTop) - mouseDownPos.y;
        if (Math.sqrt(dx*dx + dy*dy) <= CLICK_THRESHOLD) {
            createNote(e.clientX, e.clientY);
        }
    }
    clearSelectionBox();
}

function handleKeyDown(e) {
    if (e.key === 'Backspace') {
        // Check if the active element is an input or textarea
        const activeElement = document.activeElement;
        const isEditing = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

        // Only delete selected notes if we're not editing
        if (!isEditing && selectedNotes.size > 0) {
            e.preventDefault(); // Prevent browser back navigation
            deleteSelectedNotes();
        }
    } else if (e.key === "Escape") {
        clearSelection();
    }
}

function handleInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const note = e.target.closest('.note');
        saveNote(note);

        // Get the current scroll position
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Calculate the position for the new note
        const newNoteX = parseInt(note.style.left) - scrollLeft;
        const newNoteY = parseInt(note.style.top) + note.offsetHeight + 10 - scrollTop;

        // Create the new note at the calculated position
        createNote(newNoteX, newNoteY);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        const note = e.target.closest('.note');
        saveNote(note);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.target.tagName === 'INPUT') {
            const textarea = document.createElement('textarea');
            textarea.className = 'note-input';
            textarea.value = e.target.value;
            textarea.style.height = 'auto';
            textarea.addEventListener('keydown', handleInput);
            textarea.addEventListener('blur', function() {
                const note = this.closest('.note');
                if (note) {
                    saveNote(note);
                }
            });
            
            e.target.parentElement.replaceChild(textarea, e.target);
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }
}


// Make all functions global
window.handleCanvasMouseDown = handleCanvasMouseDown;
window.handleCanvasMouseMove = handleCanvasMouseMove;
window.handleCanvasMouseUp = handleCanvasMouseUp;
window.handleKeyDown = handleKeyDown;
window.handleInput = handleInput;