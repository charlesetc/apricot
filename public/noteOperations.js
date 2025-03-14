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
    maybeCreateStrikethrough(note, text, pre);
    
    if (text.startsWith('#')) {
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
    dragStartPos = { x: e.clientX, y: e.clientY };

    // Add mousemove and mouseup listeners to the document
    document.addEventListener('mousemove', handleNoteDrag);
    document.addEventListener('mouseup', handleNoteMouseUp);

    e.preventDefault(); // Prevent text selection
}

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
        var target = noteOrEvent.target;
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
