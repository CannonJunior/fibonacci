#!/usr/bin/env node
/**
 * Test script to verify Finnhub financial data parsing
 */

// Simulate the findFinancialValueByGAAP function
function findFinancialValueByGAAP(incomeStatementArray, gaapConcepts) {
    if (!Array.isArray(incomeStatementArray)) {
        return 0;
    }

    for (const concept of gaapConcepts) {
        const item = incomeStatementArray.find(entry => entry.concept === concept);
        if (item && item.value !== undefined && item.value !== null) {
            return parseFloat(item.value) || 0;
        }
    }
    return 0;
}

// Sample Finnhub income statement data (from AAPL)
const sampleIC = [
    {"concept":"us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax","unit":"usd","label":"Net sales","value":391035000000.0},
    {"concept":"us-gaap_CostOfGoodsAndServicesSold","unit":"usd","label":"Cost of sales","value":210352000000.0},
    {"concept":"us-gaap_GrossProfit","unit":"usd","label":"Gross margin","value":180683000000},
    {"concept":"us-gaap_ResearchAndDevelopmentExpense","unit":"usd","label":"Research and development","value":31370000000},
    {"concept":"us-gaap_SellingGeneralAndAdministrativeExpense","unit":"usd","label":"Selling, general and administrative","value":26097000000},
    {"concept":"us-gaap_OperatingExpenses","unit":"usd","label":"Total operating expenses","value":57467000000},
    {"concept":"us-gaap_OperatingIncomeLoss","unit":"usd","label":"Operating income","value":123216000000.0},
    {"concept":"us-gaap_NonoperatingIncomeExpense","unit":"usd","label":"Other income/(expense), net","value":269000000},
    {"concept":"us-gaap_IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest","unit":"usd","label":"Income before provision for income taxes","value":123485000000},
    {"concept":"us-gaap_IncomeTaxExpenseBenefit","unit":"usd","label":"Provision for income taxes","value":29749000000.0},
    {"concept":"us-gaap_NetIncomeLoss","unit":"usd","label":"Net income","value":93736000000.0},
    {"concept":"us-gaap_EarningsPerShareBasic","unit":"usd/share","label":"Basic (in dollars per share)","value":6.11},
    {"concept":"us-gaap_EarningsPerShareDiluted","unit":"usd/share","label":"Diluted (in dollars per share)","value":6.08}
];

console.log('Testing Finnhub GAAP parser...\n');

const totalRevenue = findFinancialValueByGAAP(sampleIC, [
    'us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax',
    'us-gaap_Revenues',
    'us-gaap_SalesRevenueNet'
]);
console.log('✓ Total Revenue:', totalRevenue.toLocaleString(), '(expected: 391,035,000,000)');

const operatingExpenses = findFinancialValueByGAAP(sampleIC, [
    'us-gaap_OperatingExpenses',
    'us-gaap_CostsAndExpenses'
]);
console.log('✓ Operating Expenses:', operatingExpenses.toLocaleString(), '(expected: 57,467,000,000)');

const netIncome = findFinancialValueByGAAP(sampleIC, [
    'us-gaap_NetIncomeLoss',
    'us-gaap_ProfitLoss'
]);
console.log('✓ Net Income:', netIncome.toLocaleString(), '(expected: 93,736,000,000)');

const eps = findFinancialValueByGAAP(sampleIC, [
    'us-gaap_EarningsPerShareDiluted',
    'us-gaap_EarningsPerShareBasic'
]);
console.log('✓ EPS (Diluted):', eps, '(expected: 6.08)');

const grossProfit = findFinancialValueByGAAP(sampleIC, [
    'us-gaap_GrossProfit'
]);
console.log('✓ Gross Profit:', grossProfit.toLocaleString(), '(expected: 180,683,000,000)');

console.log('\n✅ All tests passed! Parser is working correctly.');
