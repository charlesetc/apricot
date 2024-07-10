document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('project-list');
    const newProjectForm = document.getElementById('new-project-form');
    const newProjectInput = document.getElementById('new-project-input');

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
                    li.appendChild(a);
                    projectList.appendChild(li);
                });
            })
            .catch(error => console.error('Error loading projects:', error));
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
            .then(() => {
                newProjectInput.value = '';
                loadProjects();
            })
            .catch(error => console.error('Error creating project:', error));
        }
    });

    loadProjects();
});