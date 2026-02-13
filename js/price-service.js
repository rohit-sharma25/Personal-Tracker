import { CONFIG } from './config.js';
import { DBService } from './db-service.js';

export class PriceService {
    static ALPHA_BASE_URL = 'https://www.alphavantage.co/query';
    static FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

    /**
     * SYMBOL MAPPING
     * Internal App Symbol -> API Symbol
     */
    static SYMBOL_MAP = {
        'GOLD': { finnhub: 'OANDA:XAU_USD', alpha: 'GOLD' }, // Finnhub: Forex/CFD, Alpha: Commodity
        'SILVER': { finnhub: 'OANDA:XAG_USD', alpha: 'SILVER' },
        'RELIANCE.BSE': { finnhub: 'RELIANCE.NS', alpha: 'RELIANCE.BSE' }, // Finnhub prefers NS for India
        'TCS.BSE': { finnhub: 'TCS.NS', alpha: 'TCS.BSE' },
        'INFY.BSE': { finnhub: 'INFY.NS', alpha: 'INFY.BSE' },
        'HDFCBANK.BSE': { finnhub: 'HDFCBANK.NS', alpha: 'HDFCBANK.BSE' }
    };

    /**
     * SIMULATED BACKEND TRIGGER
     * This method acts as a Cloud Function trigger.
     * It fetches data from APIs and updates the 'cachedMarketData' collection in Firestore.
     * The Dashboard reads ONLY from Firestore.
     */
    static async syncMarketData(uid, holdings) {
        if (!uid) return;

        const symbols = new Set(['GOLD', 'SILVER', 'RELIANCE.BSE', 'TCS.BSE']); // Defaults
        if (holdings) {
            holdings.forEach(h => {
                if (h.type === 'STOCK' || h.type === 'COMMODITY') symbols.add(h.symbol);
            });
        }

        console.log('[Backend Simulation] Syncing market data for:', [...symbols]);

        const updates = {};

        for (const symbol of symbols) {
            try {
                // 1. Fetch Real-time Quote (Finnhub)
                const quoteData = await this.fetchQuote(symbol);

                // 2. Fetch History (Alpha Vantage) - Optimized to not over-fetch
                // In a real app, we'd check timestamp and only fetch daily. 
                // For demo, we might fetch if missing or old.
                // We'll skip history fetch in high-frequency loop to save limits, 
                // relying on a separate trigger or just initial load logic if needed.
                // For now, let's include a lightweight check or just fetch quote.

                updates[symbol] = {
                    ...quoteData,
                    symbol: symbol,
                    updatedAt: new Date().toISOString()
                };

            } catch (err) {
                console.warn(`[Backend Simulation] Error syncing ${symbol}:`, err);
            }
        }

        // Batch write to Firestore
        // In a real backend, we'd use batch. Here we iterate.
        for (const [sym, data] of Object.entries(updates)) {
            await DBService.saveData(uid, 'cachedMarketData', sym, data);
        }

        return updates;
    }

    /**
     * Fetches real-time quote from Finnhub.
     */
    static async fetchQuote(symbol) {
        const apiKey = CONFIG.FINNHUB_API_KEY;
        const mapped = this.SYMBOL_MAP[symbol] ? this.SYMBOL_MAP[symbol].finnhub : symbol;

        if (!apiKey || apiKey === 'YOUR_FINNHUB_KEY') {
            console.warn('Finnhub API key missing. Using mock.');
            return this.getMockQuote(symbol);
        }

        // Finnhub Quote Endpoint
        const url = `${this.FINNHUB_BASE_URL}/quote?symbol=${mapped}&token=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Finnhub status: ${response.status}`);
            const data = await response.json();

            // Finnhub response: { c: current, d: change, dp: percent, h: high, l: low, o: open, pc: prev_close }
            if (data.c === 0 && data.pc === 0) throw new Error("Invalid symbol or no data");

            return {
                price: parseFloat(data.c),
                change: parseFloat(data.d),
                changePercent: parseFloat(data.dp).toFixed(2) + '%',
                prevClose: parseFloat(data.pc),
                high: data.h,
                low: data.l,
            };
        } catch (error) {
            console.error(`Finnhub error for ${symbol}:`, error);
            return this.getMockQuote(symbol);
        }
    }

    /**
     * Fetches historical data from Alpha Vantage for Charts.
     */
    static async fetchHistory(symbol) {
        const apiKey = CONFIG.ALPHA_VANTAGE_API_KEY;
        const mapped = this.SYMBOL_MAP[symbol] ? this.SYMBOL_MAP[symbol].alpha : symbol;
        const type = (symbol === 'GOLD' || symbol === 'SILVER') ? 'COMMODITY' : 'STOCK';

        if (!apiKey || apiKey === 'demo') return this.getMockHistory();

        let url = '';
        if (type === 'COMMODITY') {
            // AV doesn't give nice history for free commodities mostly, but let's try
            // or fallback to a mock for commodities history in this demo if needed.
            // For consistency with stocks in charts, we might treat it like a stock if we use an ETF symbol,
            // but user specified XAUUSD. AV has digital currency or forex for that.
            // Let's stick to STOCK DAILY for stocks.
            return this.getMockHistory(); // AV Commodities are tricky on free tier for history sometimes
        } else {
            url = `${this.ALPHA_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${mapped}&apikey=${apiKey}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();
            const series = data['Time Series (Daily)'];

            if (!series) throw new Error("No history data");

            // Format for ApexCharts: [{ x: date, y: [o, h, l, c] }]
            const history = Object.keys(series).slice(0, 30).map(date => {
                const item = series[date];
                return {
                    x: new Date(date).getTime(), // Timestamp for X axis
                    y: [
                        parseFloat(item['1. open']),
                        parseFloat(item['2. high']),
                        parseFloat(item['3. low']),
                        parseFloat(item['4. close'])
                    ]
                };
            }).reverse();

            return history;
        } catch (error) {
            console.error(`AV History error for ${symbol}:`, error);
            return this.getMockHistory();
        }
    }

    static getMockQuote(symbol) {
        const mocks = {
            'GOLD': 62500,
            'SILVER': 75000,
            'RELIANCE.BSE': 2950,
            'TCS.BSE': 4100
        };
        const base = mocks[symbol] || 1000;
        const price = base + (Math.random() - 0.5) * 10;
        return {
            price: price,
            change: (Math.random() * 20).toFixed(2),
            changePercent: (Math.random() * 2).toFixed(2) + '%',
            prevClose: base
        };
    }

    static getMockHistory() {
        // Generate 30 days of dummy candles
        const data = [];
        let price = 1000;
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (30 - i));
            const open = price;
            const close = price + (Math.random() - 0.5) * 50;
            const high = Math.max(open, close) + Math.random() * 10;
            const low = Math.min(open, close) - Math.random() * 10;
            data.push({
                x: date.getTime(),
                y: [open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2)]
            });
            price = close;
        }
        return data;
    }
}
