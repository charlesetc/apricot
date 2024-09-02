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

    note.style.left = `${noteData.x}px`;
    note.style.top = `${noteData.y}px`;
    
    note.setAttribute('data-id', noteData.id);

    initializeNoteContents(note, noteData.text);

    note.addEventListener('mousedown', handleNoteMouseDown);
    canvas.appendChild(note);
}

function initializeNoteContents(note, text) {
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
        || text.startsWith('* ') || text == '*'
        || text.startsWith('- ') || text == '-') {
        note.classList.add('list');
        note.bulletStr = text.charAt(0);
    } else {
        note.classList.remove('list');
    }
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
    const note = document.createElement('div');
    note.className = 'note';

    note.style.left = `${x}px`;
    note.style.top = `${y}px`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-input';
    input.addEventListener('keydown', handleInput);
    input.addEventListener('input', resizeInput);
    input.addEventListener('blur', () => saveNote(note));

    if (text) {
        input.value = text;
    }

    note.appendChild(input);
    canvas.appendChild(note);

    note.addEventListener('mousedown', handleNoteMouseDown);

    input.focus();
    note.classList.add('editing');
    updateCanvasSize();

    currentlyEditing = note;
}

window.createNote = createNote;

function isMeaninglessContent(text) {
    text = text.trim()
    return text.length == 0 || (text.length == 1 && [ '*', '-', '•', ].includes(text));
}

function saveNote(note) {
    let text;

    if (note.querySelector('.note-input')) {
        const input = note.querySelector('.note-input');
        text = input.value.trim();
    } else {
        const pre = note.querySelector('pre');
        text = pre.textContent;
    }

    if (isMeaninglessContent(text)) {
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
        input.style.width = `${text.length}ch`;
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

    note.classList.add('editing');
    
    // Set the currentlyEditing variable
    currentlyEditing = note;
}


function createNoteWithImage(imageUrl, x, y) {
    const note = document.createElement('div');
    note.className = 'note';
    
    console.log("x,y", x, y);

    note.style.left = `${x}px`;
    note.style.top = `${y}px`;

    const pre = document.createElement('pre');
    pre.textContent = `![Pasted Image](${imageUrl})`;
    note.appendChild(pre);

    maybeCreateImage(note, pre.textContent, pre);
    maybeCreateLinkNote(note, pre.textContent, pre);

    note.setAttribute('data-id', Date.now().toString());
    note.addEventListener('mousedown', handleNoteMouseDown);
    canvas.appendChild(note);

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

async function maybePasteNotes(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !currentlyEditing) {
        e.preventDefault();
        console.log("paste notes");
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const clipboardItem of clipboardItems) {
                if (clipboardItem.types.includes('text/html')) {
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

                    // Calculate offset to center around mouse position, including scroll offsets
                    const offsetX = evenNumber(clientX + scrollLeft - minX , snapGridSize);
                    const offsetY = evenNumber(clientY + scrollTop - minY, snapGridSize);


                    let id_counter = 0;

                    clearSelection();

                    notes.forEach(note => {
                        const newNote = note.cloneNode(true); // deep clone
                        newNote.style.left = `${parseInt(note.style.left) + offsetX}px`;
                        newNote.style.top = `${parseInt(note.style.top) + offsetY}px`;
                        newNote.setAttribute('data-id', Date.now().toString() + '-' + id_counter);
                        id_counter++;

                        canvas.appendChild(newNote);
                        sendToBackend(newNote);
                        selectNote(newNote);
                    });


                    tempDiv.remove();

                    updateCanvasSize();
                }
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    }
}

window.createNoteWithImage = createNoteWithImage;
window.maybeCopySelectedNotes = maybeCopySelectedNotes;
window.maybePasteNotes = maybePasteNotes;