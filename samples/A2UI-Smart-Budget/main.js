/**
 * main.gs
 * Configuration and Main Entry Point
 */
const apiKey = "{Your API key}"; // Please set your API key.
const model = "gemini-3-flash-preview";

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("A2UI Smart Budget")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function processUserRequest(userQuery) {
  if (!apiKey) throw new Error('Script Property "GEMINI_API_KEY" is not set.');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemPrompt = getSystemPrompt();

  // Define tools for Budget Management
  const tools = {
    function_declarations: [
      {
        name: "get_monthly_data",
        description:
          "Retrieve current month's expense data from the spreadsheet.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "update_budget_sheet",
        description: "Update the spreadsheet with the approved budget plan.",
        parameters: {
          type: "OBJECT",
          properties: {
            changes_summary: {
              type: "STRING",
              description:
                "A summary of changes made (e.g., 'Reduced Dining Out by 5000').",
            },
            new_savings_amount: {
              type: "NUMBER",
              description: "The new calculated savings amount.",
            },
          },
          required: ["changes_summary", "new_savings_amount"],
        },
      },
    ],
  };

  let messages = [{ role: "user", parts: [{ text: userQuery }] }];

  // --- 1st API Call ---
  let payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    tools: [tools],
    generationConfig: { temperature: 0.2 },
  };

  let response = fetchGemini(apiUrl, payload);
  if (!response.candidates || response.candidates.length === 0)
    return { text: "No response.", uiJson: null };

  let resultPart = response.candidates[0].content.parts[0];

  // --- Handle Tool Execution ---
  if (resultPart.functionCall) {
    const fnCall = resultPart.functionCall;
    messages.push(response.candidates[0].content); // Add assistant's tool call to history

    let toolResponseContent;

    if (fnCall.name === "get_monthly_data") {
      const data = executeGetMonthlyData();
      toolResponseContent = { current_expenses: data };
    } else if (fnCall.name === "update_budget_sheet") {
      const status = executeUpdateBudgetSheet(fnCall.args);
      toolResponseContent = { status: status };
    }

    messages.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: fnCall.name,
            response: { name: fnCall.name, content: toolResponseContent },
          },
        },
      ],
    });

    // --- 2nd API Call (Generate UI based on data) ---
    payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      generationConfig: { temperature: 0.2 },
    };
    response = fetchGemini(apiUrl, payload);
    resultPart = response.candidates[0].content.parts[0];
  }

  // --- Parse Output ---
  const rawText = resultPart.text || "";
  const splitMarker = "---a2ui_JSON---";

  if (rawText.includes(splitMarker)) {
    const [textPart, jsonPart] = rawText.split(splitMarker);
    const cleanJsonStr = jsonPart
      .trim()
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
    try {
      return { text: textPart.trim(), uiJson: JSON.parse(cleanJsonStr) };
    } catch (e) {
      return { text: textPart.trim(), uiJson: null, error: "JSON Parse Error" };
    }
  } else {
    return { text: rawText, uiJson: null };
  }
}

function fetchGemini(url, payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  if (json.error) throw new Error(`Gemini API Error: ${json.error.message}`);
  return json;
}
