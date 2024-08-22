# Apricot

A canvas note-taking app, very much a work in progress.

A lot of the code has been generated by Claude.

### Key Bindings
 
- `enter` to create a new note below the current note
- `cmd+enter` to create a new note to the right of the current note
- `tab` to move the note to the right
- `shift+tab` to move the note to the left
- `escape` to go into a sort of "selection mode"
- arrow keys when selecting a single note to select a different note
- arrow keys when selecting multiple notes to move the selection
- `ctrl+` arrow keys to move a single note when editing
- `cmd+/` to search different canvases
- `backspace` to delete notes when selecting


### Other things

- Any change is saved to the server immdiately
- There is no undo/redo yet (be careful!)
- Notes are saved to a single `notes.db` file in the root directory of the project
- Pasted images are saved to the `public/uploads` directory