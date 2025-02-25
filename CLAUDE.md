# Apricot Development Guide

## Build & Run Commands
- Start server: `npm start` or `node server.js`
- Access app at: http://localhost:3003

## Code Style Guidelines

### JavaScript
- Use vanilla JavaScript (no frameworks except express for backend)
- Use `let`/`const` when possible
- Prefer camelCase for variables and functions
- CSS uses kebab-case for classes and IDs
- 2-space indentation
- Semicolons at the end of statements

### Architecture
- Frontend: Static files served from `/public` directory
- Backend: ExpressJS server with SQLite database (`notes.db`)
- RESTful API endpoints handle CRUD operations

### Error Handling
- Backend errors: Return appropriate HTTP status codes with JSON error messages
- Frontend: Use try/catch with console.error for fetch operations
- Always check for nulls and undefined values before accessing properties

### State Management
- DOM-based state management with global variables
- Save notes automatically to persist changes
- Use event delegation for dynamic elements

### File Organization
- Frontend: Separate JS files by functionality (noteOperations, eventHandlers, etc.)
- Backend: Single server.js file with API routes grouped by resource