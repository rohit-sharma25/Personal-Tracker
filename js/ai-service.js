// js/ai-service.js
export class AIService {
    static async getHabitInsights(habits, logs) {
        await new Promise(r => setTimeout(r, 800)); // Simulate thinking
        if (habits.length === 0) return "Start your journey by adding a new habit like 'Morning Walk' or 'Drink Water'!";
        const topHabit = [...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
        if (topHabit.streak > 5) {
            return `Amazing consistency with **${topHabit.name}**! You have a ${topHabit.streak} day streak. Maybe it's time to challenge yourself with something new?`;
        }
        return `You're doing great! Try to hit 3 days in a row for **${habits[0].name}** to build momentum.`;
    }

    static async getFinancialAdvice(finances, budget) {
        const today = new Date().toISOString().slice(0, 7);
        const monthlyExpenses = finances
            .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
            .reduce((sum, f) => sum + f.amount, 0);
        if (!budget) return "Set a monthly budget to get personalized financial advice!";
        const ratio = monthlyExpenses / budget;
        if (ratio > 1) return "⚠️ You've exceeded your budget! Consider reviewing your recent expenses.";
        if (ratio > 0.8) return "🟡 You've used over 80% of your budget. Slow down on non-essentials.";
        return "✅ Your spending is on track! Keep it up.";
    }

    static async chat(message, context) {
        const msg = message.toLowerCase();

        if (msg.includes("hello") || msg.includes("hi")) {
            return "Hello! I'm your AI tracker assistant. How can I help you today?";
        }

        if (msg.includes("habit") || msg.includes("streak")) {
            if (!context.habits || context.habits.length === 0) return "You haven't added any habits yet. Add one to start tracking!";
            const active = context.habits.length;
            return `You have ${active} active habits. Keep pushing to maintain your streaks!`;
        }

        if (msg.includes("money") || msg.includes("budget") || msg.includes("spent")) {
            const today = new Date().toISOString().slice(0, 7);
            const spent = (context.finances || [])
                .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
                .reduce((sum, f) => sum + f.amount, 0);
            return `You've spent ₹${spent.toFixed(2)} this month. ${context.budget ? `Your budget is ₹${context.budget}.` : "Set a budget for better tracking!"}`;
        }

        return "I'm still learning! Ask me about your habits, streaks, or monthly spending.";
    }
}
