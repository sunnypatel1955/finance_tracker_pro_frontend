let charts = {};

function initCharts() {
    const canvases = {
        investment: document.getElementById('investmentChart'),
        risk: document.getElementById('riskChart'),
        progress: document.getElementById('progressChart'),
        historical: document.getElementById('historicalChart')
    };
     if (canvases.investment) {
        charts.investment = new Chart(canvases.investment.getContext('2d'), {
            type: 'doughnut',
            data: { 
                labels: [], 
                datasets: [{ 
                    data: [], 
                    backgroundColor: [], 
                    borderColor: [], 
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                    hoverOffset: 8
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                layout: { padding: 20 }, 
                plugins: { 
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    }, 
                    tooltip: { 
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: { 
                            label: context => {
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : '0';
                                return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
    }
    if (canvases.risk) {
        charts.risk = new Chart(canvases.risk.getContext('2d'), {
            type: 'bar',
            data: { labels: ['Low', 'Medium', 'High'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#28A745', '#FFC107', '#DC3545'], barPercentage: 0.75 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, x: { grid: { display: false }, ticks: { padding: 10 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `Invested Amount: ${formatCurrency(context.raw)}` } } } }
        });
    }
    if (canvases.progress) {
        charts.progress = new Chart(canvases.progress.getContext('2d'), {
            type: 'line',
            data: { labels: ['Now'], datasets: [{ data: [0], borderColor: '#4CAF50', backgroundColor: context => { const values = context.dataset.data; return values[context.dataIndex] < 0 ? 'rgba(220, 53, 69, 0.3)' : 'rgba(76, 175, 80, 0.3)'; }, fill: true, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } }, plugins: { legend: { display: false } } }
        });
    }
    if (canvases.historical) {
        charts.historical = new Chart(canvases.historical.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Net Worth', data: [], borderColor: '#0288D1', backgroundColor: 'rgba(2, 136, 209, 0.3)', fill: true, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, title: { display: true, text: 'Net Worth' } }, x: { title: { display: true, text: 'Month' } } }, plugins: { legend: { display: true }, tooltip: { callbacks: { label: context => `Net Worth: ${formatCurrency(context.raw)}` } } } }
        });
    }
    updateAllCharts();
}

function updateAllCharts() {
    const totalInvestments = data.investments.reduce((sum, i) => sum + i.value, 0);
    const totalLoans = data.loans.reduce((sum, l) => sum + l.value, 0);
    const totalIncome = data.income.reduce((sum, s) => sum + s.value, 0);
    const totalRecurringExpenses = data.expenses.filter(e => e.type === 'Recurring').reduce((sum, e) => sum + e.value, 0);
    updateInvestmentChart();
    updateRiskChart();
    updateProgressChart(totalIncome, totalRecurringExpenses);
    updateHistoricalChart();
}

function updateInvestmentChart() {
    if (!charts.investment) return;
    const sortedInvestments = [...data.investments].sort((a, b) => b.value - a.value);
    const labels = sortedInvestments.map(i => i.name);
    const values = sortedInvestments.map(i => i.value);
    const colorMap = { 'Gold': { background: '#FFD700', border: '#E6C200' }, 'Mutual Funds': { background: '#90EE90', border: '#7CFC00' }, 'Stocks': { background: '#1E90FF', border: '#1C86EE' }, 'Fixed Income': { background: '#228B22', border: '#006400' }, 'Real Estate': { background: '#808080', border: '#696969' }, 'Bonds': { background: '#BA55D3', border: '#9932CC' }, 'Other': { background: '#FF4500', border: '#D2691E' }, 'Cryptocurrency': { background: '#FFC107', border: '#FFC107' } };
    const backgroundColors = [];
    const borderColors = [];
    const baseNameCounts = {};
    labels.forEach(label => {
        const baseName = label.split('-')[0];
        baseNameCounts[baseName] = (baseNameCounts[baseName] || 0) + 1;
        const count = baseNameCounts[baseName];
        let baseColor = colorMap[baseName]?.background || getRandomColor();
        let baseBorder = colorMap[baseName]?.border || getRandomColor();
        const factor = 1 - (count - 1) * 0.2;
        backgroundColors.push(adjustColor(baseColor, factor));
        borderColors.push(adjustColor(baseBorder, factor));
    });
    charts.investment.data.labels = labels;
    charts.investment.data.datasets[0].data = values;
    charts.investment.data.datasets[0].backgroundColor = backgroundColors;
    charts.investment.data.datasets[0].borderColor = borderColors;
    charts.investment.update();
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function updateRiskChart() {
    if (!charts.risk) return;
    const riskData = { low: { value: 0 }, medium: { value: 0 }, high: { value: 0 } };
    data.investments.forEach(i => {
        riskData[i.risk].value += i.value;
    });
    charts.risk.data.datasets[0].data = [riskData.low.value, riskData.medium.value, riskData.high.value];
    charts.risk.update();
}

function updateProgressChart(income, recurringExpenses) {
    if (!charts.progress) return;
    const monthlySavings = income - recurringExpenses;
    const totalInvestmentValue = data.investments.length ? data.investments.reduce((sum, i) => sum + i.value, 0) : 0;
    const weightedReturnSum = data.investments.length ? data.investments.reduce((sum, i) => sum + (i.value * (i.return >= 0 ? i.return : 0)), 0) : 0;
    const avgReturn = totalInvestmentValue ? weightedReturnSum / totalInvestmentValue / 100 : 0;
    const avgInterest = data.loans.length ? data.loans.reduce((sum, l) => sum + l.interest, 0) / data.loans.length / 100 : 0;
    const netWorth = data.initial_cash + data.investments.reduce((sum, i) => sum + i.value, 0) - data.loans.reduce((sum, l) => sum + l.value, 0);
    const years = 10;
    const dataPoints = [netWorth];
    let currentValue = netWorth;
    for (let i = 1; i <= years; i++) {
        const annualGrowth = currentValue * (avgReturn - avgInterest);
        currentValue += (monthlySavings * 12) + annualGrowth;
        dataPoints.push(currentValue);
    }
    charts.progress.data.labels = ['Now', ...Array(years).fill().map((_, i) => `Year ${i + 1}`)];
    charts.progress.data.datasets[0].data = dataPoints;
    charts.progress.update();
}

function updateHistoricalChart() {
    if (!charts.historical) return;
    if (historicalNetWorth.length === 0) return;

    historicalNetWorth.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalPoints = historicalNetWorth.length;
    const pointsToShow = Math.min(totalPoints, 12);

    const sampledPoints = [];

    if (pointsToShow === 1) {
        sampledPoints.push(historicalNetWorth[0]);
    } else {
        const step = (totalPoints - 1) / (pointsToShow - 1);
        for (let i = 0; i < pointsToShow - 1; i++) {
            sampledPoints.push(historicalNetWorth[Math.floor(i * step)]);
        }
        sampledPoints.push(historicalNetWorth[totalPoints - 1]);
    }

    const labels = sampledPoints.map(record => {
        const date = new Date(record.date);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    const values = sampledPoints.map(record => record.netWorth);

    charts.historical.data.labels = labels;
    charts.historical.data.datasets[0].data = values;
    charts.historical.update();

    updateInsights();
    updateMonthlyRecordsTable();
}







function updateChartColors(isDarkMode) {
    const color = isDarkMode ? '#E0E0E0' : '#212121';
    if (charts.investment) charts.investment.options.plugins.legend.labels.color = color;
    if (charts.risk) {
        charts.risk.options.scales.y.ticks.color = color;
        charts.risk.options.scales.x.ticks.color = color;
    }
    if (charts.progress) {
        charts.progress.options.scales.y.ticks.color = color;
        charts.progress.options.scales.x.ticks.color = color;
    }
    if (charts.historical) {
        charts.historical.options.scales.y.ticks.color = color;
        charts.historical.options.scales.x.ticks.color = color;
        charts.historical.options.scales.y.title.color = color;
        charts.historical.options.scales.x.title.color = color;
        charts.historical.options.plugins.legend.labels.color = color;
    }
}
