let previousData = null;
console.log('Initial previousData:', previousData);

let hasCookieConsent = false;
console.log('Initial hasCookieConsent:', hasCookieConsent);

let notificationQueue = [];
console.log('Initial notificationQueue:', notificationQueue);

let isDisplaying = false;
console.log('Initial isDisplaying:', isDisplaying);

function debounce(func, wait) {
    console.log(`Creating debounced function with wait time: ${wait}ms`);
    let timeout;
    return function (...args) {
        console.log('Debounced function called with args:', args);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            console.log(`Debounced function executing after ${wait}ms`);
            func.apply(this, args);
        }, wait);
    };
}

const debouncedUpdate = debounce(update, 300);
window.debouncedUpdate = debouncedUpdate;
console.log('debouncedUpdate function created and assigned to window');

function toggleSection(sectionId) {
    console.log(`toggleSection called for sectionId: ${sectionId}`);
    const section = document.getElementById(sectionId);
    if (!section) {
        console.warn(`No section found with id: ${sectionId}`);
        return;
    }

    const button = section.parentElement.querySelector('.toggle-btn');
    if (!button) {
        console.warn(`No toggle button found for sectionId: ${sectionId}`);
        return;
    }

    if (section.classList.contains('show')) {
        section.classList.remove('show');
        button.textContent = '+';
        console.log(`Section ${sectionId} hidden.`);
    } else {
        section.classList.add('show');
        button.textContent = '-';
        console.log(`Section ${sectionId} shown.`);
    }
}


function allowOnlyNumbersAndDot(event) {
    const char = String.fromCharCode(event.which);
    const isNumber = /[0-9]/.test(char);
    const isDot = char === '.';
    const alreadyHasDot = event.target.value.includes('.');

    if (!isNumber && (!isDot || alreadyHasDot)) {
        event.preventDefault();
    }
}

function preventInvalidPaste(event) {
    const paste = (event.clipboardData || window.clipboardData).getData('text');
    if (!/^\d*\.?\d*$/.test(paste)) {
        event.preventDefault();
    }
}

function addRow(tableId, event) {
    const table = document.getElementById(tableId).querySelector('tbody');
    const currentRows = table.querySelectorAll('tr').length;

    // Define limits per table
    const rowLimits = {
        'investments': 50,
        'loans': 10,
        'income': 25,
        'expenses': 40
    };

    if (currentRows >= rowLimits[tableId]) {
        alert(`Maximum ${rowLimits[tableId]} entries allowed for ${tableId} in the current month.`);
        return;
    }

    const row = document.createElement('tr');

    // Define default expected return percentages and risk levels for each investment type
    const defaultReturns = {
        "Fixed Income": 6.5,
        "Mutual Funds": 10.0,
        "Stocks": 12.0,
        "Real Estate": 9.0,
        "Gold": 8.0,
        "Bonds": 7.5,
        "Cryptocurrency": 12.0,
        "Other": 7.0 
    };

    const defaultRisks = {
        "Fixed Income": "low",
        "Mutual Funds": "medium",
        "Stocks": "high",
        "Real Estate": "medium",
        "Gold": "medium",
        "Bonds": "low",
        "Cryptocurrency": "high",
        "Other": "medium" 
    };

    if (tableId === 'investments') {
        row.innerHTML = `
            <td><select class="form-select" name="investment_name" oninput="debouncedUpdate()">
                <option value="Fixed Income">Fixed Income</option>
                <option value="Mutual Funds">Mutual Funds</option>
                <option value="Stocks">Stocks</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Gold">Gold</option>
                <option value="Bonds">Bonds</option>
                <option value="Cryptocurrency">Cryptocurrency</option>
                <option value="Other">Other</option>
            </select></td>
            <td><input type="number" class="form-control" name="investment_value" placeholder="Value" step="100" min="0" oninput="debouncedUpdate()"></td>
            <td><input type="number" class="form-control" name="investment_return" placeholder="Return" step="0.1" min="0" oninput="debouncedUpdate()"></td>
            <td><select class="form-select" name="investment_risk" oninput="debouncedUpdate()">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </select></td>
            <td><input type="text" class="form-control" name="investment_remark" placeholder="Remark" maxlength="30" oninput="debouncedUpdate()"></td>
            <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')">X</button></td>
        `;

        const nameSelect = row.querySelector('[name="investment_name"]');
        const returnInput = row.querySelector('[name="investment_return"]');
        const riskSelect = row.querySelector('[name="investment_risk"]');
        const baseName = nameSelect.value; // Default selected value (e.g., "Fixed Income")
        
        // Set default return and risk values based on selected investment
        returnInput.value = defaultReturns[baseName] || 0;
        riskSelect.value = defaultRisks[baseName] || "medium";

        // Update display name to handle duplicates
        const existingNames = Array.from(table.querySelectorAll('[name="investment_name"]')).map(select => select.value.split('-')[0]);
        const sameTypeCount = existingNames.filter(name => name === baseName).length + 1;
        const displayName = sameTypeCount > 1 ? `${baseName}-${sameTypeCount}` : baseName;
        Array.from(nameSelect.options).forEach(option => {
            if (option.value === baseName) {
                option.text = displayName;
                option.value = displayName;
            }
        });
        nameSelect.value = displayName;

        // Add event listener to update return and risk when investment name changes
        nameSelect.addEventListener('change', function() {
            const selectedBaseName = this.value.split('-')[0]; // Get base name without suffix
            returnInput.value = defaultReturns[selectedBaseName] || 0;
            riskSelect.value = defaultRisks[selectedBaseName] || "medium";
            debouncedUpdate(); // Trigger update when name changes
        });
    } else {
        // Other tables (income, loans, expenses)
        row.innerHTML = tableId === 'income' ? `
            <td><select class="form-select" name="income_name" oninput="debouncedUpdate()">
                <option value="Salary">Salary</option>
                <option value="Freelance">Freelance</option>
                <option value="Business">Business</option>
                <option value="Rental Income">Rental Income</option>
                <option value="Other">Other</option>
            </select></td>
            <td><input type="number" class="form-control" name="income_value" placeholder="Amount" step="100" min="0" oninput="debouncedUpdate()"></td>
            <td><input type="text" class="form-control" name="income_remark" placeholder="Remark" maxlength="30" oninput="debouncedUpdate()"></td>
            <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')">X</button></td>
        ` : tableId === 'loans' ? `
            <td><select class="form-select" name="loan_name" oninput="debouncedUpdate()">
                <option value="Home Loan">Home Loan</option>
                <option value="Car Loan">Car Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Education Loan">Education Loan</option>
                <option value="Other">Other</option>
            </select></td>
            <td><input type="number" class="form-control" name="loan_value" placeholder="Amount" step="100" min="0" oninput="debouncedUpdate()"></td>
            <td><input type="number" class="form-control" name="loan_interest" placeholder="Interest" step="0.1" min="0" oninput="debouncedUpdate()"></td>
            <td><input type="text" class="form-control" name="loan_remark" placeholder="Remark" maxlength="30" oninput="debouncedUpdate()"></td>
            <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')">X</button></td>
        ` : tableId === 'expenses' ? `
            <td><select class="form-select" name="expense_category" oninput="debouncedUpdate()">
                <option value="Housing">Housing</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Loan Installment">Loan Installment</option>
                <option value="Other">Other</option>
            </select></td>
            <td><select class="form-select" name="expense_type" oninput="debouncedUpdate()">
                <option value="Recurring">Recurring</option>
                <option value="Exceptional">Exceptional</option>
            </select></td>
            <td><input type="number" class="form-control" name="expense_value" placeholder="Amount" step="100" min="0" oninput="debouncedUpdate()"></td>
            <td><input type="text" class="form-control" name="expense_remark" placeholder="Remark" maxlength="30" oninput="debouncedUpdate()"></td>
            <td><button class="remove-btn" onclick="removeRow(this, '${tableId}')">X</button></td>
        ` : '';
    }

    // Add input restrictions on all number fields in the row
    const numberInputs = row.querySelectorAll('input[type="number"]');

    numberInputs.forEach(input => {
        input.addEventListener('keypress', allowOnlyNumbersAndDot);
        input.addEventListener('paste', preventInvalidPaste);
    });

    table.appendChild(row);
    debouncedUpdate();
}


function addGoal(event) {
    const table = document.getElementById('goals').querySelector('tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control" name="goal_name" placeholder="e.g., Retirement" oninput="debouncedUpdate()"></td>
        <td><input type="number" class="form-control" name="goal_target" placeholder="Target" step="100" min="0" oninput="debouncedUpdate()"></td>
        <td><input type="text" class="form-control" name="goal_time" readonly placeholder="Years + Months"></td>
        <td><div class="progress"><div class="progress-bar bg-success" style="width: 0%"></div></div></td>
        <td><button class="remove-btn" onclick="removeRow(this, 'goals')">X</button></td>
    `;
    
    // Add input restrictions on goal_target input
    const targetInput = row.querySelector('input[name="goal_target"]');
    targetInput.addEventListener('keypress', allowOnlyNumbersAndDot);
    targetInput.addEventListener('paste', preventInvalidPaste);

    table.appendChild(row);
    debouncedUpdate();
}

function removeRow(button, tableId) {
    button.closest('tr').remove();
    debouncedUpdate();
    showNotification('Item removed', 'success');
}

function validateInputs() {
    let errors = [];
    if (data.initial_cash < 0) errors.push("Liquid Cash Available cannot be negative.");
    data.investments.forEach(i => { if (i.value < 0 || !i.name) errors.push(`Invalid investment: ${i.name || 'unnamed'}`); });
    data.income.forEach(s => { if (s.value < 0 || !s.name) errors.push(`Invalid income: ${s.name || 'unnamed'}`); });
    data.loans.forEach(l => { if (l.value < 0 || !l.name) errors.push(`Invalid loan: ${l.name || 'unnamed'}`); });
    data.expenses.forEach(e => { if (e.value < 0 || !e.category) errors.push(`Invalid expense: ${e.category || 'unnamed'}`); });
    data.goals.forEach(g => { if (g.target <= 0 || !g.name) errors.push(`Invalid goal: ${g.name || 'unnamed'}`); });
    document.getElementById('error-message').textContent = errors.join(' ');
    return errors.length === 0;
}

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

function updateMonthlyRecordsTable() {
    const tbody = document.querySelector('#monthlyRecords tbody');
    tbody.innerHTML = '';
    const sortedRecords = [...historicalNetWorth].sort((a, b) => new Date(b.date) - new Date(a.date));
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
        row.innerHTML = `
            <td>${monthYear}</td>
            <td>${formatCurrency(record.netWorth)}</td>
            <td class="${change.startsWith('-') ? 'text-danger' : 'text-success'}">${change}</td>
            <td><span class="badge ${status === 'Locked' ? 'bg-secondary' : 'bg-success'}">${status}</span></td>
            <td><button class="btn btn-sm btn-primary" onclick="showMonthlyDetails('${record.date}')"><i class="fas fa-eye"></i> Details</button></td>
        `;
        tbody.appendChild(row);
    });
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    const menuItem = document.querySelector('.dropdown-item[onclick="toggleDarkMode()"]');
    if (menuItem) {
        menuItem.textContent = isDarkMode ? 'Toggle Light Mode' : 'Toggle Dark Mode';
    }
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        if (isDarkMode) table.classList.add('table-dark');
        else table.classList.remove('table-dark');
    });
    updateChartColors(isDarkMode);
    Object.values(charts).forEach(chart => chart?.update());
    showNotification('Theme switched', 'success');
}

function showNotification(message, type) {
    notificationQueue.push({ message, type });
    displayNextNotification();
}

function displayNextNotification() {
    if (isDisplaying || notificationQueue.length === 0) return;
    isDisplaying = true;
    const { message, type } = notificationQueue.shift();
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    const activeNotifs = document.querySelectorAll('.notification');
    const offset = Array.from(activeNotifs).reduce((sum, n) => sum + n.offsetHeight + 8, 24);
    notif.style.top = `${offset}px`;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.remove();
        isDisplaying = false;
        displayNextNotification();
    }, 3000);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = message ? 'block' : 'none';
    if (message) showNotification(message, 'error');
}

function initializeCookieConsent() {
    console.log('initializeCookieConsent() called');

    if (!checkAuth()) {
        console.warn('User not authenticated — aborting cookie consent initialization.');
        return;
    }

    const email = getCurrentUser();
    console.log('Current user email:', email);

    if (!email) {
        console.warn('No user email found — cannot proceed with cookie consent.');
        return;
    }

    const consentKey = `cookieConsent_${email}`;
    const consent = localStorage.getItem(consentKey);
    console.log(`Consent key: ${consentKey}, Consent value:`, consent);

    const cookieConsentPopup = document.getElementById('cookieConsent');
    if (!cookieConsentPopup) {
        console.error('Cookie consent popup element not found in DOM.');
        return;
    }

    if (consent) {
        const settings = JSON.parse(consent);
        console.log('Existing cookie consent settings found:', settings);
        applyCookieSettings(settings);
        hasCookieConsent = true;
        console.log('hasCookieConsent set to true');
    } else {
        cookieConsentPopup.style.display = 'block';
        hasCookieConsent = false;
        console.log('No consent found — showing popup and setting hasCookieConsent to false');
    }
}




function acceptCookies() {
    console.log('acceptCookies() called');
    const email = getCurrentUser();
    if (!email) return;

    const consentKey = `cookieConsent_${email}`;
    const settings = { necessary: true, analytics: true, timestamp: new Date().toISOString() };
    localStorage.setItem(consentKey, JSON.stringify(settings));
    document.getElementById('cookieConsent').style.display = 'none';
    applyCookieSettings(settings);
    showNotification('Cookies accepted', 'success');
    hasCookieConsent = true;  // consent given, so allow saving
    console.log(' hasCookieConsent is true now:', hasCookieConsent);
}

function declineCookies() {
    console.log('declineCookies() called');
    const email = getCurrentUser();
    if (!email) return;

    const consentKey = `cookieConsent_${email}`;
    const settings = { necessary: false, analytics: false, timestamp: new Date().toISOString() };
    localStorage.setItem(consentKey, JSON.stringify(settings));
    document.getElementById('cookieConsent').style.display = 'none';
    applyCookieSettings(settings);
    showNotification('Cookies declined; saving and importing disabled', 'error');
    hasCookieConsent = false;  // consent denied, so block saving
}



function showCookieSettings() {
    console.log('showCookieSettings() called');
    const email = getCurrentUser();
    if (!email) return;

    const consentKey = `cookieConsent_${email}`;
    const existingConsent = localStorage.getItem(consentKey);

    if (existingConsent) {
        const settings = JSON.parse(existingConsent);
        document.getElementById('analyticsCookies').checked = settings.analytics;
        const necessaryCheckbox = document.getElementById('necessaryCookies');
        if (necessaryCheckbox) necessaryCheckbox.checked = settings.necessary;
    }

    const modal = new bootstrap.Modal(document.getElementById('cookieSettingsModal'));
    modal.show();
}


function saveCookieSettings() {
    console.log('saveCookieSettings() called');
    const email = getCurrentUser();
    if (!email) return;

    const consentKey = `cookieConsent_${email}`;
    const settings = {
        necessary: document.getElementById('necessaryCookies') ? document.getElementById('necessaryCookies').checked : true,
        analytics: document.getElementById('analyticsCookies').checked,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(consentKey, JSON.stringify(settings));

    const modal = bootstrap.Modal.getInstance(document.getElementById('cookieSettingsModal'));
    modal.hide();
    document.getElementById('cookieConsent').style.display = 'none';
    applyCookieSettings(settings);
    showNotification('Cookie settings saved', 'success');
    hasCookieConsent = true;
}


function applyCookieSettings(settings) {
    console.log('applyCookieSettings() called');
    if (!settings.analytics) console.log('Analytics cookies disabled');
    if (!settings.necessary) console.log('Necessary cookies disabled; localStorage operations restricted');
}


function getCurrentUser() {
    console.log('getCurrentUser: Function called');
    const email = localStorage.getItem('financeLoggedInUserEmail');
    console.log('getCurrentUser: Retrieved email from localStorage:', email);
    return email ? email : null;
}


function getCurrentUserFullName() {
    console.log('getCurrentUserFullName: Function called');
    const fullName = localStorage.getItem('financeLoggedInUserFullName');
    return fullName ? JSON.parse(fullName) : null;
}


function logout() {
    console.log('logout() called');
    const email = getCurrentUser();
    if (email) {
        const prefix = `financeData_${email}_`;

        // Iterate backwards safely and remove matching keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            console.log("Checking key: ", key);
            if (key && key.startsWith(prefix)) {
                console.log("Removing key: ", key);
                localStorage.removeItem(key);
            }
        }

        // Remove consent key
        localStorage.removeItem(`cookieConsent_${email}`);
    }

    // Remove session info
    localStorage.removeItem('financeLoggedInUserEmail');
    localStorage.removeItem('financeLoggedInUserFullName');
    localStorage.removeItem('token');
    
    showNotification('Logged out successfully', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}





function showChangePasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    modal.show();
}

async function changePassword() {
    console.log('changePassword function called');
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showNotification('Please fill in all fields', 'error');
        console.log('Validation failed: Missing fields');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showNotification('New passwords do not match', 'error');
        console.log('Validation failed: Passwords do not match');
        return;
    }

    const email = getCurrentUser();
    console.log('Current user email:', email);
    if (!email) {
        showNotification('No user logged in', 'error');
        console.log('No user logged in');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('You are not logged in', 'error');
            return;
        }
    
        const response = await fetch('https://finance-tracker-pro-server.onrender.com/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                email: email,
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
    
        const result = await response.json();
        console.log('Password change response:', result);
    
        if (response.ok) {
            const modalElement = document.getElementById('changePasswordModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            
            // Remove focus from any element inside modal
            document.activeElement.blur();
            
            // Hide modal
            modal.hide();
        
            // Optionally move focus to a known safe element
            document.getElementById('dashboardLink')?.focus();
        
            showNotification('Password changed successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to change password', 'error');
        }
        
    
    } catch (e) {
        showNotification('Error while changing password: ' + e.message, 'error');
        console.error('Change password error:', e);
    }    
}

function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye-slash';
    }
}

window.togglePassword = togglePassword;
window.showChangePasswordModal = showChangePasswordModal;
window.changePassword = changePassword;
