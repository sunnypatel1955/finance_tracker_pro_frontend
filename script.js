function checkAuth() {
    console.log('checkAuth function called');
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to access the app', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return false;
    }
    // Optionally, add token expiry check here if you want

    return true;
}


function startAutoSave() {
    setInterval(() => { if (hasCookieConsent) saveData(); }, 5 * 60 * 1000);
}

function formatCurrency(amount, forPDF = false) {
    const currencySelect = document.getElementById('currency');
    const currency = forPDF ? 'USD' : (currencySelect ? currencySelect.value : 'USD');
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency });
    return formatter.format(amount);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event triggered');
    if (!checkAuth()) return;
    initializeCookieConsent();
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (!isDarkMode) toggleDarkMode();
    const tables = document.querySelectorAll('.table');
    tables.forEach(table => {
        if (document.body.classList.contains('dark-mode')) table.classList.add('table-dark');
    });
    initCharts();
    loadData();

    // Show full name in userName div
    const loggedInUser = localStorage.getItem('financeLoggedInUserFullName');
    if (loggedInUser) {
        document.getElementById('userName').textContent = `Welcome, ${loggedInUser}`;
    }

}); // <--- make sure this closing brace and parenthesis is here

    // Wait for debouncedUpdate and update to be defined
    function setupEventListeners() {
        console.log('setupEventListeners function called');
        if (typeof debouncedUpdate === 'function' && typeof update === 'function') {
            const allInputs = document.querySelectorAll('input, select');
            allInputs.forEach(input => {
                input.addEventListener('input', debouncedUpdate);
            });
            const calculateBtn = document.querySelector('button[onclick="calculate()"]');
            if (calculateBtn) {
                calculateBtn.addEventListener('click', calculate);
            }
            calculate(); // Initial calculation
        } else {
            setTimeout(setupEventListeners, 100); // Retry after 100ms
        }
    }
    setupEventListeners();

    startAutoSave();

// Rest of the export functions (exportToExcel, exportToCSV, exportToPDF, exportToJSON) remain unchanged
function exportData() {
    if (!checkAuth()) return;
    const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
    exportModal.show();
}

// [Include the unchanged exportToExcel, exportToCSV, exportToPDF, exportToJSON functions here]

function exportToExcel() {
    try {
        const wb = XLSX.utils.book_new();
        const overviewData = [['Category', 'Amount'], ['Liquid Cash', data.initial_cash], ['Total Investments', data.investments.reduce((sum, i) => sum + i.value, 0)], ['Total Loans', data.loans.reduce((sum, l) => sum + l.value, 0)], ['Total Income', data.income.reduce((sum, s) => sum + s.value, 0)], ['Total Expenses', data.expenses.reduce((sum, e) => sum + e.value, 0)]];
        const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview');
        const investmentsData = [['Name', 'Value', 'Expected Return (%)', 'Risk Level', 'Remark'], ...data.investments.map(i => [i.name, i.value, i.return, i.risk, i.remark])];
        const investmentsSheet = XLSX.utils.aoa_to_sheet(investmentsData);
        XLSX.utils.book_append_sheet(wb, investmentsSheet, 'Investments');
        const loansData = [['Name', 'Outstanding Amount', 'Annual Interest (%)', 'Remark'], ...data.loans.map(l => [l.name, l.value, l.interest, l.remark])];
        const loansSheet = XLSX.utils.aoa_to_sheet(loansData);
        XLSX.utils.book_append_sheet(wb, loansSheet, 'Loans');
        const incomeData = [['Source', 'Monthly Amount', 'Remark'], ...data.income.map(s => [s.name, s.value, s.remark])];
        const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
        XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income');
        const expensesData = [['Category', 'Type', 'Monthly Amount', 'Remark'], ...data.expenses.map(e => [e.name, e.type, e.value, e.remark])];
        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(wb, expensesSheet, 'Expenses');
        const goalsData = [['Name', 'Target Amount', 'Time to Achieve'], ...data.goals.map(g => [g.name, g.target, g.time || 'N/A'])];
        const goalsSheet = XLSX.utils.aoa_to_sheet(goalsData);
        XLSX.utils.book_append_sheet(wb, goalsSheet, 'Goals');
        const historicalData = [['Date', 'Net Worth', 'Cash', 'Total Investments', 'Total Loans', 'Total Income', 'Total Expenses'], ...historicalNetWorth.map(h => [new Date(h.date).toLocaleDateString(), h.netWorth, h.cash, h.investments.reduce((sum, i) => sum + i.amount, 0), h.loans.reduce((sum, l) => sum + l.amount, 0), h.income.reduce((sum, i) => sum + i.amount, 0), h.expenses.reduce((sum, e) => sum + e.amount, 0)])];
        const historicalSheet = XLSX.utils.aoa_to_sheet(historicalData);
        XLSX.utils.book_append_sheet(wb, historicalSheet, 'Historical Data');
        XLSX.writeFile(wb, `finance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('Data exported to Excel', 'success');
    } catch (e) {
        showError('Failed to export to Excel: ' + e.message);
    }
}

function exportToCSV() {
    try {
        let csvContent = 'OVERVIEW\nCategory,Amount\n';
        csvContent += `Liquid Cash,${data.initial_cash}\nTotal Investments,${data.investments.reduce((sum, i) => sum + i.value, 0)}\nTotal Loans,${data.loans.reduce((sum, l) => sum + l.value, 0)}\nTotal Income,${data.income.reduce((sum, s) => sum + s.value, 0)}\nTotal Expenses,${data.expenses.reduce((sum, e) => sum + e.value, 0)}\n\n`;
        csvContent += 'INVESTMENTS\nName,Value,Expected Return (%),Risk Level,Remark\n';
        data.investments.forEach(i => csvContent += `${i.name},${i.value},${i.return},${i.risk},${i.remark}\n`);
        csvContent += '\nLOANS\nName,Outstanding Amount,Annual Interest (%),Remark\n';
        data.loans.forEach(l => csvContent += `${l.name},${l.value},${l.interest},${l.remark}\n`);
        csvContent += '\nINCOME\nSource,Monthly Amount,Remark\n';
        data.income.forEach(s => csvContent += `${s.name},${s.value},${s.remark}\n`);
        csvContent += '\nEXPENSES\nCategory,Type,Monthly Amount,Remark\n';
        data.expenses.forEach(e => csvContent += `${e.name},${e.type},${e.value},${e.remark}\n`);
        csvContent += '\nGOALS\nName,Target Amount,Time to Achieve\n';
        data.goals.forEach(g => csvContent += `${g.name},${g.target},${g.time || 'N/A'}\n`);
        csvContent += '\nHISTORICAL DATA\nDate,Net Worth,Cash,Total Investments,Total Loans,Total Income,Total Expenses\n';
        historicalNetWorth.forEach(h => csvContent += `${new Date(h.date).toLocaleDateString()},${h.netWorth},${h.cash},${h.investments.reduce((sum, i) => sum + i.amount, 0)},${h.loans.reduce((sum, l) => sum + l.amount, 0)},${h.income.reduce((sum, i) => sum + i.amount, 0)},${h.expenses.reduce((sum, e) => sum + e.amount, 0)}\n`);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `finance_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        showNotification('Data exported to CSV', 'success');
    } catch (e) {
        showError('Failed to export to CSV: ' + e.message);
    }
}

function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yPos = 20;
        doc.setFontSize(20);
        doc.text('Finance Report', 20, yPos);
        yPos += 20;
        doc.setFontSize(16);
        doc.text('Overview', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        doc.text(`Liquid Cash: ${formatCurrency(data.initial_cash, true)}`, 20, yPos);
        yPos += 7;
        doc.text(`Total Investments: ${formatCurrency(data.investments.reduce((sum, i) => sum + i.value, 0), true)}`, 20, yPos);
        yPos += 7;
        doc.text(`Total Loans: ${formatCurrency(data.loans.reduce((sum, l) => sum + l.value, 0), true)}`, 20, yPos);
        yPos += 7;
        doc.text(`Total Income: ${formatCurrency(data.income.reduce((sum, s) => sum + s.value, 0), true)}`, 20, yPos);
        yPos += 7;
        doc.text(`Total Expenses: ${formatCurrency(data.expenses.reduce((sum, e) => sum + e.value, 0), true)}`, 20, yPos);
        yPos += 15;
        doc.setFontSize(16);
        doc.text('Investments', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        data.investments.forEach(inv => {
            doc.text(`${inv.name}: ${formatCurrency(inv.value, true)} (${inv.return}% return, ${inv.risk} risk)`, 20, yPos);
            yPos += 7;
        });
        yPos += 5;
        doc.setFontSize(16);
        doc.text('Loans', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        data.loans.forEach(loan => {
            doc.text(`${loan.name}: ${formatCurrency(loan.value, true)} (${loan.interest}% interest)`, 20, yPos);
            yPos += 7;
        });
        yPos += 5;
        doc.setFontSize(16);
        doc.text('Income', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        data.income.forEach(inc => {
            doc.text(`${inc.name}: ${formatCurrency(inc.value, true)}`, 20, yPos);
            yPos += 7;
        });
        yPos += 5;
        doc.setFontSize(16);
        doc.text('Expenses', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        data.expenses.forEach(exp => {
            doc.text(`${exp.name} (${exp.type}): ${formatCurrency(exp.value, true)}`, 20, yPos);
            yPos += 7;
        });
        yPos += 5;
        doc.setFontSize(16);
        doc.text('Financial Goals', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        data.goals.forEach(goal => {
            doc.text(`${goal.name}: ${formatCurrency(goal.target, true)} (${goal.time || 'N/A'})`, 20, yPos);
            yPos += 7;
        });
        doc.addPage();
        yPos = 20;
        doc.setFontSize(16);
        doc.text('Financial Visualizations', 20, yPos);
        yPos += 15;
        doc.setFontSize(14);
        doc.text('Investment Distribution', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
        data.investments.forEach(inv => {
            const percentage = totalInvestments > 0 ? ((inv.value / totalInvestments) * 100).toFixed(1) : 0;
            doc.text(`${inv.name}: ${percentage}% (${formatCurrency(inv.value, true)})`, 20, yPos);
            yPos += 7;
        });
        yPos += 5;
        doc.setFontSize(14);
        doc.text('Risk Distribution', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        const riskData = { low: { value: 0 }, medium: { value: 0 }, high: { value: 0 } };
        data.investments.forEach(i => riskData[i.risk].value += i.value);
        Object.entries(riskData).forEach(([risk, data]) => {
            const percentage = totalInvestments > 0 ? ((data.value / totalInvestments) * 100).toFixed(1) : 0;
            doc.text(`${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk: ${percentage}% (${formatCurrency(data.value, true)})`, 20, yPos);
            yPos += 7;
        });
        yPos += 5;
        doc.setFontSize(14);
        doc.text('Monthly Summary', 20, yPos);
        yPos += 10;
        doc.setFontSize(12);
        const totalIncome = data.income.reduce((sum, s) => sum + s.value, 0);
        const totalExpenses = data.expenses.reduce((sum, e) => sum + e.value, 0);
        const monthlySavings = totalIncome - totalExpenses;
        doc.text(`Total Monthly Income: ${formatCurrency(totalIncome, true)}`, 20, yPos);
        yPos += 7;
        doc.text(`Total Monthly Expenses: ${formatCurrency(totalExpenses, true)}`, 20, yPos);
        yPos += 7;
        doc.text(`Monthly Savings: ${formatCurrency(monthlySavings, true)}`, 20, yPos);
        yPos += 7;
        const savingsRate = totalIncome > 0 ? ((monthlySavings / totalIncome) * 100).toFixed(1) : 0;
        doc.text(`Savings Rate: ${savingsRate}%`, 20, yPos);
        yPos += 15;
        if (historicalNetWorth.length > 0) {
            doc.setFontSize(14);
            doc.text('Historical Performance', 20, yPos);
            yPos += 10;
            doc.setFontSize(12);
            const sortedRecords = [...historicalNetWorth].sort((a, b) => new Date(b.date) - new Date(a.date));
            const last6Months = sortedRecords.slice(0, 6);
            last6Months.forEach((record, index) => {
                const date = new Date(record.date);
                const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                let change = '0%';
                if (index < sortedRecords.length - 1) {
                    const prevNetWorth = sortedRecords[index + 1].netWorth;
                    const changePercent = ((record.netWorth - prevNetWorth) / prevNetWorth) * 100;
                    change = `${changePercent.toFixed(1)}%`;
                }
                doc.text(`${monthYear}: ${formatCurrency(record.netWorth, true)} (${change})`, 20, yPos);
                yPos += 7;
            });
        }
        doc.save(`finance_report_${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('Data exported to PDF', 'success');
    } catch (e) {
        showError('Failed to export to PDF: ' + e.message);
    }
}

function exportToJSON() {
    try {
        const exportData = {
            version: CURRENT_DATA_VERSION,
            timestamp: new Date().toISOString(),
            data: data,
            historicalNetWorth: historicalNetWorth
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Data exported to JSON', 'success');
    } catch (e) {
        showError('Failed to export to JSON: ' + e.message);
    }
}