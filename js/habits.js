// --- HIGH ENGINE SMART HABIT TRACKER COMPONENT ---
(function() {
    // Systems Cache Initialization
    let habits = JSON.parse(localStorage.getItem('sm_tracker_habits')) || [
        { id: 1, name: "Cardio Interval Training", category: "Fitness", priority: "1", completed: false, order: 0 },
        { id: 2, name: "Read Design Systems Documentation", category: "Study", priority: "2", completed: true, order: 1 }
    ];

    // Node Registries
    const habitList = document.getElementById('habit-list');
    const inputField = document.getElementById('new-habit-input');
    const categoryField = document.getElementById('habit-category');
    const priorityField = document.getElementById('habit-priority');
    const submitBtn = document.getElementById('add-habit-btn');
    const editTargetId = document.getElementById('edit-target-id');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const progressRing = document.getElementById('tracker-progress-ring');
    const progressText = document.getElementById('progress-text');

    // Circle Sizing Constants
    const radius = progressRing.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

    function setProgress(percent) {
        const offset = circumference - (percent / 100 * circumference);
        progressRing.style.strokeDashoffset = offset;
        progressText.textContent = `${percent}%`;
    }

    function syncState() {
        localStorage.setItem('sm_tracker_habits', JSON.stringify(habits));
        render();
    }

    // Builder Engine Template Render
    function render() {
        habitList.innerHTML = '';
        
        // Sorting Algorithm: Complete status elements sink down, active elements stay sorted by index rank
        const sortedHabits = [...habits].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return a.order - b.order;
        });

        if (sortedHabits.length === 0) {
            habitList.innerHTML = `<p style="color: var(--muted); font-style: italic; text-align: center; margin: 20px 0;">Your routine profile is empty. Let's add something!</p>`;
            setProgress(0);
            return;
        }

        sortedHabits.forEach(habit => {
            const row = document.createElement('div');
            row.className = `habit-item ${habit.completed ? 'is-completed' : ''}`;
            row.setAttribute('draggable', 'true');
            row.setAttribute('data-id', habit.id);
            row.setAttribute('data-priority', habit.priority);

            row.innerHTML = `
                <div class="habit-left-block">
                    <input type="checkbox" ${habit.completed ? 'checked' : ''} class="habit-toggle" style="accent-color: var(--accent); transform: scale(1.2); cursor: pointer;">
                    <div>
                        <div class="habit-content-title">${escapeHTML(habit.name)}</div>
                        <div class="habit-meta-badges">
                            <span class="badge badge-cat">${habit.category}</span>
                        </div>
                    </div>
                </div>
                <div class="habit-right-block">
                    <button class="op-btn op-edit" title="Edit Entry">✏️</button>
                    <button class="op-btn op-delete" title="Delete Entry">✕</button>
                </div>
            `;
            habitList.appendChild(row);
        });

        // Compute Completion Percentage Slices
        const total = habits.length;
        const completedCount = habits.filter(h => h.completed).length;
        setProgress(total > 0 ? Math.round((completedCount / total) * 100) : 0);
        initDragAndDrop();
    }

    // Processing Form Commands
    function processForm() {
        const titleText = inputField.value.trim();
        if (!titleText) return;

        const targetId = editTargetId.value;

        if (targetId) {
            // Edit execution block
            const matchedIndex = habits.findIndex(h => h.id === parseInt(targetId));
            if (matchedIndex !== -1) {
                habits[matchedIndex].name = titleText;
                habits[matchedIndex].category = categoryField.value;
                habits[matchedIndex].priority = priorityField.value;
            }
            clearFormState();
        } else {
            // Create target blueprint routing
            const item = {
                id: Date.now(),
                name: titleText,
                category: categoryField.value,
                priority: priorityField.value,
                completed: false,
                order: habits.length
            };
            habits.push(item);
            inputField.value = '';
        }
        syncState();
    }

    function enterEditMode(id) {
        const target = habits.find(h => h.id === id);
        if (!target) return;

        inputField.value = target.name;
        categoryField.value = target.category;
        priorityField.value = target.priority;
        editTargetId.value = target.id;
        
        submitBtn.textContent = 'Save';
        cancelEditBtn.style.display = 'inline-block';
        inputField.focus();
    }

    function clearFormState() {
        inputField.value = '';
        editTargetId.value = '';
        submitBtn.textContent = 'Add';
        cancelEditBtn.style.display = 'none';
    }

    // Drag and Drop Sorting Engine
    function initDragAndDrop() {
        const items = habitList.querySelectorAll('.habit-item:not(.is-completed)');
        
        items.forEach(item => {
            item.addEventListener('dragstart', () => item.classList.add('dragging'));
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                // Capture new ordering position indices on release
                const finalRows = Array.from(habitList.querySelectorAll('.habit-item'));
                finalRows.forEach((row, index) => {
                    const rowId = parseInt(row.getAttribute('data-id'));
                    const memoryItem = habits.find(h => h.id === rowId);
                    if (memoryItem) memoryItem.order = index;
                });
                localStorage.setItem('sm_tracker_habits', JSON.stringify(habits));
            });
        });

        habitList.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(habitList, e.clientY);
            const draggingEl = document.querySelector('.dragging');
            if (!draggingEl) return;
            
            if (afterElement == null) {
                habitList.appendChild(draggingEl);
            } else {
                habitList.insertBefore(draggingEl, afterElement);
            }
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.habit-item:not(.dragging):not(.is-completed)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Structural Intercept Event Mapping
    habitList.addEventListener('click', e => {
        const targetRow = e.target.closest('.habit-item');
        if (!targetRow) return;
        const targetId = parseInt(targetRow.getAttribute('data-id'));

        if (e.target.classList.contains('habit-toggle')) {
            const item = habits.find(h => h.id === targetId);
            if (item) {
                item.completed = e.target.checked;
                syncState();
            }
        } else if (e.target.classList.contains('op-edit')) {
            enterEditMode(targetId);
        } else if (e.target.classList.contains('op-delete')) {
            habits = habits.filter(h => h.id !== targetId);
            syncState();
        }
    });

    submitBtn.addEventListener('click', processForm);
    inputField.addEventListener('keypress', e => { if (e.key === 'Enter') processForm(); });
    cancelEditBtn.addEventListener('click', clearFormState);

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Run Engine
    render();
})();
