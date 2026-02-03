/**
 * Code.gs
 * Backend logic for the Task-Driven UI Application.
 * Handles Gemini API communication and Google Drive Tool execution.
 */

// --- CONFIGURATION ---
const GEMINI_API_KEY = "###"; // Replace with your actual key or use ScriptProperties
const MODEL_NAME = "gemini-3-flash-preview"; // Efficient model for logic

/**
 * Serves the HTML file for the Web App.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Drive Task Agent")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- SPREADSHEET INTEGRATION ---
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
// -------------------------------

/**
 * Main entry point for frontend requests.
 */
function processUserRequest(userMessage, history) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
    throw new Error("API Key is not set in Code.gs.");
  }

  // 1. Prepare Tools (Drive Functions)
  const tools = {
    function_declarations: [
      {
        name: "list_files_in_folder",
        description:
          "List files in a specific folder by name. Returns ID and Name.",
        parameters: {
          type: "OBJECT",
          properties: {
            folderName: {
              type: "STRING",
              description: "Name of the folder to search (e.g., 'sample').",
            },
          },
          required: ["folderName"],
        },
      },
      {
        name: "fetch_file_details",
        description:
          "Fetch content for a list of file IDs. Used for viewing content or previewing before edit.",
        parameters: {
          type: "OBJECT",
          properties: {
            fileIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Array of file IDs to fetch.",
            },
          },
          required: ["fileIds"],
        },
      },
      {
        name: "fetch_files_metadata",
        description:
          "Fetch metadata (id, size, mimeType, created) for a list of file IDs.",
        parameters: {
          type: "OBJECT",
          properties: {
            fileIds: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Array of file IDs to fetch.",
            },
          },
          required: ["fileIds"],
        },
      },
      {
        name: "update_file_content",
        description: "Overwrite the content of a file.",
        parameters: {
          type: "OBJECT",
          properties: {
            fileId: { type: "STRING" },
            newContent: { type: "STRING" },
          },
          required: ["fileId", "newContent"],
        },
      },
    ],
  };

  // 2. Prepare System Prompt
  const systemPrompt = `
    You are an intelligent Drive Task Assistant. Your goal is to guide the user through file operations using dynamic UIs.
    
    You communicate in a specific format.
    1. **Thought**: Internal reasoning.
    2. **Response Text**: Conversational reply.
    3. **UI JSON**: Separated by "---UI_JSON---".

    --- UI TYPES ---
    1. "FILE_SELECTOR": List files with checkboxes.
       JSON: { "type": "FILE_SELECTOR", "data": { "files": [{ "id": "...", "name": "..." }] } }
    
    2. "CONTENT_VIEWER": Display file content (readonly) for one or more files.
       JSON: { "type": "CONTENT_VIEWER", "data": { "files": [{ "name": "...", "content": "..." }] } }
    
    3. "METADATA_VIEWER": Display file metadata for one or more files.
       JSON: { "type": "METADATA_VIEWER", "data": { "files": [{ "name": "...", "id": "...", "size": "...", "type": "...", "created": "..." }] } }

    4. "SELECTION_PREVIEW": Show content of selected files and allow selecting ONE via radio button.
       JSON: { "type": "SELECTION_PREVIEW", "data": { "files": [{ "id": "...", "name": "...", "content": "..." }] } }

    5. "EDITOR": A form to edit file content.
       JSON: { "type": "EDITOR", "data": { "fileId": "...", "fileName": "...", "content": "..." } }

    6. "UPDATE_SUCCESS": Display a success message after updating.
       JSON: { "type": "UPDATE_SUCCESS", "data": { "fileName": "...", "timestamp": "..." } }

    --- SCENARIO LOGIC ---
    
    **Pattern 1 (View Content):**
    - User asks to see content -> Call 'list_files_in_folder'.
    - Return UI: FILE_SELECTOR.
    - User selects (one or more) -> Call 'fetch_file_details' with IDs.
    - Return UI: CONTENT_VIEWER (using the list of files).

    **Pattern 2 (View Metadata):**
    - User asks for metadata -> Call 'list_files_in_folder'.
    - Return UI: FILE_SELECTOR.
    - User selects (one or more) -> Call 'fetch_files_metadata' with IDs.
    - Return UI: METADATA_VIEWER (using the list of files).

    **Pattern 3 (Edit Flow):**
    - User asks to edit -> Call 'list_files_in_folder'.
    - Return UI: FILE_SELECTOR.
    - User selects (one or more) -> Call 'fetch_file_details' with IDs.
    - Return UI: SELECTION_PREVIEW with the list of files.
    - User selects ONE file (Radio) -> Return UI: EDITOR for that ID.
    - User clicks Update -> Call 'update_file_content'.
    - Return UI: UPDATE_SUCCESS.

    **Important**: 
    - Always use the output of the tools. Do not hallucinate data.
    - If user sends "SYSTEM_EVENT: User selected files: [...]", proceed to the next step based on the pattern.
  `;

  // 3. Construct Message Payload
  const contents = history.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }],
  }));
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  // 4. Call Gemini
  return executeGeminiLoop(contents, tools, systemPrompt);
}

/**
 * Handles the turn-based loop with Gemini, including RETRY LOGIC for overloaded model.
 */
function executeGeminiLoop(
  messages,
  tools,
  systemInstruction,
  accumulatedRetryMsg = "",
) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: messages,
    tools: [tools],
    generationConfig: { temperature: 0.1 },
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  let response;
  let result;
  let retryCount = 0;
  const maxRetries = 3;
  let currentRetryMsg = "";

  // Retry Loop for Overloaded Model
  while (retryCount <= maxRetries) {
    try {
      response = UrlFetchApp.fetch(apiUrl, options);
      const code = response.getResponseCode();
      const contentText = response.getContentText();

      try {
        result = JSON.parse(contentText);
      } catch (e) {
        throw new Error("Failed to parse JSON response: " + contentText);
      }

      // Check for Overloaded/503/429 Errors
      if (
        code >= 500 ||
        code === 429 ||
        (result.error &&
          result.error.message &&
          result.error.message.includes("overloaded"))
      ) {
        if (retryCount < maxRetries) {
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.warn(
            `Gemini API Overloaded (Code ${code}). Retrying in ${waitTime}ms... (Attempt ${retryCount})`,
          );
          Utilities.sleep(waitTime);
          continue;
        } else {
          throw new Error(
            `Gemini API Error after ${maxRetries} retries: ${result.error ? result.error.message : "Service Unavailable"}`,
          );
        }
      }

      if (result.error) {
        throw new Error(`Gemini API Error: ${result.error.message}`);
      }

      // Success
      break;
    } catch (e) {
      const errorStr = e.toString();
      if (
        retryCount < maxRetries &&
        (errorStr.includes("overloaded") ||
          errorStr.includes("503") ||
          errorStr.includes("429"))
      ) {
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.warn(
          `Fetch Error: ${errorStr}. Retrying in ${waitTime}ms... (Attempt ${retryCount})`,
        );
        Utilities.sleep(waitTime);
        continue;
      }
      throw e;
    }
  }

  if (retryCount > 0) {
    currentRetryMsg = `\n\n(ℹ️ System: Automatically retried ${retryCount} time(s) due to API overload.)`;
  }

  const candidate = result.candidates[0];
  const part = candidate.content.parts[0];

  // Function Call Logic
  if (part.functionCall) {
    const fnName = part.functionCall.name;
    const fnArgs = part.functionCall.args;
    let toolResult = null;

    console.log(`Calling tool: ${fnName}`);

    try {
      if (fnName === "list_files_in_folder")
        toolResult = toolListFiles(fnArgs.folderName);
      else if (fnName === "fetch_file_details")
        toolResult = toolFetchFileDetails(fnArgs.fileIds);
      else if (fnName === "fetch_files_metadata")
        toolResult = toolFetchFilesMetadata(fnArgs.fileIds);
      else if (fnName === "update_file_content")
        toolResult = toolUpdateFile(fnArgs.fileId, fnArgs.newContent);
    } catch (e) {
      toolResult = { error: e.toString() };
    }

    messages.push(candidate.content);
    messages.push({
      role: "function",
      parts: [
        {
          functionResponse: {
            name: fnName,
            response: { name: fnName, content: toolResult },
          },
        },
      ],
    });

    return executeGeminiLoop(
      messages,
      tools,
      systemInstruction,
      accumulatedRetryMsg + currentRetryMsg,
    );
  }

  // Text Response
  const rawText = part.text || "";
  const splitMarker = "---UI_JSON---";

  const finalText = (rawText + accumulatedRetryMsg + currentRetryMsg).trim();

  if (rawText.includes(splitMarker)) {
    const [conversation, jsonStr] = rawText.split(splitMarker);
    const conversationWithNotice = (
      conversation +
      accumulatedRetryMsg +
      currentRetryMsg
    ).trim();
    try {
      const uiJson = JSON.parse(
        jsonStr
          .trim()
          .replace(/^```json/, "")
          .replace(/```$/, ""),
      );
      return { text: conversationWithNotice, uiJson: uiJson };
    } catch (e) {
      return { text: finalText, uiJson: null, error: "JSON Parse Error" };
    }
  }

  return { text: finalText, uiJson: null };
}

// --- TOOLS ---

function toolListFiles(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (!folders.hasNext()) {
    DriveApp.createFolder(folderName);
    return { error: `Folder '${folderName}' not found. I created it.` };
  }
  const folder = folders.next();
  const files = folder.getFiles();
  const result = [];
  while (files.hasNext()) {
    const f = files.next();
    result.push({ id: f.getId(), name: f.getName() });
  }
  // Sort by Name Alphabetically
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

function toolFetchFileDetails(fileIds) {
  if (!Array.isArray(fileIds)) fileIds = [fileIds];
  const results = [];
  for (const id of fileIds) {
    try {
      const file = DriveApp.getFileById(id);
      const type = file.getMimeType();
      let content = "[Binary Content]";
      if (
        type.includes("text") ||
        type.includes("json") ||
        type.includes("javascript") ||
        type.includes("html")
      ) {
        content = file.getBlob().getDataAsString();
      }
      results.push({
        id: id,
        name: file.getName(),
        content: content,
      });
    } catch (e) {
      results.push({ id: id, error: "File not found" });
    }
  }
  return results;
}

function toolFetchFilesMetadata(fileIds) {
  if (!Array.isArray(fileIds)) fileIds = [fileIds];
  const results = [];
  for (const id of fileIds) {
    try {
      const file = DriveApp.getFileById(id);
      results.push({
        name: file.getName(),
        id: file.getId(),
        size: file.getSize() + " bytes",
        created: file.getDateCreated().toString(),
        type: file.getMimeType(),
      });
    } catch (e) {
      results.push({ id: id, error: "File not found" });
    }
  }
  return results;
}

function toolUpdateFile(id, content) {
  try {
    const file = DriveApp.getFileById(id);
    file.setContent(content);
    return {
      status: "success",
      name: file.getName(),
      updated: new Date().toString(),
    };
  } catch (e) {
    return { error: e.toString() };
  }
}
