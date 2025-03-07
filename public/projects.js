document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('project-list');
    const newProjectForm = document.getElementById('new-project-form');
    const newProjectInput = document.getElementById('new-project-input');
    const settingsModal = document.getElementById('settings-modal');
    const editProjectForm = document.getElementById('edit-project-form');
    const editProjectName = document.getElementById('edit-project-name');
    const deleteProjectButton = document.getElementById('delete-project');
    const closeModalButton = document.getElementById('close-modal');

    let currentProjectId = null;

    function loadProjects() {
        fetch('/api/canvases')
            .then(response => response.json())
            .then(projects => {
                projectList.innerHTML = '';
                projects.forEach(project => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `/canvas.html?id=${project.id}`;
                    a.textContent = project.name;
                    
                    const settingsButton = document.createElement('button');
                    settingsButton.textContent = 'Settings';
                    settingsButton.className = 'settings-button';
                    settingsButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        openSettings(project);
                    });

                    li.appendChild(a);
                    li.appendChild(settingsButton);
                    projectList.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading projects:', error));
    }

    function openSettings(project) {
        currentProjectId = project.id;
        editProjectName.value = project.name;
        settingsModal.style.display = 'block';
    }

    newProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newProjectInput.value.trim();
        if (name) {
            fetch('/api/canvases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            .then(response => response.json())
            .then((data) => {
                window.location.href = `/canvas.html?id=${data.id}`;
            })
            .catch(error => console.error('Error creating project:', error));
        }
    });

    editProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = editProjectName.value.trim();
        if (name) {
            fetch(`/api/canvases/${currentProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                settingsModal.style.display = 'none';
                loadProjects();
            })
            .catch(error => {
                console.error('Error updating project:', error);
                alert('Failed to update project. Please try again.');
            });
        }
    });

    deleteProjectButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            fetch(`/api/canvases/${currentProjectId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(() => {
                settingsModal.style.display = 'none';
                loadProjects();
            })
            .catch(error => console.error('Error deleting project:', error));
        }
    });

    closeModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    loadProjects();
});