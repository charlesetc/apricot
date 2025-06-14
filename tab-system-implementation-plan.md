# Tab System Implementation Plan

## Overview

Add a tab system to Apricot that allows organizing notes into different "tabs" within each canvas, where each tab acts like its own sub-canvas with filtered note visibility.

## Database Changes

### - [ ] Backend (server.js)

#### - [ ] Add `tabs` table:

- [ ] `id` (PRIMARY KEY)
- [ ] `canvas_id` (FOREIGN KEY to canvases)
- [ ] `name` (TEXT)
- [ ] `sort_order` (INTEGER for reverse alphabetical ordering)
- [ ] `created_at` (DATETIME)

#### - [ ] Modify `notes` table:

- [ ] Add `tab_id` (FOREIGN KEY to tabs, nullable for backward compatibility)

#### - [ ] Create API endpoints:

- [ ] `GET /api/tabs/:canvasId` - Get all tabs for a canvas
- [ ] `POST /api/tabs` - Create new tab
- [ ] `PUT /api/tabs/:id` - Update tab name
- [ ] `DELETE /api/tabs/:id` - Delete tab (reassign notes to default tab)
- [ ] `PUT /api/notes/:id/tab` - Move note to different tab

## Frontend Implementation

### - [ ] UI Components

#### - [ ] Left Sidebar:

- [ ] Fixed positioned sidebar (toggleable with Cmd+Shift+S)
- [ ] List of tab names (reverse alphabetical order)
- [ ] Button to show/hide sidebar
- [ ] Each tab name is clickable to switch tabs

#### - [ ] Current Tab Display:

- [ ] Show current tab name next to canvas title
- [ ] Make tab name editable (click to edit, like canvas title)
- [ ] Save on blur/enter, revert on escape

#### - [ ] Sidebar Toggle Button:

- [ ] Fixed position button to open sidebar
- [ ] Alternative to keyboard shortcut

### - [ ] State Management

#### - [ ] Tab State Variables:

- [ ] `currentTabId` - Currently active tab
- [ ] `tabs` - Array of tab objects for current canvas
- [ ] `sidebarVisible` - Boolean for sidebar visibility

#### - [ ] Note Filtering:

- [ ] Filter `loadNotes()` to only show notes for current tab
- [ ] Update `sendToBackend()` to include current tab ID
- [ ] Modify note creation to assign to current tab

### - [ ] Keyboard Shortcuts

#### - [ ] Cmd+Shift+S: Toggle sidebar visibility

#### - [ ] Handle focus management when sidebar opens/closes

### - [ ] CSS Styling

#### - [ ] Sidebar Styles:

- [ ] Fixed positioning on left side
- [ ] Consistent with app's design theme
- [ ] Dark/light mode support
- [ ] NO show/hide animations

#### - [ ] Tab Name Styles:

- [ ] Consistent with canvas title styling
- [ ] Hover effects for clickable elements
- [ ] Active tab highlighting in sidebar

## Implementation Details

### - [ ] Tab Management Logic

#### - [ ] Default Tab Creation:

- [ ] Create "Main" tab automatically for existing canvases
- [ ] Migrate existing notes to default tab

#### - [ ] Tab Operations:

- [ ] Create new tab with default name
- [ ] Rename tabs with validation (no empty names)
- [ ] Delete tabs (move notes to default tab)
- [ ] Switch between tabs (filter note visibility)

### - [ ] Note Assignment

#### - [ ] New Notes: Automatically assign to current tab

#### - [ ] Note Moving: Allow moving notes between tabs via API

#### - [ ] Tab Deletion: Reassign notes to default tab before deletion

### - [ ] Data Migration

#### - [ ] Backward Compatibility:

- [ ] Notes without tab_id show in default tab
- [ ] Graceful handling of missing tab references

## File Structure Changes

### - [ ] New Files

- [ ] `public/tabOperations.js` - Tab management functions
- [ ] `public/sidebar.js` - Sidebar UI and interactions

### - [ ] Modified Files

- [ ] `server.js` - Database schema and API endpoints
- [ ] `public/main.js` - Tab state management and initialization
- [ ] `public/noteOperations.js` - Tab-aware note operations
- [ ] `public/eventHandlers.js` - Keyboard shortcut for sidebar
- [ ] `public/styles.css` - Sidebar and tab styling
- [ ] `public/canvas.html` - Include new script files
