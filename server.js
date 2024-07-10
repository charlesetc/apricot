const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./notes.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS canvases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
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
    db.all('SELECT * FROM canvases', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
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

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});