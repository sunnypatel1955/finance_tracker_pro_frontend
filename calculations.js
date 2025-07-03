// Enhanced Calculations Module
// Remove duplicate previousData declaration since it's already in data.js
// Color adjustment utility
function adjustColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 6);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const adjust = (value) => Math.min(255, Math.max(0, Math.round(value * factor)));
    
    return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
}

// Complete replacement for update function in calculations.js
function update() {
    console.log('update: Starting calculation update');
    
    // Store previous data for undo (use the global previousData from data.js)
    if (typeof window.data !== 'undefined') {
        window.previousData = JSON.parse(JSON.stringify(window.data));
    }
    
    // Update data from UI
    const initialCashInput = document.getElementById('initial_cash');
    if (initialCashInput && window.data) {
        const cashValue = parseFloat(initialCashInput.value) || 0;
        window.data.initial_cash = cashValue;
        console.log('update: Set initial_cash to:', cashValue);
    }
    
    // Update currency setting
    const currencySelect = document.getElementById('currency');
    if (currencySelect && window.data && window.data.settings) {
        window.data.settings.currency = currencySelect.value;
    }
    
    if (!window.data) {
        console.warn('update: No data object found');
        return;
    }
    
    // Update investments
    window.data.investments = Array.from(document.querySelectorAll('#investments tbody tr')).map(row => ({
        name: row.querySelector('[name="investment_name"]')?.value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="investment_value"]')?.value) || 0,
        return: parseFloat(row.querySelector('[name="investment_return"]')?.value) || 0,
        risk: row.querySelector('[name="investment_risk"]')?.value || 'low',
        remark: row.querySelector('[name="investment_remark"]')?.value || '',
        dateAdded: new Date().toISOString()
    }));
    
    // Update income
    window.data.income = Array.from(document.querySelectorAll('#income tbody tr')).map(row => ({
        name: row.querySelector('[name="income_name"]')?.value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="income_value"]')?.value) || 0,
        remark: row.querySelector('[name="income_remark"]')?.value || ''
    }));
    
    // Update loans
    window.data.loans = Array.from(document.querySelectorAll('#loans tbody tr')).map(row => ({
        name: row.querySelector('[name="loan_name"]')?.value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="loan_value"]')?.value) || 0,
        interest: parseFloat(row.querySelector('[name="loan_interest"]')?.value) || 0,
        remark: row.querySelector('[name="loan_remark"]')?.value || ''
    }));
    
    // Update expenses
    window.data.expenses = Array.from(document.querySelectorAll('#expenses tbody tr')).map(row => ({
        name: row.querySelector('[name="expense_category"]')?.value || 'Other',
        type: row.querySelector('[name="expense_type"]')?.value || 'Recurring',
        value: parseFloat(row.querySelector('[name="expense_value"]')?.value) || 0,
        category: row.querySelector('[name="expense_category"]')?.value || 'Other',
        remark: row.querySelector('[name="expense_remark"]')?.value || ''
    }));
    
    // Update goals
    window.data.goals = Array.from(document.querySelectorAll('#goals tbody tr')).map(row => ({
        name: row.querySelector('[name="goal_name"]')?.value || 'Unnamed',
        target: parseFloat(row.querySelector('[name="goal_target"]')?.value) || 0,
        time: row.querySelector('[name="goal_time"]')?.value || 'N/A'
    }));
    
    // Validate inputs
    if (!validateInputs()) {
        console.warn('update: Input validation failed');
        return;
    }
    
    // Perform calculations
    performCalculations();
    
    // Update all visualizations - with proper function checks
    if (typeof window.updateAllCharts === 'function') {
        window.updateAllCharts();
    }
    
    if (typeof window.updateSummaryCards === 'function') {
        window.updateSummaryCards();
    }
    
    // Save data if auto-save enabled
    if (window.data.settings?.autoSave && window.hasCookieConsent) {
        if (typeof window.saveData === 'function') {
            window.saveData();
        }
    }
    
    // Update monthly records and insights
    if (typeof updateMonthlyRecordsTable === 'function') {
        updateMonthlyRecordsTable();
    }
    if (typeof updateInsights === 'function') {
        updateInsights();
    }
    showError(''); // Clear any previous errors
}

// Complete replacement for performCalculations function in calculations.js
function performCalculations() {
    if (!window.data) return;
    
    // Calculate totals
    const totalInvestments = window.data.investments.reduce((sum, i) => sum + (i.value || 0), 0);
    const totalLoans = window.data.loans.reduce((sum, l) => sum + (l.value || 0), 0);
    const totalIncome = window.data.income.reduce((sum, s) => sum + (s.value || 0), 0);
    const totalRecurringExpenses = window.data.expenses
        .filter(e => e.type === 'Recurring')
        .reduce((sum, e) => sum + (e.value || 0), 0);
    const totalExpenses = window.data.expenses.reduce((sum, e) => sum + (e.value || 0), 0);
    
    // Calculate net worth - ensure initial_cash is a number
    const initialCash = parseFloat(window.data.initial_cash) || 0;
    const netWorth = initialCash + totalInvestments - totalLoans;
    
    console.log('performCalculations: Values calculated:', {
        initialCash,
        totalInvestments,
        totalLoans,
        netWorth
    });
    
    // Update overview displays
    const netWorthInput = document.getElementById('netWorth');
    const totalInvestmentsInput = document.getElementById('totalInvestments');
    const totalLoansInput = document.getElementById('totalLoans');
    
    if (netWorthInput) {
        netWorthInput.value = formatCurrency(netWorth);
        console.log('performCalculations: Updated netWorth display to:', netWorthInput.value);
    }
    if (totalInvestmentsInput) totalInvestmentsInput.value = formatCurrency(totalInvestments);
    if (totalLoansInput) totalLoansInput.value = formatCurrency(totalLoans);
    
    // Calculate goals progress
    window.data.goals.forEach((goal, index) => {
        const row = document.querySelectorAll('#goals tbody tr')[index];
        if (!row) return;
        
        const monthlySavings = totalIncome - totalRecurringExpenses;
        
        // FIXED: Calculate weighted average return correctly
        let avgReturn = 0;
        if (totalInvestments > 0 && window.data.investments.length > 0) {
            const weightedReturnSum = window.data.investments.reduce((sum, i) => {
                return sum + ((i.value || 0) * (i.return || 0));
            }, 0);
            avgReturn = weightedReturnSum / totalInvestments / 100; // Convert to decimal
        }
        
        // Calculate average loan interest
        const avgInterest = window.data.loans.length > 0
            ? window.data.loans.reduce((sum, l) => sum + (l.interest || 0), 0) / window.data.loans.length / 100
            : 0;
        
        // Calculate time to reach goal
        let currentValue = netWorth;
        let months = 0;
        
        if (goal.target > 0) {
            // Calculate progress percentage
            const progress = Math.min((netWorth / goal.target) * 100, 100);
            const progressBar = row.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${progress.toFixed(0)}%`;
            }
            
            // Calculate time to reach goal
            if (monthlySavings > 0 || avgReturn > avgInterest) {
                const monthlyReturn = avgReturn / 12;
                const monthlyInterest = avgInterest / 12;
                const netMonthlyReturn = monthlyReturn - monthlyInterest;
                
                while (currentValue < goal.target && months < 1200) {
                    currentValue = currentValue * (1 + netMonthlyReturn) + monthlySavings;
                    months++;
                }
                
                // Format time display
                const timeInput = row.querySelector('[name="goal_time"]');
                if (timeInput) {
                    if (months >= 1200) {
                        timeInput.value = '>100 years';
                    } else if (netWorth >= goal.target) {
                        timeInput.value = 'Achieved!';
                    } else {
                        const years = Math.floor(months / 12);
                        const remainingMonths = months % 12;
                        timeInput.value = years > 0 
                            ? `${years}y ${remainingMonths}m`
                            : `${remainingMonths}m`;
                    }
                }
            } else {
                const timeInput = row.querySelector('[name="goal_time"]');
                if (timeInput) {
                    timeInput.value = monthlySavings <= 0 ? 'Need positive savings' : 'N/A';
                }
            }
        }
    });
}


// Memory-efficient data validation
function validateInputs() {
    if (!window.data) return false;
    
    const errors = [];
    const maxErrors = 10; // Limit error collection
    
    // Validate with early exit
    if (window.data.initial_cash < 0) {
        errors.push("Liquid Cash cannot be negative");
    }
    
    // Use for...of with early break for better performance
    for (const [index, inv] of (window.data.investments || []).entries()) {
        if (errors.length >= maxErrors) break;
        
        if (inv.value < 0) {
            errors.push(`Investment #${index + 1}: Value cannot be negative`);
        }
        if (inv.return < -100 || inv.return > 100) {
            errors.push(`Investment #${index + 1}: Return must be between -100% and 100%`);
        }
    }
    
    // Display errors
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        if (errors.length > 0) {
            const displayErrors = errors.slice(0, maxErrors);
            if (errors.length > maxErrors) {
                displayErrors.push(`... and ${errors.length - maxErrors} more errors`);
            }
            
            errorDiv.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <strong>Validation Errors:</strong>
                    <ul class="mb-0">
                        ${displayErrors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            `;
            errorDiv.style.display = 'block';
        } else {
            errorDiv.innerHTML = '';
            errorDiv.style.display = 'none';
        }
    }
    
    return errors.length === 0;
}

// Calculate and update insights
function updateInsights() {
    console.log('updateInsights: Calculating financial insights');
    
    if (!window.historicalNetWorth || window.historicalNetWorth.length < 2) {
        const growthRateElement = document.getElementById('growthRate');
        const volatilityElement = document.getElementById('volatility');
        const bestWorstMonthElement = document.getElementById('bestWorstMonth');
        const actionableInsightsElement = document.getElementById('actionableInsights');
        
        if (growthRateElement) growthRateElement.textContent = 'Not enough data (need 2+ months)';
        if (volatilityElement) volatilityElement.textContent = 'Not enough data';
        if (bestWorstMonthElement) bestWorstMonthElement.textContent = 'Not enough data';
        if (actionableInsightsElement) {
            actionableInsightsElement.innerHTML = '<p>Add more monthly records to get personalized insights and recommendations.</p>';
        }
        return;
    }
    
    // Calculate monthly changes and growth rates
    const monthlyChanges = [];
    const monthlyGrowthRates = [];
    let bestMonth = { change: -Infinity, date: null };
    let worstMonth = { change: Infinity, date: null };
    
    const sortedRecords = [...window.historicalNetWorth].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 1; i < sortedRecords.length; i++) {
        const current = sortedRecords[i];
        const previous = sortedRecords[i - 1];
        const change = current.netWorth - previous.netWorth;
        const growthRate = previous.netWorth > 0 ? (change / previous.netWorth) * 100 : 0;
        
        monthlyChanges.push(change);
        monthlyGrowthRates.push(growthRate);
        
        if (change > bestMonth.change) {
            bestMonth = { change, date: new Date(current.date) };
        }
        if (change < worstMonth.change) {
            worstMonth = { change, date: new Date(current.date) };
        }
    }
    
    // Calculate average growth rate
    const avgGrowthRate = monthlyGrowthRates.length > 0
        ? monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length
        : 0;
    
    // FIXED: Calculate volatility correctly as percentage of net worth
    const meanChange = monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length;
    const squaredDiffs = monthlyChanges.map(change => Math.pow(change - meanChange, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / monthlyChanges.length;
    const volatility = Math.sqrt(variance);
    
    // Convert volatility to percentage of average net worth
    const avgNetWorth = sortedRecords.reduce((sum, record) => sum + record.netWorth, 0) / sortedRecords.length;
    const volatilityPercentage = avgNetWorth > 0 ? (volatility / avgNetWorth) * 100 : 0;
    
    // Format dates
    const formatDate = (date) => date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
    });
    
    // Update growth rate card
    const growthRateCard = document.getElementById('growthRate');
    if (growthRateCard) {
        growthRateCard.textContent = `${avgGrowthRate >= 0 ? '+' : ''}${avgGrowthRate.toFixed(1)}% monthly average`;
        const cardElement = growthRateCard.closest('.insight-card');
        if (cardElement) {
            cardElement.classList.remove('positive', 'negative', 'neutral');
            cardElement.classList.add(
                avgGrowthRate > 2 ? 'positive' : avgGrowthRate < -2 ? 'negative' : 'neutral'
            );
        }
    }
    
    // FIXED: Update volatility card with correct interpretation
    const volatilityCard = document.getElementById('volatility');
    if (volatilityCard) {
        let stabilityText = '';
        if (volatilityPercentage < 5) stabilityText = 'Very Stable';
        else if (volatilityPercentage < 10) stabilityText = 'Moderately Stable';
        else if (volatilityPercentage < 20) stabilityText = 'Somewhat Volatile';
        else stabilityText = 'Highly Volatile';
        
        volatilityCard.textContent = `${stabilityText} (${volatilityPercentage.toFixed(1)}% volatility)`;
        const cardElement = volatilityCard.closest('.insight-card');
        if (cardElement) {
            cardElement.classList.remove('positive', 'negative', 'neutral');
            cardElement.classList.add(
                volatilityPercentage < 10 ? 'positive' : volatilityPercentage < 20 ? 'neutral' : 'negative'
            );
        }
    }
    
    // Update best/worst month card
    const bestWorstMonthCard = document.getElementById('bestWorstMonth');
    if (bestWorstMonthCard && bestMonth.date && worstMonth.date) {
        bestWorstMonthCard.innerHTML = `
            <strong>Best:</strong> ${formatDate(bestMonth.date)} (${formatCurrency(bestMonth.change)})<br>
            <strong>Worst:</strong> ${formatDate(worstMonth.date)} (${formatCurrency(worstMonth.change)})
        `;
    }
    
    // FIXED: Generate actionable insights with correct volatility thresholds
    const insights = generateActionableInsights(avgGrowthRate, volatilityPercentage);
    const actionableInsightsCard = document.getElementById('actionableInsights');
    if (actionableInsightsCard) {
        actionableInsightsCard.innerHTML = `<ul>${insights.map(item => `<li>${item}</li>`).join('')}</ul>`;
    }
}

// Generate actionable insights based on data
function generateActionableInsights(avgGrowthRate, volatilityPercentage) {
    if (!window.data) return ['Data not available for insights.'];
    
    const insights = [];
    
    // Get current financial state
    const totalIncome = window.data.income.reduce((sum, inc) => sum + inc.value, 0);
    const totalExpenses = window.data.expenses.reduce((sum, exp) => sum + exp.value, 0);
    const totalInvestments = window.data.investments.reduce((sum, i) => sum + i.value, 0);
    const totalLoans = window.data.loans.reduce((sum, l) => sum + l.value, 0);
    const netWorth = window.data.initial_cash + totalInvestments - totalLoans;
    
    // Growth rate insights
    if (avgGrowthRate > 5) {
        insights.push(`Excellent! Your wealth is growing at ${avgGrowthRate.toFixed(1)}% monthly. Consider increasing investments to accelerate growth.`);
    } else if (avgGrowthRate > 0) {
        insights.push(`Your net worth is growing at ${avgGrowthRate.toFixed(1)}% monthly. Good progress, but there's room for improvement.`);
    } else if (avgGrowthRate < 0) {
        insights.push(`⚠️ Your net worth is declining at ${Math.abs(avgGrowthRate).toFixed(1)}% monthly. Review expenses and consider additional income sources.`);
    }
    
    // FIXED: Volatility insights with correct thresholds
    if (volatilityPercentage > 30) {
        insights.push('📊 High volatility detected. Consider diversifying investments and building an emergency fund.');
    } else if (volatilityPercentage > 20) {
        insights.push('📈 Moderate volatility in your finances. Consider reviewing your risk tolerance.');
    } else if (volatilityPercentage < 5) {
        insights.push('💪 Very stable financial performance! Your strategy is working well.');
    } else {
        insights.push('✅ Good financial stability. Continue monitoring and maintain your current approach.');
    }
    
    // Savings rate analysis
    if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
        
        if (savingsRate >= 30) {
            insights.push(`💪 Excellent savings rate of ${savingsRate.toFixed(1)}%! You're on track for financial independence.`);
        } else if (savingsRate >= 20) {
            insights.push(`Good savings rate of ${savingsRate.toFixed(1)}%. Try to reach 30% for faster wealth building.`);
        } else if (savingsRate >= 10) {
            insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% to build long-term wealth.`);
        } else if (savingsRate > 0) {
            insights.push(`⚠️ Low savings rate of ${savingsRate.toFixed(1)}%. Focus on reducing expenses or increasing income.`);
        } else {
            insights.push(`🚨 You're spending more than you earn! Create a budget immediately to control expenses.`);
        }
    }
    
    // Investment diversification insights
    const investmentTypes = new Set(window.data.investments.map(i => i.name)).size;
    if (investmentTypes < 3 && window.data.investments.length > 0) {
        insights.push('💡 Consider diversifying across more investment types to reduce risk.');
    } else if (investmentTypes >= 5) {
        insights.push('👍 Good diversification across investment types.');
    }
    
    // Emergency fund check
    const monthlyExpenses = totalExpenses;
    const liquidCash = window.data.initial_cash;
    const emergencyFundMonths = monthlyExpenses > 0 ? liquidCash / monthlyExpenses : 0;
    
    if (emergencyFundMonths < 3) {
        insights.push('🚨 Build an emergency fund covering 3-6 months of expenses.');
    } else if (emergencyFundMonths >= 6) {
        insights.push('💰 Great emergency fund! You have good financial security.');
    }
    
    return insights.length > 0 ? insights : ['Keep tracking your finances regularly for personalized insights.'];
}

// Manual calculation trigger
function calculate() {
    console.log('calculate: Manual calculation triggered');
    update();
    if (typeof window.showNotification === 'function') {
        window.showNotification('Calculations updated successfully', 'success');
    }
}

// Format currency function (if not defined elsewhere)
function formatCurrency(amount) {
    if (typeof window.formatCurrency === 'function') {
        return window.formatCurrency(amount);
    }
    
    // Fallback formatting
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

// Show error function (if not defined elsewhere)
function showError(message) {
    if (typeof window.showError === 'function') {
        window.showError(message);
    } else {
        console.error('Error:', message);
    }
}

// Auto-save functionality
function startAutoSave() {
    // Clear existing timer first
    if (window.autoSaveTimer) {
        clearInterval(window.autoSaveTimer);
        window.autoSaveTimer = null;
    }
    
    // Check if auto-save is enabled
    if (window.data?.settings?.autoSave !== false) {
        window.autoSaveTimer = setInterval(() => {
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
    if (window.autoSaveTimer) {
        clearInterval(window.autoSaveTimer);
        window.autoSaveTimer = null;
        console.log('Auto-save disabled');
    }
}

// Show notification function (fallback)
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Cleanup resources function
function cleanupResources() {
    console.log('Cleaning up calculation resources...');
    
    // Stop auto-save
    stopAutoSave();
    
    // Clear any calculation timeouts/intervals
    if (window.calculationTimeout) {
        clearTimeout(window.calculationTimeout);
    }
}

// Setup optimized event listeners
function setupOptimizedEventListeners() {
    console.log('Setting up optimized calculation event listeners...');
    
    // Add debounced listeners to all inputs
    const inputs = document.querySelectorAll('input[type="number"], select, input[type="text"]:not([readonly])');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (typeof window.debouncedUpdate === 'function') {
                window.debouncedUpdate();
            }
        });
    });
}

// Export functions to global scope
window.update = update;
window.calculate = calculate;
window.updateInsights = updateInsights;
window.adjustColor = adjustColor;
window.performCalculations = performCalculations;
window.validateInputs = validateInputs;
window.generateActionableInsights = generateActionableInsights;
window.startAutoSave = startAutoSave;
window.stopAutoSave = stopAutoSave;
window.showNotification = showNotification;
window.cleanupResources = cleanupResources;
window.setupOptimizedEventListeners = setupOptimizedEventListeners;
