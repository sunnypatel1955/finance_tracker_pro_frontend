// Enhanced Data Management Module
const CURRENT_DATA_VERSION = 2;
// Replace the existing API_BASE_URL with this
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://finance-tracker-pro-server.onrender.com/api';
// Global data structure
let data = {
    initial_cash: 0,
    investments: [],
    income: [],
    loans: [],
    expenses: [],
    goals: [],
    settings: {
        currency: 'INR',
        theme: 'dark',
        autoSave: true,
        notifications: true
    }
};

let historicalNetWorth = [];
let previousData = null; // Keep this as the single source
let autoSaveInterval = null;

// Enhanced authentication helpers
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No authentication token found');
        return null;
    }
    return token;
}

function getCurrentUser() {
    const email = localStorage.getItem('financeLoggedInUserEmail');
    return email || null;
}

function getUserDataKey() {
    const token = getToken();
    const email = getCurrentUser();
    if (!token || !email) {
        console.warn('Missing authentication credentials');
        return null;
    }
    return `financeData_${email}_${token}`;
}

// Enhanced save data with retry logic
async function saveData() {
    console.log('saveData: Starting save operation');
    console.log('saveData: Current data before sending:', data);
    console.log('saveData: Current historicalNetWorth before sending:', historicalNetWorth);
    // Check if hasCookieConsent is available
    const consentCheck = typeof window.hasCookieConsent !== 'undefined' ? window.hasCookieConsent : true;
    
    if (!consentCheck) {
        console.log('saveData: Blocked - no cookie consent');
        return false;
    }
    
    if (!checkAuth()) {
        console.log('saveData: Blocked - not authenticated');
        return false;
    }

    const email = getCurrentUser();
    const token = getToken();
    
    if (!email || !token) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error: Authentication required', 'error');
        }
        return false;
    }

    // Check consent
    const consentKey = `cookieConsent_${email}`;
    const consent = localStorage.getItem(consentKey);
    
    if (!consent || !JSON.parse(consent).necessary) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Data saving blocked due to cookie settings', 'error');
        }
        return false;
    }

    try {
        // Show loading state
        if (typeof window.showLoadingState === 'function') {
            window.showLoadingState(true);
        }
        
        const financeServerData = {
            version: CURRENT_DATA_VERSION,
            timestamp: new Date().toISOString(),
            data: data,
            historicalNetWorth: historicalNetWorth,
            checksum: generateChecksum(data)
        };
    
        console.log('saveData: Sending to server...');

        const response = await fetch(`${API_BASE_URL}/financeServerData`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ financeServerData })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('saveData: Success', result);
        console.log('Saved data', financeServerData);
        
        // Save to local storage as backup
        saveToLocalStorage(financeServerData);
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Data saved successfully', 'success');
        }
        return true;
        
    } catch (error) {
        console.error('saveData: Error', error);
        
        // Try to save locally as fallback
        try {
            const dataKey = getUserDataKey();
            if (dataKey) {
                const localData = {
                    version: CURRENT_DATA_VERSION,
                    timestamp: new Date().toISOString(),
                    data: data,
                    historicalNetWorth: historicalNetWorth
                };
                localStorage.setItem(dataKey, JSON.stringify(localData));
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Data saved locally (offline mode)', 'warning');
                }
            }
        } catch (localError) {
            console.error('saveData: Local save also failed', localError);
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`Save failed: ${error.message}`, 'error');
        }
        return false;
        
    } finally {
        if (typeof window.showLoadingState === 'function') {
            window.showLoadingState(false);
        }
    }
}

// Enhanced load data with validation
async function loadData() {
    console.log('loadData: Starting load operation');
    
    if (!checkAuth()) {
        console.log('loadData: Blocked - not authenticated');
        return false;
    }

    const email = getCurrentUser();
    const token = getToken();
    
    if (!email || !token) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error: Authentication required', 'error');
        }
        return false;
    }

    try {
        if (typeof window.showLoadingState === 'function') {
            window.showLoadingState(true);
        }
        
        // Try to load from server first
        const response = await fetch(`${API_BASE_URL}/financeServerData`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Raw response:', response);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const serverData = await response.json();
        console.log('Server data content:', serverData);
        console.log('loadData: Data received from server');
        
        // Validate data integrity
        if (!validateDataIntegrity(serverData.data)) {
            throw new Error('Invalid data structure received');
        }

        // Check version compatibility
        if (serverData.version > CURRENT_DATA_VERSION) {
            throw new Error('Data version is newer than current app version');
        }

        // Apply data migrations if needed
        if (serverData.version < CURRENT_DATA_VERSION) {
            serverData.data = migrateData(serverData.data, serverData.version);
        }

        // Apply loaded data
        data = serverData.data || getDefaultData();
        historicalNetWorth = serverData.historicalNetWorth || [];
        
        // CRITICAL: Add this line to sync both references
        window.historicalNetWorth = historicalNetWorth;
        
        // Update UI
        updateUIWithData();
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Data loaded successfully', 'success');
        }
        return true;

    } catch (error) {
        console.error('loadData: Error loading from server', error);
        
        // Try to load from local storage as fallback
        const loaded = loadFromLocalStorage();
        if (loaded) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Data loaded from local storage', 'warning');
            }
            return true;
        }
        
        // Initialize with default data
        data = getDefaultData();
        historicalNetWorth = [];
        
        // CRITICAL: Add this line here too
        window.historicalNetWorth = historicalNetWorth;
        
        updateUIWithData();
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Starting with fresh data', 'info');
        }
        return false;
        
    } finally {
        if (typeof window.showLoadingState === 'function') {
            window.showLoadingState(false);
        }
    }
}

// Save to local storage
function saveToLocalStorage(dataToSave) {
    try {
        const dataKey = getUserDataKey();
        if (dataKey) {
            localStorage.setItem(dataKey, JSON.stringify(dataToSave));
            return true;
        }
    } catch (error) {
        console.error('saveToLocalStorage: Error', error);
    }
    return false;
}

// Load from local storage
function loadFromLocalStorage() {
    try {
        const dataKey = getUserDataKey();
        if (!dataKey) return false;
        
        const savedData = localStorage.getItem(dataKey);
        if (!savedData) return false;
        
        const parsedData = JSON.parse(savedData);
        
        if (!validateDataIntegrity(parsedData.data)) {
            throw new Error('Invalid local data structure');
        }
        
        data = parsedData.data || getDefaultData();
        historicalNetWorth = parsedData.historicalNetWorth || [];
        
        // CRITICAL: Add this line to sync both references
        window.historicalNetWorth = historicalNetWorth;
        
        updateUIWithData();
        return true;
        
    } catch (error) {
        console.error('loadFromLocalStorage: Error', error);
        return false;
    }
}

// Get default data structure
function getDefaultData() {
    return {
        initial_cash: 0,
        investments: [],
        income: [],
        loans: [],
        expenses: [],
        goals: [],
        settings: {
            currency: 'INR',
            theme: 'dark',
            autoSave: true,
            notifications: true
        }
    };
}

// Validate data integrity
function validateDataIntegrity(dataToValidate) {
    try {
        if (!dataToValidate || typeof dataToValidate !== 'object') {
            console.warn('validateDataIntegrity: Invalid data type');
            return false;
        }
        
        const requiredProps = ['initial_cash', 'investments', 'income', 'loans', 'expenses', 'goals'];
        
        for (const prop of requiredProps) {
            if (!(prop in dataToValidate)) {
                console.warn(`validateDataIntegrity: Missing property ${prop}`);
                return false;
            }
        }
        
        // Validate arrays
        const arrayProps = ['investments', 'income', 'loans', 'expenses', 'goals'];
        for (const prop of arrayProps) {
            if (!Array.isArray(dataToValidate[prop])) {
                console.warn(`validateDataIntegrity: ${prop} is not an array`);
                return false;
            }
        }
        
        // Validate initial_cash
        if (typeof dataToValidate.initial_cash !== 'number' || dataToValidate.initial_cash < 0) {
            console.warn('validateDataIntegrity: Invalid initial_cash value');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('validateDataIntegrity: Error', error);
        return false;
    }
}

// Data migration for version compatibility
function migrateData(oldData, oldVersion) {
    console.log(`Migrating data from version ${oldVersion} to ${CURRENT_DATA_VERSION}`);
    
    let migratedData = { ...oldData };
    
    // Version 1 to 2 migration
    if (oldVersion < 2) {
        // Add settings if not present
        if (!migratedData.settings) {
            migratedData.settings = {
                currency: 'INR',
                theme: 'dark',
                autoSave: true,
                notifications: true
            };
        }
        
        // Add missing fields to existing records
        migratedData.investments = migratedData.investments.map(inv => ({
            ...inv,
            dateAdded: inv.dateAdded || new Date().toISOString(),
            tags: inv.tags || []
        }));
    }
    
    return migratedData;
}

// Generate checksum for data integrity
function generateChecksum(dataObj) {
    const str = JSON.stringify(dataObj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
}

// Update UI with loaded data
function updateUIWithData() {
    console.log('updateUIWithData: Updating UI elements');
    
    // Update initial cash
    const initialCashInput = document.getElementById('initial_cash');
    if (initialCashInput) {
        initialCashInput.value = data.initial_cash || 0;
    }
    
    // Update currency
    const currencySelect = document.getElementById('currency');
    if (currencySelect && data.settings?.currency) {
        currencySelect.value = data.settings.currency;
    }
    
    // Update tables
    ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
        updateTableSection(section);
    });
    
    // Update charts
    if (typeof window.updateAllCharts === 'function') {
        window.updateAllCharts();
    }
    
    if (typeof window.updateMonthlyRecordsTable === 'function') {
        window.updateMonthlyRecordsTable();
    }
    
    if (typeof window.updateSummaryCards === 'function') {
        window.updateSummaryCards();
    }
}

// Update table section
function updateTableSection(section) {
    const tbody = document.getElementById(section)?.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const items = data[section] || [];
    
    items.forEach(item => {
        const row = createTableRow(section, item);
        if (row) {
            tbody.appendChild(row);
        }
    });
}

// Create table row based on section
function createTableRow(section, item) {
    const row = document.createElement('tr');
    
    switch (section) {
        case 'investments':
            row.innerHTML = `
                <td><select class="form-select" name="investment_name" oninput="debouncedUpdate()">
                    ${getInvestmentOptions(item.name)}
                </select></td>
                <td><input type="number" class="form-control" name="investment_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                <td><input type="number" class="form-control" name="investment_return" value="${item.return || 0}" step="0.1" oninput="debouncedUpdate()"></td>
                <td><select class="form-select" name="investment_risk" oninput="debouncedUpdate()">
                    <option value="low" ${item.risk === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${item.risk === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${item.risk === 'high' ? 'selected' : ''}>High</option>
                </select></td>
                <td><input type="text" class="form-control" name="investment_remark" value="${item.remark || ''}" maxlength="50" oninput="debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, 'investments')">X</button></td>
            `;
            break;
            
        case 'income':
            row.innerHTML = `
                <td><select class="form-select" name="income_name" oninput="debouncedUpdate()">
                    ${getIncomeOptions(item.name)}
                </select></td>
                <td><input type="number" class="form-control" name="income_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="income_remark" value="${item.remark || ''}" maxlength="50" oninput="debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, 'income')">X</button></td>
            `;
            break;
            
        case 'loans':
            row.innerHTML = `
                <td><select class="form-select" name="loan_name" oninput="debouncedUpdate()">
                    ${getLoanOptions(item.name)}
                </select></td>
                <td><input type="number" class="form-control" name="loan_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                <td><input type="number" class="form-control" name="loan_interest" value="${item.interest || 0}" step="0.1" min="0" oninput="debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="loan_remark" value="${item.remark || ''}" maxlength="50" oninput="debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, 'loans')">X</button></td>
            `;
            break;
            
        case 'expenses':
            row.innerHTML = `
                <td><select class="form-select" name="expense_category" oninput="debouncedUpdate()">
                    ${getExpenseOptions(item.category)}
                </select></td>
                <td><select class="form-select" name="expense_type" oninput="debouncedUpdate()">
                    <option value="Recurring" ${item.type === 'Recurring' ? 'selected' : ''}>Recurring</option>
                    <option value="One-time" ${item.type === 'One-time' ? 'selected' : ''}>One-time</option>
                </select></td>
                <td><input type="number" class="form-control" name="expense_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="expense_remark" value="${item.remark || ''}" maxlength="50" oninput="debouncedUpdate()"></td>
                <td><button class="remove-btn" onclick="removeRow(this, 'expenses')">X</button></td>
            `;
            break;
            
        case 'goals':
            row.innerHTML = `
                <td><input type="text" class="form-control" name="goal_name" value="${item.name || ''}" oninput="debouncedUpdate()"></td>
                <td><input type="number" class="form-control" name="goal_target" value="${item.target || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                <td><input type="text" class="form-control" name="goal_time" readonly value="${item.time || 'N/A'}"></td>
                <td><div class="progress"><div class="progress-bar bg-success" style="width: 0%"></div></div></td>
                <td><button class="remove-btn" onclick="removeRow(this, 'goals')">X</button></td>
            `;
            break;
    }
    
    return row;
}

// Option generators
function getInvestmentOptions(selected) {
    const options = ['Fixed Income', 'Mutual Funds', 'Stocks', 'Real Estate', 'Gold', 'Bonds', 'Cryptocurrency', 'Other'];
    return options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
}

function getIncomeOptions(selected) {
    const options = ['Salary', 'Freelance', 'Business', 'Rental Income', 'Dividend', 'Interest', 'Other'];
    return options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
}

function getLoanOptions(selected) {
    const options = ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Business Loan', 'Other'];
    return options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
}

function getExpenseOptions(selected) {
    const options = ['Housing', 'Food', 'Transport', 'Loan EMI', 'Healthcare', 'Entertainment', 'Utilities', 'Other'];
    return options.map(opt => `<option value="${opt}" ${selected === opt ? 'selected' : ''}>${opt}</option>`).join('');
}

// Reset data with confirmation
function resetData() {
    console.log('resetData: Initiating reset');
    
    // Check if Swal is available
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This will permanently delete all your financial data!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, reset all data!',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await performReset();
            }
        });
    } else {
        // Fallback confirmation
        if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            performReset();
        }
    }
}

// Perform the actual reset
async function performReset() {
    try {
        // Delete from server
        const token = getToken();
        if (token) {
            await fetch(`${API_BASE_URL}/financeServerData`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        // Clear local storage
        const dataKey = getUserDataKey();
        if (dataKey) {
            localStorage.removeItem(dataKey);
        }
        localStorage.removeItem('historicalNetWorth');
        
        // Reset to default data
        data = getDefaultData();
        historicalNetWorth = [];
        
        // Clear UI
        clearAllTables();
        const initialCashInput = document.getElementById('initial_cash');
        if (initialCashInput) {
            initialCashInput.value = 0;
        }
        
        // Update charts
        if (typeof window.updateAllCharts === 'function') {
            window.updateAllCharts();
        }
        if (typeof window.updateMonthlyRecordsTable === 'function') {
            window.updateMonthlyRecordsTable();
        }
        if (typeof window.updateSummaryCards === 'function') {
            window.updateSummaryCards();
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('All data has been reset', 'success');
        }
        
        // Reload page for fresh state
        setTimeout(() => location.reload(), 1000);
        
    } catch (error) {
        console.error('resetData: Error', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error resetting data: ' + error.message, 'error');
        }
    }
}

// Clear all tables
function clearAllTables() {
    ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
        const tbody = document.getElementById(section)?.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
    });
}

// Backup data
async function backupData() {
    console.log('backupData: Creating backup');
    
    if (!checkAuth()) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please login to backup data', 'error');
        }
        return;
    }
    
    try {
        const email = getCurrentUser();
        const backup = {
            version: CURRENT_DATA_VERSION,
            userEmail: email,
            timestamp: new Date().toISOString(),
            data: data,
            historicalNetWorth: historicalNetWorth,
            metadata: {
                totalRecords: {
                    investments: data.investments.length,
                    loans: data.loans.length,
                    income: data.income.length,
                    expenses: data.expenses.length,
                    goals: data.goals.length,
                    historical: historicalNetWorth.length
                },
                checksum: generateChecksum(data)
            }
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_backup_${email}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Backup created successfully', 'success');
        }
        
    } catch (error) {
        console.error('backupData: Error', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Backup failed: ' + error.message, 'error');
        }
    }
}

// Import data with validation
function importData() {
    console.log('importData: Starting import process');
    
    if (!checkAuth()) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please login to import data', 'error');
        }
        return;
    }
    
    const email = getCurrentUser();
    if (!email) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error: No user logged in', 'error');
        }
        return;
    }
    
    // Check cookie consent
    const consentKey = `cookieConsent_${email}`;
    const consent = localStorage.getItem(consentKey);
    
    if (!consent || !JSON.parse(consent).necessary) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Data import blocked due to cookie settings', 'error');
        }
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backup = JSON.parse(event.target.result);
                
                // Validate backup structure
                if (!backup.version || !backup.data || !backup.userEmail) {
                    throw new Error('Invalid backup file format');
                }
                
                // Check if backup belongs to current user
                if (backup.userEmail !== email) {
                    if (typeof Swal !== 'undefined') {
                        const confirmImport = await Swal.fire({
                            title: 'Different User Data',
                            text: 'This backup belongs to a different user. Import anyway?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, import',
                            cancelButtonText: 'Cancel'
                        });
                        
                        if (!confirmImport.isConfirmed) return;
                    } else {
                        if (!confirm('This backup belongs to a different user. Import anyway?')) {
                            return;
                        }
                    }
                }
                
                // Validate data integrity
                if (!validateDataIntegrity(backup.data)) {
                    throw new Error('Invalid data structure in backup');
                }
                
                // Check version compatibility
                if (backup.version > CURRENT_DATA_VERSION) {
                    throw new Error('Backup version is newer than current app version');
                }
                
                // Apply migrations if needed
                let importedData = backup.data;
                if (backup.version < CURRENT_DATA_VERSION) {
                    importedData = migrateData(backup.data, backup.version);
                }
                
                // Verify checksum if available
                if (backup.metadata?.checksum) {
                    const calculatedChecksum = generateChecksum(importedData);
                    if (calculatedChecksum !== backup.metadata.checksum) {
                        console.warn('Checksum mismatch - data may have been modified');
                    }
                }
                
                // Apply imported data
                data = importedData;
                historicalNetWorth = backup.historicalNetWorth || [];
                
                // Save to server and local storage
                await saveData();
                
                // Update UI
                updateUIWithData();
                
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Data imported successfully', 'success');
                }
                
            } catch (error) {
                console.error('importData: Error', error);
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Import failed: ' + error.message, 'error');
                }
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Undo last action
function undoData() {
    console.log('undoData: Attempting to undo last action');
    
    if (!previousData) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No previous data to undo', 'warning');
        }
        return;
    }
    
    try {
        // Store current data as new previous
        const temp = JSON.parse(JSON.stringify(data));
        
        // Restore previous data
        data = JSON.parse(JSON.stringify(previousData));
        previousData = temp;
        
        // Update UI
        updateUIWithData();
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('Action undone', 'success');
        }
        
    } catch (error) {
        console.error('undoData: Error', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Undo failed: ' + error.message, 'error');
        }
    }
}

// Replace your saveMonthlyNetWorth function with this version that updates BOTH references

async function saveMonthlyNetWorth() {
    console.log('saveMonthlyNetWorth: Starting...');
    
    // CRITICAL: First update data from all UI inputs
    if (typeof window.update === 'function') {
        window.update();
        console.log('saveMonthlyNetWorth: Called update() to sync UI with data');
    }
    
    // IMPORTANT: Wait a bit for update to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!data) {
        console.error('saveMonthlyNetWorth: No data found');
        if (typeof window.showNotification === 'function') {
            window.showNotification('No financial data found to save', 'error');
        }
        return;
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    console.log('saveMonthlyNetWorth: Current year/month:', currentYear, currentMonth);
    
    // Get the current net worth from the UI element (which was just updated)
    const netWorthElement = document.getElementById('netWorth');
    let netWorth = 0;
    
    if (netWorthElement && netWorthElement.value) {
        // Parse the formatted currency value
        const netWorthText = netWorthElement.value.replace(/[^0-9.-]/g, '');
        netWorth = parseFloat(netWorthText) || 0;
        console.log('saveMonthlyNetWorth: Net worth from UI element:', netWorth);
    } else {
        // Fallback: Calculate manually
        const cash = data.initial_cash || 0;
        const totalInvestments = data.investments?.reduce((sum, i) => sum + (i.value || 0), 0) || 0;
        const totalLoans = data.loans?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
        netWorth = cash + totalInvestments - totalLoans;
        console.log('saveMonthlyNetWorth: Net worth calculated manually:', netWorth);
    }
    
    // Calculate other values
    const cash = data.initial_cash || 0;
    const totalInvestments = data.investments?.reduce((sum, i) => sum + (i.value || 0), 0) || 0;
    const totalLoans = data.loans?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
    const totalIncome = data.income?.reduce((sum, inc) => sum + (inc.value || 0), 0) || 0;
    const totalExpenses = data.expenses?.reduce((sum, exp) => sum + (exp.value || 0), 0) || 0;
    
    console.log('saveMonthlyNetWorth: Updated calculated values:', {
        cash,
        totalInvestments,
        totalLoans,
        netWorth
    });
    
    // Create new record
    const newRecord = {
        date: now.toISOString(),
        netWorth,
        cash,
        totalInvestments,
        totalLoans,
        totalIncome,
        totalExpenses,
        locked: false
    };
    
    console.log('saveMonthlyNetWorth: New record with updated values:', newRecord);
    
    // Remove existing record for current month if it exists
    const originalLength = historicalNetWorth.length;
    historicalNetWorth = historicalNetWorth.filter(record => {
        const recordDate = new Date(record.date);
        const keep = !(recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth);
        if (!keep) {
            console.log('saveMonthlyNetWorth: Removing existing record:', record);
        }
        return keep;
    });
    
    console.log('saveMonthlyNetWorth: Removed records:', originalLength - historicalNetWorth.length);
    
    // Add new record
    historicalNetWorth.push(newRecord);
    console.log('saveMonthlyNetWorth: Added new record, total length:', historicalNetWorth.length);
    
    // Lock previous months
    historicalNetWorth.forEach(record => {
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth();
        
        if (recordYear < currentYear || (recordYear === currentYear && recordMonth < currentMonth)) {
            record.locked = true;
        }
    });
    
    // Sort by date
    historicalNetWorth.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Update window reference
    window.historicalNetWorth = historicalNetWorth;
    
    // Save data
    if (typeof window.saveData === 'function') {
        await window.saveData();
        console.log('saveMonthlyNetWorth: Data saved to server');
    }
    
    // Update UI components
    if (typeof updateMonthlyRecordsTable === 'function') {
        updateMonthlyRecordsTable();
        console.log('saveMonthlyNetWorth: Monthly records table updated');
    }
    
    if (typeof window.updateHistoricalChart === 'function') {
        window.updateHistoricalChart();
    }
    
    if (typeof window.updateInsights === 'function') {
        window.updateInsights();
    }
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('Monthly net worth saved successfully', 'success');
    }
    
    console.log('saveMonthlyNetWorth: Completed successfully');
}


// Export month data
function exportMonthData() {
    // Implementation for exporting specific month data
    const modal = document.getElementById('monthlyDetailsModal');
    if (!modal) return;
    
    const monthData = modal.dataset.monthData;
    
    if (!monthData) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No month data available', 'error');
        }
        return;
    }
    
    const data = JSON.parse(monthData);
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `month_data_${new Date(data.date).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('Month data exported', 'success');
    }
}

// 5. Fix for auto-save memory leak
let autoSaveTimer = null;
function startAutoSave() {
    // Clear existing timer first
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
    }
    
    // Check if auto-save is enabled
    if (data.settings?.autoSave !== false) {
        autoSaveTimer = setInterval(() => {
            const consentCheck = typeof window.hasCookieConsent !== 'undefined' ? window.hasCookieConsent : true;
            if (consentCheck && typeof window.saveData === 'function') {
                window.saveData().catch(error => {
                    console.error('Auto-save error:', error);
                });
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('Auto-save enabled (5-minute interval)');
    }
}

function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
        console.log('Auto-save disabled');
    }
}


// Show/hide loading state
function showLoadingState(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

// Update summary cards
function updateSummaryCards() {
    const totalInvestments = data.investments?.reduce((sum, i) => sum + (i.value || 0), 0) || 0;
    const totalLoans = data.loans?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
    const totalIncome = data.income?.reduce((sum, inc) => sum + (inc.value || 0), 0) || 0;
    const totalExpenses = data.expenses?.reduce((sum, exp) => sum + (exp.value || 0), 0) || 0;
    const netWorth = (data.initial_cash || 0) + totalInvestments - totalLoans;
    const monthlySavings = totalIncome - totalExpenses;
    
    // Calculate average returns
    let avgReturns = 0;
    if (data.investments.length > 0) {
        const totalReturns = data.investments.reduce((sum, i) => sum + ((i.value || 0) * (i.return || 0) / 100), 0);
        avgReturns = totalInvestments > 0 ? (totalReturns / totalInvestments) * 100 : 0;
    }
    
    // Calculate goals progress
    let goalsProgress = 0;
    if (data.goals.length > 0) {
        const progressSum = data.goals.reduce((sum, g) => {
            const progress = g.target > 0 ? Math.min((netWorth / g.target) * 100, 100) : 0;
            return sum + progress;
        }, 0);
        goalsProgress = progressSum / data.goals.length;
    }
    
    // Update summary elements
    updateElement('summaryNetWorth', formatCurrency(netWorth));
    updateElement('summarySavings', formatCurrency(monthlySavings));
    updateElement('summaryReturns', avgReturns.toFixed(1) + '%');
    updateElement('summaryGoals', goalsProgress.toFixed(0) + '%');
    
    // Update quick stats in top bar
    updateElement('quickNetWorth', formatCurrency(netWorth));
    updateElement('quickSavings', formatCurrency(monthlySavings));
}

// Helper to update element text
function updateElement(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// Format currency function
function formatCurrency(amount) {
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect ? currencySelect.value : 'INR';
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
}

// Check authentication function
function checkAuth() {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('financeLoggedInUserEmail');
    
    if (!token || !email) {
        console.warn('Authentication check failed');
        return false;
    }
    
    // Verify token is not expired (simple check)
    try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
            console.warn('Token expired');
            localStorage.removeItem('token');
            localStorage.removeItem('financeLoggedInUserEmail');
            return false;
        }
    } catch (e) {
        console.error('Invalid token format');
        return false;
    }
    
    return true;
}

// Export module functions to global scope
window.data = data;
window.historicalNetWorth = historicalNetWorth;
window.previousData = previousData;
window.saveData = saveData;
window.loadData = loadData;
window.resetData = resetData;
window.backupData = backupData;
window.importData = importData;
window.undoData = undoData;
window.saveMonthlyNetWorth = saveMonthlyNetWorth;
window.exportMonthData = exportMonthData;
window.startAutoSave = startAutoSave;
window.stopAutoSave = stopAutoSave;
window.updateSummaryCards = updateSummaryCards;
window.formatCurrency = formatCurrency;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.getToken = getToken;
window.showLoadingState = showLoadingState;
