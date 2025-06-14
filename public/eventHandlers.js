
let isCanvasDragging = false;
let lastMouseX, lastMouseY;

function findNoteAtPosition(x, y) {
    let element = document.elementFromPoint(x, y);

    while (element && element !== document.body) {
        if (element.classList.contains('note')) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}


function findListNoteAbove(x, y) {
    const notes = Array.from(document.querySelectorAll('.note'));

    const note = findNoteAtPosition(x, y - snapGridSize) || findNoteAtPosition(x, y - snapGridSize * 2);
    if (note && note.classList.contains('list')) {
        var rect = note.getBoundingClientRect();
        if (Math.abs(rect.left - x) <= 160) {
            return note;
        }
    }

    return null;
}

function findListNoteBelow(x, y) {
    const notes = Array.from(document.querySelectorAll('.note'));

    const note = findNoteAtPosition(x, y + snapGridSize) || findNoteAtPosition(x, y + snapGridSize * 2);
    if (note && note.classList.contains('list')) {
        var rect = note.getBoundingClientRect();
        if (Math.abs(rect.left - x) <= 160) {
            return note;
        }
    }

    return null;
}

function stopCanvasDragging() {
    document.body.classList.remove('right-click-dragging');
    isCanvasDragging = false;
}

function startCanvasDragging(e) {
    document.body.classList.add('right-click-dragging');
    isCanvasDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}


function handleCanvasMouseDown(e) {
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    mouseDownPos = {
        x: e.clientX + scrollLeft,
        y: e.clientY + scrollTop
    };

    if (e.button === 1) {
        e.preventDefault(); // Prevent context menu
        startCanvasDragging(e);
        return;
    }

    if (e.target === canvas) {
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
        } else {
            e.target.focus();
        }
    }
}

SCROLL_MULTIPLIER = 1.5;

function handleCanvasMouseMove(e) {
    if (isCanvasDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        window.scrollBy(-dx * SCROLL_MULTIPLIER, -dy * SCROLL_MULTIPLIER);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
    }

    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Handle horizontal selection line when near the left edge
    if (e.clientX <= EDGE_PROXIMITY) {
        showHorizontalLine(e.clientY);
        hideVerticalLine(); // Hide vertical line when showing horizontal
    }
    // Handle vertical selection line when near the top edge and past the minimum X position
    else if (e.clientY <= TOP_PROXIMITY && e.clientX >= MIN_X_POSITION) {
        showVerticalLine(e.clientX);
        hideHorizontalLine(); // Hide horizontal line when showing vertical
    } else {
        hideHorizontalLine();
        hideVerticalLine();
    }

    if (isDragging) {
        dragSelectedNotes(e);
    } else if (e.buttons === 1 && e.target === canvas) {
        const dx = (e.clientX + scrollLeft) - mouseDownPos.x;
        const dy = (e.clientY + scrollTop) - mouseDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) {
            isSelecting = true;
            if (!selectionBox) {
                createSelectionBox(mouseDownPos.x, mouseDownPos.y);
            }
        }
    }

    if (isSelecting && selectionBox) {
        updateSelectionBox(e.clientX + scrollLeft, e.clientY + scrollTop);
        highlightSelection();
    }
}

function handleCanvasMouseUp(e) {
    if (e.button === 1) {
        stopCanvasDragging();
        return;
    }

    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Check if clicking near the left edge with horizontal line visible
    if (e.clientX <= EDGE_PROXIMITY && horizontalLine && horizontalLine.style.opacity === '1') {
        handleHorizontalSelection(e.clientY);
        hideHorizontalLine();
        return;
    }

    // Check if clicking near the top edge with vertical line visible
    if (e.clientY <= TOP_PROXIMITY && e.clientX >= MIN_X_POSITION && verticalLine && verticalLine.style.opacity === '1') {
        handleVerticalSelection(e.clientX);
        hideVerticalLine();
        return;
    }

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

        if (e.target.tagName === 'A' && !e.metaKey && !e.shiftKey) {
            window.open(e.target.href, '_blank');
            return;
        }

        editNote(e);
    } else if (e.target === canvas) {
        let dx = (e.clientX + scrollLeft) - mouseDownPos.x;
        let dy = (e.clientY + scrollTop) - mouseDownPos.y;


        if (Math.sqrt(dx * dx + dy * dy) <= CLICK_THRESHOLD) {
            const listNoteAbove = findListNoteAbove(e.clientX, e.clientY);
            const listNoteBelow = findListNoteBelow(e.clientX, e.clientY);

            if (listNoteAbove) {
                const listNoteRect = listNoteAbove.getBoundingClientRect();
                let newListNoteX = listNoteRect.left + scrollLeft;
                let newListNoteY = listNoteRect.top + scrollTop + snapGridSize * 2;
                createNote(newListNoteX, newListNoteY, nextBulletStr(listNoteAbove.bulletStr));
            } else if (listNoteBelow) {
                const listNoteRect = listNoteBelow.getBoundingClientRect();
                let newListNoteX = listNoteRect.left + scrollLeft;
                let newListNoteY = listNoteRect.top + scrollTop - snapGridSize * 2;
                createNote(newListNoteX, newListNoteY, nextBulletStr(listNoteBelow.bulletStr));
            } else {
                let newNoteX = evenNumber(e.clientX + scrollLeft, snapGridSize);
                let newNoteY = evenNumber(e.clientY + scrollTop, snapGridSize);
                createNote(newNoteX, newNoteY);
            }
        }
    }
    clearSelectionBox();
    hideHorizontalLine();
    hideVerticalLine();
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
    // Check if the title input is focused
    const isTitleEditing = document.activeElement &&
        document.activeElement.classList &&
        document.activeElement.classList.contains('title-edit-input');

    if (isTitleEditing) {
        // Don't intercept keydown events when editing the title
        return;
    }

    // Handle undo/redo shortcuts
    if (handleUndoRedoShortcuts(e)) {
        return; // Event was handled by undo/redo
    }

    if (e.key === 'Tab' && !currentlyEditing) {
        if (selectedNotes.size === 0) {
            e.preventDefault();
            selectFirstNote();
        } else {
            e.preventDefault();
            // Store positions before moving for undo
            const movements = [];
            selectedNotes.forEach(note => {
                movements.push({
                    noteId: note.getAttribute('data-id'),
                    oldPosition: {
                        x: parseInt(note.style.left),
                        y: parseInt(note.style.top)
                    }
                });
            });

            // Move notes
            const offset = e.shiftKey ? -1 * snapGridSize : snapGridSize;
            selectedNotes.forEach(note => {
                note.style.left = `${parseInt(note.style.left) + offset}px`;
                if (note.getAttribute('data-id')) {
                    saveNote(note);
                }
            });

            // Record final positions for undo
            movements.forEach(movement => {
                const note = document.querySelector(`.note[data-id="${movement.noteId}"]`);
                if (note) {
                    movement.newPosition = {
                        x: parseInt(note.style.left),
                        y: parseInt(note.style.top)
                    };
                }
            });

            // Record the multi-move action
            recordMultiMoveAction(movements);
        }
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        !currentlyEditing &&
        !e.metaKey) {
        e.preventDefault();
        if (selectedNotes.size === 1 && !e.ctrlKey) {
            moveSelection(e.key);
        } else if (selectedNotes.size > 1 || e.ctrlKey) {
            // Store positions before moving for undo
            const movements = [];
            selectedNotes.forEach(note => {
                movements.push({
                    noteId: note.getAttribute('data-id'),
                    oldPosition: {
                        x: parseInt(note.style.left),
                        y: parseInt(note.style.top)
                    }
                });
            });

            // Move notes
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

                if (note.getAttribute('data-id')) {
                    saveNote(note);
                }
            });

            // Record final positions for undo
            movements.forEach(movement => {
                const note = document.querySelector(`.note[data-id="${movement.noteId}"]`);
                if (note) {
                    movement.newPosition = {
                        x: parseInt(note.style.left),
                        y: parseInt(note.style.top)
                    };
                }
            });

            // Record the multi-move action
            recordMultiMoveAction(movements);
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
            // Record the delete action for undo
            if (selectedNotes.size === 1) {
                recordDeleteAction(Array.from(selectedNotes)[0]);
            } else {
                recordMultiDeleteAction(selectedNotes);
            }
            deleteSelectedNotes();
        }
    } else if (e.key === "Escape") {
        if (currentlyEditing) {
            const note = currentlyEditing;

            // Check if this is a note created by command-click that is being edited
            // and the user pressed Escape without entering any text
            if (lastCommandClickData &&
                lastCommandClickData.newNote === note &&
                Date.now() - lastCommandClickData.timestamp < 30000) {

                // User wants to undo the command-click operation

                // Get the value of the input to check if it's semantically empty
                const input = note.querySelector('.note-input');
                const isEmpty = input && isMeaninglessContent(input.value);

                if (isEmpty) {
                    // Delete the newly created empty note
                    deleteSingleNote(note);

                    // Restore original positions of moved notes
                    lastCommandClickData.originalPositions.forEach(item => {
                        item.note.style.top = `${item.top}px`;
                        sendToBackend(item.note);
                    });

                    updateCanvasSize();
                    lastCommandClickData = null; // Clear the command-click data
                    currentlyEditing = null;
                    return;
                }
            }

            // Normal behavior for Escape during editing
            saveNote(note);
            clearSelection();
            selectNote(note);
            currentlyEditing = null;
        } else if (selectedNotes.size > 0) {
            clearSelection();
        }
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        console.log("HI THERE");
        e.preventDefault();
        toggleSidebar();
    } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
    } else if (e.key == 'l' && (e.ctrlKey)) {
        // Rotate through possible bullet types

        e.preventDefault();
        if (selectedNotes.size === 0) return;

        let first_note = Array.from(selectedNotes)[0];

        selectedNotes.forEach(note => {
            if (parseInt(first_note.style.top) > parseInt(note.style.top)) {
                first_note = note;
            }
        });

        const bullets = ['[]', '•', '-', ''];
        const bulletIndex = bullets.indexOf(first_note.bulletStr || '');
        let newBullet = bullets[(bulletIndex + 1) % bullets.length];
        if (newBullet !== '') {
            newBullet = `${newBullet} `;
        }

        selectedNotes.forEach(note => {
            const pre = note.querySelector('pre');
            pre.textContent = newBullet + pre.textContent.replace(/^(\[[xX ]?\]|[•*-])\s*/, '');
            saveNote(note);
        });
    } else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        toggleSearchOverlay();
    }

    maybeCopySelectedNotes(e);
    maybeCutSelectedNotes(e);
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

function nextBulletStr(bulletStr) {
    if (bulletStr.match(numberRegex_Begin)) {
        const number = parseInt(bulletStr.match(numberRegex_Begin)[0]);
        return `${number + 1}. `;
    } else {
        return bulletStr + ' ';
    }
}

function handleInput(e) {
    if (e.key === 'Enter' && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();

        const offset = e.shiftKey ? -1 * snapGridSize * 2 : snapGridSize * 2;


        const note = e.target.closest('.note');
        saveNote(note);

        // +1 to go to the next one
        let newNoteX = evenNumber(parseInt(note.style.left), snapGridSize);
        let newNoteY = evenNumber(parseInt(note.style.top), snapGridSize) + offset;

        let existingNote = document.elementFromPoint(newNoteX - window.scrollX + 4, newNoteY - window.scrollY + 4);
        existingNote = existingNote ? existingNote.closest('.note') : null;

        if (existingNote && existingNote !== note && existingNote.style.left === note.style.left) {
            editNote(existingNote);
            return;
        }

        if (note.classList.contains('list')) {
            createNote(newNoteX, newNoteY, nextBulletStr(note.bulletStr));
        } else {
            createNote(newNoteX, newNoteY);
        }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const note = e.target.closest('.note');

        const rect = note.getBoundingClientRect();
        let newNoteX = evenNumber(rect.right + window.scrollX + snapGridSize, snapGridSize);
        let newNoteY = evenNumber(rect.top + window.scrollY, snapGridSize);

        createNote(newNoteX, newNoteY);

        // Important to do this after creating the new note, so the note will still exist when we need it.
        saveNote(note);
    } else if (e.key === 'Tab') {
        if (e.target.tagName === 'INPUT') {
            e.preventDefault();
            const note = e.target.closest('.note');
            const offset = e.shiftKey ? -1 * snapGridSize : snapGridSize;
            note.style.left = `${parseInt(note.style.left) + offset}px`

            const input = e.target;
            const regex = /^(•|-|\[x?\]|\d+\.)\s*/;
            if (input.value.match(regex) && !e.shiftKey) {
                input.value = input.value.replace(regex, '');
                note.classList.remove('list');
            }

            if (note.getAttribute('data-id') && !isMeaninglessContent(input.value)) {
                saveNote(note, { doNotRemove: true });
                editNote(note);
            }
        }
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? -5 * snapGridSize : -1 * snapGridSize;
        note.style.top = `${parseInt(note.style.top) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note, { doNotRemove: true });
            editNote(note);
        }
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? 5 * snapGridSize : snapGridSize;
        note.style.top = `${parseInt(note.style.top) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note, { doNotRemove: true });
            editNote(note);
        }
    } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? -5 * snapGridSize : -1 * snapGridSize;
        note.style.left = `${parseInt(note.style.left) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note, { doNotRemove: true });
            editNote(note);
        }
    } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        const offset = e.shiftKey ? 5 * snapGridSize : snapGridSize;
        note.style.left = `${parseInt(note.style.left) + offset}px`
        if (note.getAttribute('data-id')) {
            saveNote(note, { doNotRemove: true });
            editNote(note);
        }
    } else if (e.key === 'Backspace' && e.ctrlKey) {
        e.preventDefault();
        const note = e.target.closest('.note');
        if (note.getAttribute('data-id')) {
            deleteSingleNote(note);
        }
    }


}

async function handleImagePaste(e, clipboardItem, type) {
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
        let x = clientX + scrollLeft;
        let y = clientY + scrollTop;


        if (currentlyEditing) {
            const note = currentlyEditing;

            x = parseInt(note.style.left) + scrollLeft;
            y = parseInt(note.style.top) + scrollTop;

            saveNote(note);
            currentlyEditing = null;
            clearSelection();
        }

        createNoteWithImage(data.imageUrl, x, y);
    } catch (error) {
        console.error('Error uploading image:', error);
    }
    return;
}

async function handleHtmlPaste(e, clipboardItem) {
    e.preventDefault();

    const blob = await clipboardItem.getType('text/html');
    const text = await blob.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const notes = tempDiv.querySelectorAll('.note');

    // Calculate minimum position of original notes
    let minX = Infinity, minY = Infinity;
    notes.forEach(note => {
        minX = Math.min(minX, parseInt(note.style.left));
        minY = Math.min(minY, parseInt(note.style.top));
    });

    // Get scroll offsets
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let offsetX, offsetY;

    if (currentlyEditing) {
        offsetX = evenNumber(parseInt(currentlyEditing.style.left) + scrollLeft - minX, snapGridSize);
        offsetY = evenNumber(parseInt(currentlyEditing.style.top) + scrollTop - minY, snapGridSize);

        saveNote(currentlyEditing)
        currentlyEditing = null;
        clearSelection();
    } else {
        // Calculate offset to center around mouse position, including scroll offsets
        offsetX = evenNumber(clientX + scrollLeft - minX, snapGridSize);
        offsetY = evenNumber(clientY + scrollTop - minY, snapGridSize);
    }

    let id_counter = 0;

    clearSelection();

    notes.forEach(note => {
        const newNote = createNoteElement(
            Date.now().toString() + '-' + id_counter,
            parseInt(note.style.left) + offsetX,
            parseInt(note.style.top) + offsetY,
            note.textContent
        );

        id_counter++;

        sendToBackend(newNote);
        selectNote(newNote);
    });


    tempDiv.remove();

    updateCanvasSize();
}

async function handleMultilineTextPaste(text) {
    // Split text into lines and handle both \n and \r\n line endings
    const lines = text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0); // Skip empty lines

    if (lines.length <= 1) return false; // Not multiline text

    // Get scroll offsets
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let x, y;

    if (currentlyEditing) {
        // If we're editing a note, replace it with the first line
        // and add the rest below it
        const note = currentlyEditing;
        x = parseInt(note.style.left);
        y = parseInt(note.style.top);

        // Replace current note's content with the first line
        const input = note.querySelector('.note-input');
        if (input) {
            input.value = lines[0];
            saveNote(note);
        }

        // Start creating new notes below the current one
        for (let i = 1; i < lines.length; i++) {
            y += snapGridSize * 2; // Move down for each new note
            const newNote = createNoteElement(
                Date.now().toString() + '-' + i,
                x,
                y,
                lines[i]
            );
            sendToBackend(newNote);
        }

        currentlyEditing = null;
    } else {
        // If not editing, create all lines as new notes at cursor position
        x = evenNumber(clientX + scrollLeft, snapGridSize);
        y = evenNumber(clientY + scrollTop, snapGridSize);

        lines.forEach((line, index) => {
            const yPos = y + (index * snapGridSize * 2);
            const newNote = createNoteElement(
                Date.now().toString() + '-' + index,
                x,
                yPos,
                line
            );
            sendToBackend(newNote);
        });
    }

    updateCanvasSize();
    return true; // Successfully handled multiline paste
}

async function handleSingleLineTextPaste(text, e) {
    // If editing a note, allow default behavior for single line paste
    if (currentlyEditing) {
        // Let the default paste action happen in the input field
        return false;
    }

    // If not editing, create a new note at cursor position
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    const x = evenNumber(clientX + scrollLeft, snapGridSize);
    const y = evenNumber(clientY + scrollTop, snapGridSize);

    const newNote = createNoteElement(
        Date.now().toString(),
        x,
        y,
        text
    );
    sendToBackend(newNote);
    updateCanvasSize();

    return true;
}

async function handlePaste(e) {
    // If paste is directly in an input field, don't interfere with default behavior
    // This case is now handled by the keyup event handler
    if (e.target.tagName === 'INPUT' && e.target.classList.contains('note-input')) {
        return;
    }

    // For pastes outside of input fields
    const clipboardItems = await navigator.clipboard.read();

    for (const clipboardItem of clipboardItems) {
        // First check for HTML paste
        if (clipboardItem.types.includes('text/html')) {
            await handleHtmlPaste(e, clipboardItem);
            return;
        }

        // Then check for plain text, which might be multiline
        if (clipboardItem.types.includes('text/plain')) {
            const blob = await clipboardItem.getType('text/plain');
            const text = await blob.text();

            // Handle multi-line text as a special case
            if (await handleMultilineTextPaste(text)) {
                return;
            }

            // Handle single line text
            if (await handleSingleLineTextPaste(text, e)) {
                return;
            }
        }

        // Handle image paste
        for (const type of clipboardItem.types) {
            if (type.startsWith('image/')) {
                await handleImagePaste(e, clipboardItem, type);
                return;
            }
        }
    }
}


searchInput.addEventListener('input', searchCanvases);

// on blur, un-show search
document.body.addEventListener('click', (e) => {
    if (e.target.closest('#search-overlay') && !e.target.closest('.overlay-content')) {
        toggleSearchOverlay();
        fetch('/api/canvases')
            .then(response => response.json())
            .then(canvases => {
                displaySearchResults(canvases);
            });
    }
})

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

function stopBoxSelection() {
    // Make sure isSelecting is defined
    if (typeof isSelecting !== 'undefined' && isSelecting) {
        isSelecting = false;
        finalizeSelection();
    }
}

// Add global mouseup event listener
document.addEventListener('mouseup', stopCanvasDragging);
document.addEventListener('mouseup', stopBoxSelection);

// Add click-outside-to-close sidebar functionality
document.addEventListener('click', (e) => {
  // Check if sidebar is visible and click is outside sidebar
  if (window.sidebarVisible && !e.target.closest('.tab-sidebar') && !e.target.closest('#current-tab-name')) {
    window.hideSidebar();
  }
});


window.addEventListener("blur", function (event) {
    if (event.target == window) {
        stopBoxSelection();
        clearSelectionBox();
    }
});