function loadNotes() {
    fetch(`/api/notes/${canvasId}`)
        .then(response => response.json())
        .then(notes => {
            canvas.innerHTML = ''; // Clear existing notes
            notes.forEach(note => {
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

    const pre = document.createElement('pre');
    pre.textContent = text;
    note.innerHTML = '';
    note.appendChild(pre);
    note.setAttribute('data-id', note.getAttribute('data-id') || Date.now().toString());



    maybeCreateImage(note, text, pre);
    maybeCreateLinkNote(note, text, pre);
    
    if (text.startsWith('#')) {
        note.classList.add('header');
    } else {
        note.classList.remove('header');
    }
    
    if (text.startsWith('• ') || text == '•'
    || text.startsWith('- ') || text == '-') {
        note.classList.add('list');
        note.bulletStr = text.charAt(0);
    } else {
        note.bulletStr = '';
        note.classList.remove('list');
    }

    maybeCreateCheckbox(note, text, pre);
}


// Add this new function
function handleNoteMouseDown(e) {
    if (e.button === 1) {
        return;
    }

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

var currentlyEditing = null;


function createNote(x, y, text = null) {
    clearSelection();
    const note = createNoteElement(Date.now().toString(), x, y, text || '');
    editNote(note);
    updateCanvasSize();
}

window.createNote = createNote;

function isMeaninglessContent(text) {
    text = text.trim()
    return text.length == 0 || (text.length == 1 && [ '*', '-', '•', ].includes(text));
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
        note.remove();
    } else {
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
        input.style.width = `${Math.max(text.length, 2)}ch`;
    }
    
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
            e.stopPropagation();
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

function maybeCopySelectedNotes(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedNotes.size > 0) {
        e.preventDefault();
        const notesHtml = Array.from(selectedNotes)
            .map(note => note.outerHTML.replace(/\sdata-id="[^"]*"/, ''))
            .join('');
        const blob = new Blob([notesHtml], {type: 'text/html'});
        const item = new ClipboardItem({'text/html': blob});
        navigator.clipboard.write([item]);
    }
}

function maybeCutSelectedNotes(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'x' && !currentlyEditing) {
        e.preventDefault();
        const notesHtml = Array.from(selectedNotes)
            .map(note => note.outerHTML.replace(/\sdata-id="[^"]*"/, ''))
            .join('');
        const blob = new Blob([notesHtml], {type: 'text/html'});
        const item = new ClipboardItem({'text/html': blob});
        navigator.clipboard.write([item]);
        deleteSelectedNotes();
    }
}
