let currentProjectId = null;
let currentScope = 'Web';

const API_BASE = 'api/api.php';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    setupEventListeners();
});

function setupEventListeners() {
    // Project actions
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) addProjectBtn.addEventListener('click', handleCreateProject);

    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    if (deleteProjectBtn) deleteProjectBtn.addEventListener('click', handleDeleteProject);

    // Sync button (for pulling newly added master checklist items into existing projects)
    const syncProjectBtn = document.getElementById('syncProjectBtn');
    if (syncProjectBtn) syncProjectBtn.addEventListener('click', handleSyncProject);

    // Master template form
    const addTemplateBtn = document.getElementById('addTemplateBtn');
    if (addTemplateBtn) addTemplateBtn.addEventListener('click', handleAddMasterTemplate);

    // Sidebar collapse toggle
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            sidebarToggleBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
        });
    }

    // Scope Tabs (Web, API, Server)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentScope = e.target.getAttribute('data-scope');
            if (currentProjectId) {
                loadChecklist(currentProjectId, currentScope);
            }
        });
    });
}

// 1. Fetch & Render Project List in Sidebar
async function fetchProjects() {
    try {
        const res = await fetch(`${API_BASE}?action=get_projects`);
        const projects = await res.json();
        const list = document.getElementById('projectList');
        if (!list) return;

        list.innerHTML = '';

        projects.forEach(p => {
            const li = document.createElement('li');
            li.className = `project-item ${currentProjectId === p.id ? 'active' : ''}`;
            li.textContent = p.project_name;
            li.onclick = () => selectProject(p.id, p.project_name);
            list.appendChild(li);
        });
    } catch (err) {
        console.error('Failed to load projects:', err);
    }
}

// 2. Select Project
function selectProject(id, name) {
    currentProjectId = id;

    const title = document.getElementById('currentProjectTitle');
    const deleteBtn = document.getElementById('deleteProjectBtn');
    const syncBtn = document.getElementById('syncProjectBtn');
    const scopeTabs = document.getElementById('scopeTabs');

    if (title) title.textContent = `Project: ${name}`;
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
    if (syncBtn) syncBtn.style.display = 'inline-block';
    if (scopeTabs) scopeTabs.style.display = 'flex';

    fetchProjects();
    loadChecklist(currentProjectId, currentScope);
}

// 3. Create Project
async function handleCreateProject() {
    const input = document.getElementById('newProjectInput');
    const name = input ? input.value.trim() : '';
    if (!name) return;

    try {
        const res = await fetch(`${API_BASE}?action=create_project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_name: name })
        });

        const data = await res.json();
        if (data.success) {
            input.value = '';
            selectProject(data.project_id, name);
        } else {
            alert(data.error || 'Failed to create project.');
        }
    } catch (err) {
        alert('Server connection error while creating project.');
    }
}

// 4. Delete Project
async function handleDeleteProject() {
    if (!currentProjectId) return;
    if (!confirm("Are you sure you want to delete this project and all its findings?")) return;

    try {
        const res = await fetch(`${API_BASE}?action=delete_project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: currentProjectId })
        });

        const data = await res.json();
        if (data.success) {
            currentProjectId = null;

            const title = document.getElementById('currentProjectTitle');
            const deleteBtn = document.getElementById('deleteProjectBtn');
            const syncBtn = document.getElementById('syncProjectBtn');
            const scopeTabs = document.getElementById('scopeTabs');
            const tbody = document.getElementById('checklistBody');

            if (title) title.textContent = 'Select a Project';
            if (deleteBtn) deleteBtn.style.display = 'none';
            if (syncBtn) syncBtn.style.display = 'none';
            if (scopeTabs) scopeTabs.style.display = 'none';
            if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Select or create a project to start auditing.</td></tr>';

            fetchProjects();
        } else {
            alert('Failed to delete project.');
        }
    } catch (err) {
        alert('Server connection error while deleting project.');
    }
}

// 5. Sync Missing Master Checklist Items to Old Projects
async function handleSyncProject() {
    if (!currentProjectId) return;

    try {
        const res = await fetch(`${API_BASE}?action=sync_project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: currentProjectId })
        });

        const data = await res.json();
        if (data.success) {
            if (data.added > 0) {
                alert(`Sync successful! Added ${data.added} new check(s) to this project.`);
            } else {
                alert('This project is already up-to-date with the master templates.');
            }
            loadChecklist(currentProjectId, currentScope);
        } else {
            alert(data.error || 'Failed to sync checklist items.');
        }
    } catch (err) {
        alert('Server connection error during synchronization.');
    }
}

// 6. Add New Item to Master Templates
async function handleAddMasterTemplate() {
    const scopeEl = document.getElementById('tplScope');
    const nameEl = document.getElementById('tplName');
    const toolEl = document.getElementById('tplTool');
    const descEl = document.getElementById('tplDesc');

    const scope_type = scopeEl ? scopeEl.value : 'Web';
    const name = nameEl ? nameEl.value.trim() : '';
    const tool = toolEl ? toolEl.value.trim() : '';
    const description = descEl ? descEl.value.trim() : '';

    if (!name) {
        alert('Please enter a test name.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}?action=add_template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope_type, name, tool, description })
        });

        const data = await res.json();
        if (data.success) {
            alert(`Added "${name}" to Master ${scope_type} Checklist!`);
            if (nameEl) nameEl.value = '';
            if (toolEl) toolEl.value = '';
            if (descEl) descEl.value = '';
        } else {
            alert(data.error || 'Failed to add item to master template.');
        }
    } catch (err) {
        alert('Server connection error while saving master template item.');
    }
}

// 7. Dynamic Dropdown Color Function
function applyDropdownColor(selectElement) {
    if (!selectElement) return;

    // Remove any previously set state classes
    selectElement.classList.remove(
        'color-not-started', 'color-in-progress', 'color-completed',
        'color-pending', 'color-yes', 'color-no', 'color-recheck'
    );

    const val = selectElement.value;
    switch (val) {
        case 'Not Started':
            selectElement.classList.add('color-not-started');
            break;
        case 'In Progress':
            selectElement.classList.add('color-in-progress');
            break;
        case 'Completed':
            selectElement.classList.add('color-completed');
            break;
        case 'Pending':
            selectElement.classList.add('color-pending');
            break;
        case 'Yes':
            selectElement.classList.add('color-yes');
            break;
        case 'No':
            selectElement.classList.add('color-no');
            break;
        case 'Recheck':
            selectElement.classList.add('color-recheck');
            break;
    }
}

// 8. Load Checklist Table
async function loadChecklist(projectId, scope) {
    const tbody = document.getElementById('checklistBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Loading checks...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}?action=get_checklist&project_id=${projectId}&scope=${scope}`);
        const items = await res.json();

        tbody.innerHTML = '';
        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No checklist items found for this scope.</td></tr>';
            return;
        }

        // Loop once, assign colors directly on render
        items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td><small>${escapeHtml(item.description || '')}</small></td>
                <td><small>${escapeHtml(item.tool || '')}</small></td>
                <td>
                    <input type="text" id="url-${item.id}" value="${escapeHtml(item.vuln_url || '')}" placeholder="e.g. /api/login">
                </td>
                <td>
                    <select id="prog-${item.id}" onchange="applyDropdownColor(this)">
                        <option value="Not Started" ${item.progress === 'Not Started' ? 'selected' : ''}>Not Started</option>
                        <option value="In Progress" ${item.progress === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Completed" ${item.progress === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </td>
                <td>
                    <select id="stat-${item.id}" onchange="applyDropdownColor(this)">
                        <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Yes" ${item.status === 'Yes' ? 'selected' : ''}>Yes</option>
                        <option value="No" ${item.status === 'No' ? 'selected' : ''}>No</option>
                        <option value="Recheck" ${item.status === 'Recheck' ? 'selected' : ''}>Recheck</option>
                    </select>
                </td>
                <td>
                    <textarea id="meth-${item.id}" placeholder="Enter steps or evidence...">${escapeHtml(item.methodology || '')}</textarea>
                </td>
                <td>
                    <button class="save-btn" onclick="saveRow(${item.id})">Save</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Apply matching color immediately when table is loaded
            applyDropdownColor(document.getElementById(`prog-${item.id}`));
            applyDropdownColor(document.getElementById(`stat-${item.id}`));
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Error loading checklist data.</td></tr>';
    }
}

// 9. Save a Single Checklist Row
async function saveRow(itemId) {
    const urlEl = document.getElementById(`url-${itemId}`);
    const progEl = document.getElementById(`prog-${itemId}`);
    const statEl = document.getElementById(`stat-${itemId}`);
    const methEl = document.getElementById(`meth-${itemId}`);

    const vulnUrl = urlEl ? urlEl.value : '';
    const progress = progEl ? progEl.value : 'Not Started';
    const status = statEl ? statEl.value : 'Pending';
    const methodology = methEl ? methEl.value : '';

    try {
        const res = await fetch(`${API_BASE}?action=update_item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itemId,
                vuln_url: vulnUrl,
                progress: progress,
                status: status,
                methodology: methodology
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('Item updated successfully!');
        } else {
            alert('Failed to save item.');
        }
    } catch (err) {
        alert('Server connection error while saving.');
    }
}

// Helper to escape HTML characters in inputs and tables
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}