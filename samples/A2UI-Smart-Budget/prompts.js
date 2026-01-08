/**
 * prompts.gs
 * System prompts and A2UI templates for Budget App.
 */

function getSystemPrompt() {
  const schema = getA2UiSchema();
  const examples = getUiExamples();

  return `
    You are a smart financial assistant. Your goal is to visualize household expenses and help the user simulate budget changes.
    
    Your final output MUST be:
    1. Conversational text.
    2. The delimiter \`---a2ui_JSON---\`.
    3. A raw JSON object validating against the A2UI SCHEMA.

    --- RULES ---
    1. **Initial Request**: When asked to check budget/expenses, call \`get_monthly_data\`. Use the \`DASHBOARD_EXAMPLE\` template.
       - Aggregate the raw transaction data into categories (e.g., sum of "Dining Out").
       - Populate \`pieChartData\` with these aggregates.
    
    2. **Simulation**: When the user asks to change the budget (e.g., "Cut dining by 5000 and save it"), DO NOT call a tool yet.
       - Perform the calculation mentally.
       - Update the \`DASHBOARD_EXAMPLE\` with the NEW numbers.
       - Change the "Update Sheet" button to be ENABLED/VISIBLE.
       - Explain the simulation in the text part.
    
    3. **Execution**: When the user clicks "Update Sheet" (triggering \`update_budget_sheet\`), and the tool returns success, use the \`SUCCESS_MSG_EXAMPLE\`.

    ${examples}

    ---BEGIN A2UI JSON SCHEMA---
    ${schema}
    ---END A2UI JSON SCHEMA---
  `;
}

function getA2UiSchema() {
  return `
{
  "type": "object",
  "properties": {
    "beginRendering": { "type": "object", "required": ["root", "surfaceId"] },
    "surfaceUpdate": { "type": "object", "required": ["surfaceId", "components"] },
    "dataModelUpdate": { "type": "object", "required": ["contents", "surfaceId"] }
  }
}
  `;
}

function getUiExamples() {
  return `
---BEGIN DASHBOARD_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "budget-dash", "root": "main-col", "styles": {{ "primaryColor": "#28a745" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "budget-dash",
    "components": [
      {{ "id": "main-col", "component": {{ "Column": {{ "children": {{ "explicitList": ["header-title", "chart-card", "breakdown-title", "expense-list", "action-row"] }} }} }} }},
      {{ "id": "header-title", "component": {{ "Text": {{ "usageHint": "h1", "text": {{ "literalString": "💰 Monthly Budget" }} }} }} }},
      
      {{ "id": "chart-card", "component": {{ "Card": {{ "child": "chart-view" }} }} }},
      {{ "id": "chart-view", "component": {{ "Chart": {{ "type": "pie", "labels": {{ "path": "categories" }}, "data": {{ "path": "amounts" }}, "title": "Expense Breakdown" }} }} }},

      {{ "id": "breakdown-title", "component": {{ "Text": {{ "usageHint": "h2", "text": {{ "literalString": "Details" }} }} }} }},
      {{ "id": "expense-list", "component": {{ "List": {{ "direction": "vertical", "children": {{ "template": {{ "componentId": "expense-item", "dataBinding": "/expenses" }} }} }} }} }},
      
      {{ "id": "expense-item", "component": {{ "Row": {{ "children": {{ "explicitList": ["cat-name", "cat-amt"] }} }} }} }},
      {{ "id": "cat-name", "weight": 1, "component": {{ "Text": {{ "text": {{ "path": "category" }} }} }} }},
      {{ "id": "cat-amt", "component": {{ "Text": {{ "text": {{ "path": "formattedAmount" }} }} }} }},

      {{ "id": "action-row", "component": {{ "Column": {{ "children": {{ "explicitList": ["sim-text", "update-btn"] }} }} }} }},
      {{ "id": "sim-text", "component": {{ "Text": {{ "usageHint": "caption", "text": {{ "literalString": "Ask AI to simulate changes above." }} }} }} }},
      {{ "id": "update-btn", "component": {{ "Button": {{ "primary": true, "child": "btn-txt", "action": {{ "name": "update_budget_sheet", "context": [ {{ "key": "changes_summary", "value": {{ "literalString": "User confirmed budget simulation" }} }}, {{ "key": "new_savings_amount", "value": {{ "path": "projectedSavings" }} }} ] }} }} }} }},
      {{ "id": "btn-txt", "component": {{ "Text": {{ "text": {{ "literalString": "Update Sheet with this Plan" }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "budget-dash",
    "path": "/",
    "contents": [
      {{ "key": "categories", "valueString": ["Rent", "Food", "Savings"] }},
      {{ "key": "amounts", "valueString": [1000, 500, 200] }}, // Note: Arrays passed as strings or managed via index map in complex scenarios, but simplified here for Chart component logic
      {{ "key": "projectedSavings", "valueNumber": 200 }},
      {{ "key": "expenses", "valueMap": [
         {{ "key": "0", "valueMap": [ {{ "key": "category", "valueString": "Rent" }}, {{ "key": "formattedAmount", "valueString": "$1000" }} ] }},
         {{ "key": "1", "valueMap": [ {{ "key": "category", "valueString": "Food" }}, {{ "key": "formattedAmount", "valueString": "$500" }} ] }}
      ] }}
    ]
  }} }}
]
---END DASHBOARD_EXAMPLE---

---BEGIN SUCCESS_MSG_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "success-view", "root": "s-card" }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "success-view",
    "components": [
      {{ "id": "s-card", "component": {{ "Card": {{ "child": "s-col" }} }} }},
      {{ "id": "s-col", "component": {{ "Column": {{ "children": {{ "explicitList": ["icon", "msg"] }} }} }} }},
      {{ "id": "icon", "component": {{ "Text": {{ "usageHint": "h1", "text": {{ "literalString": "✅ Success" }} }} }} }},
      {{ "id": "msg", "component": {{ "Text": {{ "text": {{ "path": "message" }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "success-view",
    "path": "/",
    "contents": [ {{ "key": "message", "valueString": "Budget Sheet has been updated successfully." }} ]
  }} }}
]
---END SUCCESS_MSG_EXAMPLE---
`;
}
