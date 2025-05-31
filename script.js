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
// Enhanced Export Functions for Finance Tracker Pro

class FinanceExporter {
    constructor(data, historicalNetWorth, formatCurrency, showNotification, showError) {
        this.data = data;
        this.historicalNetWorth = historicalNetWorth;
        this.formatCurrency = formatCurrency;
        this.showNotification = showNotification;
        this.showError = showError;
        this.CURRENT_DATA_VERSION = '1.0'; // Define this constant
    }

    // Utility methods
    generateFilename(extension) {
        const timestamp = new Date().toISOString().split('T')[0];
        return `finance_report_${timestamp}.${extension}`;
    }

    calculateTotals() {
        return {
            totalInvestments: this.data.investments?.reduce((sum, i) => sum + (i.value || 0), 0) || 0,
            totalLoans: this.data.loans?.reduce((sum, l) => sum + (l.value || 0), 0) || 0,
            totalIncome: this.data.income?.reduce((sum, s) => sum + (s.value || 0), 0) || 0,
            totalExpenses: this.data.expenses?.reduce((sum, e) => sum + (e.value || 0), 0) || 0
        };
    }

    generateOverviewData() {
        const totals = this.calculateTotals();
        const netWorth = (this.data.initial_cash || 0) + totals.totalInvestments - totals.totalLoans;
        const monthlySavings = totals.totalIncome - totals.totalExpenses;
        const savingsRate = totals.totalIncome > 0 ? ((monthlySavings / totals.totalIncome) * 100).toFixed(1) : 0;

        return {
            ...totals,
            liquidCash: this.data.initial_cash || 0,
            netWorth,
            monthlySavings,
            savingsRate
        };
    }

    // Excel Export with improved formatting
    async exportToExcel() {
        try {
            if (!window.XLSX) {
                throw new Error('XLSX library not loaded');
            }

            const wb = XLSX.utils.book_new();
            const overview = this.generateOverviewData();

            // Enhanced Overview Sheet
            const overviewData = [
                ['Finance Report Overview', ''],
                ['Generated on', new Date().toLocaleDateString()],
                ['', ''],
                ['Category', 'Amount'],
                ['Net Worth', overview.netWorth],
                ['Liquid Cash', overview.liquidCash],
                ['Total Investments', overview.totalInvestments],
                ['Total Loans', overview.totalLoans],
                ['Monthly Income', overview.totalIncome],
                ['Monthly Expenses', overview.totalExpenses],
                ['Monthly Savings', overview.monthlySavings],
                ['Savings Rate (%)', parseFloat(overview.savingsRate)]
            ];

            const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
            
            // Style the overview sheet
            overviewSheet['!cols'] = [{ width: 20 }, { width: 15 }];
            overviewSheet['A1'].s = { font: { bold: true, sz: 14 } };
            
            XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview');

            // Enhanced Investments Sheet
            if (this.data.investments?.length > 0) {
                const investmentsData = [
                    ['Investment Portfolio Analysis', '', '', '', ''],
                    ['Name', 'Value', 'Expected Return (%)', 'Risk Level', 'Remark'],
                    ...this.data.investments.map(i => [
                        i.name || 'Unnamed',
                        i.value || 0,
                        i.return || 0,
                        i.risk || 'Unknown',
                        i.remark || ''
                    ])
                ];
                
                const investmentsSheet = XLSX.utils.aoa_to_sheet(investmentsData);
                investmentsSheet['!cols'] = [{ width: 20 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 25 }];
                XLSX.utils.book_append_sheet(wb, investmentsSheet, 'Investments');
            }

            // Enhanced Loans Sheet
            if (this.data.loans?.length > 0) {
                const loansData = [
                    ['Loans & Liabilities', '', '', ''],
                    ['Name', 'Outstanding Amount', 'Annual Interest (%)', 'Remark'],
                    ...this.data.loans.map(l => [
                        l.name || 'Unnamed',
                        l.value || 0,
                        l.interest || 0,
                        l.remark || ''
                    ])
                ];
                
                const loansSheet = XLSX.utils.aoa_to_sheet(loansData);
                loansSheet['!cols'] = [{ width: 20 }, { width: 18 }, { width: 18 }, { width: 25 }];
                XLSX.utils.book_append_sheet(wb, loansSheet, 'Loans');
            }

            // Enhanced Income Sheet
            if (this.data.income?.length > 0) {
                const incomeData = [
                    ['Income Sources', '', ''],
                    ['Source', 'Monthly Amount', 'Remark'],
                    ...this.data.income.map(s => [
                        s.name || 'Unnamed',
                        s.value || 0,
                        s.remark || ''
                    ])
                ];
                
                const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
                incomeSheet['!cols'] = [{ width: 20 }, { width: 15 }, { width: 25 }];
                XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income');
            }

            // Enhanced Expenses Sheet
            if (this.data.expenses?.length > 0) {
                const expensesData = [
                    ['Monthly Expenses', '', '', ''],
                    ['Category', 'Type', 'Monthly Amount', 'Remark'],
                    ...this.data.expenses.map(e => [
                        e.name || 'Unnamed',
                        e.type || 'General',
                        e.value || 0,
                        e.remark || ''
                    ])
                ];
                
                const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
                expensesSheet['!cols'] = [{ width: 20 }, { width: 12 }, { width: 15 }, { width: 25 }];
                XLSX.utils.book_append_sheet(wb, expensesSheet, 'Expenses');
            }

            // Enhanced Goals Sheet
            if (this.data.goals?.length > 0) {
                const goalsData = [
                    ['Financial Goals', '', ''],
                    ['Name', 'Target Amount', 'Timeline'],
                    ...this.data.goals.map(g => [
                        g.name || 'Unnamed',
                        g.target || 0,
                        g.time || 'Not specified'
                    ])
                ];
                
                const goalsSheet = XLSX.utils.aoa_to_sheet(goalsData);
                goalsSheet['!cols'] = [{ width: 20 }, { width: 15 }, { width: 15 }];
                XLSX.utils.book_append_sheet(wb, goalsSheet, 'Goals');
            }

            // Enhanced Historical Data Sheet
            if (this.historicalNetWorth?.length > 0) {
                const historicalData = [
                    ['Historical Performance', '', '', '', '', '', ''],
                    ['Date', 'Net Worth', 'Cash', 'Investments', 'Loans', 'Income', 'Expenses'],
                    ...this.historicalNetWorth.map(h => [
                        new Date(h.date).toLocaleDateString(),
                        h.netWorth || 0,
                        h.cash || 0,
                        h.investments?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
                        h.loans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0,
                        h.income?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
                        h.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
                    ])
                ];
                
                const historicalSheet = XLSX.utils.aoa_to_sheet(historicalData);
                historicalSheet['!cols'] = Array(7).fill({ width: 12 });
                XLSX.utils.book_append_sheet(wb, historicalSheet, 'Historical Data');
            }

            XLSX.writeFile(wb, this.generateFilename('xlsx'));
            this.showNotification('Excel report generated successfully', 'success');
            
        } catch (error) {
            console.error('Excel export error:', error);
            this.showError(`Failed to export Excel: ${error.message}`);
        }
    }

    // Enhanced CSV Export
    async exportToCSV() {
        try {
            const overview = this.generateOverviewData();
            let csvContent = '';

            // Header
            csvContent += `Finance Report - Generated on ${new Date().toLocaleDateString()}\n\n`;

            // Overview Section
            csvContent += 'FINANCIAL OVERVIEW\n';
            csvContent += 'Category,Amount\n';
            csvContent += `Net Worth,${overview.netWorth}\n`;
            csvContent += `Liquid Cash,${overview.liquidCash}\n`;
            csvContent += `Total Investments,${overview.totalInvestments}\n`;
            csvContent += `Total Loans,${overview.totalLoans}\n`;
            csvContent += `Monthly Income,${overview.totalIncome}\n`;
            csvContent += `Monthly Expenses,${overview.totalExpenses}\n`;
            csvContent += `Monthly Savings,${overview.monthlySavings}\n`;
            csvContent += `Savings Rate (%),${overview.savingsRate}\n\n`;

            // Investments Section
            if (this.data.investments?.length > 0) {
                csvContent += 'INVESTMENTS\n';
                csvContent += 'Name,Value,Expected Return (%),Risk Level,Remark\n';
                this.data.investments.forEach(i => {
                    csvContent += `"${i.name || 'Unnamed'}",${i.value || 0},${i.return || 0},"${i.risk || 'Unknown'}","${i.remark || ''}"\n`;
                });
                csvContent += '\n';
            }

            // Loans Section
            if (this.data.loans?.length > 0) {
                csvContent += 'LOANS\n';
                csvContent += 'Name,Outstanding Amount,Annual Interest (%),Remark\n';
                this.data.loans.forEach(l => {
                    csvContent += `"${l.name || 'Unnamed'}",${l.value || 0},${l.interest || 0},"${l.remark || ''}"\n`;
                });
                csvContent += '\n';
            }

            // Income Section
            if (this.data.income?.length > 0) {
                csvContent += 'INCOME SOURCES\n';
                csvContent += 'Source,Monthly Amount,Remark\n';
                this.data.income.forEach(s => {
                    csvContent += `"${s.name || 'Unnamed'}",${s.value || 0},"${s.remark || ''}"\n`;
                });
                csvContent += '\n';
            }

            // Expenses Section
            if (this.data.expenses?.length > 0) {
                csvContent += 'EXPENSES\n';
                csvContent += 'Category,Type,Monthly Amount,Remark\n';
                this.data.expenses.forEach(e => {
                    csvContent += `"${e.name || 'Unnamed'}","${e.type || 'General'}",${e.value || 0},"${e.remark || ''}"\n`;
                });
                csvContent += '\n';
            }

            // Goals Section
            if (this.data.goals?.length > 0) {
                csvContent += 'FINANCIAL GOALS\n';
                csvContent += 'Name,Target Amount,Timeline\n';
                this.data.goals.forEach(g => {
                    csvContent += `"${g.name || 'Unnamed'}",${g.target || 0},"${g.time || 'Not specified'}"\n`;
                });
                csvContent += '\n';
            }

            // Historical Data Section
            if (this.historicalNetWorth?.length > 0) {
                csvContent += 'HISTORICAL DATA\n';
                csvContent += 'Date,Net Worth,Cash,Total Investments,Total Loans,Total Income,Total Expenses\n';
                this.historicalNetWorth.forEach(h => {
                    const investmentsTotal = h.investments?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
                    const loansTotal = h.loans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
                    const incomeTotal = h.income?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
                    const expensesTotal = h.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
                    
                    csvContent += `${new Date(h.date).toLocaleDateString()},${h.netWorth || 0},${h.cash || 0},${investmentsTotal},${loansTotal},${incomeTotal},${expensesTotal}\n`;
                });
            }

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = this.generateFilename('csv');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            this.showNotification('CSV report generated successfully', 'success');
            
        } catch (error) {
            console.error('CSV export error:', error);
            this.showError(`Failed to export CSV: ${error.message}`);
        }
    }

    // Enhanced PDF Export with better formatting
    async exportToPDF() {
        try {
            if (!window.jspdf) {
                throw new Error('jsPDF library not loaded');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const overview = this.generateOverviewData();
            let yPos = 20;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;

            // Helper function to check if we need a new page
            const checkPageBreak = (requiredSpace = 20) => {
                if (yPos + requiredSpace > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
            };

            // Title
            doc.setFontSize(22);
            doc.setFont(undefined, 'bold');
            doc.text('Finance Report', margin, yPos);
            yPos += 15;

            // Generated date
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPos);
            yPos += 20;

            // Overview Section
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Financial Overview', margin, yPos);
            yPos += 12;

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            const overviewItems = [
                ['Net Worth', this.formatCurrency(overview.netWorth, true)],
                ['Liquid Cash', this.formatCurrency(overview.liquidCash, true)],
                ['Total Investments', this.formatCurrency(overview.totalInvestments, true)],
                ['Total Loans', this.formatCurrency(overview.totalLoans, true)],
                ['Monthly Income', this.formatCurrency(overview.totalIncome, true)],
                ['Monthly Expenses', this.formatCurrency(overview.totalExpenses, true)],
                ['Monthly Savings', this.formatCurrency(overview.monthlySavings, true)],
                ['Savings Rate', `${overview.savingsRate}%`]
            ];

            overviewItems.forEach(([label, value]) => {
                checkPageBreak();
                doc.text(`${label}: ${value}`, margin, yPos);
                yPos += 7;
            });

            yPos += 10;

            // Investments Section
            if (this.data.investments?.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Investment Portfolio', margin, yPos);
                yPos += 12;

                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                this.data.investments.forEach(inv => {
                    checkPageBreak();
                    const riskColor = inv.risk === 'high' ? [255, 0, 0] : inv.risk === 'medium' ? [255, 165, 0] : [0, 128, 0];
                    doc.setTextColor(...riskColor);
                    doc.text(`• ${inv.name || 'Unnamed'}: ${this.formatCurrency(inv.value || 0, true)} (${inv.return || 0}% return, ${inv.risk || 'unknown'} risk)`, margin, yPos);
                    doc.setTextColor(0, 0, 0); // Reset to black
                    yPos += 7;
                });
                yPos += 10;
            }

            // Loans Section
            if (this.data.loans?.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Loans & Liabilities', margin, yPos);
                yPos += 12;

                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                this.data.loans.forEach(loan => {
                    checkPageBreak();
                    doc.text(`• ${loan.name || 'Unnamed'}: ${this.formatCurrency(loan.value || 0, true)} (${loan.interest || 0}% interest)`, margin, yPos);
                    yPos += 7;
                });
                yPos += 10;
            }

            // Income Section
            if (this.data.income?.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Income Sources', margin, yPos);
                yPos += 12;

                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                this.data.income.forEach(inc => {
                    checkPageBreak();
                    doc.text(`• ${inc.name || 'Unnamed'}: ${this.formatCurrency(inc.value || 0, true)}/month`, margin, yPos);
                    yPos += 7;
                });
                yPos += 10;
            }

            // Expenses Section
            if (this.data.expenses?.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Monthly Expenses', margin, yPos);
                yPos += 12;

                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                this.data.expenses.forEach(exp => {
                    checkPageBreak();
                    doc.text(`• ${exp.name || 'Unnamed'} (${exp.type || 'General'}): ${this.formatCurrency(exp.value || 0, true)}`, margin, yPos);
                    yPos += 7;
                });
                yPos += 10;
            }

            // Goals Section
            if (this.data.goals?.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Financial Goals', margin, yPos);
                yPos += 12;

                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                this.data.goals.forEach(goal => {
                    checkPageBreak();
                    doc.text(`• ${goal.name || 'Unnamed'}: ${this.formatCurrency(goal.target || 0, true)} (${goal.time || 'Timeline not specified'})`, margin, yPos);
                    yPos += 7;
                });
                yPos += 10;
            }

            // Historical Performance Section
            if (this.historicalNetWorth?.length > 0) {
                checkPageBreak(50);
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('Historical Performance', margin, yPos);
                yPos += 12;

                doc.setFontSize(11);
                doc.setFont(undefined, 'normal');
                const sortedRecords = [...this.historicalNetWorth].sort((a, b) => new Date(b.date) - new Date(a.date));
                const recentRecords = sortedRecords.slice(0, 10); // Last 10 records

                recentRecords.forEach((record, index) => {
                    checkPageBreak();
                    const date = new Date(record.date);
                    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    
                    let changeText = '';
                    if (index < sortedRecords.length - 1) {
                        const prevNetWorth = sortedRecords[index + 1].netWorth || 0;
                        const changePercent = prevNetWorth > 0 ? (((record.netWorth || 0) - prevNetWorth) / prevNetWorth) * 100 : 0;
                        const changeSymbol = changePercent >= 0 ? '+' : '';
                        changeText = ` (${changeSymbol}${changePercent.toFixed(1)}%)`;
                    }
                    
                    doc.text(`${monthYear}: ${this.formatCurrency(record.netWorth || 0, true)}${changeText}`, margin, yPos);
                    yPos += 7;
                });
            }

            doc.save(this.generateFilename('pdf'));
            this.showNotification('PDF report generated successfully', 'success');
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.showError(`Failed to export PDF: ${error.message}`);
        }
    }

    // Enhanced JSON Export with metadata
    async exportToJSON() {
        try {
            const overview = this.generateOverviewData();
            const exportData = {
                version: this.CURRENT_DATA_VERSION,
                timestamp: new Date().toISOString(),
                metadata: {
                    exportedBy: 'Finance Tracker Pro',
                    recordCount: {
                        investments: this.data.investments?.length || 0,
                        loans: this.data.loans?.length || 0,
                        income: this.data.income?.length || 0,
                        expenses: this.data.expenses?.length || 0,
                        goals: this.data.goals?.length || 0,
                        historicalRecords: this.historicalNetWorth?.length || 0
                    },
                    overview
                },
                data: this.data,
                historicalNetWorth: this.historicalNetWorth
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json;charset=utf-8;' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateFilename('json');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showNotification('JSON backup created successfully', 'success');
            
        } catch (error) {
            console.error('JSON export error:', error);
            this.showError(`Failed to export JSON: ${error.message}`);
        }
    }

    // Batch export function
    async exportAll(formats = ['excel', 'csv', 'pdf', 'json']) {
        const results = [];
        
        for (const format of formats) {
            try {
                switch (format.toLowerCase()) {
                    case 'excel':
                        await this.exportToExcel();
                        results.push({ format: 'Excel', success: true });
                        break;
                    case 'csv':
                        await this.exportToCSV();
                        results.push({ format: 'CSV', success: true });
                        break;
                    case 'pdf':
                        await this.exportToPDF();
                        results.push({ format: 'PDF', success: true });
                        break;
                    case 'json':
                        await this.exportToJSON();
                        results.push({ format: 'JSON', success: true });
                        break;
                    default:
                        results.push({ format, success: false, error: 'Unknown format' });
                }
                
                // Small delay between exports
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                results.push({ format, success: false, error: error.message });
            }
        }
        
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        
        if (successful === total) {
            this.showNotification(`All ${total} reports exported successfully`, 'success');
        } else {
            this.showNotification(`${successful}/${total} reports exported successfully`, 'warning');
        }
        
        return results;
    }
}

// Usage functions (maintain compatibility with existing code)
function exportToExcel() {
    const exporter = new FinanceExporter(data, historicalNetWorth, formatCurrency, showNotification, showError);
    exporter.exportToExcel();
}

function exportToCSV() {
    const exporter = new FinanceExporter(data, historicalNetWorth, formatCurrency, showNotification, showError);
    exporter.exportToCSV();
}

function exportToPDF() {
    const exporter = new FinanceExporter(data, historicalNetWorth, formatCurrency, showNotification, showError);
    exporter.exportToPDF();
}

function exportToJSON() {
    const exporter = new FinanceExporter(data, historicalNetWorth, formatCurrency, showNotification, showError);
    exporter.exportToJSON();
}

// New batch export function
function exportAllFormats() {
    const exporter = new FinanceExporter(data, historicalNetWorth, formatCurrency, showNotification, showError);
    exporter.exportAll();
}

// Export specific formats
function exportSelectedFormats(formats) {
    const exporter = new FinanceExporter(data, historicalNetWorth, formatCurrency, showNotification, showError);
    exporter.exportAll(formats);
}
