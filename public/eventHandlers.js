

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

        if (clickedNote.classList.contains('link') && !e.metaKey && !e.shiftKey) {
            window.open(clickedNote.querySelector('a').href, '_blank');
            return;
        }

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
            let newNoteX = evenNumber(e.clientX + scrollLeft, snapGridSize);
            let newNoteY = evenNumber(e.clientY + scrollTop, snapGridSize);
            createNote(newNoteX, newNoteY);
        }
    }
    clearSelectionBox();
}

function selectFirstNote() {
    const notes = Array.from(document.querySelectorAll('.note'));
    if (notes.length === 0) return; // No notes to select

    let topLeftNote = notes[0];
    let minDistance = Infinity;

    notes.forEach(note => {
        const rect = note.getBoundingClientRect();
        const distance = Math.sqrt(rect.left * rect.left + rect.top * rect.top);
        
        if (distance < minDistance) {
            minDistance = distance;
            topLeftNote = note;
        }
    });

    clearSelection();
    selectNote(topLeftNote);
}

let searchOverlay = document.getElementById('search-overlay');
let searchInput = document.getElementById('canvas-search');
let searchResults = document.getElementById('search-results');

function toggleSearchOverlay() {


    fetch('/api/canvases')
    .then(response => response.json())
    .then(canvases => {
        displaySearchResults(canvases);
    }).then(() => {
        searchOverlay.style.display = searchOverlay.style.display === 'block' ? 'none' : 'block';
        if (searchOverlay.style.display === 'block') {
            searchInput.focus();
        }
    });
}

function displaySearchResults(canvases) {
    searchResults.innerHTML = '';
    canvases.forEach((canvas, index) => {
        const resultElement = document.createElement('div');
        resultElement.classList.add('search-result');
        resultElement.dataset.id = canvas.id;
        resultElement.textContent = canvas.name;
        resultElement.addEventListener('click', () => {
            navigateToCanvas(canvas.id);
        });
        searchResults.appendChild(resultElement);
    });
}

function navigateToCanvas(canvasId) {
    window.location.href = `/canvas.html?id=${canvasId}`;
}

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const firstResult = searchResults.querySelector('.search-result');
        if (firstResult) {
            const canvasId = firstResult.dataset.id;
            navigateToCanvas(canvasId);
        }
    }
});

function searchCanvases() {
    const query = searchInput.value.toLowerCase();
    fetch('/api/canvases')
        .then(response => response.json())
        .then(canvases => {
            const options = {
                keys: ['name'],
                threshold: 0.3,
            };
            const fuse = new Fuse(canvases, options);
            const filteredCanvases = fuse.search(query).map(result => result.item);
            displaySearchResults(filteredCanvases);
        });
}

function handleKeyDown(e) {
    if (e.key === 'Tab' && !currentlyEditing) {
        if (selectedNotes.size === 0) {
            e.preventDefault();
            selectFirstNote();
        } else {
            e.preventDefault();
            const offset = e.shiftKey ? -1 * snapGridSize : snapGridSize;
            selectedNotes.forEach(note => {
                note.style.left = `${parseInt(note.style.left) + offset}px`;
                console.log("note", note, note.getAttribute('data-id'));
                if (note.getAttribute('data-id')) {
                    saveNote(note);
                }
            });
        }
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && 
               !currentlyEditing && 
               !e.ctrlKey && 
               !e.metaKey) {
        e.preventDefault();
        if (selectedNotes.size === 1) {
            moveSelection(e.key);
        } else if (selectedNotes.size > 1) {
            const offset = e.shiftKey ? snapGridSize * 5 : snapGridSize;
            selectedNotes.forEach(note => {
                if (e.key === 'ArrowUp') {
                    note.style.top = `${parseInt(note.style.top) - offset}px`;
                } else if (e.key === 'ArrowDown') {
                    note.style.top = `${parseInt(note.style.top) + offset}px`;
                } else if (e.key === 'ArrowLeft') {
                    note.style.left = `${parseInt(note.style.left) - offset}px`;
                } else if (e.key === 'ArrowRight') {
                    note.style.left = `${parseInt(note.style.left) + offset}px`;
                }
                console.log("note", note, note.getAttribute('data-id'));
                if (note.getAttribute('data-id')) {
                    saveNote(note);
                }
            });
        } else if (selectedNotes.size === 0) {
            selectFirstNote();
        }
    } else if (e.key === 'Enter' && !currentlyEditing && selectedNotes.size === 1) {
        e.preventDefault();
        const selectedNote = Array.from(selectedNotes)[0];
        editNote(selectedNote);
    } else if (e.key === 'Backspace') {
        const activeElement = document.activeElement;
        const isEditing = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

        if (!isEditing && selectedNotes.size > 0) {
            e.preventDefault();
            deleteSelectedNotes();
        }
    } else if (e.key === "Escape") {
        if (currentlyEditing) {
            const note = currentlyEditing;
            saveNote(note);
            clearSelection();
            selectNote(note);
            currentlyEditing = null;
        } else if (selectedNotes.size > 0) {
            clearSelection();
        }
    } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
    } else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggleSearchOverlay();
    }
}

function moveSelection(direction) {
    const currentNote = Array.from(selectedNotes)[0];
    const currentRect = currentNote.getBoundingClientRect();
    const notes = Array.from(document.querySelectorAll('.note'));
    
    let closestNote = null;
    let minDistance = Infinity;

    notes.forEach(note => {
        if (note === currentNote) return;
        
        const rect = note.getBoundingClientRect();
        let distance;

        switch (direction) {
            case 'ArrowUp':
                if (rect.bottom <= currentRect.top) {
                    distance = Math.hypot(rect.left - currentRect.left, rect.bottom - currentRect.top);
                }
                break;
            case 'ArrowDown':
                if (rect.top >= currentRect.bottom) {
                    distance = Math.hypot(rect.left - currentRect.left, rect.top - currentRect.bottom);
                }
                break;
            case 'ArrowLeft':
                if (rect.right <= currentRect.left) {
                    distance = Math.hypot(rect.right - currentRect.left, rect.top - currentRect.top);
                }
                break;
            case 'ArrowRight':
                if (rect.left >= currentRect.right) {
                    distance = Math.hypot(rect.left - currentRect.right, rect.top - currentRect.top);
                }
                break;
        }

        if (distance !== undefined && distance < minDistance) {
            minDistance = distance;
            closestNote = note;
        }
    });

    if (closestNote) {
        clearSelection();
        selectNote(closestNote);
    }
}


function handleInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const note = e.target.closest('.note');
        saveNote(note);

        // +1 to go to the next one
        let newNoteX = evenNumber(parseInt(note.style.left), snapGridSize);
        let newNoteY = evenNumber(parseInt(note.style.top), snapGridSize) + snapGridSize * 2;

        if (note.classList.contains('list')) {
            createNote(newNoteX, newNoteY, note.bulletStr + ' ');
        } else {
            createNote(newNoteX, newNoteY);
        }
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

async function handlePaste(e) {
    const clipboardItems = await navigator.clipboard.read();
    
    for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
            if (type.startsWith('image/')) {
                // only prevent default if the clipboard item is an image
                e.preventDefault();

                const blob = await clipboardItem.getType(type);
                const uuid = crypto.randomUUID();
                const formData = new FormData();
                formData.append('image', blob, `pasted_image_${uuid}.png`);

                try {
                    const response = await fetch('/api/upload-image', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();

                    // Get the current scroll position
                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    
                    // Calculate the position for the new note
                    const x = clientX + scrollLeft;
                    const y = clientY + scrollTop;
                    
                    createNoteWithImage(data.imageUrl, x, y);
                } catch (error) {
                    console.error('Error uploading image:', error);
                }
                return;
            }
        }
    }
}


searchInput.addEventListener('input', searchCanvases);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchOverlay.style.display === 'block') {
        toggleSearchOverlay();
        fetch('/api/canvases')
        .then(response => response.json())
        .then(canvases => {
            displaySearchResults(canvases);
        });    
    } else if (e.key === 'Meta' || e.key === 'Shift') {
        document.body.classList.add('meta-or-shift-pressed');
    }
});

document.addEventListener('keyup', (e) => {
    if ((e.key === 'Meta' || e.key === 'Shift') && document.body.classList.contains('meta-or-shift-pressed')) {
        document.body.classList.remove('meta-or-shift-pressed');
    }
});


// Make all functions global
window.handleCanvasMouseDown = handleCanvasMouseDown;
window.handleCanvasMouseMove = handleCanvasMouseMove;
window.handleCanvasMouseUp = handleCanvasMouseUp;
window.handleKeyDown = handleKeyDown;
window.handleInput = handleInput;
window.moveSelection = moveSelection;
window.handlePaste = handlePaste;
window.handleKeyDown = handleKeyDown;
