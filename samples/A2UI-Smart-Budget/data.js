/**
 * data.gs
 * Google Sheets Interaction Logic
 */

/**
 * Reads expense data from the sheet.
 */
function executeGetMonthlyData() {
  console.log("Fetching monthly data...");

  // -- MOCK DATA MODE (Use this if you don't have the Sheet set up yet) --
  // return [
  //   { category: "Rent", amount: 120000 },
  //   { category: "Food", amount: 45000 },
  //   { category: "Transport", amount: 12000 },
  //   { category: "Dining Out", amount: 20000 },
  //   { category: "Savings", amount: 30000 }
  // ];

  // -- REAL SHEET MODE --
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Remove header

    // Simple aggregation by Category
    const summary = {};
    data.forEach((row) => {
      // Assuming Column B (index 1) is Category, Column C (index 2) is Amount
      const cat = row[1];
      const amt = Number(row[2]);
      if (cat && !isNaN(amt)) {
        summary[cat] = (summary[cat] || 0) + amt;
      }
    });

    // Convert to list for LLM
    return Object.keys(summary).map((k) => ({
      category: k,
      amount: summary[k],
    }));
  } catch (e) {
    console.error(e);
    return [{ category: "Error", amount: 0, note: "Could not read sheet" }];
  }
}

/**
 * Updates the sheet (e.g., adds a new row or updates a savings cell).
 * For this demo, we will append a log row indicating the budget change.
 */
function executeUpdateBudgetSheet(args) {
  console.log("Updating sheet with:", JSON.stringify(args));

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");

    // Append a new row recording the simulation adjustment
    const dateStr = new Date().toISOString().split("T")[0];
    sheet.appendRow([
      dateStr,
      "Budget Adjustment",
      args.new_savings_amount,
      `Plan update: ${args.changes_summary}`,
    ]);

    return "Success: Budget updated in Sheet.";
  } catch (e) {
    console.error(e);
    return "Error: Failed to update sheet.";
  }
}
