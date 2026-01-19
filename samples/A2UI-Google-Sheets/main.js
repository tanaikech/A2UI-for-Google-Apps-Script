/**
 * main.gs
 * Your values
 */
const apiKey = "###"; // Please set your API key.
const model = "gemini-3-flash-preview";

/**
 * If you want to use this sample script as Web Apps, please use this function.
 */
// function doGet() {
//   return HtmlService.createHtmlOutputFromFile("index")
//     .setTitle("A2UI App Hub")
//     .addMetaTag("viewport", "width=device-width, initial-scale=1");
// }

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("sample")
    .addItem("run", "openDialog")
    .addToUi();
}

function openDialog() {
  const html = HtmlService.createHtmlOutputFromFile("index")
    .setTitle("A2UI App Hub")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setWidth(1000)
    .setHeight(600)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  SpreadsheetApp.getUi().showModalDialog(html, "sample");
}

/**
 * Main function to process user requests.
 * Acts as a generic router to select the appropriate sub-application.
 */
function processUserRequest(userQuery) {
  if (!apiKey) {
    throw new Error('Script Property "GEMINI_API_KEY" is not set.');
  }

  // 1. Define the Router System Prompt
  const routerSystemPrompt = `
    You are a helpful AI assistant and application router.
    Your goal is to analyze the user's request and determine which specific tool/application to launch.
    
    - If the user wants to find restaurants, check food details, or make a reservation, call the function \`restaurantFinder\`.
    - If the user wants to find schedule events, check calendar availability, or add events to the calendar, call the function \`eventFinder\`.
    - If the user's request is general chat or does not match a specific tool, simply reply with a helpful text message.
  `;

  // 2. Define High-Level Application Tools (The "Menu")
  const routerTools = {
    function_declarations: [
      {
        name: "restaurantFinder",
        description:
          "An application to search for restaurants based on cuisine/location and make reservations.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "eventFinder",
        description:
          "An application to search for company events from the database and add them to Google Calendar.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
    ],
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: { parts: [{ text: routerSystemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userQuery }] }],
    tools: [routerTools],
    generationConfig: { temperature: 0.1 },
  };

  // 3. Call Gemini to decide which path to take
  const response = fetchGemini(apiUrl, payload);

  if (!response.candidates || response.candidates.length === 0) {
    return { text: "No response from AI.", uiJson: null };
  }

  const resultPart = response.candidates[0].content.parts[0];

  // 4. Check for Function Call (Routing)
  if (resultPart.functionCall) {
    const fnName = resultPart.functionCall.name;

    if (fnName === "restaurantFinder") {
      return runRestaurantApp(userQuery);
    } else if (fnName === "eventFinder") {
      return runEventApp(userQuery);
    }
  }

  // 5. Default: Return generic text if no tool was selected
  return {
    text:
      resultPart.text ||
      "I can help you find restaurants or check company events. What would you like to do?",
    uiJson: null,
  };
}

/**
 * Logic for the Restaurant Finder application.
 */
function runRestaurantApp(userQuery) {
  const systemPrompt = getRestaurantSystemPrompt();
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
  return runGeminiAppLoop(userQuery, systemPrompt, tools);
}

/**
 * Logic for the Event Finder application.
 */
function runEventApp(userQuery) {
  const systemPrompt = getEventSystemPrompt();
  const tools = {
    function_declarations: [
      {
        name: "get_events",
        description:
          "Search for events in the database based on date or keywords.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: {
              type: "STRING",
              description: "Start date in YYYY-MM-DD format.",
            },
            endDate: {
              type: "STRING",
              description: "End date in YYYY-MM-DD format.",
            },
            keyword: {
              type: "STRING",
              description: "Keyword to filter event titles.",
            },
          },
          required: ["startDate"],
        },
      },
      {
        name: "add_events_to_calendar",
        description: "Add a list of specific events to the Google Calendar.",
        parameters: {
          type: "OBJECT",
          properties: {
            eventsJson: {
              type: "STRING",
              description: "A JSON string array of event objects to add.",
            },
          },
          required: ["eventsJson"],
        },
      },
    ],
  };
  return runGeminiAppLoop(userQuery, systemPrompt, tools);
}

/**
 * Generic loop for Gemini Tool calling.
 */
function runGeminiAppLoop(userQuery, systemPrompt, tools) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let messages = [{ role: "user", parts: [{ text: userQuery }] }];

  // 1st Call
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

  // Tool Execution Loop
  if (resultPart.functionCall) {
    const fnCall = resultPart.functionCall;
    messages.push(response.candidates[0].content);

    let toolResultContent;
    const args = fnCall.args;

    // --- Dispatcher ---
    if (fnCall.name === "get_restaurants") {
      toolResultContent = executeGetRestaurants(
        args.cuisine,
        args.location,
        args.count || 5
      );
    } else if (fnCall.name === "submit_booking") {
      const status = executeSubmitBooking(args);
      toolResultContent = { status: status };
    } else if (fnCall.name === "get_events") {
      toolResultContent = executeGetEvents(
        args.startDate,
        args.endDate,
        args.keyword
      );
    } else if (fnCall.name === "add_events_to_calendar") {
      // The args might come as a JSON string or object depending on Gemini's mood, handle safely
      let events = args.eventsJson;
      if (typeof events === "string") {
        try {
          events = JSON.parse(events);
        } catch (e) {
          events = [];
        }
      }
      const status = executeAddCalendar(events);
      toolResultContent = { status: status, addedCount: events.length };
    }
    // ------------------

    messages.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: fnCall.name,
            response: { name: fnCall.name, content: toolResultContent },
          },
        },
      ],
    });

    // 2nd Call with Tool Results
    payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      tools: [tools],
      generationConfig: { temperature: 0.1 },
    };

    response = fetchGemini(apiUrl, payload);
    resultPart = response.candidates[0].content.parts[0];
  }

  // Final Output Processing
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
      return { text: textPart.trim(), uiJson: parsedJson };
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
