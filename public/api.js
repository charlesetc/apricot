function sendToBackend(note) {
    const pre = note.querySelector('pre');
    const noteData = {
        id: note.getAttribute('data-id'),
        canvas_id: canvasId,
        text: pre.textContent,
        x: parseInt(note.style.left),
        y: parseInt(note.style.top)
    };

    fetch('/api/notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
    }).then(response => response.json())
      .then(data => console.log('Note saved:', data))
      .catch(error => console.error('Error saving note:', error));
}

function deleteSelectedNotes() {
    const deletePromises = Array.from(selectedNotes).map(note => {
        const noteId = note.getAttribute('data-id');
        note.remove();
        return deleteNoteFromBackend(noteId);
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
    return fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
    }).then(response => response.json())
      .then(data => console.log('Note deleted:', data))
      .catch(error => console.error('Error deleting note:', error));
}