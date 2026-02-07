const apiKey = "###"; // Replace with your actual API Key
const model = "gemini-3-flash-preview";

/**
 * Serves the HTML file for the Web App.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Drive Task Agent")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * SPREADSHEET INTEGRATION
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("A2UI App")
    .addItem("Launch App Hub", "openDialog")
    .addToUi();
}

function openDialog() {
  const html = HtmlService.createHtmlOutputFromFile("index")
    .setTitle("A2UI App Hub")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setWidth(1000)
    .setHeight(800)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  SpreadsheetApp.getUi().showModalDialog(html, "A2UI App Hub");
}
// -------------------------------

/**
 * Main Entry Point: Processes user query via Gemini routing
 */
function processUserRequest(userQuery, historyJson = "[]") {
  if (!apiKey || apiKey === "###") {
    throw new Error('Script Property "GEMINI_API_KEY" is not set.');
  }

  // Parse History
  let clientHistory = [];
  try {
    clientHistory = JSON.parse(historyJson);
  } catch (e) {
    console.error("Invalid history JSON", e);
  }

  // ------------------------------------------------------------------------
  // 1. DIRECT HANDLERS (Bypass Router for specific UI Interactions)
  // ------------------------------------------------------------------------

  // Quiz Finished
  if (userQuery.startsWith("SYSTEM_QUIZ_COMPLETED:")) {
    return handleQuizCompletion(userQuery);
  }

  // Restaurant: User clicked "Book Now" -> Generate Booking Form
  if (userQuery.startsWith("DETAILS_JSON:")) {
    return runRestaurantApp(userQuery, clientHistory);
  }

  // Restaurant: User clicked "Submit Reservation" -> Execute Tool & Show Confirmation
  if (userQuery.startsWith("BOOKING_SUBMIT_JSON:")) {
    const data = JSON.parse(userQuery.replace("BOOKING_SUBMIT_JSON:", ""));
    // Construct a natural language request so the Restaurant App logic triggers the 'submit_booking' tool
    const naturalQuery = `Submit a booking for ${data.restaurantName} for ${data.partySize} people at ${data.reservationTime}. Dietary: ${data.dietary}. ImageUrl: ${data.imageUrl}`;
    return runRestaurantApp(naturalQuery, clientHistory);
  }

  // ------------------------------------------------------------------------
  // 2. ROUTING LOGIC (For general natural language queries)
  // ------------------------------------------------------------------------
  const routerSystemPrompt = `
    You are a helpful AI assistant and application router.
    Your goal is to analyze the user's request and determine which specific tool/application to launch.
    - If the user wants to find restaurants, check food details, or make a reservation, call \`restaurantFinder\`.
    - If the user wants to find schedule events, check calendar availability, or add events, call \`eventFinder\`.
    - If the user wants to learn something, take a quiz, study a topic, or review past learning performance, call \`quizGenerator\`.
    - If the user's request is general chat, simply reply with a helpful text message.
  `;

  const routerTools = {
    function_declarations: [
      {
        name: "restaurantFinder",
        description: "App for restaurant search and reservations.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "eventFinder",
        description: "App for company events and calendar management.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "quizGenerator",
        description:
          "App for generating educational quizzes and tracking learning progress.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
    ],
  };

  // Use history for routing context
  const response = callGemini(
    routerSystemPrompt,
    userQuery,
    routerTools,
    clientHistory,
  );

  if (!response.candidates || response.candidates.length === 0) {
    return { text: "No response from AI.", uiJson: null };
  }

  const resultPart = response.candidates[0].content.parts[0];

  // Check Routing Result
  if (resultPart.functionCall) {
    const fnName = resultPart.functionCall.name;
    if (fnName === "restaurantFinder") {
      return runRestaurantApp(userQuery, clientHistory);
    } else if (fnName === "eventFinder") {
      return runEventApp(userQuery, clientHistory);
    } else if (fnName === "quizGenerator") {
      return runQuizApp(userQuery, clientHistory);
    }
  }

  return {
    text: resultPart.text || "How can I help you today?",
    uiJson: null,
  };
}

// -----------------------------------------------------------
// APP: QUIZ GENERATOR
// -----------------------------------------------------------
function runQuizApp(userQuery, clientHistory) {
  const systemPrompt = getQuizSystemPrompt();

  // Retrieve past learning history to enable adaptive learning
  const history = executeGetPastResults(30);

  // augment the query with history
  const contextQuery = `
    ${userQuery}
    
    [PAST LEARNING HISTORY (JSON)]:
    ${history}
  `;

  const response = callGemini(systemPrompt, contextQuery, null, clientHistory);
  const text = response.candidates[0].content.parts[0].text;

  const quizInitMatch = text.match(
    /```json\s*(\{[\s\S]*?"type":\s*"QUIZ_INIT"[\s\S]*?\})\s*```/,
  );
  const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);

  let payload = { text: text, quizData: null };

  if (quizInitMatch) {
    try {
      payload.quizData = JSON.parse(quizInitMatch[1]);
      payload.text = text.replace(quizInitMatch[0], "").trim();
    } catch (e) {
      console.error("Quiz JSON Parse Error", e);
    }
  } else if (jsonMatch) {
    try {
      const j = JSON.parse(jsonMatch[1]);
      if (j.type === "QUIZ_INIT") {
        payload.quizData = j;
        payload.text = text.replace(jsonMatch[0], "").trim();
      }
    } catch (e) {}
  }

  return payload;
}

function handleQuizCompletion(systemMessage) {
  // 1. Parse Data
  const jsonStr = systemMessage.replace("SYSTEM_QUIZ_COMPLETED:", "");
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { text: "Error processing quiz results." };
  }

  // 2. Save Results (Batch)
  executeSaveQuizResults(data.results);

  // 3. Get History for Context and Overall Stats Calculation
  const pastResultsStr = executeGetPastResults(50); // Get more history for better stats
  let pastHistory = [];
  try {
    pastHistory = JSON.parse(pastResultsStr);
  } catch (e) {}

  // Calculate "Current Session" Stats
  const currentCorrect = data.results.filter((r) => r.isCorrect).length;
  const currentTotal = data.results.length;
  const currentIncorrect = currentTotal - currentCorrect;

  // Calculate "Overall History" Stats
  let totalCorrect = 0;
  let totalQuestions = 0;

  if (pastHistory.length > 0) {
    pastHistory.forEach((h) => {
      if (h.isCorrect) totalCorrect++;
      totalQuestions++;
    });
  } else {
    totalCorrect = currentCorrect;
    totalQuestions = currentTotal;
  }

  if (totalQuestions < currentTotal) {
    totalCorrect += currentCorrect;
    totalQuestions += currentTotal;
  }

  const totalIncorrect = totalQuestions - totalCorrect;

  // 4. Generate Two Charts (High Resolution & Larger Font)

  // Chart 1: Current Session
  const currentChartConfig = {
    type: "doughnut",
    data: {
      labels: ["Correct", "Incorrect"],
      datasets: [
        {
          data: [currentCorrect, currentIncorrect],
          backgroundColor: ["#28a745", "#dc3545"],
        },
      ],
    },
    options: {
      cutoutPercentage: 50, // Make the ring thicker
      plugins: {
        doughnutlabel: {
          labels: [
            {
              text: `Current\n${currentCorrect}/${currentTotal}`,
              font: { size: 28, weight: "bold" },
            },
          ], // Larger font
        },
        legend: { display: true, position: "bottom", labels: { fontSize: 16 } },
      },
    },
  };
  // Explicitly set width/height to get higher res image
  const currentChartUrl = `https://quickchart.io/chart?w=500&h=300&c=${encodeURIComponent(JSON.stringify(currentChartConfig))}`;

  // Chart 2: Overall Performance
  const historyChartConfig = {
    type: "doughnut",
    data: {
      labels: ["Total Correct", "Total Incorrect"],
      datasets: [
        {
          data: [totalCorrect, totalIncorrect],
          backgroundColor: ["#17a2b8", "#6c757d"],
        },
      ],
    },
    options: {
      cutoutPercentage: 50, // Make the ring thicker
      plugins: {
        doughnutlabel: {
          labels: [
            {
              text: `All Time\n${totalCorrect}/${totalQuestions}`,
              font: { size: 28, weight: "bold" },
            },
          ], // Larger font
        },
        legend: { display: true, position: "bottom", labels: { fontSize: 16 } },
      },
    },
  };
  const historyChartUrl = `https://quickchart.io/chart?w=500&h=300&c=${encodeURIComponent(JSON.stringify(historyChartConfig))}`;

  // 5. Ask Gemini for Analysis
  const analysisPrompt = `
    The user has just completed a quiz.
    
    Current Session Results:
    ${JSON.stringify(data.results)}
    
    Past History Summary:
    Total Questions Answered: ${totalQuestions}
    Total Correct: ${totalCorrect}
    
    TASK:
    Generate a 'SUMMARY_CARD' JSON response with RICH HTML CONTENT.
    
    1. **Charts**: I have generated two charts. 
       - Current Session URL: ${currentChartUrl}
       - All Time History URL: ${historyChartUrl}
       Please embed these images side-by-side (or responsive wrapping) in the HTML using <div class='charts-wrapper'><div class='chart-item'><span class='chart-label'>Current Session</span><img src='...'/></div>...</div> structure.
       
    2. **Analysis**: Analyze the user's performance. Compare current session vs all-time performance. Identify weak topics if possible from the JSON.
       Use HTML tags directly (\`<ul>\`, \`<li>\`, \`<b>\`, \`<table>\`).
    
    OUTPUT FORMAT:
    \`\`\`json
    {
      "type": "SUMMARY_CARD",
      "data": {
        "score": ${currentCorrect},
        "total": ${currentTotal},
        "htmlContent": "<div class='charts-wrapper'>...</div><h3>Performance Analysis</h3>..."
      }
    }
    \`\`\`
  `;

  const response = callGemini(
    analysisPrompt,
    "Analyze my quiz performance.",
    null,
    [],
  );
  const text = response.candidates[0].content.parts[0].text;

  const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      return { quizSummary: JSON.parse(jsonMatch[1]) };
    } catch (e) {
      return { text: "Analysis generated but JSON was invalid.\n" + text };
    }
  }
  return { text: text };
}

// -----------------------------------------------------------
// APP: RESTAURANT
// -----------------------------------------------------------
function runRestaurantApp(userQuery, clientHistory) {
  const systemPrompt = getRestaurantSystemPrompt();
  const tools = {
    function_declarations: [
      {
        name: "get_restaurants",
        description: "Get a list of restaurants.",
        parameters: {
          type: "OBJECT",
          properties: {
            location: { type: "STRING" },
            cuisine: { type: "STRING" },
            count: { type: "INTEGER" },
          },
          required: ["location", "cuisine"],
        },
      },
      {
        name: "submit_booking",
        description: "Submit a restaurant reservation.",
        parameters: {
          type: "OBJECT",
          properties: {
            restaurantName: { type: "STRING" },
            partySize: { type: "STRING" },
            reservationTime: { type: "STRING" },
            dietary: { type: "STRING" },
            imageUrl: { type: "STRING" },
          },
          required: ["restaurantName", "partySize", "reservationTime"],
        },
      },
    ],
  };
  return runGeminiLoop(
    userQuery,
    systemPrompt,
    tools,
    processRestaurantTools,
    clientHistory,
  );
}

function processRestaurantTools(fnName, args) {
  if (fnName === "get_restaurants") {
    return executeGetRestaurants(args.cuisine, args.location, args.count || 5);
  } else if (fnName === "submit_booking") {
    return { status: executeSubmitBooking(args) };
  }
}

// -----------------------------------------------------------
// APP: EVENTS
// -----------------------------------------------------------
function runEventApp(userQuery, clientHistory) {
  const systemPrompt = getEventSystemPrompt();
  const tools = {
    function_declarations: [
      {
        name: "get_events",
        description: "Search for events.",
        parameters: {
          type: "OBJECT",
          properties: {
            startDate: { type: "STRING" },
            endDate: { type: "STRING" },
            keyword: { type: "STRING" },
          },
          required: ["startDate"],
        },
      },
      {
        name: "add_events_to_calendar",
        description: "Add events to Google Calendar.",
        parameters: {
          type: "OBJECT",
          properties: {
            eventsJson: { type: "STRING" },
          },
          required: ["eventsJson"],
        },
      },
    ],
  };
  return runGeminiLoop(
    userQuery,
    systemPrompt,
    tools,
    processEventTools,
    clientHistory,
  );
}

function processEventTools(fnName, args) {
  if (fnName === "get_events") {
    return executeGetEvents(args.startDate, args.endDate, args.keyword);
  } else if (fnName === "add_events_to_calendar") {
    let events = args.eventsJson;
    if (typeof events === "string") {
      try {
        events = JSON.parse(events);
      } catch (e) {
        events = [];
      }
    }
    const status = executeAddCalendar(events);
    return { status: status, addedCount: events.length };
  }
}

// -----------------------------------------------------------
// CORE GEMINI HELPERS
// -----------------------------------------------------------

function callGemini(systemPrompt, userMsg, tools, history = []) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Format history for Gemini
  const contents = history.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.text }],
  }));

  // Add current message
  contents.push({ role: "user", parts: [{ text: userMsg }] });

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    generationConfig: { temperature: 0.1 },
  };
  if (tools) payload.tools = [tools];

  return fetchWithRetry(apiUrl, payload);
}

function runGeminiLoop(
  userQuery,
  systemPrompt,
  tools,
  toolProcessor,
  history = [],
) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Construct initial contents with history
  let contents = history.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.text }],
  }));
  contents.push({ role: "user", parts: [{ text: userQuery }] });

  let payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    tools: [tools],
    generationConfig: { temperature: 0.1 },
  };

  let response = fetchWithRetry(apiUrl, payload);
  if (!response.candidates) return { text: "API Error" };

  let resultPart = response.candidates[0].content.parts[0];

  // Tool Use Loop
  if (resultPart.functionCall) {
    const fnCall = resultPart.functionCall;

    // Append model's tool call to conversation
    contents.push(response.candidates[0].content);

    // Execute Tool
    const toolResult = toolProcessor(fnCall.name, fnCall.args);

    // Append tool response to conversation
    contents.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: fnCall.name,
            response: { name: fnCall.name, content: toolResult },
          },
        },
      ],
    });

    payload.contents = contents;
    delete payload.tools; // Remove tools for final text/UI generation

    response = fetchWithRetry(apiUrl, payload);
    resultPart = response.candidates[0].content.parts[0];
  }

  // A2UI JSON Extraction
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
      return { text: textPart.trim(), error: "JSON Parse Error" };
    }
  }

  return { text: rawText };
}

function fetchWithRetry(url, payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const json = JSON.parse(response.getContentText());

      if (response.getResponseCode() !== 200 || json.error) {
        console.warn(
          `Attempt ${i + 1} failed: ${json.error?.message || "Http Error"}`,
        );
        if (i === maxRetries - 1)
          throw new Error(json.error?.message || "API Failed");
        Utilities.sleep(Math.pow(2, i) * 1000);
        continue;
      }
      return json;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      Utilities.sleep(1000);
    }
  }
}
