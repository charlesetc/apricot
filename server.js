const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fetch = require('node-fetch');

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

app.get('/api/canvases/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM canvases WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Canvas not found' });
            return;
        }
        res.json(row);
    });
})

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

app.get('/export.html', (req, res) => {
    const canvasId = req.query.id;
    
    if (!canvasId) {
        return res.status(400).send('Canvas ID is required.');
    }

    // First, get the canvas name
    db.get('SELECT * FROM canvases WHERE id = ?', [canvasId], (err, canvas) => {
        if (err) {
            return res.status(500).send('Error fetching canvas: ' + err.message);
        }
        
        if (!canvas) {
            return res.status(404).send('Canvas not found.');
        }
        
        // Then, get all the notes for this canvas
        db.all('SELECT * FROM notes WHERE canvas_id = ?', [canvasId], (err, notes) => {
            if (err) {
                return res.status(500).send('Error fetching notes: ' + err.message);
            }
            
            // Sort notes first by x position, then by y position
            notes.sort((a, b) => {
                if (a.x !== b.x) {
                    return a.x - b.x;
                }
                return a.y - b.y;
            });
            
            // Generate HTML
            let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${canvas.name} - Apricot Export</title><style>/* Base styles */
                    body {
                        font-family: 'Iosevka Medium', 'Iosevka', 'Courier New', Courier, monospace;
                        line-height: 1.6;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        color: #111;
                        background-color: #ffffff;
                    }
                    h1 {
                        border-bottom: 1px solid #eee;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                        font-size: 1.1em;
                    }
                    
                    /* Note styles - matching the canvas version */
                    .note {
                        position: relative; /* Not absolute in the export */
                        background-color: #f0f0f0;
                        border: 2px solid transparent;
                        border-radius: 4px;
                        padding: 3px 5px;
                        margin-bottom: 15px;
                        box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);
                        white-space: pre-wrap;
                        font-size: 14px;
                    }
                    
                    /* Special note types */
                    .note.header {
                        font-weight: bold;
                    }
                    
                    .note.checkbox {
                        display: flex;
                        align-items: flex-start;
                        padding-left: 24px;
                        padding-right: 8px;
                    }
                    
                    .note.checkbox input[type="checkbox"] {
                        position: absolute;
                        left: 4px;
                        top: 4px;
                        margin-right: 8px;
                    }
                    
                    .note.checkbox.checked {
                        text-decoration: line-through;
                        color: #888;
                    }
                    
                    .note.image img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                    
                    .note.link a {
                        color: #007bff;
                        text-decoration: underline;
                    }
                    
                    .note.strikethrough {
                        text-decoration: line-through;
                    }
                    
                    /* Bullet list items */
                    .note.list.bullet::before {
                        content: '•';
                        position: absolute;
                        left: 5px;
                    }
                    
                    .note.list.dash::before {
                        content: '-';
                        position: absolute;
                        left: 5px;
                    }
                    
                    .note.list:not(.checkbox) {
                        padding-left: 24px;
                    }
                    
                    /* Hide the original content for special notes */
                    .note pre {
                        margin: 0;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font-family: inherit;
                        font-size: inherit;
                    }
                    
                    /* Coordinates removed */
                    
                    footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 0.8em;
                        color: #666;
                    }

                    /* Dark mode */
                    @media (prefers-color-scheme: dark) {
                        body {
                            background-color: #1a1a1a;
                            color: #f0f0f0;
                        }
                        .note {
                            background-color: #2a2a2a;
                            border-color: transparent;
                        }
                        .note.link a {
                            color: #005dc1;
                        }
                        h1 {
                            border-bottom-color: #333;
                        }
                    }
                    
                    /* Print styles - force background colors when printing */
                    @media print {
                        .note {
                            background-color: #f0f0f0 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            color-adjust: exact;
                            border: 1px solid #d0d0d0;
                        }
                        @page {
                            margin: 1cm;
                        }
                    }
                </style></head><body><h1>${canvas.name}</h1><div class="notes-container">`;
            
            notes.forEach(note => {
                let noteContent = '';
                let className = 'note';
                
                // Parse markdown-like content
                if (note.text.startsWith('#')) {
                    className += ' header';
                }
                
                // Handle bullet lists
                if (note.text.startsWith('• ') || note.text === '•') {
                    className += ' list bullet';
                    noteContent = note.text.replace(/^• /, '');
                } 
                // Handle dash lists
                else if (note.text.startsWith('- ') || note.text === '-') {
                    className += ' list dash';
                    noteContent = note.text.replace(/^- /, '');
                }
                // Handle numbered lists
                else if (note.text.match(/^\d+\.\s+/)) {
                    className += ' list numbered';
                    const match = note.text.match(/^(\d+\.\s+)(.*)/);
                    if (match) {
                        noteContent = `<span style="position:absolute;left:4px;">${match[1]}</span>${match[2]}`;
                    } else {
                        noteContent = note.text;
                    }
                }
                // Handle checkboxes
                else if (note.text.match(/^\[[xX ]?\]/)) {
                    const isChecked = note.text.match(/^\[[xX]\]/) !== null;
                    className += ' checkbox list';
                    if (isChecked) {
                        className += ' checked';
                    }
                    
                    const checkboxHtml = `<input type="checkbox" ${isChecked ? 'checked' : ''} disabled>`;
                    noteContent = note.text.replace(/^\[[xX ]?\]\s*/, '');
                    
                    html += `<div class="${className}">${checkboxHtml}<span style="margin-left: 8px;">${noteContent}</span></div>`;
                    return; // Skip the default note creation at the end
                }
                // Handle images
                else if (note.text.match(/!\[.*?\]\((.*?)\)/)) {
                    const match = note.text.match(/!\[.*?\]\((.*?)\)/);
                    if (match && match[1]) {
                        // Make sure image path is absolute
                        let imgSrc = match[1];
                        if (!imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
                            imgSrc = '/' + imgSrc;
                        }
                        noteContent = `<img src="${imgSrc}" alt="Note Image">`;
                        className += ' image';
                        
                        html += `<div class="${className}">${noteContent}</div>`;
                        return; // Skip the default note creation at the end
                    }
                }
                // Handle links
                else if (note.text.match(/\[(.*?)\]\((.*?)\)/) && !note.text.match(/!\[.*?\]\((.*?)\)/)) {
                    const match = note.text.match(/\[(.*?)\]\((.*?)\)/);
                    if (match && match[1] && match[2]) {
                        noteContent = `<a href="${match[2]}" target="_blank">${match[1]}</a>`;
                        className += ' link';
                        
                        html += `<div class="${className}">${noteContent}</div>`;
                        return; // Skip the default note creation at the end
                    }
                }
                // Handle strikethrough
                else if (note.text.match(/^~.*?~$/)) {
                    const match = note.text.match(/^~(.*?)~$/);
                    if (match && match[1]) {
                        noteContent = match[1];
                        className += ' strikethrough';
                    }
                }
                // Default case - regular note
                else {
                    noteContent = note.text;
                }
                
                // Add the note to HTML
                html += `<div class="${className}"><pre>${noteContent}</pre></div>`;
            });
            
            html += `</div><footer>Exported from Apricot - ${new Date().toLocaleString()}</footer></body></html>`;
            
            res.send(html);
        });
    });
});

// Endpoint to get a read-only snapshot of a canvas with embedded CSS
app.get('/api/readonly-canvas/:id', async (req, res) => {
    const canvasId = req.params.id;
    
    if (!canvasId) {
        return res.status(400).send('Canvas ID is required.');
    }

    try {
        // First, get the canvas name
        const canvas = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM canvases WHERE id = ?', [canvasId], (err, row) => {
                if (err) reject(err);
                if (!row) reject(new Error('Canvas not found'));
                resolve(row);
            });
        });
        
        // Then, get all the notes for this canvas
        const notes = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM notes WHERE canvas_id = ?', [canvasId], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        
        // Get CSS content
        const cssPath = path.join(__dirname, 'public', 'styles.css');
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        
        // Generate the HTML
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${canvas.name} - Apricot</title>
    <style>
    /* Base embedded styles */
    ${cssContent}
    
    /* Read-only mode overrides */
    body {
        min-width: auto;
        min-height: auto;
        overflow: auto;
    }
    
    html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }
    
    .canvas-page {
        min-width: auto;
        min-height: auto;
        position: relative;
    }
    
    #canvas {
        position: relative;
        width: 5000px;
        height: 5000px;
        overflow: visible;
    }
    
    /* Create a container that allows scrolling */
    body {
        cursor: default;
    }
    
    /* For middle-button drag scrolling */
    body.right-click-dragging {
        cursor: grabbing !important;
    }
    
    .note {
        position: absolute;
        cursor: default;
        user-select: text;
        -webkit-user-select: text;
        -ms-user-select: text;
        box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);
    }
    
    /* Style the header elements */
    .back-button {
        position: fixed;
        top: 10px;
        left: 10px;
        padding: 5px 10px;
        background-color: var(--button-bg-color);
        text-decoration: none;
        color: var(--text-color);
        border-radius: 3px;
        z-index: 100;
    }
    
    .canvas-title {
        position: fixed;
        top: 10px;
        left: 80px;
        border-radius: 3px;
        margin: 5px 7px;
        padding: 0px 3px;
        background: var(--bg-color);
        font-size: 14px;
    }
    
    .export-button {
        display: none;
    }
    
    /* Add footer */
    .footer {
        text-align: center;
        padding: 20px;
        margin-top: 40px;
        color: var(--text-color);
        opacity: 0.7;
        font-size: 12px;
    }
    </style>
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
</head>
<body class="canvas-page">
    <a href="https://github.com/charlesetc/apricot" class="back-button" target="_blank">Apricot</a>
    <div class="canvas-title">${canvas.name}</div>
    <div id="canvas">`;
        
        // Add each note
        notes.forEach(note => {
            // Process note content
            let noteContent = note.text || '';
            let noteClass = 'note';
            
            // Parse markdown-like content for special note types
            if (noteContent.startsWith('#')) {
                noteClass += ' header';
            }
            
            // Handle bullet lists
            if (noteContent.startsWith('• ') || noteContent === '•') {
                noteClass += ' list bullet';
            } 
            // Handle dash lists
            else if (noteContent.startsWith('- ') || noteContent === '-') {
                noteClass += ' list dash';
            }
            // Handle numbered lists
            else if (noteContent.match(/^\d+\.\s+/)) {
                noteClass += ' list numbered';
            }
            // Handle checkboxes
            else if (noteContent.match(/^\[[xX ]?\]/)) {
                const isChecked = noteContent.match(/^\[[xX]\]/) !== null;
                noteClass += ' checkbox list';
                if (isChecked) {
                    noteClass += ' checked';
                }
                noteContent = noteContent.replace(/^\[[xX ]?\]\s*/, '');
                noteContent = `<input type="checkbox" ${isChecked ? 'checked' : ''} disabled>${noteContent}`;
            }
            // Handle images
            else if (noteContent.match(/!\[.*?\]\((.*?)\)/)) {
                const match = noteContent.match(/!\[.*?\]\((.*?)\)/);
                if (match && match[1]) {
                    let imgSrc = match[1];
                    if (!imgSrc.startsWith('http') && !imgSrc.startsWith('/')) {
                        imgSrc = '/' + imgSrc;
                    }
                    noteContent = `<img src="${imgSrc}" alt="Note Image">`;
                    noteClass += ' image';
                }
            }
            // Handle links
            else if (noteContent.match(/\[(.*?)\]\((.*?)\)/) && !noteContent.match(/!\[.*?\]\((.*?)\)/)) {
                const match = noteContent.match(/\[(.*?)\]\((.*?)\)/);
                if (match && match[1] && match[2]) {
                    noteContent = `<a href="${match[2]}" target="_blank">${match[1]}</a>`;
                    noteClass += ' link';
                }
            }
            // Handle strikethrough
            else if (noteContent.match(/^~.*?~$/)) {
                const match = noteContent.match(/^~(.*?)~$/);
                if (match && match[1]) {
                    noteContent = match[1];
                    noteClass += ' strikethrough';
                }
            }
            
            // Add the note to HTML with positioning
            html += `
        <div class="${noteClass}" style="left: ${note.x}px; top: ${note.y}px;">
            <pre>${noteContent}</pre>
        </div>`;
        });
        
        // Close the HTML
        html += `
    </div>
    <div class="footer">
        Shared from Apricot - <a href="${req.protocol}://${req.get('host')}">View more spaces</a>
    </div>
    
    <script>
    // Middle-button drag navigation
    (function() {
        let isCanvasDragging = false;
        let lastMouseX, lastMouseY;
        const SCROLL_MULTIPLIER = 1.5;
        
        function startCanvasDragging(e) {
            document.body.classList.add('right-click-dragging');
            isCanvasDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
        
        function stopCanvasDragging() {
            document.body.classList.remove('right-click-dragging');
            isCanvasDragging = false;
        }
        
        document.addEventListener('mousedown', function(e) {
            if (e.button === 1) { // Middle button
                e.preventDefault();
                startCanvasDragging(e);
            }
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isCanvasDragging) {
                const dx = e.clientX - lastMouseX;
                const dy = e.clientY - lastMouseY;
                window.scrollBy(-dx * SCROLL_MULTIPLIER, -dy * SCROLL_MULTIPLIER);
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });
        
        document.addEventListener('mouseup', function(e) {
            if (e.button === 1) {
                stopCanvasDragging();
            }
        });
        
        document.addEventListener('mouseleave', stopCanvasDragging);
        window.addEventListener('blur', stopCanvasDragging);
    })();
    </script>
</body>
</html>`;
        
        res.send(html);
    } catch (error) {
        console.error('Error generating read-only canvas:', error);
        res.status(500).send('Error generating canvas: ' + error.message);
    }
});

// Endpoint for sharing a canvas to Cloudflare
app.post('/api/share', async (req, res) => {
    try {
        const { canvasId, name, htmlContent } = req.body;
        
        // Generate a unique identifier for the shared canvas
        const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Cloudflare account details
        const apiToken = '2muDSzmTu7BttzTwwEDSjBrx5oarkV8tgloFEdyU'; // Your provided token
        
        // In production, use environment variables instead:
        // const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        // const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        // const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
        
        // Actual Cloudflare account details
        const accountId = '771075126a31746d5e4a9b10b7357afd'; // Your actual account ID
        const namespaceId = '5c8bdbe765f748c094289bc7e5cb074c'; // Your actual namespace ID
        
        // Upload the HTML content to Cloudflare KV
        const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${shareId}`;
        
        console.log(`Uploading to Cloudflare KV: ${kvUrl}`);
        
        const uploadResponse = await fetch(kvUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'text/html'
            },
            body: htmlContent
        });
        
        const uploadResult = await uploadResponse.json();
        
        if (!uploadResult.success) {
            console.error('Cloudflare upload error:', uploadResult);
            throw new Error('Failed to upload content to Cloudflare: ' + JSON.stringify(uploadResult.errors));
        }
        
        // Your worker's domain
        const workerDomain = 'apricot-share.inclouds.workers.dev'; // Your actual worker domain
        const shareUrl = `https://${workerDomain}/${shareId}`;
        
        console.log(`Canvas ${canvasId} (${name}) shared with ID: ${shareId}`);
        console.log(`Share URL: ${shareUrl}`);
        
        // Return the share URL
        res.json({
            success: true,
            shareId: shareId,
            shareUrl: shareUrl
        });
    } catch (error) {
        console.error('Error sharing canvas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});