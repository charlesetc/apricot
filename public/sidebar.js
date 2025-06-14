// Sidebar state
let sidebarVisible = false;

function createSidebar() {
  // Remove existing sidebar if any
  const existingSidebar = document.getElementById('tab-sidebar');
  if (existingSidebar) {
    existingSidebar.remove();
  }
  
  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'tab-sidebar';
  sidebar.className = 'tab-sidebar';
  
  // Create sidebar header
  const header = document.createElement('div');
  header.className = 'sidebar-header';
  
  const title = document.createElement('h3');
  title.textContent = 'Tabs';
  header.appendChild(title);
  
  // Create new tab button
  const newTabButton = document.createElement('button');
  newTabButton.textContent = '+';
  newTabButton.className = 'new-tab-button';
  newTabButton.addEventListener('click', handleNewTab);
  header.appendChild(newTabButton);
  
  sidebar.appendChild(header);
  
  // Create tabs list
  const tabsList = document.createElement('div');
  tabsList.id = 'tabs-list';
  tabsList.className = 'tabs-list';
  sidebar.appendChild(tabsList);
  
  // Add sidebar to body
  document.body.appendChild(sidebar);
  
  return sidebar;
}

function updateSidebar() {
  const tabsList = document.getElementById('tabs-list');
  if (!tabsList) return;
  
  // Clear existing tabs
  tabsList.innerHTML = '';
  
  // Sort tabs in reverse alphabetical order
  const sortedTabs = [...tabs].sort((a, b) => b.name.localeCompare(a.name));
  
  sortedTabs.forEach(tab => {
    const tabElement = document.createElement('div');
    tabElement.className = `tab-item ${tab.id === currentTabId ? 'active' : ''}`;
    tabElement.setAttribute('data-tab-id', tab.id);
    
    // Create tab name display
    const tabName = document.createElement('span');
    tabName.className = 'tab-name';
    tabName.textContent = tab.name;
    tabElement.appendChild(tabName);
    
    // Create tab actions container
    const tabActions = document.createElement('div');
    tabActions.className = 'tab-actions';
    
    // Only show delete button if there are more than 1 tab remaining
    if (tabs.length > 1) {
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '×';
      deleteButton.className = 'delete-tab-button';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteTab(tab.id);
      });
      tabActions.appendChild(deleteButton);
    }
    
    tabElement.appendChild(tabActions);
    
    // Add click handler to switch tabs
    tabElement.addEventListener('click', () => {
      switchToTab(tab.id);
    });
    
    // Add double-click handler to edit tab name
    tabElement.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      editTabName(tab);
    });
    
    tabsList.appendChild(tabElement);
  });
}

function showSidebar() {
  sidebarVisible = true;
  window.sidebarVisible = sidebarVisible;
  const sidebar = document.getElementById('tab-sidebar');
  if (sidebar) {
    sidebar.style.display = 'block';
  }
  document.body.classList.add('sidebar-open');
  updateSidebar();
}

function hideSidebar() {
  sidebarVisible = false;
  window.sidebarVisible = sidebarVisible;
  const sidebar = document.getElementById('tab-sidebar');
  if (sidebar) {
    sidebar.style.display = 'none';
  }
  document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
  if (sidebarVisible) {
    hideSidebar();
  } else {
    showSidebar();
  }
}


async function handleNewTab() {
  const tabName = prompt('Enter tab name:');
  if (tabName && tabName.trim()) {
    const newTab = await createTab(tabName.trim());
    if (newTab) {
      updateSidebar();
      successToast('Tab created successfully');
    }
  }
}

async function handleDeleteTab(tabId) {
  const success = await deleteTab(tabId);
  if (success) {
    updateSidebar();
  }
}

function editTabName(tab) {
  const tabElement = document.querySelector(`.tab-item[data-tab-id="${tab.id}"]`);
  const tabNameElement = tabElement.querySelector('.tab-name');
  
  if (!tabNameElement) return;
  
  const currentName = tabNameElement.textContent;
  
  // Create input element
  const inputElement = document.createElement('input');
  inputElement.type = 'text';
  inputElement.value = currentName;
  inputElement.className = 'tab-name-edit-input';
  
  // Replace tab name with input
  tabNameElement.style.display = 'none';
  tabElement.insertBefore(inputElement, tabNameElement);
  
  // Focus and select
  inputElement.focus();
  inputElement.select();
  
  // Save on blur or Enter
  const saveEdit = async () => {
    const newName = inputElement.value.trim();
    
    if (newName && newName !== currentName) {
      const updatedTab = await updateTab(tab.id, newName);
      if (updatedTab) {
        updateSidebar();
        updateCurrentTabDisplay();
        successToast('Tab renamed successfully');
      }
    } else {
      // Revert changes
      tabNameElement.style.display = '';
      inputElement.remove();
    }
  };
  
  inputElement.addEventListener('blur', saveEdit);
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      tabNameElement.style.display = '';
      inputElement.remove();
    }
  });
}

// Initialize sidebar when DOM is loaded
function initializeSidebar() {
  createSidebar();
  hideSidebar(); // Start with sidebar hidden
}

// Make functions and variables global
window.createSidebar = createSidebar;
window.updateSidebar = updateSidebar;
window.showSidebar = showSidebar;
window.hideSidebar = hideSidebar;
window.toggleSidebar = toggleSidebar;
window.initializeSidebar = initializeSidebar;
window.sidebarVisible = sidebarVisible;