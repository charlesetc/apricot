// Tab state variables
let currentTabId = null;
let tabs = [];

async function loadTabs() {
  try {
    const response = await fetch(`/api/tabs/${canvasId}`);
    const tabsData = await response.json();
    tabs = tabsData;
    
    // If no current tab is set, use the first tab (which should be 'default')
    if (!currentTabId && tabs.length > 0) {
      // Find the default tab first, otherwise use the first tab
      const defaultTab = tabs.find(tab => tab.name === 'default');
      currentTabId = defaultTab ? defaultTab.id : tabs[0].id;
    }
    
    return tabs;
  } catch (error) {
    console.error('Error loading tabs:', error);
    return [];
  }
}

async function createTab(name) {
  try {
    const response = await fetch('/api/tabs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        canvas_id: canvasId,
        name: name
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create tab');
    }
    
    const newTab = await response.json();
    tabs.push(newTab);
    
    // Sort tabs in reverse alphabetical order
    tabs.sort((a, b) => b.name.localeCompare(a.name));
    
    return newTab;
  } catch (error) {
    console.error('Error creating tab:', error);
    errorToast('Failed to create tab');
    return null;
  }
}

async function updateTab(tabId, name) {
  try {
    const response = await fetch(`/api/tabs/${tabId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: name })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update tab');
    }
    
    const result = await response.json();
    
    // Update local tabs array
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      tabs[tabIndex] = result.tab;
      // Re-sort tabs
      tabs.sort((a, b) => b.name.localeCompare(a.name));
    }
    
    return result.tab;
  } catch (error) {
    console.error('Error updating tab:', error);
    errorToast('Failed to update tab');
    return null;
  }
}

async function deleteTab(tabId) {
  // Find the tab to be deleted
  const tabToDelete = tabs.find(tab => tab.id === tabId);
  if (!tabToDelete) {
    errorToast('Tab not found');
    return false;
  }
  
  // Show confirmation dialog
  const confirmMessage = `Are you sure you want to delete the tab "${tabToDelete.name}"?\n\nThis will permanently delete ALL NOTES in this tab. This action cannot be undone.`;
  
  if (!confirm(confirmMessage)) {
    return false;
  }
  
  try {
    const response = await fetch(`/api/tabs/${tabId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete tab');
    }
    
    const result = await response.json();
    
    // Remove tab from local array
    tabs = tabs.filter(tab => tab.id !== tabId);
    
    // If this was the current tab, switch to another tab
    if (currentTabId === tabId) {
      if (tabs.length > 0) {
        const defaultTab = tabs.find(tab => tab.name === 'default');
        currentTabId = defaultTab ? defaultTab.id : tabs[0].id;
        await switchToTab(currentTabId);
      } else {
        currentTabId = null;
      }
    }
    
    successToast(`Tab deleted successfully. ${result.notesDeleted} notes were deleted.`);
    return true;
  } catch (error) {
    console.error('Error deleting tab:', error);
    errorToast('Failed to delete tab');
    return false;
  }
}

async function switchToTab(tabId) {
  if (currentTabId === tabId) {
    return; // Already on this tab
  }
  
  currentTabId = tabId;
  
  // Update current tab display
  updateCurrentTabDisplay();
  
  // Reload notes for the new tab
  await loadNotes();
  
  // Update sidebar to show active tab
  updateSidebar();
}

function getCurrentTab() {
  return tabs.find(tab => tab.id === currentTabId);
}

function getCurrentTabId() {
  return currentTabId;
}

function updateCurrentTabDisplay() {
  const currentTab = getCurrentTab();
  const tabNameElement = document.getElementById('current-tab-name');
  
  if (tabNameElement && currentTab) {
    tabNameElement.textContent = currentTab.name;
  }
}

// Make functions global
window.loadTabs = loadTabs;
window.createTab = createTab;
window.updateTab = updateTab;
window.deleteTab = deleteTab;
window.switchToTab = switchToTab;
window.getCurrentTab = getCurrentTab;
window.getCurrentTabId = getCurrentTabId;
window.updateCurrentTabDisplay = updateCurrentTabDisplay;