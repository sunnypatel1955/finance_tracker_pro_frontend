// Enhanced UI Management Module
let hasCookieConsent = false;
let notificationQueue = [];
let isDisplayingNotification = false;
let currentTourStep = 0;

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Create debounced update function - wait for update function to be available
// Replace the existing debouncedUpdate creation with this improved version
function createDebouncedUpdate() {
    return function(...args) {
        if (typeof window.update === 'function') {
            if (!window.debouncedUpdate || window.debouncedUpdate.name !== 'debouncedUpdate') {
                window.debouncedUpdate = debounce(window.update, 300);
            }
            window.debouncedUpdate(...args);
        } else {
            console.warn('Update function not yet available, queuing call');
            setTimeout(() => {
                if (typeof window.update === 'function') {
                    window.debouncedUpdate = debounce(window.update, 300);
                    window.debouncedUpdate(...args);
                }
            }, 100);
        }
    };
}

// Initialize the debounced update function
window.debouncedUpdate = createDebouncedUpdate();

// Check periodically if update function becomes available and update debouncedUpdate
const updateChecker = setInterval(() => {
    if (typeof window.update === 'function') {
        window.debouncedUpdate = debounce(window.update, 300);
        clearInterval(updateChecker);
    }
}, 100);

// Toggle section visibility
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const button = section.closest('.card').querySelector('.toggle-btn i');
    if (!button) return;
    
    if (section.classList.contains('show')) {
        section.classList.remove('show');
        button.classList.replace('fa-chevron-up', 'fa-chevron-down');
    } else {
        section.classList.add('show');
        button.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

// Add row to table
function addRow(tableId, event) {
    const table = document.getElementById(tableId)?.querySelector('tbody');
    if (!table) {
        console.error(`Table ${tableId} not found`);
        return;
    }
    
    const currentRows = table.querySelectorAll('tr').length;
    
    // Row limits
    const rowLimits = {
        'investments': 50,
        'loans': 20,
        'income': 25,
        'expenses': 50,
        'goals': 20
    };
    
    if (currentRows >= rowLimits[tableId]) {
        showNotification(`Maximum ${rowLimits[tableId]} entries allowed for ${tableId}`, 'warning');
        return;
    }
    
    const row = document.createElement('tr');
    row.style.opacity = '0';
    
    // Default values for different investment types
    const investmentDefaults = {
        "Fixed Income": { return: 6.5, risk: "low" },
        "Mutual Funds": { return: 10.0, risk: "medium" },
        "Stocks": { return: 12.0, risk: "high" },
        "Real Estate": { return: 9.0, risk: "medium" },
        "Gold": { return: 8.0, risk: "medium" },
        "Bonds": { return: 7.5, risk: "low" },
        "Cryptocurrency": { return: 15.0, risk: "high" },
        "Other": { return: 7.0, risk: "medium" }
    };
    
    switch (tableId) {
        case 'investments':
            const defaultInvestment = "Fixed Income";
            const defaults = investmentDefaults[defaultInvestment];
            
            row.innerHTML = `
                <td><select class="form-select" name="investment_name" oninput="handleInvestmentChange(this); window.debouncedUpdate()">
                    <option value="Fixed Income">Fixed Income</option>
                    <option value="Mutual Funds">Mutual Funds</option>
                    <option value="Stocks">Stocks</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Gold">Gold</option>
                    <option value="Bonds">Bonds</option>
                    <option value="Cryptocurrency">Cryptocurrency</option>
                    <option value="Other">Other</option>
                </select></td>
                <td><input type="number" class="form-control" name="investment_value" placeholder="0" step="100" min="0" oninput="window.debouncedUpdate()"></td>
                <td><input type="number" class="form-control" name="investment_return" value="${defaults.return}" step="0.1" min="-100" max="100" oninput="window.debouncedUpdate()"></td>
                <td><select class="form-select" name="investment_risk" oninput="window.debouncedUpdate()">
                    <option value="low" ${defaults.risk === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${defaults.risk === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${defaults.risk === 'high' ? 'selected' : ''}>High</option>
                </select></td>
                <td><input type="text" class="form-control" name="investment_remark" placeholder="Notes" maxlength="50" oninput="window.debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button></td>
            `;
            break;
            
        case 'income':
            row.innerHTML = `
                <td><select class="form-select" name="income_name" oninput="window.debouncedUpdate()">
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Business">Business</option>
                    <option value="Rental Income">Rental Income</option>
                    <option value="Dividend">Dividend</option>
                    <option value="Interest">Interest</option>
                    <option value="Other">Other</option>
                </select></td>
                <td><input type="number" class="form-control" name="income_value" placeholder="0" step="100" min="0" oninput="window.debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="income_remark" placeholder="Notes" maxlength="50" oninput="window.debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button></td>
            `;
            break;
            
        case 'loans':
            row.innerHTML = `
                <td><select class="form-select" name="loan_name" oninput="window.debouncedUpdate()">
                    <option value="Home Loan">Home Loan</option>
                    <option value="Car Loan">Car Loan</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Education Loan">Education Loan</option>
                    <option value="Business Loan">Business Loan</option>
                    <option value="Other">Other</option>
                </select></td>
                <td><input type="number" class="form-control" name="loan_value" placeholder="0" step="100" min="0" oninput="window.debouncedUpdate()"></td>
                <td><input type="number" class="form-control" name="loan_interest" placeholder="0" step="0.1" min="0" max="50" oninput="window.debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="loan_remark" placeholder="Notes" maxlength="50" oninput="window.debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button></td>
            `;
            break;
            
        case 'expenses':
            row.innerHTML = `
                <td><select class="form-select" name="expense_category" oninput="window.debouncedUpdate()">
                    <option value="Housing">Housing</option>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Loan EMI">Loan EMI</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                </select></td>
                <td><select class="form-select" name="expense_type" oninput="window.debouncedUpdate()">
                    <option value="Recurring">Recurring</option>
                    <option value="One-time">One-time</option>
                </select></td>
                <td><input type="number" class="form-control" name="expense_value" placeholder="0" step="100" min="0" oninput="window.debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="expense_remark" placeholder="Notes" maxlength="50" oninput="window.debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button></td>
            `;
            break;
    }
    
    // Add input validation
    addInputValidation(row);
    
    // Append row with animation
    table.appendChild(row);
    setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease';
        row.style.opacity = '1';
    }, 10);
    
    // Focus first input
    const firstInput = row.querySelector('input[type="number"]');
    if (firstInput) firstInput.focus();
    
    // Call update function if available
    if (typeof window.debouncedUpdate === 'function') {
        window.debouncedUpdate();
    }
}

// Add goal
function addGoal(event) {
    const table = document.getElementById('goals')?.querySelector('tbody');
    if (!table) {
        console.error('Goals table not found');
        return;
    }
    
    const currentRows = table.querySelectorAll('tr').length;
    
    if (currentRows >= 20) {
        showNotification('Maximum 20 goals allowed', 'warning');
        return;
    }
    
    const row = document.createElement('tr');
    row.style.opacity = '0';
    
    row.innerHTML = `
        <td><input type="text" class="form-control" name="goal_name" placeholder="e.g., Retirement Fund" oninput="window.debouncedUpdate()"></td>
        <td><input type="number" class="form-control" name="goal_target" placeholder="0" step="10000" min="0" oninput="window.debouncedUpdate()"></td>
        <td><input type="text" class="form-control" name="goal_time" readonly placeholder="Calculating..."></td>
        <td><div class="progress"><div class="progress-bar bg-success" style="width: 0%"></div></div></td>
        <td><button class="remove-btn" onclick="removeRow(this, 'goals')" title="Remove">
            <i class="fas fa-times"></i>
        </button></td>
    `;
    
    addInputValidation(row);
    
    table.appendChild(row);
    setTimeout(() => {
        row.style.transition = 'opacity 0.3s ease';
        row.style.opacity = '1';
    }, 10);
    
    const nameInput = row.querySelector('[name="goal_name"]');
    if (nameInput) nameInput.focus();
    
    if (typeof window.debouncedUpdate === 'function') {
        window.debouncedUpdate();
    }
}

// Handle investment type change
function handleInvestmentChange(selectElement) {
    const row = selectElement.closest('tr');
    const selectedType = selectElement.value;
    
    const investmentDefaults = {
        "Fixed Income": { return: 6.5, risk: "low" },
        "Mutual Funds": { return: 10.0, risk: "medium" },
        "Stocks": { return: 12.0, risk: "high" },
        "Real Estate": { return: 9.0, risk: "medium" },
        "Gold": { return: 8.0, risk: "medium" },
        "Bonds": { return: 7.5, risk: "low" },
        "Cryptocurrency": { return: 15.0, risk: "high" },
        "Other": { return: 7.0, risk: "medium" }
    };
    
    const defaults = investmentDefaults[selectedType] || investmentDefaults["Other"];
    
    const returnInput = row.querySelector('[name="investment_return"]');
    const riskSelect = row.querySelector('[name="investment_risk"]');
    
    if (returnInput) returnInput.value = defaults.return;
    if (riskSelect) riskSelect.value = defaults.risk;
}

// Remove row with animation
function removeRow(button, tableId) {
    const row = button.closest('tr');
    
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Remove this item?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, remove it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                performRowRemoval(row);
            }
        });
    } else {
        // Fallback confirmation
        if (confirm('Remove this item? This action cannot be undone.')) {
            performRowRemoval(row);
        }
    }
}

// Perform the actual row removal
function performRowRemoval(row) {
    row.style.transition = 'opacity 0.3s ease';
    row.style.opacity = '0';
    
    setTimeout(() => {
        row.remove();
        if (typeof window.debouncedUpdate === 'function') {
            window.debouncedUpdate();
        }
        showNotification('Item removed', 'success');
    }, 300);
}

// Add input validation
function addInputValidation(row) {
    // Number inputs
    const numberInputs = row.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('keypress', validateNumberInput);
        input.addEventListener('paste', validatePaste);
    });
    
    // Text inputs
    const textInputs = row.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        if (!input.readOnly) {
            input.addEventListener('input', validateTextInput);
        }
    });
}

// Validate number input
function validateNumberInput(event) {
    const char = String.fromCharCode(event.which);
    const value = event.target.value;
    const isNumber = /[0-9]/.test(char);
    const isDot = char === '.';
    const isMinus = char === '-';
    const hasDot = value.includes('.');
    const hasMinus = value.includes('-');
    
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.keyCode === 65 && event.ctrlKey === true) ||
        (event.keyCode === 67 && event.ctrlKey === true) ||
        (event.keyCode === 86 && event.ctrlKey === true) ||
        (event.keyCode === 88 && event.ctrlKey === true)) {
        return;
    }
    
    // Allow minus at start for returns
    if (isMinus && event.target.name === 'investment_return' && value.length === 0) {
        return;
    }
    
    // Prevent invalid characters
    if (!isNumber && (!isDot || hasDot)) {
        event.preventDefault();
    }
}

// Validate paste
function validatePaste(event) {
    const paste = (event.clipboardData || window.clipboardData).getData('text');
    if (!/^-?\d*\.?\d*$/.test(paste)) {
        event.preventDefault();
    }
}

// Validate text input
function validateTextInput(event) {
    const input = event.target;
    const maxLength = parseInt(input.getAttribute('maxlength') || '50');
    
    if (input.value.length > maxLength) {
        input.value = input.value.substring(0, maxLength);
    }
}

// 6. Optimized notification system
let notificationTimeouts = new Set();

function showNotification(message, type = 'info') {
    // Limit notification queue size
    if (notificationQueue.length > 5) {
        notificationQueue.shift(); // Remove oldest
    }
    
    notificationQueue.push({ message, type });
    displayNextNotification();
}

function displayNextNotification() {
    if (isDisplayingNotification || notificationQueue.length === 0) return;
    
    isDisplayingNotification = true;
    const { message, type } = notificationQueue.shift();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)} me-2"></i>
        <span>${message}</span>
    `;
    
    const activeNotifications = document.querySelectorAll('.notification');
    const offset = Array.from(activeNotifications).reduce((sum, n) => sum + n.offsetHeight + 10, 90);
    notification.style.top = `${offset}px`;
    
    document.body.appendChild(notification);
    
    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    });
    
    // Track timeout for cleanup
    const timeout = setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        const removeTimeout = setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            isDisplayingNotification = false;
            notificationTimeouts.delete(timeout);
            notificationTimeouts.delete(removeTimeout);
            displayNextNotification();
        }, 300);
        
        notificationTimeouts.add(removeTimeout);
    }, 3000);
    
    notificationTimeouts.add(timeout);
}


// Get notification icon
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Show error
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? 'block' : 'none';
    }
    if (message) {
        showNotification(message, 'error');
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode', !isDarkMode);
    
    // Save preference
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update data settings
    if (window.data && window.data.settings) {
        window.data.settings.theme = isDarkMode ? 'dark' : 'light';
    }
    
    // Update menu item
    const menuItem = document.querySelector('.dropdown-item[onclick="toggleDarkMode()"]');
    if (menuItem) {
        menuItem.innerHTML = `<i class="fas fa-${isDarkMode ? 'sun' : 'moon'} me-2"></i>Toggle ${isDarkMode ? 'Light' : 'Dark'} Mode`;
    }
    
    // Update tables
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        table.classList.toggle('table-dark', isDarkMode);
    });
    
    // Update charts
    if (typeof window.updateChartColors === 'function') {
        window.updateChartColors(isDarkMode);
        if (window.charts) {
            Object.values(window.charts).forEach(chart => chart?.update());
        }
    }
    
    showNotification(`${isDarkMode ? 'Dark' : 'Light'} mode activated`, 'success');
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const isActive = sidebar.classList.toggle('active');
    
    // Save preference
    localStorage.setItem('sidebarActive', isActive);
    
    // Adjust main content
    if (window.innerWidth > 768) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginLeft = isActive ? '320px' : '0';
        }
    }
}

// Show monthly details
function showMonthlyDetails(date) {
    const sortedRecords = [...historicalNetWorth].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recordIndex = sortedRecords.findIndex(r => r.date === date);
    const record = sortedRecords[recordIndex];
    if (!record) return;
    const modal = new bootstrap.Modal(document.getElementById('monthlyDetailsModal'));
    const recordDate = new Date(record.date);
    const formattedDate = recordDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let change = '0%';
    if (recordIndex < sortedRecords.length - 1) {
        const prevNetWorth = sortedRecords[recordIndex + 1].netWorth;
        const changePercent = ((record.netWorth - prevNetWorth) / prevNetWorth) * 100;
        change = `${changePercent.toFixed(1)}%`;
    }
    document.getElementById('modalDate').textContent = formattedDate;
    document.getElementById('modalNetWorth').textContent = formatCurrency(record.netWorth);
    document.getElementById('modalChange').textContent = change;
    document.getElementById('modalChange').className = change.startsWith('-') ? 'text-danger' : 'text-success';
    const totalInvestments = record.totalInvestments;
    const totalLoans = record.totalLoans;
    const totalIncome = record.totalIncome;
    const totalExpenses = record.totalExpenses;
    const netSavings = totalIncome - totalExpenses;
    document.getElementById('modalCash').textContent = formatCurrency(record.cash);
    document.getElementById('modalInvestments').textContent = formatCurrency(totalInvestments);
    document.getElementById('modalLoans').textContent = formatCurrency(totalLoans);
    document.getElementById('modalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('modalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('modalSavings').textContent = formatCurrency(netSavings);
    document.getElementById('modalSavings').className = netSavings < 0 ? 'text-danger' : 'text-success';
    modal.show();
}

// Debug version of updateMonthlyRecordsTable
function updateMonthlyRecordsTable() {
    console.log('=== UPDATE MONTHLY RECORDS TABLE DEBUG START ===');
    console.log('1. Function called');
    console.log('   - historicalNetWorth length:', historicalNetWorth?.length || 0);
    console.log('   - window.historicalNetWorth length:', window.historicalNetWorth?.length || 0);
    console.log('   - Are they same reference?', historicalNetWorth === window.historicalNetWorth);
    
    const tbody = document.querySelector('#monthlyRecords tbody');
    if (!tbody) {
        console.error('ERROR: Monthly records tbody not found');
        return;
    }
    console.log('2. Table tbody found');
    
    console.log('3. Current historicalNetWorth data:');
    if (historicalNetWorth && historicalNetWorth.length > 0) {
        historicalNetWorth.forEach((record, index) => {
            const date = new Date(record.date);
            console.log(`   [${index}] ${date.toLocaleDateString()} - Net Worth: ${record.netWorth}`);
        });
    } else {
        console.log('   - No historical data found');
    }
    
    tbody.innerHTML = '';
    
    if (!historicalNetWorth || historicalNetWorth.length === 0) {
        console.log('4. No data - showing empty message');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No monthly records yet. Click "Save Monthly Record" to start tracking.
                </td>
            </tr>
        `;
        console.log('=== UPDATE MONTHLY RECORDS TABLE DEBUG END (NO DATA) ===');
        return;
    }
    
    const sortedRecords = [...historicalNetWorth].sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('4. Sorted records for display:');
    sortedRecords.forEach((record, index) => {
        const date = new Date(record.date);
        console.log(`   [${index}] ${date.toLocaleDateString()} - Net Worth: ${record.netWorth}`);
    });
    
    console.log('5. Creating table rows...');
    sortedRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        const date = new Date(record.date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        let change = '0%';
        if (index < sortedRecords.length - 1) {
            const prevNetWorth = sortedRecords[index + 1].netWorth;
            const changePercent = ((record.netWorth - prevNetWorth) / prevNetWorth) * 100;
            change = `${changePercent.toFixed(1)}%`;
        }
        
        let status = 'Current';
        if (index > 0) {
            const today = new Date();
            const recordDate = new Date(record.date);
            const monthDiff = (today.getFullYear() - recordDate.getFullYear()) * 12 + (today.getMonth() - recordDate.getMonth());
            if (monthDiff > 0) status = 'Locked';
        }
        
        console.log(`   Creating row for ${monthYear} - Net Worth: ${window.formatCurrency ? window.formatCurrency(record.netWorth) : record.netWorth}`);
        
        row.innerHTML = `
            <td>${monthYear}</td>
            <td>${window.formatCurrency ? window.formatCurrency(record.netWorth) : record.netWorth}</td>
            <td class="${change.startsWith('-') ? 'text-danger' : 'text-success'}">${change}</td>
            <td><span class="badge ${status === 'Locked' ? 'bg-secondary' : 'bg-success'}">${status}</span></td>
            <td><button class="btn btn-sm btn-primary" onclick="showMonthlyDetails('${record.date}')"><i class="fas fa-eye"></i> Details</button></td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('6. Table rows created and added');
    console.log('   - Final tbody children count:', tbody.children.length);
    console.log('=== UPDATE MONTHLY RECORDS TABLE DEBUG END ===');
}

// Debug version to check the update function
function debugUpdate() {
    console.log('=== UPDATE FUNCTION DEBUG ===');
    console.log('Current data.initial_cash:', data?.initial_cash);
    console.log('Current overview net worth element:', document.getElementById('netWorth')?.value);
    
    // Call the actual update
    if (typeof window.update === 'function') {
        window.update();
    }
    
    console.log('After update - data.initial_cash:', data?.initial_cash);
    console.log('After update - overview net worth element:', document.getElementById('netWorth')?.value);
}
// Add delete function if missing
function deleteMonthlyRecord(date) {
    if (confirm('Delete this monthly record? This action cannot be undone.')) {
        if (window.historicalNetWorth) {
            window.historicalNetWorth = window.historicalNetWorth.filter(r => r.date !== date);
            updateMonthlyRecordsTable();
            
            if (typeof window.updateHistoricalChart === 'function') {
                window.updateHistoricalChart();
            }
            if (typeof window.updateInsights === 'function') {
                window.updateInsights();
            }
            if (typeof window.saveData === 'function') {
                window.saveData();
            }
            
            showNotification('Monthly record deleted', 'success');
        }
    }
}

// Delete monthly record
function deleteMonthlyRecord(date) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Delete Monthly Record?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                performRecordDeletion(date);
            }
        });
    } else {
        if (confirm('Delete this monthly record? This action cannot be undone.')) {
            performRecordDeletion(date);
        }
    }
}

// Perform the actual record deletion
function performRecordDeletion(date) {
    if (window.historicalNetWorth) {
        window.historicalNetWorth = window.historicalNetWorth.filter(r => r.date !== date);
        updateMonthlyRecordsTable();
        
        if (typeof window.updateHistoricalChart === 'function') {
            window.updateHistoricalChart();
        }
        if (typeof window.updateInsights === 'function') {
            window.updateInsights();
        }
        if (typeof window.saveData === 'function') {
            window.saveData();
        }
        
        showNotification('Monthly record deleted', 'success');
    }
}

// Initialize cookie consent
function initializeCookieConsent() {
    console.log('Initializing cookie consent');
    
    if (!window.checkAuth || !window.checkAuth()) {
        console.warn('User not authenticated - skipping cookie consent');
        return;
    }
    
    const email = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!email) {
        console.warn('No user email found');
        return;
    }
    
    const consentKey = `cookieConsent_${email}`;
    const consent = localStorage.getItem(consentKey);
    const cookieConsentPopup = document.getElementById('cookieConsent');
    
    if (!cookieConsentPopup) {
        console.error('Cookie consent popup element not found');
        return;
    }
    
    if (consent) {
        const settings = JSON.parse(consent);
        applyCookieSettings(settings);
        hasCookieConsent = true;
        cookieConsentPopup.style.display = 'none';
    } else {
        cookieConsentPopup.style.display = 'flex';
        hasCookieConsent = false;
    }
}

// Accept cookies
function acceptCookies() {
    const email = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!email) return;
    
    const consentKey = `cookieConsent_${email}`;
    const settings = {
        necessary: true,
        analytics: true,
        performance: true,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(consentKey, JSON.stringify(settings));
    const cookieConsent = document.getElementById('cookieConsent');
    if (cookieConsent) {
        cookieConsent.style.display = 'none';
    }
    applyCookieSettings(settings);
    hasCookieConsent = true;
    
    showNotification('Cookie preferences saved', 'success');
    
    // Start auto-save
    if (typeof window.startAutoSave === 'function') {
        window.startAutoSave();
    }
}

// Decline cookies
function declineCookies() {
    const email = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!email) return;
    
    const consentKey = `cookieConsent_${email}`;
    const settings = {
        necessary: false,
        analytics: false,
        performance: false,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(consentKey, JSON.stringify(settings));
    const cookieConsent = document.getElementById('cookieConsent');
    if (cookieConsent) {
        cookieConsent.style.display = 'none';
    }
    applyCookieSettings(settings);
    hasCookieConsent = false;
    
    showNotification('Cookies declined - data saving disabled', 'warning');
}

// Show cookie settings
function showCookieSettings() {
    const email = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!email) return;
    
    const consentKey = `cookieConsent_${email}`;
    const existingConsent = localStorage.getItem(consentKey);
    
    if (existingConsent) {
        const settings = JSON.parse(existingConsent);
        const analyticsCheckbox = document.getElementById('analyticsCookies');
        const performanceCheckbox = document.getElementById('performanceCookies');
        
        if (analyticsCheckbox) analyticsCheckbox.checked = settings.analytics || false;
        if (performanceCheckbox) performanceCheckbox.checked = settings.performance || false;
    }
    
    const modal = document.getElementById('cookieSettingsModal');
    if (modal && typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Save cookie settings
function saveCookieSettings() {
    const email = window.getCurrentUser ? window.getCurrentUser() : null;
    if (!email) return;
    
    const consentKey = `cookieConsent_${email}`;
    const analyticsCheckbox = document.getElementById('analyticsCookies');
    const performanceCheckbox = document.getElementById('performanceCookies');
    
    const settings = {
        necessary: true,
        analytics: analyticsCheckbox ? analyticsCheckbox.checked : false,
        performance: performanceCheckbox ? performanceCheckbox.checked : false,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(consentKey, JSON.stringify(settings));
    
    const modal = document.getElementById('cookieSettingsModal');
    if (modal && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
    
    const cookieConsent = document.getElementById('cookieConsent');
    if (cookieConsent) {
        cookieConsent.style.display = 'none';
    }
    
    applyCookieSettings(settings);
    hasCookieConsent = true;
    
    showNotification('Cookie preferences updated', 'success');
    
    // Start auto-save if necessary cookies enabled
    if (settings.necessary && typeof window.startAutoSave === 'function') {
        window.startAutoSave();
    }
}

// Apply cookie settings
function applyCookieSettings(settings) {
    console.log('Applying cookie settings:', settings);
    
    // Update global variable
    window.hasCookieConsent = settings.necessary;
    hasCookieConsent = settings.necessary;
    
    if (!settings.analytics) {
        console.log('Analytics cookies disabled');
    }
    
    if (!settings.performance) {
        console.log('Performance cookies disabled');
    }
    
    if (!settings.necessary) {
        console.log('Necessary cookies disabled - data saving restricted');
        if (typeof window.stopAutoSave === 'function') {
            window.stopAutoSave();
        }
    }
}

// Export all UI functions to global scope
window.toggleSection = toggleSection;
window.addRow = addRow;
window.addGoal = addGoal;
window.removeRow = removeRow;
window.handleInvestmentChange = handleInvestmentChange;
window.showNotification = showNotification;
window.showError = showError;
window.toggleDarkMode = toggleDarkMode;
window.toggleSidebar = toggleSidebar;
window.showMonthlyDetails = showMonthlyDetails;
window.updateMonthlyRecordsTable = updateMonthlyRecordsTable;
window.deleteMonthlyRecord = deleteMonthlyRecord;
window.initializeCookieConsent = initializeCookieConsent;
window.acceptCookies = acceptCookies;
window.declineCookies = declineCookies;
window.showCookieSettings = showCookieSettings;
window.saveCookieSettings = saveCookieSettings;
window.hasCookieConsent = hasCookieConsent;
window.updateMonthlyRecordsTable = updateMonthlyRecordsTable;
window.deleteMonthlyRecord = deleteMonthlyRecord;
