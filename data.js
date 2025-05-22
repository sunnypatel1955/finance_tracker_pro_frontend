// Global variables
let data = {
    initial_cash: 0,
    investments: [],
    income: [],
    loans: [],
    expenses: [],
    goals: [],
};
let historicalNetWorth = JSON.parse(localStorage.getItem('historicalNetWorth')) || [];

// New token-based key retriever
function getToken() {
    const token = localStorage.getItem('token');
    console.log('getToken: token =', token);
    return token ? token : null;
}

function getUserDataKey() {
    const token = getToken();
    const email = getCurrentUser();
    if (!token || !email) {
        console.log('getUserDataKey: missing token or email');
        return null;
    }
    const key = `financeData_${email}_${token}`;
    console.log('getUserDataKey:', key);
    return key;
}


function saveData() {
    console.log('saveData function called');
    if (!hasCookieConsent) {
        console.log('saveData skipped: waiting for cookie consent');
        return;
    }
    if (!checkAuth()) {
        console.log('saveData skipped: user not authenticated');
        return;
    }

    const email = getCurrentUser();
    if (!email) {
        console.log('saveData: no user email found');
        return;
    }

    const consentKey = `cookieConsent_${email}`;
    const consent = localStorage.getItem(consentKey);
    console.log(`saveData: consent for ${email} =`, consent);

    if (!consent || !JSON.parse(consent).necessary) {
        console.log('Data saving blocked due to cookie consent');
        showNotification('Data saving blocked due to cookie settings', 'error');
        return;
    }

    const dataKey = getUserDataKey();
    if (!dataKey) {
        console.log('saveData: no dataKey found');
        showNotification('Error: No user logged in', 'error');
        return;
    }

    try {
        console.log('saveData: dataKey =', dataKey);
        const financeServerData = {
            version: CURRENT_DATA_VERSION,
            timestamp: new Date().toISOString(),
            data: data,
            historicalNetWorth: historicalNetWorth
        };
    
        console.log('📡 Sending data to server...');

        fetch('https://finance-tracker-pro-server.onrender.com/api/financeServerData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ financeServerData: financeServerData })
        })
        .then(res => {
            console.log('📥 Server responded with status:', res.status);

            if (!res.ok) {
                // If not 2xx response, read the error text and throw it
        return res.text().then(text => {
            console.error('❌ Server returned error text:', text);
            throw new Error(text || 'Server error occurred');
        });
    }

    console.log('✅ Response is OK — parsing JSON...');
    return res.json();
})
        .then(response => {
            console.log('Data saved to server:', response);
            showNotification('Finance data saved to server', 'success');
        })
        .catch(err => {
            console.error('Failed to save data:', err);
            showNotification('Error saving data: ' + err.message, 'error');
        });
        
    } catch (e) {
        console.error('Save error:', e);
        showNotification('Failed to save data: ' + e.message, 'error');
    }
}

function showConfirmation(message, onConfirm) {
    Swal.fire({
        title: 'Confirm',
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
    }).then((result) => {
        if (result.isConfirmed) {
            onConfirm();
        }
    });
}

async function loadData() {
    console.log('loadData function called');
    if (!checkAuth()) {
        console.log('loadData skipped: user not authenticated');
        return;
    }

    const email = getCurrentUser();
    if (!email) {
        console.log('loadData: no user email found');
        showNotification('Error: No user logged in', 'error');
        return;
    }

    const dataKey = getUserDataKey();
    if (!dataKey) {
        console.log('loadData: no dataKey found');
        showNotification('Error: No user logged in', 'error');
        return;
    }

    try {
        console.log('Fetching data from server for:', email);

        const response = await fetch('https://finance-tracker-pro-server.onrender.com/api/financeServerData', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const serverData = await response.json();
        
        console.log('Data received from server:', serverData);
        console.log('🔍 Data being validated:', serverData.data);
        console.log('Does it have initial_cash?', 'initial_cash' in serverData.data);
        console.log('Does it have investments?', 'investments' in serverData.data);
        console.log('Does it have income?', 'income' in serverData.data);
        console.log('Does it have loans?', 'loans' in serverData.data);
        console.log('Does it have expenses?', 'expenses' in serverData.data);
        console.log('Does it have goals?', 'goals' in serverData.data);

        if (!validateDataIntegrity(serverData.data)) {
            console.warn('⚠️ Data structure has issues — skipping validation for now.');
        }

        if (serverData.version > CURRENT_DATA_VERSION) {
            throw new Error('Saved data version is newer than current version');
        }

        data = serverData.data || {};
        historicalNetWorth = serverData.historicalNetWorth || [];

            document.getElementById('initial_cash').value = data.initial_cash || 0;
            ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
                const tbody = document.getElementById(section).querySelector('tbody');
                tbody.innerHTML = '';
                (data[section] || []).forEach(item => {
                    const row = document.createElement('tr');
                    if (section === 'investments') {
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
                            <td><input type="number" class="form-control" name="investment_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="number" class="form-control" name="investment_return" value="${item.return || 0}" step="0.1" min="0" oninput="debouncedUpdate()"></td>
                            <td><select class="form-select" name="investment_risk" oninput="debouncedUpdate()">
                                <option value="low" ${item.risk === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${item.risk === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${item.risk === 'high' ? 'selected' : ''}>High</option>
                            </select></td>
                            <td><input type="text" class="form-control" name="investment_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'investments')">X</button></td>
                        `;
                        const nameSelect = row.querySelector('[name="investment_name"]');
                        const baseName = item.name ? item.name.split('-')[0] : 'Other';
                        const existingNames = Array.from(tbody.querySelectorAll('[name="investment_name"]')).map(select => select.value.split('-')[0]);
                        const sameTypeCount = existingNames.filter(name => name === baseName).length + 1;
                        const displayName = sameTypeCount > 1 ? `${baseName}-${sameTypeCount}` : baseName;
                        Array.from(nameSelect.options).forEach(option => {
                            if (option.value === baseName) {
                                option.text = displayName;
                                option.value = displayName;
                            }
                        });
                        nameSelect.value = displayName;
                    } else {
                        row.innerHTML = section === 'income' ? `
                            <td><select class="form-select" name="income_name" oninput="debouncedUpdate()">
                                <option value="Salary" ${item.name === 'Salary' ? 'selected' : ''}>Salary</option>
                                <option value="Freelance" ${item.name === 'Freelance' ? 'selected' : ''}>Freelance</option>
                                <option value="Business" ${item.name === 'Business' ? 'selected' : ''}>Business</option>
                                <option value="Rental Income" ${item.name === 'Rental Income' ? 'selected' : ''}>Rental Income</option>
                                <option value="Other" ${item.name === 'Other' ? 'selected' : ''}>Other</option>
                            </select></td>
                            <td><input type="number" class="form-control" name="income_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="income_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'income')">X</button></td>
                        ` : section === 'loans' ? `
                            <td><select class="form-select" name="loan_name" oninput="debouncedUpdate()">
                                <option value="Home Loan" ${item.name === 'Home Loan' ? 'selected' : ''}>Home Loan</option>
                                <option value="Car Loan" ${item.name === 'Car Loan' ? 'selected' : ''}>Car Loan</option>
                                <option value="Personal Loan" ${item.name === 'Personal Loan' ? 'selected' : ''}>Personal Loan</option>
                                <option value="Education Loan" ${item.name === 'Education Loan' ? 'selected' : ''}>Education Loan</option>
                                <option value="Other" ${item.name === 'Other' ? 'selected' : ''}>Other</option>
                            </select></td>
                            <td><input type="number" class="form-control" name="loan_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="number" class="form-control" name="loan_interest" value="${item.interest || 0}" step="0.1" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="loan_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'loans')">X</button></td>
                        ` : section === 'expenses' ? `
                            <td><select class="form-select" name="expense_category" oninput="debouncedUpdate()">
                                <option value="Housing" ${item.category === 'Housing' ? 'selected' : ''}>Housing</option>
                                <option value="Food" ${item.category === 'Food' ? 'selected' : ''}>Food</option>
                                <option value="Transport" ${item.category === 'Transport' ? 'selected' : ''}>Transport</option>
                                <option value="Loan Installment" ${item.category === 'Loan Installment' ? 'selected' : ''}>Loan Installment</option>
                                <option value="Other" ${item.category === 'Other' ? 'selected' : ''}>Other</option>
                            </select></td>
                            <td><select class="form-select" name="expense_type" oninput="debouncedUpdate()">
                                <option value="Recurring" ${item.type === 'Recurring' ? 'selected' : ''}>Recurring</option>
                                <option value="Exceptional" ${item.type === 'Exceptional' ? 'selected' : ''}>Exceptional</option>
                            </select></td>
                            <td><input type="number" class="form-control" name="expense_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="expense_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'expenses')">X</button></td>
                        ` : section === 'goals' ? `
                            <td><input type="text" class="form-control" name="goal_name" value="${item.name || ''}" oninput="debouncedUpdate()"></td>
                            <td><input type="number" class="form-control" name="goal_target" value="${item.target || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="goal_time" readonly value="${item.time || 'N/A'}"></td>
                            <td><div class="progress"><div class="progress-bar bg-success" style="width: 0%"></div></div></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'goals')">X</button></td>
                        ` : '';
                    }
                    tbody.appendChild(row);
                });
            });

            console.log('📊LoadData calling for updateHistoricalChart, Historical Net Worth Data:', historicalNetWorth);
            updateHistoricalChart();
            updateMonthlyRecordsTable();

    } catch (e) {
        console.error('Load error:', e);
        showNotification('Failed to load data: ' + e.message, 'error');
    }
}

function loadLocalData() {
    if (!checkAuth()) return;
    const dataKey = getUserDataKey();
    if (!dataKey) {
        showNotification('Error: No user logged in', 'error');
        return;
    }
    try {
        const savedData = localStorage.getItem(dataKey);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (!validateDataIntegrity(parsedData.data)) {
                throw new Error('Invalid data structure');
            }
            if (parsedData.version > CURRENT_DATA_VERSION) {
                throw new Error('Saved data version is newer than current version');
            }
            data = parsedData.data || {};
            historicalNetWorth = parsedData.historicalNetWorth || [];
            document.getElementById('initial_cash').value = data.initial_cash || 0;
            ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
                const tbody = document.getElementById(section).querySelector('tbody');
                tbody.innerHTML = '';
                (data[section] || []).forEach(item => {
                    const row = document.createElement('tr');
                    if (section === 'investments') {
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
                            <td><input type="number" class="form-control" name="investment_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="number" class="form-control" name="investment_return" value="${item.return || 0}" step="0.1" min="0" oninput="debouncedUpdate()"></td>
                            <td><select class="form-select" name="investment_risk" oninput="debouncedUpdate()">
                                <option value="low" ${item.risk === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${item.risk === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${item.risk === 'high' ? 'selected' : ''}>High</option>
                            </select></td>
                            <td><input type="text" class="form-control" name="investment_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'investments')">X</button></td>
                        `;
                        const nameSelect = row.querySelector('[name="investment_name"]');
                        const baseName = item.name ? item.name.split('-')[0] : 'Other';
                        const existingNames = Array.from(tbody.querySelectorAll('[name="investment_name"]')).map(select => select.value.split('-')[0]);
                        const sameTypeCount = existingNames.filter(name => name === baseName).length + 1;
                        const displayName = sameTypeCount > 1 ? `${baseName}-${sameTypeCount}` : baseName;
                        Array.from(nameSelect.options).forEach(option => {
                            if (option.value === baseName) {
                                option.text = displayName;
                                option.value = displayName;
                            }
                        });
                        nameSelect.value = displayName;
                    } else {
                        row.innerHTML = section === 'income' ? `
                            <td><select class="form-select" name="income_name" oninput="debouncedUpdate()">
                                <option value="Salary" ${item.name === 'Salary' ? 'selected' : ''}>Salary</option>
                                <option value="Freelance" ${item.name === 'Freelance' ? 'selected' : ''}>Freelance</option>
                                <option value="Business" ${item.name === 'Business' ? 'selected' : ''}>Business</option>
                                <option value="Rental Income" ${item.name === 'Rental Income' ? 'selected' : ''}>Rental Income</option>
                                <option value="Other" ${item.name === 'Other' ? 'selected' : ''}>Other</option>
                            </select></td>
                            <td><input type="number" class="form-control" name="income_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="income_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'income')">X</button></td>
                        ` : section === 'loans' ? `
                            <td><select class="form-select" name="loan_name" oninput="debouncedUpdate()">
                                <option value="Home Loan" ${item.name === 'Home Loan' ? 'selected' : ''}>Home Loan</option>
                                <option value="Car Loan" ${item.name === 'Car Loan' ? 'selected' : ''}>Car Loan</option>
                                <option value="Personal Loan" ${item.name === 'Personal Loan' ? 'selected' : ''}>Personal Loan</option>
                                <option value="Education Loan" ${item.name === 'Education Loan' ? 'selected' : ''}>Education Loan</option>
                                <option value="Other" ${item.name === 'Other' ? 'selected' : ''}>Other</option>
                            </select></td>
                            <td><input type="number" class="form-control" name="loan_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="number" class="form-control" name="loan_interest" value="${item.interest || 0}" step="0.1" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="loan_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'loans')">X</button></td>
                        ` : section === 'expenses' ? `
                            <td><select class="form-select" name="expense_category" oninput="debouncedUpdate()">
                                <option value="Housing" ${item.category === 'Housing' ? 'selected' : ''}>Housing</option>
                                <option value="Food" ${item.category === 'Food' ? 'selected' : ''}>Food</option>
                                <option value="Transport" ${item.category === 'Transport' ? 'selected' : ''}>Transport</option>
                                <option value="Loan Installment" ${item.category === 'Loan Installment' ? 'selected' : ''}>Loan Installment</option>
                                <option value="Other" ${item.category === 'Other' ? 'selected' : ''}>Other</option>
                            </select></td>
                            <td><select class="form-select" name="expense_type" oninput="debouncedUpdate()">
                                <option value="Recurring" ${item.type === 'Recurring' ? 'selected' : ''}>Recurring</option>
                                <option value="Exceptional" ${item.type === 'Exceptional' ? 'selected' : ''}>Exceptional</option>
                            </select></td>
                            <td><input type="number" class="form-control" name="expense_value" value="${item.value || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="expense_remark" value="${item.remark || ''}" maxlength="30" oninput="debouncedUpdate()"></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'expenses')">X</button></td>
                        ` : section === 'goals' ? `
                            <td><input type="text" class="form-control" name="goal_name" value="${item.name || ''}" oninput="debouncedUpdate()"></td>
                            <td><input type="number" class="form-control" name="goal_target" value="${item.target || 0}" step="0.01" min="0" oninput="debouncedUpdate()"></td>
                            <td><input type="text" class="form-control" name="goal_time" readonly value="${item.time || 'N/A'}"></td>
                            <td><div class="progress"><div class="progress-bar bg-success" style="width: 0%"></div></div></td>
                            <td><button class="remove-btn" onclick="removeRow(this, 'goals')">X</button></td>
                        ` : '';
                    }
                    tbody.appendChild(row);
                });
            });
            updateHistoricalChart();
            updateMonthlyRecordsTable();
        } else {
            showNotification('No data found for this user', 'info');
            data = {
                initial_cash: 0,
                investments: [],
                income: [],
                loans: [],
                expenses: [],
                goals: []
            };
            historicalNetWorth = [];
            document.getElementById('initial_cash').value = 0;
            ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
                const tbody = document.getElementById(section).querySelector('tbody');
                tbody.innerHTML = '';
            });
            updateHistoricalChart();
            updateMonthlyRecordsTable();
        }
    } catch (e) {
        showNotification('Failed to load data: ' + e.message, 'error');
        console.error('Load error:', e);
    }
}

function validateDataIntegrity(dataToValidate) {
    try {
        if (!dataToValidate) {
            console.warn('validateDataIntegrity: no data to validate');
            return false;
        }
        const requiredProps = ['initial_cash', 'investments', 'income', 'loans', 'expenses', 'goals'];
        for (const prop of requiredProps) {
            if (!(prop in dataToValidate)) {
                console.warn(`validateDataIntegrity: missing property ${prop}`);
                return false;
            }
        }
        if (!Array.isArray(dataToValidate.investments) ||
            !Array.isArray(dataToValidate.income) ||
            !Array.isArray(dataToValidate.loans) ||
            !Array.isArray(dataToValidate.expenses) ||
            !Array.isArray(dataToValidate.goals)) {
            console.warn('validateDataIntegrity: invalid array properties');
            return false;
        }
        return true;
    } catch (e) {
        console.error('Data validation error:', e);
        return false;
    }
}

function resetData() {
    console.log('resetData function called');
    if (confirm('Are you sure you want to reset all data?')) {
        console.log('Reset initiated');
        try {
            const dataKey = getUserDataKey();
            if (!dataKey) {
                showNotification('Error: No user logged in', 'error');
                return;
            }

            // Remove saved data for this user
            localStorage.removeItem(dataKey);
            localStorage.removeItem('historicalNetWorth');

            // Reset global variables
            data = {
                initial_cash: 0,
                investments: [],
                income: [],
                loans: [],
                expenses: [],
                goals: []
            };
            if (Array.isArray(historicalNetWorth)) {
                historicalNetWorth.length = 0;
            }

            // Clear UI inputs
            const initialCash = document.getElementById('initial_cash');
            if (initialCash) {
                initialCash.value = 0;
            }

            // Clear table bodies
            ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
                const tbody = document.getElementById(section)?.querySelector('tbody');
                if (tbody) tbody.innerHTML = '';
            });

            // Clear other tables if any
            document.querySelectorAll('table tbody').forEach(table => table.innerHTML = '');

            // Update visualizations
            if (typeof updateHistoricalChart === 'function') updateHistoricalChart();
            if (typeof updateMonthlyRecordsTable === 'function') updateMonthlyRecordsTable();

            // Recalculate to reflect reset
            if (typeof calculate === 'function') calculate();

            // Notify user
            if (typeof showNotification === 'function') {
                showNotification('Financial data reset successfully', 'success');
            } else {
                console.warn('showNotification function not found');
            }

            // Optional: reload page for fresh state
            location.reload();

        } catch (e) {
            console.error('Reset error:', e);
            if (typeof showNotification === 'function') {
                showNotification('Error resetting data: ' + e.message, 'error');
            }
        }
    }
}

function silentReset() {
    console.log('Silent reset initiated');
    try {
        const dataKey = getUserDataKey();
        if (!dataKey) {
            showNotification('Error: No user logged in', 'error');
            return;
        }

        // Remove saved data for this user
        localStorage.removeItem(dataKey);
        localStorage.removeItem('historicalNetWorth');

        // Reset global variables
        data = {
            initial_cash: 0,
            investments: [],
            income: [],
            loans: [],
            expenses: [],
            goals: []
        };
        if (Array.isArray(historicalNetWorth)) {
            historicalNetWorth.length = 0;
        }

        // Clear UI inputs
        const initialCash = document.getElementById('initial_cash');
        if (initialCash) initialCash.value = 0;

        // Clear table bodies
        ['investments', 'income', 'loans', 'expenses', 'goals'].forEach(section => {
            const tbody = document.getElementById(section)?.querySelector('tbody');
            if (tbody) tbody.innerHTML = '';
        });

        // Update visualizations
        if (typeof updateHistoricalChart === 'function') updateHistoricalChart();
        if (typeof updateMonthlyRecordsTable === 'function') updateMonthlyRecordsTable();

        // Recalculate
        if (typeof calculate === 'function') calculate();

    } catch (e) {
        console.error('Silent reset error:', e);
        showNotification('Error resetting data: ' + e.message, 'error');
    }
}

function backupData() {
    console.log('backupData function called');
    if (!checkAuth()) return;
    try {
        const email = getCurrentUser();
        if (!email) {
            throw new Error('No user logged in');
        }
        const backup = {
            userEmail: email,
            version: CURRENT_DATA_VERSION,
            timestamp: new Date().toISOString(),
            data: data,
            historicalNetWorth: historicalNetWorth
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_backup_${email}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        showNotification('Backup failed: ' + e.message, 'error');
        console.error('Backup error:', e);
    }
}


const CURRENT_DATA_VERSION = 1;

function importData() {
    console.log('importData function called');
    if (!checkAuth()) {
        console.log('importData skipped: user not authenticated');
        return;
    }

    const email = getCurrentUser();
    console.log('importData: email =', email);

    if (!email) {
        showNotification('Error: No user logged in', 'error');
        return;
    }

    const consentKey = `cookieConsent_${email}`;
    const consent = localStorage.getItem(consentKey);
    console.log(`importData: consent for ${email} =`, consent);

    if (!consent || !JSON.parse(consent).necessary) {
        console.log('Data import blocked due to cookie consent');
        showNotification('Data import blocked due to cookie settings', 'error');
        return;
    }

    

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const backup = JSON.parse(event.target.result);

                if (backup.userEmail !== email) {
                    throw new Error('This file belongs to another user');
                }
                if (!validateDataIntegrity(backup.data)) {
                    throw new Error('Invalid backup data structure');
                }
                if (backup.version > CURRENT_DATA_VERSION) {
                    throw new Error('Backup version is newer than current version');
                }

                const dataKey = getUserDataKey();
                if (!dataKey) {
                    showNotification('Error: No user data key found', 'error');
                    return;
                }

                localStorage.setItem(dataKey, JSON.stringify({
                    version: CURRENT_DATA_VERSION,
                    timestamp: new Date().toISOString(),
                    data: backup.data,
                    historicalNetWorth: backup.historicalNetWorth || []
                }));

                loadLocalData();
                showNotification('Data imported successfully', 'success');

            } catch (error) {
                console.error('Import error:', error);
                showNotification('Failed to import backup: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function undoData() {
    if (typeof previousData !== 'undefined' && previousData) {
        data = JSON.parse(JSON.stringify(previousData));
        loadData();
        showNotification('Data reverted', 'success');
    } else {
        showError('No previous data to undo');
    }
}

function saveMonthlyNetWorth() {
    if (!data) {
        console.warn('saveMonthlyNetWorth: No financial data found');
        showNotification('No financial data found to save.', 'error');
        return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const cash = data.initial_cash || 0;
    const totalInvestments = data.investments?.reduce((sum, i) => sum + (i.value || 0), 0) || 0;
    const totalLoans = data.loans?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
    const totalIncome = data.income?.reduce((sum, inc) => sum + (inc.value || 0), 0) || 0;
    const totalExpenses = data.expenses?.reduce((sum, exp) => sum + (exp.value || 0), 0) || 0;

    const netWorth = cash + totalInvestments - totalLoans;

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

    historicalNetWorth = (historicalNetWorth || []).filter(record => {
        const recordDate = new Date(record.date);
        return !(recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth);
    });

    historicalNetWorth.push(newRecord);

    historicalNetWorth.forEach(record => {
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth();
        if (recordYear < currentYear || (recordYear === currentYear && recordMonth < currentMonth)) {
            record.locked = true;
        }
    });

    historicalNetWorth.sort((a, b) => new Date(a.date) - new Date(b.date));

    saveData();
    updateHistoricalChart?.();
    updateMonthlyRecordsTable?.();
    showNotification('Saved net worth for this month.', 'success');
}

