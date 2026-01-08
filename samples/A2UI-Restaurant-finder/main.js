/**
 * main.gs
 * Your values
 */
const apiKey = "{Your API key}"; // Please set your API key.
const model = "gemini-3-flash-preview";

/**
 * main.gs
 * Main entry point for the web application.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("A2UI Restaurant Finder")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Main function to process user requests from the client-side UI.
 */
function processUserRequest(userQuery) {
  if (!apiKey) {
    throw new Error('Script Property "GEMINI_API_KEY" is not set.');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemPrompt = getSystemPrompt();

  const tools = {
    function_declarations: [
      {
        name: "get_restaurants",
        description: "Get a list of restaurants based on cuisine and location.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: {
              type: "STRING",
              description: "The location (e.g., New York).",
            },
            cuisine: { type: "STRING", description: "The type of cuisine." },
            count: {
              type: "INTEGER",
              description: "Number of restaurants to return.",
            },
          },
          required: ["location", "cuisine"],
        },
      },
      {
        name: "submit_booking",
        description: "Submit a restaurant reservation booking with details.",
        parameters: {
          type: "OBJECT",
          properties: {
            restaurantName: {
              type: "STRING",
              description: "Name of the restaurant.",
            },
            partySize: { type: "STRING", description: "Number of people." },
            reservationTime: {
              type: "STRING",
              description: "Date and time of reservation.",
            },
            dietary: {
              type: "STRING",
              description: "Dietary requirements if any.",
            },
            imageUrl: {
              type: "STRING",
              description: "Image URL of the restaurant.",
            },
          },
          required: ["restaurantName", "partySize", "reservationTime"],
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
    generationConfig: { temperature: 0.1 },
  };

  let response = fetchGemini(apiUrl, payload);

  if (!response.candidates || response.candidates.length === 0) {
    return { text: "No response from AI.", uiJson: null };
  }

  let resultPart = response.candidates[0].content.parts[0];

  // Handle Tool Calling (Function Call)
  if (resultPart.functionCall) {
    const fnCall = resultPart.functionCall;
    messages.push(response.candidates[0].content); // Add tool call request to history

    if (fnCall.name === "get_restaurants") {
      const args = fnCall.args;
      const toolResultJson = executeGetRestaurants(
        args.cuisine,
        args.location,
        args.count || 5
      );

      messages.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: "get_restaurants",
              response: { name: "get_restaurants", content: toolResultJson },
            },
          },
        ],
      });
    } else if (fnCall.name === "submit_booking") {
      const args = fnCall.args;

      const bookingResultText = executeSubmitBooking(args);

      messages.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: "submit_booking",
              response: {
                name: "submit_booking",
                content: { status: bookingResultText },
              },
            },
          },
        ],
      });
    }

    // --- 2nd API Call: Generate final response based on tool results ---
    payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      generationConfig: { temperature: 0.1 },
    };

    response = fetchGemini(apiUrl, payload);
    resultPart = response.candidates[0].content.parts[0];
  }

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
      const parsedJson = JSON.parse(cleanJsonStr);
      return {
        text: textPart.trim(),
        uiJson: parsedJson,
      };
    } catch (e) {
      console.error("JSON Parse Error", e);
      return {
        text: textPart.trim(),
        uiJson: null,
        error: "Failed to parse UI JSON.",
      };
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
  if (json.error) {
    throw new Error(`Gemini API Error: ${json.error.message}`);
  }
  return json;
}
