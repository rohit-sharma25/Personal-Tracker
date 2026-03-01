import { DBService } from './db-service.js';

export class InvestmentEngine {
    /**
     * Calculates total value and gain/loss.
     */
    static calculatePortfolioMetrics(holdings, cachedPrices) {
        let totalValue = 0;
        let totalCost = 0;
        let dailyGain = 0;

        holdings.forEach(holding => {
            const priceData = cachedPrices[holding.symbol];
            const currentPrice = (priceData && typeof priceData === 'object' ? priceData.price : priceData) || holding.avgPrice;
            const prevClose = (priceData && typeof priceData === 'object' ? priceData.prevClose : holding.prevClose) || holding.avgPrice;

            const marketValue = holding.quantity * currentPrice;
            const costBasis = holding.quantity * holding.avgPrice;

            totalValue += marketValue;
            totalCost += costBasis;

            // Daily gain: (Current Price - Previous Close) * Quantity
            dailyGain += (currentPrice - prevClose) * holding.quantity;
        });

        const totalGain = totalValue - totalCost;
        const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

        // Diversification Score (0-100)
        // Calculated based on concentration in a single asset (use numeric price values)
        let diversificationScore = 100;
        if (holdings.length > 0 && totalValue > 0) {
            const concentrations = holdings.map(h => {
                const priceObj = cachedPrices[h.symbol];
                const priceVal = (priceObj && typeof priceObj === 'object') ? priceObj.price : priceObj || h.avgPrice || 0;
                return (h.quantity * priceVal) / totalValue;
            });
            const maxConcentration = Math.max(...concentrations);
            diversificationScore = Math.max(0, 100 - (maxConcentration * 100));
        }

        return {
            totalValue,
            investedValue: totalCost,
            totalGain,
            gainPercentage,
            dailyGain,
            diversificationScore
        };
    }

    /**
     * Calculates progress for SIP, FD, and RD.
     */
    static calculateSavingsMetrics(sipPlans, fdAccounts, rdAccounts) {
        let totalSaved = 0;
        let totalTarget = 0;

        sipPlans.forEach(sip => {
            totalSaved += sip.currentInvested;
            totalTarget += sip.targetAmount;
        });

        fdAccounts.forEach(fd => {
            totalSaved += fd.principal;
            totalTarget += fd.maturityValue;
        });

        rdAccounts.forEach(rd => {
            totalSaved += rd.currentBalance;
            totalTarget += rd.targetAmount;
        });

        const completionStatus = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

        return {
            totalSaved,
            totalTarget,
            completionStatus
        };
    }

    /**
     * Calculates Asset Allocation Breakdown.
     */
    static calculateAssetAllocation(holdings, sipPlans, fdAccounts, rdAccounts, cachedPrices) {
        let equity = 0;
        let commodities = 0;
        let fixedIncome = 0;

        holdings.forEach(h => {
            const priceData = cachedPrices[h.symbol];
            const price = (priceData && typeof priceData === 'object' ? priceData.price : priceData) || h.avgPrice || 0;
            const value = h.quantity * price;

            if (h.type === 'STOCK') equity += value;
            else if (h.type === 'COMMODITY') commodities += value;
        });

        sipPlans.forEach(s => equity += s.currentInvested); // SIPs are (mostly) equity
        fdAccounts.forEach(fd => fixedIncome += fd.principal);
        rdAccounts.forEach(rd => fixedIncome += rd.currentBalance);

        const total = equity + commodities + fixedIncome;

        return {
            equity: total > 0 ? (equity / total) * 100 : 0,
            commodities: total > 0 ? (commodities / total) * 100 : 0,
            fixedIncome: total > 0 ? (fixedIncome / total) * 100 : 0,
            total
        };
    }

    /**
     * Estimates Annual Passive Income.
     */
    static calculatePassiveIncome(holdings, sipPlans, fdAccounts, rdAccounts, cachedPrices) {
        let annualIncome = 0;

        // Assumed Dividend Yield: 1.5% for stocks
        holdings.forEach(h => {
            if (h.type === 'STOCK') {
                const priceData = cachedPrices[h.symbol];
                const price = (priceData && typeof priceData === 'object' ? priceData.price : priceData) || h.avgPrice || 0;
                const value = h.quantity * price;
                annualIncome += value * 0.015;
            }
        });

        // Assumed Dividend Yield: 1% for SIPs
        sipPlans.forEach(s => {
            annualIncome += s.currentInvested * 0.01;
        });

        // FD/RD interest
        fdAccounts.forEach(fd => annualIncome += fd.principal * (fd.interestRate / 100));
        rdAccounts.forEach(rd => annualIncome += rd.currentBalance * (rd.interestRate / 100));

        return annualIncome;
    }

    /**
     * Calculates Projected Wealth.
     */
    static calculateProjections(amount, rate, years, isMonthly = false) {
        if (isMonthly) {
            const monthlyRate = (rate / 100) / 12;
            const months = years * 12;
            return amount * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
        } else {
            return amount * Math.pow(1 + (rate / 100), years);
        }
    }

    /**
     * Prepares summary for AI processing.
     */
    static generateSummaryForAI(portfolioMetrics, savingsMetrics) {
        return {
            totalWealth: portfolioMetrics.totalValue + savingsMetrics.totalSaved,
            portfolioGain: portfolioMetrics.gainPercentage,
            diversification: portfolioMetrics.diversificationScore,
            savingsProgress: savingsMetrics.completionStatus,
            riskProfile: portfolioMetrics.diversificationScore < 40 ? 'High' : 'Low'
        };
    }
}
