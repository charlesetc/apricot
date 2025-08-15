function loadNotes() {
    fetch(`/api/notes/${canvasId}`)
        .then(response => response.json())
        .then(notes => {
            canvas.innerHTML = ''; // Clear existing notes
            
            // Filter notes for current tab only
            const currentTabId = getCurrentTabId();
            const filteredNotes = notes.filter(note => {
                // Show notes that belong to current tab, or notes without tab_id (for backward compatibility)
                return note.tab_id === currentTabId || (!note.tab_id && currentTabId);
            });
            
            filteredNotes.forEach(note => {
                createNoteElement(note.id, note.x, note.y, note.text);
            });
            updateCanvasSize();
        })
        .catch(error => console.error('Error loading notes:', error));
}


function createNoteElement(id, x, y, text) {
    const note = document.createElement('div');
    note.className = 'note';

    note.style.left = `${x}px`;
    note.style.top = `${y}px`;
    
    note.setAttribute('data-id', id);

    initializeNoteContents(note, text);

    note.addEventListener('mousedown', handleNoteMouseDown);
    canvas.appendChild(note);

    return note;
}

function initializeNoteContents(note, text) {

    if (text.startsWith('* ') || text == '*') {
        text = text.replace(/^\* /, '• ');
    }

    if (/^(https?:\/\/[^\s]+)$/.test(text)) {
        text = `[${text}](${text})`;
    }

    const pre = document.createElement('pre');
    pre.textContent = text;
    note.innerHTML = '';
    note.appendChild(pre);
    note.setAttribute('data-id', note.getAttribute('data-id') || Date.now().toString());



    maybeCreateImage(note, text, pre);
    maybeCreateLinkNote(note, text, pre);
    maybeCreateTagLink(note, text, pre);
    maybeCreateStrikethrough(note, text, pre);
    
    if (text.startsWith('#') && !isTagNote(text)) {
        note.classList.add('header');
    } else {
        note.classList.remove('header');
    }
    
    if (text.startsWith('• ') || text == '•'
    || text.startsWith('- ') || text == '-') {
        note.classList.add('list');
        note.bulletStr = text.charAt(0);
    } else if (text.match(numberRegex_Begin)) {
        note.classList.add('list');
        note.bulletStr = text.match(numberRegex_Begin)[0];
    } else {
        note.bulletStr = '';
        note.classList.remove('list');
    }

    maybeCreateCheckbox(note, text, pre);
}

function handleNoteMouseDown(e) {
    if (e.button === 1) {
        return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.target.type != 'checkbox') return; // Allow normal interaction with non-checkbox input fields
    }

    const note = e.target.closest('.note');
    if (!note) return;

    // Store the initial position
    dragStartPos = { x: e.clientX, y: e.clientY, note };

    // Add mousemove and mouseup listeners to the document
    document.addEventListener('mousemove', handleNoteDrag);
    document.addEventListener('mouseup', handleNoteMouseUp);

    e.preventDefault(); // Prevent text selection
}

function handleNoteDrag(e) {
    if (dragStartPos === null) return;
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;

    if (Math.sqrt(dx*dx + dy*dy) > DRAG_THRESHOLD) {
        // We've exceeded the drag threshold, start dragging
        document.removeEventListener('mousemove', handleNoteDrag);
        document.removeEventListener('mouseup', handleNoteMouseUp);
        startDragging(dragStartPos.note, e);
        e.stopPropagation();
    }
}

function isWithinDragThreshold(e) {
    if (dragStartPos === null) return false;
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;
    return Math.sqrt(dx * dx + dy * dy) <= DRAG_THRESHOLD;
}

function handleNoteMouseUp(e) {
    document.removeEventListener('mousemove', handleNoteDrag);
    document.removeEventListener('mouseup', handleNoteMouseUp);

    // reset the drag start pos so that we can resume creating selection boxes on the canvas

    if (dragStartPos === null || isWithinDragThreshold(e)) {
        // This was a click, not a drag
        if (e.metaKey || e.ctrlKey) {
            // Handle command/ctrl click to insert a new note in a list
            handleCommandClickInList(e);
        } else {
            editNote(e);
        }
    }

    dragStartPos = null;
}

function handleCommandClickInList(e) {
    const clickedNote = e.target.closest('.note');
    if (!clickedNote) return;
    
    // Get the position of the clicked note
    const clickedX = parseInt(clickedNote.style.left);
    const clickedY = parseInt(clickedNote.style.top);
    
    // Define tolerance ranges (more tolerance to the right than left)
    const leftTolerance = 2 * snapGridSize; 
    const rightTolerance = 10 * snapGridSize;
    
    // Find all notes that are part of the same vertical list
    // They can be slightly to the left or right of the clicked note
    const allNotes = Array.from(document.querySelectorAll('.note'));
    
    // Include the clicked note itself and all notes below it in the list
    const notesInList = allNotes.filter(note => {
        const noteX = parseInt(note.style.left);
        const noteY = parseInt(note.style.top);
        
        // Must be within horizontal tolerance range
        const xDiff = noteX - clickedX;
        if (xDiff < -leftTolerance || xDiff > rightTolerance) return false;
        
        // Must be at or below the clicked note
        if (noteY < clickedY) return false;
        
        // If it's the clicked note itself, include it
        if (note === clickedNote) return true;
        
        // For other notes, must be part of the list - check if it's at a position that's a multiple of snapGridSize*2
        // from the clicked note's position
        return true;
    });
    
    // Sort notes by Y position (top to bottom)
    notesInList.sort((a, b) => {
        return parseInt(a.style.top) - parseInt(b.style.top);
    });
    
    // Store the original positions before moving
    const originalPositions = notesInList.map(note => ({
        note: note,
        top: parseInt(note.style.top)
    }));
    
    // Move the clicked note and all notes below it down by snapGridSize * 2
    notesInList.forEach(note => {
        // Keep the original horizontal position when shifting down
        note.style.top = `${parseInt(note.style.top) + snapGridSize * 2}px`;
        sendToBackend(note);
    });
    
    // Create a new note at the original position of the clicked note
    let newNote;
    if (clickedNote.classList.contains('list')) {
        // For list items, use the same bullet type as the clicked note
        const bulletStr = (clickedNote.bulletStr || '') + ' ';
        newNote = createNote(clickedX, clickedY, bulletStr);
    } else {
        newNote = createNote(clickedX, clickedY);
    }
    
    // Store the command-click data for potential undo
    lastCommandClickData = {
        originalPositions: originalPositions,
        newNote: newNote,
        timestamp: Date.now()
    };
    
    // Record the command-click action for undo
    recordCommandClickAction(lastCommandClickData);
    
    updateCanvasSize();
}

function resizeInput(e) {
    e.target.style.width = `${e.target.value.length}ch`;
}

var currentlyEditing = null;


function createNote(x, y, text = null) {
    clearSelection();
    const note = createNoteElement(Date.now().toString(), x, y, text || '');
    // Record the create action for undo
    recordCreateAction(note);
    editNote(note);
    updateCanvasSize();
    return note; // Return the note element for tracking
}

window.createNote = createNote;

const numberRegex_BeginEnd = /^\d+\.\s*$/;
const numberRegex_Begin = /^\d+\.\s+/;

function isMeaninglessContent(text) {
    text = text.trim()
    return (
        text.length == 0
        || (text.length == 1 && [ '*', '-', '•', ].includes(text))
        || (text.length == 2 && [ '[]' ].includes(text))
        || (text.length == 3 && [ '[x]' ].includes(text))
        || (text.match(numberRegex_BeginEnd) !== null)
    )
}

function saveNote(note, { doNotRemove } = {}) {
    let text;

    if (note.querySelector('.note-input')) {
        const input = note.querySelector('.note-input');
        text = input.value.trim();
    } else {
        const pre = note.querySelector('pre');
        text = pre.textContent;
    }

    if (isMeaninglessContent(text) && !doNotRemove) {
        deleteSingleNote(note);
    } else {
        // Update any undo action associated with this note in the undo stack
        if (window.undoStack) {
            const noteId = note.getAttribute('data-id');
            // Look for any actions with this note ID
            for (const action of window.undoStack) {
                // Update create actions
                if (action.type === 'create' && action.noteId === noteId) {
                    action.content = text;
                }
                
                // Update delete actions
                if (action.type === 'delete' && action.noteId === noteId) {
                    action.content = text;
                }
                
                // Update multi-delete actions
                if (action.type === 'multi_delete' && action.notes) {
                    for (const noteData of action.notes) {
                        if (noteData.noteId === noteId) {
                            noteData.content = text;
                        }
                    }
                }
                
                // Update command-click actions
                if (action.type === 'command_click' && action.newNoteId === noteId) {
                    action.newNoteContent = text;
                }
            }
        }
        
        initializeNoteContents(note, text);
        sendToBackend(note);
    }

    note.classList.remove('editing');
    updateCanvasSize();
    
    // Reset the currentlyEditing variable
    currentlyEditing = null;

    return note;
}

function editNote(noteOrEvent) {
    let note;
    let isCommandClick = false;
    
    if (noteOrEvent instanceof Event) {
        var target = noteOrEvent.target;
        
        // Check if this is a command/ctrl click - if so, don't edit
        if (noteOrEvent.metaKey || noteOrEvent.ctrlKey) {
            isCommandClick = true;
        }
        
        if (target.tagName === 'INPUT' && target.type === 'checkbox') {
            return;
        }
        note = noteOrEvent.target.closest('.note');
    } else if (noteOrEvent instanceof Element) {
        note = noteOrEvent;
    } else {
        console.error('Invalid argument passed to editNote');
        return;
    }

    // Return early if this is a command click - let the event bubble up
    if (isCommandClick) {
        return;
    }

    if (!note) {
        console.warn('No note found to edit');
        return;
    }

    const pre = note.querySelector('pre');
    if (!pre) {
        console.warn('No pre element found in the note');
        return;
    }

    const text = pre ? pre.textContent : '';

    const input = document.createElement('input');
    input.className = 'note-input';
    input.value = text;
    
    input.type = 'text';
    input.style.width = `${Math.max(text.length, 2)}ch`;
    
    input.addEventListener('keydown', handleInput);
    input.addEventListener('input', resizeInput);
    input.addEventListener('blur', () => saveNote(note));

    note.innerHTML = '';
    note.appendChild(input);
    
    if (input.tagName === 'INPUT') {
        input.setSelectionRange(input.value.length, input.value.length);
    } else {
        input.setSelectionRange(input.value.length, input.value.length);
    }
    
    note.classList.add('editing');
    
    clearSelection();
    
    input.focus();
    // Set the currentlyEditing variable
    currentlyEditing = note;
}


function createNoteWithImage(imageUrl, x, y) {
    const note = createNoteElement(Date.now().toString(), x, y, `![Pasted Image](${imageUrl})`);
    sendToBackend(note);
    
    // Record paste action for undo
    recordPasteAction([note]);
    
    updateCanvasSize();
}

function maybeCreateImage(note, text, pre) {
    if (isImageMarkdown(text)) {
        const img = document.createElement('img');
        const match = text.match(/!\[.*?\]\((.*?)\)/);
        if (match && match[1]) {
            img.src = match[1];
            img.alt = 'Note Image';
            note.appendChild(img);
        }
        pre.style.display = 'none';
        note.classList.add('image');
    } else {
        note.classList.remove('image');
    }
}


function maybeCreateCheckbox(note, text, pre) {
    if (text.match(/^\[[xX ]?\]/)) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = text.match(/^\[[xX]\]/) !== null;
        checkbox.addEventListener('mouseup', e => {
            e.preventDefault();
            const newText = checkbox.checked ? '[] ' : '[x] ';
            const pre = note.querySelector('pre');
            pre.textContent = newText + pre.textContent.replace(/^\[[xX ]?\]\s*/, '');

            if (checkbox.checked) {
                note.classList.remove('checked');
            } else {
                note.classList.add('checked');
            }

            saveNote(note);
        });
        note.appendChild(checkbox);

        const textContent = document.createElement('span');
        textContent.classList.add('visual-element-only');
        textContent.textContent = text.replace(/^\[[xX ]?\]\s*/, '');
        note.appendChild(textContent);

        pre.style.display = 'none';
        note.classList.add('checkbox');
        note.classList.add('list');
        if (checkbox.checked) {
            note.classList.add('checked');
        }
        note.bulletStr = '[]';
    } else {
        note.classList.remove('checkbox');
        note.classList.remove('checked');
    }
}

function isLinkMarkdown(text) {
    return text.match(/\[(.*?)\]\((.*?)\)/) && !text.match(/!\[.*?\]\((.*?)\)/);
}

function maybeCreateLinkNote(note, text, pre) {
    if (isLinkMarkdown(text)) {
        const link = document.createElement('a');
        const match = text.match(/\[(.*?)\]\((.*?)\)/);
        if (match && match[1] && match[2]) {
            link.href = match[2];
            link.textContent = match[1];
            note.appendChild(link);
        }
        pre.style.display = 'none';
        note.classList.add('link');
    } else {
        note.classList.remove('link');
    }
}

function isTagNote(text) {
    return /^#\w+$/.test(text.trim());
}

function maybeCreateTagLink(note, text, pre) {
    if (isTagNote(text)) {
        const link = document.createElement('a');
        const tagName = text.trim().substring(1); // Remove the # symbol
        link.href = `/tag/${tagName}`;
        link.textContent = text.trim();
        link.classList.add('tag-link');
        note.appendChild(link);
        pre.style.display = 'none';
        note.classList.add('tag');
    } else {
        note.classList.remove('tag');
    }
}


function maybeCreateStrikethrough(note, text, pre) {
    if (text.match(/^~.*?~$/)) {
        const strikethrough_note = document.createElement('span');
        strikethrough_note.classList.add('visual-element-only')
        const content = text.match(/^~(.*?)~$/);
        if (content && content[1]) {
            strikethrough_note.textContent = content[1];
            strikethrough_note.style.textDecoration = 'line-through';
            note.appendChild(strikethrough_note);
        }
        pre.style.display = 'none';
        note.classList.add('strikethrough');
    } else {
        note.classList.remove('strikethrough');
    }
}


function copySelectedNotes() {
    // Copy HTML for pasting notes back into the canvas
    const notesHtml = Array.from(selectedNotes)
        .map(note => {
            const clonedNote = note.cloneNode(true);
            const spans = clonedNote.querySelectorAll('.visual-element-only');
            spans.forEach(span => span.remove());
            return clonedNote.outerHTML.replace(/\sdata-id="[^"]*"/, '');
        })
        .join('');
        
    // Extract plain text from selected notes and join with newlines for text clipboard
    const plainText = Array.from(selectedNotes)
        .map(note => {
            // Get the textContent - either from pre element or from input if being edited
            if (note.querySelector('.note-input')) {
                return note.querySelector('.note-input').value;
            } else if (note.querySelector('pre')) {
                return note.querySelector('pre').textContent;
            } else {
                return note.textContent;
            }
        })
        .join('\n');
        
    // Create clipboard items for both formats
    const htmlBlob = new Blob([notesHtml], {type: 'text/html'});
    const textBlob = new Blob([plainText], {type: 'text/plain'});
    
    // Write both formats to clipboard
    const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
    });
    
    navigator.clipboard.write([item]);
}

function maybeCopySelectedNotes(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNotes.size > 0) {
        e.preventDefault();
        copySelectedNotes();
    }
}

function maybeCutSelectedNotes(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'x' && !currentlyEditing) {
        e.preventDefault();
        copySelectedNotes();
        deleteSelectedNotes();
    }
}
