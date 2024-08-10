const operationsStack = [];
let currentOperationIndex = -1;

function addOperation(operation) {
    operationsStack.splice(currentOperationIndex + 1);
    operationsStack.push(operation);
    currentOperationIndex++;
}

function sendToBackend_internal(noteData) {
    return fetch('/api/notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
    }).then(response => response.json())
      .then(data => {
          console.log('Note saved:', data);
      })
      .catch(error => console.error('Error saving note:', error));
}

function sendToBackend(note) {
    const pre = note.querySelector('pre');
    const noteData = {
        id: note.getAttribute('data-id'),
        canvas_id: canvasId,
        text: pre.textContent,
        x: parseInt(note.style.left),
        y: parseInt(note.style.top)
    };

    sendToBackend_internal(noteData)
      .then(_ => {
          addOperation({
              type: 'add',
              noteId: noteData.id,
              noteData: noteData
          });
      })
}

function deleteSelectedNotes() {
    const deletePromises = Array.from(selectedNotes).map(note => {
        const noteId = note.getAttribute('data-id');
        const noteData = {
            id: noteId,
            canvas_id: canvasId,
            text: note.querySelector('pre').textContent,
            x: parseInt(note.style.left),
            y: parseInt(note.style.top)
        };
        note.remove();
        return deleteNoteFromBackend(noteId).then(() => {
            addOperation({
                type: 'delete',
                noteId: noteId,
                noteData: noteData
            });
        });
    });

    Promise.all(deletePromises)
        .then(() => {
            console.log('All selected notes deleted');
            selectedNotes.clear();
            updateCanvasSize();
        })
        .catch(error => console.error('Error deleting notes:', error));
}

function deleteNoteFromBackend(noteId) {
    const note = document.querySelector(`[data-id="${noteId}"]`);
    const noteData = {
        id: noteId,
        canvas_id: canvasId,
        text: note.querySelector('pre').textContent,
        x: parseInt(note.style.left),
        y: parseInt(note.style.top)
    };
    note.remove();
    return deleteNoteFromBackend_internal(noteId).then(() => {
        addOperation({
            type: 'delete',
            noteId: noteId,
            noteData: noteData
        });
    });
}

function deleteNoteFromBackend_internal(noteId) {
    return fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
    }).then(response => response.json())
      .then(data => console.log('Note deleted:', data))
      .catch(error => console.error('Error deleting note:', error));
}

function undoOperation() {
    if (currentOperationIndex < 0) return;
    
    const operation = operationsStack[currentOperationIndex];
    currentOperationIndex--;
    
    if (operation.type === 'add') {
        deleteNoteFromBackend_internal(operation.noteId)
            .then(() => {
                const noteElement = document.querySelector(`[data-id="${operation.noteId}"]`);
                if (noteElement) noteElement.remove();
                updateCanvasSize();
            })
            .catch(error => console.error('Error undoing add operation:', error));
    } else if (operation.type === 'delete') {
        sendToBackend_internal(createNoteElement(operation.noteData));
    }
}

function redoOperation() {
    if (currentOperationIndex >= operationsStack.length - 1) return;
    
    currentOperationIndex++;
    const operation = operationsStack[currentOperationIndex];
    
    if (operation.type === 'add') {
        sendToBackend_internal(createNoteElement(operation.noteData));
    } else if (operation.type === 'delete') {
        deleteNoteFromBackend(operation.noteId)
            .then(() => {
                const noteElement = document.querySelector(`[data-id="${operation.noteId}"]`);
                if (noteElement) noteElement.remove();
                updateCanvasSize();
            })
            .catch(error => console.error('Error redoing delete operation:', error));
    }
}