

function sendToBackend(note) {
  const pre = note.querySelector("pre");
  if (!pre) return;

  const noteData = {
    id: note.getAttribute("data-id"),
    canvas_id: canvasId,
    tab_id: getCurrentTabId(),
    text: pre.textContent,
    x: parseInt(note.style.left),
    y: parseInt(note.style.top),
  };

  fetch("/api/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(noteData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => console.log("Note saved:", data))
    .catch((error) => {
      console.error("Error saving note:", error);
      errorToast("Failed to save note");
    });
}

function deleteSingleNote(note) {
  const noteId = note.getAttribute("data-id");
  if (noteId) {
    deleteNoteFromBackend(noteId);
  }
  note.remove();
}

function deleteSelectedNotes() {
  Promise.all(Array.from(selectedNotes).map(deleteSingleNote))
    .then(() => {
      console.log("All selected notes deleted");
      selectedNotes.clear();
      updateCanvasSize();
    })
    .catch((error) => {
      console.error("Error deleting notes:", error);
      errorToast("Failed to delete notes");
    });
}

function deleteNoteFromBackend(noteId) {
  return fetch(`/api/notes/${noteId}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => console.log("Note deleted:", data))
    .catch((error) => {
      console.error("Error deleting note:", error);
      errorToast("Failed to delete note");
    });
}