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
        let dx = (e.clientX + scrollLeft) - mouseDownPos.x;
        let dy = (e.clientY + scrollTop) - mouseDownPos.y;

        if (Math.sqrt(dx*dx + dy*dy) <= CLICK_THRESHOLD) {
            let newNoteX = evenNumber(e.clientX, snapGridSize);
            let newNoteY = evenNumber(e.clientY, snapGridSize);
            createNote(newNoteX, newNoteY);
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
    } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); // Prevent browser save
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
        let newNoteX = parseInt(note.style.left) - scrollLeft;
        let newNoteY = parseInt(note.style.top) + note.offsetHeight + snapGridSize - scrollTop;

        newNoteX = evenNumber(newNoteX, snapGridSize);
        newNoteY = evenNumber(newNoteY, snapGridSize);

        // Create the new note at the calculated position
        createNote(newNoteX, newNoteY);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        const note = e.target.closest('.note');
        saveNote(note);
    } else if (e.key === 'Tab') {
        if (e.target.tagName === 'INPUT') {
            e.preventDefault();
            const note = e.target.closest('.note');
            const offset = e.shiftKey ? -1 * snapGridSize : snapGridSize;
            note.style.left = `${parseInt(note.style.left) + offset}px`
            if (note.getAttribute('data-id')) {
                saveNote(note);
                editNote(note);
            }
        }
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? -5 * snapGridSize : -1 * snapGridSize;
        note.style.top = `${parseInt(note.style.top) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note);
            editNote(note);
        }
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? 5 * snapGridSize : snapGridSize;
        note.style.top = `${parseInt(note.style.top) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note);
            editNote(note);
        }
    } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? -5 * snapGridSize : -1 * snapGridSize;
        note.style.left = `${parseInt(note.style.left) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note);
            editNote(note);
        }
    } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? 5 * snapGridSize : snapGridSize;
        note.style.left = `${parseInt(note.style.left) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note);
            editNote(note);
        }
    } else if (e.key === 'Backspace' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        if (note.getAttribute('data-id')) {
            deleteNoteFromBackend(note.getAttribute('data-id'));
            note.remove();
        }
    }
}


// Make all functions global
window.handleCanvasMouseDown = handleCanvasMouseDown;
window.handleCanvasMouseMove = handleCanvasMouseMove;
window.handleCanvasMouseUp = handleCanvasMouseUp;
window.handleKeyDown = handleKeyDown;
window.handleInput = handleInput;