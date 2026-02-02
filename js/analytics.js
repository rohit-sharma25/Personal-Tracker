// ============================================
// ANALYTICS.JS - Data Analysis & Insights
// ============================================

/**
 * Calculate habit statistics
 */
export function calculateHabitStats(habits, habitLogs) {
    const stats = {
        totalHabits: habits.length,
        activeHabits: 0,
        totalStreak: 0,
        longestStreak: 0,
        completionRate: 0,
        weeklyCompletion: 0
    };

    if (habits.length === 0) return stats;

    // Calculate streaks
    habits.forEach(habit => {
        const streak = habit.streak || 0;
        stats.totalStreak += streak;
        if (streak > stats.longestStreak) {
            stats.longestStreak = streak;
        }
        if (streak > 0) {
            stats.activeHabits++;
        }
    });

    // Calculate weekly completion rate
    const today = new Date();
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        weekDates.push(d.toISOString().slice(0, 10));
    }

    let totalPossible = habits.length * 7;
    let totalCompleted = 0;

    weekDates.forEach(date => {
        const dayLogs = habitLogs[date] || [];
        totalCompleted += dayLogs.length;
    });

    stats.weeklyCompletion = totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;

    stats.completionRate = stats.weeklyCompletion;

    return stats;
}

/**
 * Calculate finance statistics
 */
export function calculateFinanceStats(finances, monthlyBudget) {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);

    const stats = {
        totalExpenses: 0,
        totalIncome: 0,
        monthlyExpenses: 0,
        monthlyIncome: 0,
        todayExpenses: 0,
        budgetRemaining: 0,
        budgetUsedPercent: 0,
        savingsRate: 0,
        avgDailySpending: 0,
        topExpense: null
    };

    const todayStr = today.toISOString().slice(0, 10);
    const monthExpenses = [];

    finances.forEach(f => {
        if (f.type === 'expense') {
            stats.totalExpenses += f.amount;
            if (f.dateISO.startsWith(currentMonth)) {
                stats.monthlyExpenses += f.amount;
                monthExpenses.push(f);
            }
            if (f.dateISO === todayStr) {
                stats.todayExpenses += f.amount;
            }
        } else if (f.type === 'income') {
            stats.totalIncome += f.amount;
            if (f.dateISO.startsWith(currentMonth)) {
                stats.monthlyIncome += f.amount;
            }
        }
    });

    // Budget calculations
    if (monthlyBudget) {
        stats.budgetRemaining = monthlyBudget - stats.monthlyExpenses;
        stats.budgetUsedPercent = Math.round((stats.monthlyExpenses / monthlyBudget) * 100);
    }

    // Savings rate
    if (stats.monthlyIncome > 0) {
        stats.savingsRate = Math.round(((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100);
    }

    // Average daily spending
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    stats.avgDailySpending = stats.monthlyExpenses / today.getDate();

    // Top expense
    if (monthExpenses.length > 0) {
        stats.topExpense = monthExpenses.reduce((max, f) => f.amount > max.amount ? f : max);
    }

    return stats;
}

/**
 * Analyze spending by category
 */
export function analyzeSpendingByCategory(finances) {
    const categories = {};
    const keywords = {
        'Food': ['food', 'restaurant', 'grocery', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'pizza', 'burger'],
        'Transport': ['uber', 'taxi', 'bus', 'train', 'metro', 'fuel', 'gas', 'parking', 'transport'],
        'Shopping': ['amazon', 'shopping', 'clothes', 'shoes', 'store', 'mall', 'purchase'],
        'Entertainment': ['movie', 'netflix', 'spotify', 'game', 'concert', 'entertainment', 'subscription'],
        'Bills': ['bill', 'electricity', 'water', 'internet', 'phone', 'rent', 'utility'],
        'Health': ['medicine', 'doctor', 'hospital', 'pharmacy', 'health', 'gym', 'fitness'],
        'Other': []
    };

    finances.filter(f => f.type === 'expense').forEach(f => {
        const desc = f.desc.toLowerCase();
        let categorized = false;

        for (const [category, words] of Object.entries(keywords)) {
            if (category === 'Other') continue;
            if (words.some(word => desc.includes(word))) {
                categories[category] = (categories[category] || 0) + f.amount;
                categorized = true;
                break;
            }
        }

        if (!categorized) {
            categories['Other'] = (categories['Other'] || 0) + f.amount;
        }
    });

    return categories;
}

/**
 * Get spending trend (last 7 days)
 */
export function getSpendingTrend(finances, days = 7) {
    const trend = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);

        const dayExpenses = finances
            .filter(f => f.type === 'expense' && f.dateISO === dateStr)
            .reduce((sum, f) => sum + f.amount, 0);

        trend.push({
            date: dateStr,
            amount: dayExpenses,
            label: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }

    return trend;
}

/**
 * Get habit completion trend (last 7 days)
 */
export function getHabitCompletionTrend(habits, habitLogs, days = 7) {
    const trend = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);

        const dayLogs = habitLogs[dateStr] || [];
        const completionRate = habits.length > 0
            ? Math.round((dayLogs.length / habits.length) * 100)
            : 0;

        trend.push({
            date: dateStr,
            completed: dayLogs.length,
            total: habits.length,
            rate: completionRate,
            label: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }

    return trend;
}

/**
 * Generate insights based on data
 */
export function generateInsights(habitStats, financeStats) {
    const insights = [];

    // Habit insights
    if (habitStats.longestStreak >= 7) {
        insights.push({
            type: 'success',
            icon: '🔥',
            message: `Amazing! Your longest streak is ${habitStats.longestStreak} days!`
        });
    }

    if (habitStats.weeklyCompletion >= 80) {
        insights.push({
            type: 'success',
            icon: '⭐',
            message: `Excellent consistency! ${habitStats.weeklyCompletion}% completion this week.`
        });
    } else if (habitStats.weeklyCompletion < 50 && habitStats.totalHabits > 0) {
        insights.push({
            type: 'warning',
            icon: '💪',
            message: `You can do better! Only ${habitStats.weeklyCompletion}% completion this week.`
        });
    }

    // Finance insights
    if (financeStats.budgetUsedPercent > 90) {
        insights.push({
            type: 'danger',
            icon: '⚠️',
            message: `Budget alert! You've used ${financeStats.budgetUsedPercent}% of your monthly budget.`
        });
    } else if (financeStats.budgetUsedPercent > 0 && financeStats.budgetUsedPercent <= 70) {
        insights.push({
            type: 'success',
            icon: '💰',
            message: `Great job! You're at ${financeStats.budgetUsedPercent}% of your budget.`
        });
    }

    if (financeStats.savingsRate > 20) {
        insights.push({
            type: 'success',
            icon: '📈',
            message: `Impressive ${financeStats.savingsRate}% savings rate this month!`
        });
    }

    if (financeStats.topExpense && financeStats.topExpense.amount > 1000) {
        insights.push({
            type: 'info',
            icon: '💸',
            message: `Biggest expense: ₹${financeStats.topExpense.amount.toFixed(2)} on ${financeStats.topExpense.desc}`
        });
    }

    return insights;
}

/**
 * Calculate heatmap data for habits
 */
export function generateHabitHeatmap(habitLogs, weeks = 12) {
    const heatmapData = [];
    const today = new Date();
    const totalDays = weeks * 7;

    for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        const logs = habitLogs[dateStr] || [];

        // Level 0-4 based on number of habits completed
        let level = 0;
        if (logs.length > 0) level = 1;
        if (logs.length >= 2) level = 2;
        if (logs.length >= 3) level = 3;
        if (logs.length >= 5) level = 4;

        heatmapData.push({
            date: dateStr,
            count: logs.length,
            level: level
        });
    }

    return heatmapData;
}
