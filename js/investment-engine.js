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
        // Calculated based on concentration in a single asset
        let diversificationScore = 100;
        if (holdings.length > 0) {
            const concentrations = holdings.map(h => (h.quantity * (cachedPrices[h.symbol] || h.avgPrice)) / totalValue);
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
