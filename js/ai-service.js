// js/ai-service.js - Stable AI Service with Robust UI Handler
export class AIService {
    static async chat(message, context) {
        const msg = message.toLowerCase();

        // Financial Context Logic
        const today = new Date().toISOString().slice(0, 7);
        const finances = context.finances || [];
        const budget = context.budget || 0;

        const spent = finances
            .filter(f => f.type === 'expense' && f.dateISO.startsWith(today))
            .reduce((sum, f) => sum + f.amount, 0);

        if (msg.includes("hello") || msg.includes("hi")) {
            return "Hi there! 👋 I'm your AI financial advisor. How can I help you manage your money today?";
        }

        if (msg.includes("spent") || msg.includes("spending")) {
            const budgetMsg = budget > 0
                ? `\n\nYour budget: ₹${budget.toLocaleString('en-IN')}\nStatus: ${((spent / budget) * 100).toFixed(1)}% used.`
                : "\n\nTip: Set a budget in the Expenses page to track progress!";
            return `💰 You've spent **₹${spent.toLocaleString('en-IN')}** this month.${budgetMsg}`;
        }

        if (msg.includes("save") || msg.includes("tips")) {
            return "💡 **Quick Savings Tips:**\n1. Review recurring subscriptions.\n2. Use the '30-day rule' for big purchases.\n3. Track every small expense – they add up!";
        }

        if (msg.includes("invest")) {
            const invested = finances
                .filter(f => f.category === 'Investment')
                .reduce((sum, f) => sum + f.amount, 0);
            return `📈 You've invested a total of **₹${invested.toLocaleString('en-IN')}** so far. Building wealth is a marathon, not a sprint!`;
        }

        return "I can help with:\n• Monthly spending analysis\n• Savings suggestions\n• Investment tracking\n\nWhat's on your mind?";
    }

    /**
     * Stable UI Handler - Guaranteed focus and reactivity
     */
    static init(elements, getContext) {
        const { fab, popup, close, input, send, body } = elements;

        if (!fab || !popup || !input) return;

        // Toggle Popup with Focus Management
        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpening = popup.classList.contains('hidden');
            popup.classList.toggle('hidden');

            if (isOpening) {
                setTimeout(() => {
                    input.focus();
                    input.click(); // Force focus for some mobile browsers
                }, 100);
            }
        });

        // Close on X
        close?.addEventListener('click', () => popup.classList.add('hidden'));

        // Global Close
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target) && !fab.contains(e.target)) {
                popup.classList.add('hidden');
            }
        });

        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;

            // User Message
            this.appendMessage(body, text, 'user');
            input.value = '';

            // AI Response
            const aiMsg = this.appendMessage(body, 'Thinking...', 'ai');

            try {
                const response = await this.chat(text, getContext());
                aiMsg.innerHTML = response;
            } catch (err) {
                aiMsg.textContent = "I'm having a bit of trouble. Please try again later.";
            }

            body.scrollTop = body.scrollHeight;
        };

        send?.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    static appendMessage(container, text, type) {
        const div = document.createElement('div');
        div.className = `msg-${type}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }
}


