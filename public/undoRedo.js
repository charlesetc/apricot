// undoRedo.js - Undo and redo operations for the Apricot app

// Undo/Redo history stack
const undoStack = [];
const redoStack = [];
const MAX_STACK_SIZE = 50; // Limit the stack size to prevent memory issues

// Action types
const ACTION_TYPES = {
  CREATE: 'create',
  DELETE: 'delete',
  MOVE: 'move',
  MULTI_DELETE: 'multi_delete',
  MULTI_MOVE: 'multi_move',
  COMMAND_CLICK: 'command_click'
};

// Record a create note action
function recordCreateAction(noteElement) {
  const action = {
    type: ACTION_TYPES.CREATE,
    noteId: noteElement.getAttribute('data-id'),
    position: {
      x: parseInt(noteElement.style.left),
      y: parseInt(noteElement.style.top)
    },
    content: ''
  };
  
  addToUndoStack(action);
}

// Record a delete note action
function recordDeleteAction(noteElement) {
  const pre = noteElement.querySelector('pre');
  const text = pre ? pre.textContent : '';
  
  const action = {
    type: ACTION_TYPES.DELETE,
    noteId: noteElement.getAttribute('data-id'),
    position: {
      x: parseInt(noteElement.style.left),
      y: parseInt(noteElement.style.top)
    },
    content: text
  };
  
  addToUndoStack(action);
}

// Record a multi-delete action for multiple notes
function recordMultiDeleteAction(noteElements) {
  if (!noteElements || noteElements.length === 0) return;
  
  const notesData = Array.from(noteElements).map(note => {
    const pre = note.querySelector('pre');
    const text = pre ? pre.textContent : '';
    
    return {
      noteId: note.getAttribute('data-id'),
      position: {
        x: parseInt(note.style.left),
        y: parseInt(note.style.top)
      },
      content: text
    };
  });
  
  const action = {
    type: ACTION_TYPES.MULTI_DELETE,
    notes: notesData
  };
  
  addToUndoStack(action);
}

// Record a move note action
function recordMoveAction(noteElement, oldPosition) {
  const newPosition = {
    x: parseInt(noteElement.style.left),
    y: parseInt(noteElement.style.top)
  };
  
  const action = {
    type: ACTION_TYPES.MOVE,
    noteId: noteElement.getAttribute('data-id'),
    oldPosition: oldPosition,
    newPosition: newPosition
  };
  
  addToUndoStack(action);
}

// Record a multi-move action
function recordMultiMoveAction(movements) {
  if (!movements || movements.length === 0) return;
  
  const action = {
    type: ACTION_TYPES.MULTI_MOVE,
    movements: movements
  };
  
  addToUndoStack(action);
}

// Record a command-click action
function recordCommandClickAction(data) {
  // Get the initial bullet string or content for the new note
  let initialContent = '';
  const newNotePre = data.newNote.querySelector('pre');
  if (newNotePre) {
    initialContent = newNotePre.textContent;
  }
  
  const action = {
    type: ACTION_TYPES.COMMAND_CLICK,
    newNoteId: data.newNote.getAttribute('data-id'),
    newNoteContent: initialContent,
    originalPositions: data.originalPositions.map(item => ({
      noteId: item.note.getAttribute('data-id'),
      oldTop: item.top,
      newTop: parseInt(item.note.style.top)
    }))
  };
  
  addToUndoStack(action);
}

// Add an action to the undo stack
function addToUndoStack(action) {
  undoStack.push(action);
  // Clear the redo stack when a new action is performed
  redoStack.length = 0;
  
  // Limit stack size
  if (undoStack.length > MAX_STACK_SIZE) {
    undoStack.shift();
  }
}

// Perform undo operation
async function undo() {
  if (undoStack.length === 0) return;
  
  const action = undoStack.pop();
  redoStack.push(action);
  
  await executeUndo(action);
  
  // Show toast message
  normalToast('Undo');
}

// Perform redo operation
async function redo() {
  if (redoStack.length === 0) return;
  
  const action = redoStack.pop();
  undoStack.push(action);
  
  await executeRedo(action);
  
  // Show toast message
  normalToast('Redo');
}

// Execute undo action based on type
async function executeUndo(action) {
  switch (action.type) {
    case ACTION_TYPES.CREATE:
      await undoCreate(action);
      break;
    case ACTION_TYPES.DELETE:
      await undoDelete(action);
      break;
    case ACTION_TYPES.MOVE:
      await undoMove(action);
      break;
    case ACTION_TYPES.MULTI_DELETE:
      await undoMultiDelete(action);
      break;
    case ACTION_TYPES.MULTI_MOVE:
      await undoMultiMove(action);
      break;
    case ACTION_TYPES.COMMAND_CLICK:
      await undoCommandClick(action);
      break;
  }
  updateCanvasSize();
}

// Execute redo action based on type
async function executeRedo(action) {
  switch (action.type) {
    case ACTION_TYPES.CREATE:
      await redoCreate(action);
      break;
    case ACTION_TYPES.DELETE:
      await redoDelete(action);
      break;
    case ACTION_TYPES.MOVE:
      await redoMove(action);
      break;
    case ACTION_TYPES.MULTI_DELETE:
      await redoMultiDelete(action);
      break;
    case ACTION_TYPES.MULTI_MOVE:
      await redoMultiMove(action);
      break;
    case ACTION_TYPES.COMMAND_CLICK:
      await redoCommandClick(action);
      break;
  }
  updateCanvasSize();
}

// Undo implementations
async function undoCreate(action) {
  const note = document.querySelector(`.note[data-id="${action.noteId}"]`);
  if (note) {
    deleteSingleNote(note);
  }
}

async function undoDelete(action) {
  // Simple approach - create the note with content
  const note = createNoteElement(action.noteId, action.position.x, action.position.y, action.content);
  sendToBackend(note);
}

async function undoMove(action) {
  const note = document.querySelector(`.note[data-id="${action.noteId}"]`);
  if (note) {
    note.style.left = `${action.oldPosition.x}px`;
    note.style.top = `${action.oldPosition.y}px`;
    sendToBackend(note);
  }
}

async function undoMultiDelete(action) {
  for (const noteData of action.notes) {
    // Simple approach - create the note with content
    const note = createNoteElement(noteData.noteId, noteData.position.x, noteData.position.y, noteData.content);
    sendToBackend(note);
  }
}

async function undoMultiMove(action) {
  for (const movement of action.movements) {
    const note = document.querySelector(`.note[data-id="${movement.noteId}"]`);
    if (note) {
      note.style.left = `${movement.oldPosition.x}px`;
      note.style.top = `${movement.oldPosition.y}px`;
      sendToBackend(note);
    }
  }
}

async function undoCommandClick(action) {
  // Delete the new note created by command-click
  const newNote = document.querySelector(`.note[data-id="${action.newNoteId}"]`);
  if (newNote) {
    deleteSingleNote(newNote);
  }
  
  // Restore original positions of the notes that were moved down
  for (const position of action.originalPositions) {
    const note = document.querySelector(`.note[data-id="${position.noteId}"]`);
    if (note) {
      note.style.top = `${position.oldTop}px`;
      sendToBackend(note);
    }
  }
}

// Redo implementations
async function redoCreate(action) {
  // Simple approach - create the note
  const note = createNoteElement(action.noteId, action.position.x, action.position.y, action.content);
  
  // Make it editable right away so user can enter text
  if (!action.content) {
    editNote(note);
  }
  
  sendToBackend(note);
}

async function redoDelete(action) {
  const note = document.querySelector(`.note[data-id="${action.noteId}"]`);
  if (note) {
    deleteSingleNote(note);
  }
}

async function redoMove(action) {
  const note = document.querySelector(`.note[data-id="${action.noteId}"]`);
  if (note) {
    note.style.left = `${action.newPosition.x}px`;
    note.style.top = `${action.newPosition.y}px`;
    sendToBackend(note);
  }
}

async function redoMultiDelete(action) {
  for (const noteData of action.notes) {
    const note = document.querySelector(`.note[data-id="${noteData.noteId}"]`);
    if (note) {
      deleteSingleNote(note);
    }
  }
}

async function redoMultiMove(action) {
  for (const movement of action.movements) {
    const note = document.querySelector(`.note[data-id="${movement.noteId}"]`);
    if (note) {
      note.style.left = `${movement.newPosition.x}px`;
      note.style.top = `${movement.newPosition.y}px`;
      sendToBackend(note);
    }
  }
}

async function redoCommandClick(action) {
  // Find current positions of moved notes
  const positionData = [];
  for (const position of action.originalPositions) {
    const note = document.querySelector(`.note[data-id="${position.noteId}"]`);
    if (note) {
      positionData.push({
        note: note,
        top: parseInt(note.style.top)
      });
      
      // Move the note down again
      note.style.top = `${position.newTop}px`;
      sendToBackend(note);
    }
  }
  
  // Find the first note to determine where to create new note
  if (positionData.length > 0) {
    // Sort by Y position
    positionData.sort((a, b) => a.top - b.top);
    const firstNote = positionData[0].note;
    
    // Create the new note
    const noteX = parseInt(firstNote.style.left);
    const noteY = positionData[0].top;
    
    // Use the stored content if available, otherwise use the bullet string
    let content = action.newNoteContent || '';
    if (!content && firstNote.classList.contains('list')) {
      content = (firstNote.bulletStr || '') + ' ';
    }
    
    const newNote = createNoteElement(action.newNoteId, noteX, noteY, content);
    sendToBackend(newNote);
  }
}

// Handle keyboard shortcuts for undo/redo
function handleUndoRedoShortcuts(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
    return true;
  } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
    e.preventDefault();
    redo();
    return true;
  }
  return false;
}

// Export functions and variables
window.recordCreateAction = recordCreateAction;
window.recordDeleteAction = recordDeleteAction;
window.recordMultiDeleteAction = recordMultiDeleteAction;
window.recordMoveAction = recordMoveAction;
window.recordMultiMoveAction = recordMultiMoveAction;
window.recordCommandClickAction = recordCommandClickAction;
window.undo = undo;
window.redo = redo;
window.handleUndoRedoShortcuts = handleUndoRedoShortcuts;
window.undoStack = undoStack;
window.ACTION_TYPES = ACTION_TYPES;