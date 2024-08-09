function loadNotes() {
    fetch(`/api/notes/${canvasId}`)
        .then(response => response.json())
        .then(notes => {
            canvas.innerHTML = ''; // Clear existing notes
            notes.forEach(note => {
                createNoteElement(note);
            });
            updateCanvasSize();
        })
        .catch(error => console.error('Error loading notes:', error));
}

function createNoteElement(noteData) {
    const note = document.createElement('div');
    note.className = 'note';
    if (noteData.text.startsWith('#')) {
        note.classList.add('header');
    }
    note.style.left = `${noteData.x}px`;
    note.style.top = `${noteData.y}px`;
    
    const pre = document.createElement('pre');
    pre.textContent = noteData.text;
    note.appendChild(pre);
    
    note.setAttribute('data-id', noteData.id);

    note.addEventListener('mousedown', handleNoteMouseDown);
    canvas.appendChild(note);
}

// Add this new function
function handleNoteMouseDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; // Allow normal interaction with input fields
    }

    const note = e.target.closest('.note');
    if (!note) return;

    // Store the initial position
    dragStartPos = { x: e.clientX, y: e.clientY };

    // Add mousemove and mouseup listeners to the document
    document.addEventListener('mousemove', handleNoteDrag);
    document.addEventListener('mouseup', handleNoteMouseUp);

    e.preventDefault(); // Prevent text selection
}

// Add this new function
function handleNoteDrag(e) {
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;

    if (Math.sqrt(dx*dx + dy*dy) > DRAG_THRESHOLD) {
        // We've exceeded the drag threshold, start dragging
        document.removeEventListener('mousemove', handleNoteDrag);
        document.removeEventListener('mouseup', handleNoteMouseUp);
        startDragging(e);
    }
}

// Add this new function
function handleNoteMouseUp(e) {
    document.removeEventListener('mousemove', handleNoteDrag);
    document.removeEventListener('mouseup', handleNoteMouseUp);

    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;

    if (Math.sqrt(dx*dx + dy*dy) <= DRAG_THRESHOLD) {
        // This was a click, not a drag
        editNote(e);
    }
}

function resizeInput(e) {
    e.target.style.width = `${e.target.value.length}ch`;
}


function createNote(x, y) {
    clearSelection();
    const note = document.createElement('div');
    note.className = 'note';
    
    // Account for scroll offset
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    note.style.left = `${x + scrollLeft}px`;
    note.style.top = `${y + scrollTop}px`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-input';
    input.addEventListener('keydown', handleInput);
    input.addEventListener('input', resizeInput);
    input.addEventListener('blur', () => saveNote(note));

    note.appendChild(input);
    canvas.appendChild(note);

    note.addEventListener('mousedown', handleNoteMouseDown);

    input.focus();
    note.classList.add('editing');
    updateCanvasSize();
}

// Make function global
window.createNote = createNote;

function saveNote(note) {
    const input = note.querySelector('.note-input');
    const text = input.value.trim();

    if (text) {
        const pre = document.createElement('pre');
        pre.textContent = text;
        note.innerHTML = '';
        note.appendChild(pre);
        note.setAttribute('data-id', note.getAttribute('data-id') || Date.now().toString());
        
        // Add or remove 'header' class based on whether the text starts with '#'
        if (text.startsWith('#')) {
            note.classList.add('header');
        } else {
            note.classList.remove('header');
        }
        
        sendToBackend(note);
    } else {
        note.remove();
    }

    note.classList.remove('editing');
    updateCanvasSize();
}

function editNote(noteOrEvent) {
    let note;
    if (noteOrEvent instanceof Event) {
        note = noteOrEvent.target.closest('.note');
    } else if (noteOrEvent instanceof Element) {
        note = noteOrEvent;
    } else {
        console.error('Invalid argument passed to editNote');
        return;
    }

    if (!note) {
        console.error('No note found to edit');
        return;
    }

    const pre = note.querySelector('pre');
    if (!pre) {
        console.error('No pre element found in the note');
        return;
    }

    const text = pre.textContent;

    const input = document.createElement(text.includes('\n') ? 'textarea' : 'input');
    input.className = 'note-input';
    input.value = text;
    
    if (input.tagName === 'TEXTAREA') {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    } else {
        input.type = 'text';
    }
    
    input.addEventListener('keydown', handleInput);
    input.addEventListener('input', resizeInput);
    input.addEventListener('blur', () => saveNote(note));

    note.innerHTML = '';
    note.appendChild(input);
    input.focus();
    if (input.tagName === 'INPUT') {
        input.setSelectionRange(input.value.length, input.value.length);
    } else {
        input.setSelectionRange(input.value.length, input.value.length);
    }

    note.classList.add('editing'); // Add the 'editing' class to the note
}
