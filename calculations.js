function adjustColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const adjust = (value) => Math.min(255, Math.max(0, Math.round(value * factor)));
    return `#${adjust(r).toString(16).padStart(2, '0')}${adjust(g).toString(16).padStart(2, '0')}${adjust(b).toString(16).padStart(2, '0')}`;
}

function update() {
    console.log('update function called');
    previousData = JSON.parse(JSON.stringify(data));
    data.initial_cash = parseFloat(document.getElementById('initial_cash').value) || 0;
    data.investments = Array.from(document.querySelectorAll('#investments tbody tr')).map(row => ({
        name: row.querySelector('[name="investment_name"]').value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="investment_value"]').value) || 0,
        return: parseFloat(row.querySelector('[name="investment_return"]').value) || 0,
        risk: row.querySelector('[name="investment_risk"]').value || 'low',
        remark: row.querySelector('[name="investment_remark"]').value || ''
    }));
    data.income = Array.from(document.querySelectorAll('#income tbody tr')).map(row => ({
        name: row.querySelector('[name="income_name"]').value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="income_value"]').value) || 0,
        remark: row.querySelector('[name="income_remark"]').value || ''
    }));
    data.loans = Array.from(document.querySelectorAll('#loans tbody tr')).map(row => ({
        name: row.querySelector('[name="loan_name"]').value || 'Unnamed',
        value: parseFloat(row.querySelector('[name="loan_value"]').value) || 0,
        interest: parseFloat(row.querySelector('[name="loan_interest"]').value) || 0,
        remark: row.querySelector('[name="loan_remark"]').value || ''
    }));
    data.expenses = Array.from(document.querySelectorAll('#expenses tbody tr')).map(row => ({
        name: row.querySelector('[name="expense_category"]').value || 'Other',
        type: row.querySelector('[name="expense_type"]').value || 'Recurring',
        value: parseFloat(row.querySelector('[name="expense_value"]').value) || 0,
        category: row.querySelector('[name="expense_category"]').value || 'Other',
        remark: row.querySelector('[name="expense_remark"]').value || ''
    }));
    data.goals = Array.from(document.querySelectorAll('#goals tbody tr')).map(row => ({
        name: row.querySelector('[name="goal_name"]').value || 'Unnamed',
        target: parseFloat(row.querySelector('[name="goal_target"]').value) || 0
    }));
    if (!validateInputs()) return;
    const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
    const totalLoans = data.loans.reduce((sum, l) => sum + l.value, 0);
    const totalIncome = data.income.reduce((sum, s) => sum + s.value, 0);
    const totalRecurringExpenses = data.expenses.filter(e => e.type === 'Recurring').reduce((sum, e) => sum + e.value, 0);
    const netWorth = data.initial_cash + totalInvestments - totalLoans;
    document.getElementById('netWorth').value = formatCurrency(netWorth);
    document.getElementById('totalInvestments').value = formatCurrency(totalInvestments);
    document.getElementById('totalLoans').value = formatCurrency(totalLoans);
    data.goals.forEach((goal, index) => {
        const row = document.querySelectorAll('#goals tbody tr')[index];
        const monthlySavings = totalIncome - totalRecurringExpenses;
        const avgReturn = data.investments.length ? data.investments.reduce((sum, i) => sum + i.return, 0) / data.investments.length / 100 : 0;
        const avgInterest = data.loans.length ? data.loans.reduce((sum, l) => sum + l.interest, 0) / data.loans.length / 100 : 0;
        let currentValue = netWorth;
        let months = 0;
        if (goal.target > 0) {
            const progress = Math.min((netWorth / goal.target) * 100, 100);
            const progressBar = row.querySelector('.progress-bar');
            progressBar.style.width = `${progress}%`;
            if (monthlySavings > 0 || avgReturn > avgInterest) {
                while (currentValue < goal.target && months < 1200) {
                    currentValue = currentValue * (1 + (avgReturn - avgInterest) / 12) + monthlySavings;
                    months++;
                }
                if (months >= 1200) {
                    row.querySelector('[name="goal_time"]').value = '>100 years';
                } else {
                    const years = Math.floor(months / 12);
                    const remainingMonths = months % 12;
                    row.querySelector('[name="goal_time"]').value = `${years}y ${remainingMonths}m`;
                }
            } else {
                row.querySelector('[name="goal_time"]').value = 'N/A';
            }
        }
    });
    updateAllCharts();
    saveData();
    showError('');
}

function calculate() {
    update();
    showNotification('Calculations updated', 'success');
}

function updateOverview() {
    const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
    const totalLoans = data.loans.reduce((sum, l) => sum + l.value, 0);
    const totalIncome = data.income.reduce((sum, s) => sum + s.value, 0);
    const totalRecurringExpenses = data.expenses.filter(e => e.type === 'Recurring').reduce((sum, e) => sum + e.value, 0);
    const netWorth = data.initial_cash + totalInvestments - totalLoans;
    document.getElementById('netWorth').value = formatCurrency(netWorth);
    document.getElementById('totalInvestments').value = formatCurrency(totalInvestments);
    document.getElementById('totalLoans').value = formatCurrency(totalLoans);
    data.goals.forEach((goal, index) => {
        const row = document.querySelectorAll('#goals tbody tr')[index];
        const monthlySavings = totalIncome - totalRecurringExpenses;
        const avgReturn = data.investments.length ? data.investments.reduce((sum, i) => sum + i.return, 0) / data.investments.length / 100 : 0;
        const avgInterest = data.loans.length ? data.loans.reduce((sum, l) => sum + l.interest, 0) / data.loans.length / 100 : 0;
        let currentValue = netWorth;
        let months = 0;
        if (goal.target > 0) {
            const progress = Math.min((netWorth / goal.target) * 100, 100);
            const progressBar = row.querySelector('.progress-bar');
            progressBar.style.width = `${progress}%`;
            if (monthlySavings > 0 || avgReturn > avgInterest) {
                while (currentValue < goal.target && months < 1200) {
                    currentValue = currentValue * (1 + (avgReturn - avgInterest) / 12) + monthlySavings;
                    months++;
                }
                if (months >= 1200) {
                    row.querySelector('[name="goal_time"]').value = '>100 years';
                } else {
                    const years = Math.floor(months / 12);
                    const remainingMonths = months % 12;
                    row.querySelector('[name="goal_time"]').value = `${years}y ${remainingMonths}m`;
                }
            } else {
                row.querySelector('[name="goal_time"]').value = 'N/A';
            }
        }
    });
    updateAllCharts();
    saveData();
    showError('');
}

function updateInsights() {
    if (historicalNetWorth.length < 2) {
        document.getElementById('growthRate').textContent = 'Not enough data for analysis';
        document.getElementById('volatility').textContent = 'Not enough data for analysis';
        document.getElementById('bestWorstMonth').textContent = 'Not enough data for analysis';
        document.getElementById('actionableInsights').textContent = 'Add more monthly records to get personalized insights';
        return;
    }
    const monthlyChanges = [];
    const monthlyGrowthRates = [];
    let bestMonth = { change: -Infinity, date: null };
    let worstMonth = { change: Infinity, date: null };
    for (let i = 1; i < historicalNetWorth.length; i++) {
        const current = historicalNetWorth[i];
        const previous = historicalNetWorth[i - 1];
        const change = current.netWorth - previous.netWorth;
        const growthRate = (change / previous.netWorth) * 100;
        monthlyChanges.push(change);
        monthlyGrowthRates.push(growthRate);
        if (change > bestMonth.change) bestMonth = { change, date: new Date(current.date) };
        if (change < worstMonth.change) worstMonth = { change, date: new Date(current.date) };
    }
    const avgGrowthRate = monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length;
    const meanChange = monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length;
    const squaredDiffs = monthlyChanges.map(change => Math.pow(change - meanChange, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / monthlyChanges.length;
    const volatility = Math.sqrt(variance);
    const formatDate = (date) => date.toLocaleString('default', { month: 'short', year: 'numeric' });
    const growthRateCard = document.getElementById('growthRate');
    growthRateCard.textContent = `${avgGrowthRate.toFixed(1)}% monthly average`;
    growthRateCard.parentElement.parentElement.classList.add(avgGrowthRate > 0 ? 'positive' : avgGrowthRate < 0 ? 'negative' : 'neutral');
    const volatilityCard = document.getElementById('volatility');
    const volatilityPercentage = (volatility / historicalNetWorth[0].netWorth) * 100;
    let stabilityText = '';
    if (volatilityPercentage < 5) stabilityText = 'Very Stable';
    else if (volatilityPercentage < 10) stabilityText = 'Moderately Stable';
    else if (volatilityPercentage < 20) stabilityText = 'Somewhat Volatile';
    else stabilityText = 'Highly Volatile';
    volatilityCard.textContent = stabilityText;
    volatilityCard.parentElement.parentElement.classList.add(volatilityPercentage < 10 ? 'positive' : volatilityPercentage < 20 ? 'neutral' : 'negative');
    const bestWorstMonthCard = document.getElementById('bestWorstMonth');
    bestWorstMonthCard.textContent = `Best: ${formatDate(bestMonth.date)} (${formatCurrency(bestMonth.change)})`;
    bestWorstMonthCard.textContent += `\nWorst: ${formatDate(worstMonth.date)} (${formatCurrency(worstMonth.change)})`;
    const actionableInsightsCard = document.getElementById('actionableInsights');
    let insights = [];

if (avgGrowthRate > 0) {
    insights.push(`Your net worth is growing at ${avgGrowthRate.toFixed(1)}% monthly. Keep up the good work!`);
} else if (avgGrowthRate < 0) {
    insights.push(`Your net worth is declining at ${Math.abs(avgGrowthRate).toFixed(1)}% monthly. Consider reviewing your expenses and investments.`);
}
if (volatilityPercentage > 20) {
    insights.push('Your finances show high volatility. Consider diversifying your investments to reduce risk.');
}
if (bestMonth.change > 0 && worstMonth.change < 0) {
    insights.push(`Your best month was ${formatDate(bestMonth.date)} with a gain of ${formatCurrency(bestMonth.change)}.`);
    insights.push(`Your worst month was ${formatDate(worstMonth.date)} with a loss of ${formatCurrency(Math.abs(worstMonth.change))}.`);
}
let totalLoanEmi = data.expenses
    .filter(expense => expense.category === 'Loan Installment')
    .reduce((sum, expense) => sum + expense.value, 0);

let totalIncome = data.income
    .reduce((sum, income) => sum + income.value, 0);

if (totalIncome > 0) {
    let emiIncomeRatio = (totalLoanEmi / totalIncome) * 100;

    if (emiIncomeRatio > 50) {
        insights.push(`Your loan EMI consumes ${emiIncomeRatio.toFixed(1)}% of your monthly income. This is financially risky — consider reducing EMIs or restructuring loans.`);
    } else if (emiIncomeRatio > 40) {
        insights.push(`Your loan EMI is moderately high at ${emiIncomeRatio.toFixed(1)}% of your income. Monitor it closely to avoid future financial strain.`);
    } else if (totalLoanEmi === 0) {
        insights.push("Great! You have no active loan EMIs currently.");
    }
}
// NEW INSIGHTS ADDED BELOW

    // Savings Rate Analysis
    if (totalIncome > 0) {
        const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.value, 0);
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
        
        if (savingsRate >= 30) {
            insights.push(`Excellent! You're saving ${savingsRate.toFixed(1)}% of your income. You're on track for strong financial growth.`);
        } else if (savingsRate >= 20) {
            insights.push(`Good savings rate of ${savingsRate.toFixed(1)}%. Consider increasing to 30% for accelerated wealth building.`);
        } else if (savingsRate >= 10) {
            insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% to build long-term wealth.`);
        } else if (savingsRate > 0) {
            insights.push(`Low savings rate of ${savingsRate.toFixed(1)}%. Focus on reducing expenses or increasing income to save more.`);
        } else {
            insights.push(`You're spending more than you earn. This is unsustainable - create a budget to control expenses immediately.`);
        }
    }
    
if (insights.length === 0) {
    insights.push('Add more monthly records to get personalized insights and recommendations.');
}
actionableInsightsCard.innerHTML = '<ul>' + insights.map(item => `<li>${item}</li>`).join('') + '</ul>';
}
window.update = update;
