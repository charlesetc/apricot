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
    
    const pre = document.createElement('pre');
    pre.textContent = noteData.text;
    note.appendChild(pre);
    
    note.setAttribute('data-id', noteData.id);

    note.addEventListener('mousedown', startDragging);
    canvas.appendChild(note);
}


function createNote(x, y) {
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
    input.addEventListener('blur', () => saveNote(note));

    note.appendChild(input);
    canvas.appendChild(note);

    note.addEventListener('mousedown', startDragging);

    input.focus();
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
        sendToBackend(note);
    } else {
        note.remove();
    }
    updateCanvasSize();
}

function editNote(e) {
    const note = e.target.closest('.note');
    if (!note) return;
    const pre = note.querySelector('pre');
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
    input.addEventListener('blur', () => saveNote(note));

    note.innerHTML = '';
    note.appendChild(input);
    input.focus();
    if (input.tagName === 'INPUT') {
        input.setSelectionRange(input.value.length, input.value.length);
    } else {
        input.setSelectionRange(input.value.length, input.value.length);
    }
}
