const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

const app = express();
const port = 3003;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./notes.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS canvases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            canvas_id INTEGER,
            text TEXT,
            x INTEGER,
            y INTEGER,
            FOREIGN KEY (canvas_id) REFERENCES canvases (id)
        )`);
    }
});

// Canvas endpoints
app.post('/api/canvases', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO canvases (name) VALUES (?)', [name], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name });
    });
});

app.get('/api/canvases', (req, res) => {
    db.all(`SELECT * FROM canvases ORDER BY Timestamp DESC`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.put('/api/canvases/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    // Validate input
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Project name cannot be empty' });
    }

    // Update the project in your database
    const query = 'UPDATE canvases SET name = ? WHERE id = ?';
    const values = [name, id];

    db.run(query, values, function(error) {
        if (error) {
            console.error('Error updating project:', error.message);
            return res.status(500).json({ error: 'An error occurred while updating the project' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Fetch the updated project
        db.get('SELECT * FROM canvases WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error fetching updated project:', err.message);
                return res.status(500).json({ error: 'Project updated but unable to fetch updated data' });
            }

            res.json({
                message: 'Project updated successfully',
                project: row
            });
        });
    });
});

app.delete('/api/canvases/:id', (req, res) => {
    const { id } = req.params;

    // First, delete all notes associated with this canvas
    const deleteNotesQuery = 'DELETE FROM notes WHERE canvas_id = ?';
    db.run(deleteNotesQuery, [id], function(error) {
        if (error) {
            console.error('Error deleting associated notes:', error.message);
            return res.status(500).json({ error: 'An error occurred while deleting associated notes' });
        }

        // Now delete the canvas itself
        const deleteCanvasQuery = 'DELETE FROM canvases WHERE id = ?';
        db.run(deleteCanvasQuery, [id], function(error) {
            if (error) {
                console.error('Error deleting canvas:', error.message);
                return res.status(500).json({ error: 'An error occurred while deleting the canvas' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Canvas not found' });
            }

            res.json({
                message: 'Canvas and associated notes deleted successfully',
                deletedCanvasId: id,
                notesDeleted: this.changes
            });
        });
    });
});


// Note endpoints
app.post('/api/notes', (req, res) => {
    const { id, canvas_id, text, x, y } = req.body;
    db.run('INSERT OR REPLACE INTO notes (id, canvas_id, text, x, y) VALUES (?, ?, ?, ?, ?)', 
           [id, canvas_id, text, x, y], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Note saved successfully', id });
    });
});

app.get('/api/notes/:canvasId', (req, res) => {
    const canvasId = req.params.canvasId;
    db.all('SELECT * FROM notes WHERE canvas_id = ?', [canvasId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.delete('/api/notes/:noteId', (req, res) => {
    const noteId = req.params.noteId;
    db.run('DELETE FROM notes WHERE id = ?', [noteId], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Note deleted successfully', id: noteId });
    });
});

app.post('/api/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, './public/uploads/' + req.file.originalname);

    fs.rename(tempPath, targetPath, err => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error saving the image.');
        }

        res.json({ imageUrl: '/uploads/' + req.file.originalname });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});