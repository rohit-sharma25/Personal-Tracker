// js/ai-service.js - Enhanced AI for Expense Tracking
export class AIService {
    static async getFinancialAdvice(finances, budget) {
        const today = new Date().toISOString().slice(0, 7);
        const monthlyExpenses = finances
            .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
            .reduce((sum, f) => sum + f.amount, 0);

        if (!budget) return "💡 Set a monthly budget to get personalized financial advice!";

        const ratio = monthlyExpenses / budget;
        if (ratio > 1) return "⚠️ You've exceeded your budget! Consider reviewing your recent expenses and cutting non-essentials.";
        if (ratio > 0.8) return "🟡 You've used over 80% of your budget. Slow down on non-essential spending.";
        if (ratio > 0.5) return "📊 You're at 50% of your budget. You're on track, but keep monitoring.";
        return "✅ Your spending is well under control! Great job managing your finances.";
    }

    static async getSpendingInsights(finances) {
        if (finances.length === 0) return "No expenses recorded yet. Start tracking to get insights!";

        // Category analysis
        const categories = {};
        finances.filter(f => f.type === 'expense').forEach(f => {
            const cat = f.category || 'Miscellaneous';
            categories[cat] = (categories[cat] || 0) + f.amount;
        });

        const topCategory = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])[0];

        if (topCategory) {
            return `📊 Your biggest spending category is **${topCategory[0]}** with ₹${topCategory[1].toFixed(2)}. Consider if this aligns with your priorities.`;
        }

        return "Keep tracking your expenses to get detailed insights!";
    }

    static async getSavingsSuggestions(finances, budget) {
        const today = new Date().toISOString().slice(0, 7);
        const monthlyExpenses = finances
            .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
            .reduce((sum, f) => sum + f.amount, 0);

        const categories = {};
        finances
            .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
            .forEach(f => {
                const cat = f.category || 'Miscellaneous';
                categories[cat] = (categories[cat] || 0) + f.amount;
            });

        const suggestions = [];

        // Check food spending
        const foodSpending = categories['Food & Grocery'] || 0;
        if (foodSpending > monthlyExpenses * 0.3) {
            suggestions.push("🍔 Food spending is high (>30%). Try meal planning and cooking at home more often.");
        }

        // Check shopping
        const shopping = categories['Shopping'] || 0;
        if (shopping > monthlyExpenses * 0.2) {
            suggestions.push("🛍️ Shopping expenses are significant. Consider a 30-day rule before non-essential purchases.");
        }

        // Check subscriptions
        const subs = categories['Bill & Subscription'] || 0;
        if (subs > 0) {
            suggestions.push("💳 Review your subscriptions. Cancel unused services to save money.");
        }

        if (suggestions.length === 0) {
            return "💰 Your spending looks balanced! Keep up the good work.";
        }

        return suggestions.join('\n\n');
    }

    static async chat(message, context) {
        const msg = message.toLowerCase();

        // Greetings
        if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
            return "Hello! 👋 I'm your AI financial advisor. I can help you with:\n\n• Expense analysis\n• Budget tracking\n• Savings suggestions\n• Spending insights\n\nWhat would you like to know?";
        }

        // Monthly spending
        if (msg.includes("spent") || msg.includes("spending") || msg.includes("month")) {
            const today = new Date().toISOString().slice(0, 7);
            const spent = (context.finances || [])
                .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
                .reduce((sum, f) => sum + f.amount, 0);

            const budgetInfo = context.budget
                ? `\n\nYour budget is ₹${context.budget.toFixed(2)}. You've used ${((spent / context.budget) * 100).toFixed(1)}% of it.`
                : "\n\nSet a budget for better tracking!";

            return `💰 You've spent **₹${spent.toFixed(2)}** this month.${budgetInfo}`;
        }

        // Category breakdown
        if (msg.includes("category") || msg.includes("categories") || msg.includes("where")) {
            return await this.getSpendingInsights(context.finances || []);
        }

        // Budget advice
        if (msg.includes("budget") || msg.includes("advice") || msg.includes("help")) {
            return await this.getFinancialAdvice(context.finances || [], context.budget);
        }

        // Savings suggestions
        if (msg.includes("save") || msg.includes("saving") || msg.includes("suggest")) {
            return await this.getSavingsSuggestions(context.finances || [], context.budget);
        }

        // Investment
        if (msg.includes("invest") || msg.includes("investment")) {
            const investment = (context.finances || [])
                .filter(f => f.category === 'Investment')
                .reduce((sum, f) => sum + f.amount, 0);

            return `📈 Your total investment is **₹${investment.toFixed(2)}**.\n\nKeep investing regularly for long-term wealth building!`;
        }

        // Today's expenses
        if (msg.includes("today")) {
            const today = new Date().toISOString().slice(0, 10);
            const todayExpenses = (context.finances || [])
                .filter(f => f.type === 'expense' && f.dateISO === today)
                .reduce((sum, f) => sum + f.amount, 0);

            return `📅 Today you've spent **₹${todayExpenses.toFixed(2)}**.`;
        }

        // Default response
        return "I can help you with:\n\n• 💰 Monthly spending analysis\n• 📊 Category breakdown\n• 💡 Budget advice\n• 🎯 Savings suggestions\n• 📈 Investment tracking\n\nJust ask me anything about your finances!";
    }
}
