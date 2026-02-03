# A2UI-for-Google-Apps-Script

<a name="top"></a>
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENCE)

<a name="overview"></a>

# Overview

**Bringing A2UI to Google Workspace with Gemini**

This repository demonstrates how to implement Google's [A2UI (Agent-to-User Interface)](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) protocol entirely within the Google Apps Script (GAS) ecosystem.

By porting the official concepts to GAS, this project enables developers to create dynamic, AI-generated interactive interfaces—such as booking forms, live editors, and metadata viewers—that run natively in **Google Sheets Dialogs** and **Web Apps** without complex external server infrastructure.

# Description

A2UI is a "secure-by-design" protocol that allows AI agents to generate rich user interfaces using a strict schema rather than arbitrary code. This project leverages the Gemini API to orchestrate these interfaces within Google Workspace, focusing on **Task-Driven UIs** where the interface adapts to the user's progress.

**Key Features:**

- **Serverless Architecture**: Runs entirely on Google Apps Script (GAS).
- **Workspace Integration**: Interacts directly with Google Sheets, Calendar, and Drive.
- **Recursive UI Loop (Sample 4)**: A stateful workflow where Gemini evaluates previous interactions to generate the next appropriate UI (e.g., Select File -> OK -> Open Editor).
- **Gemini Routing**: Uses LLM-based routing to select appropriate tools and generate A2UI JSON payloads.

# Workflow

The implementation follows a stateful, agent-driven lifecycle. The backend uses the conversation history to decide which functional UI to build next.

1. **User Input**: The user interacts with an HTML interface.
2. **Request**: `google.script.run` securely bridges the client and the GAS backend.
3. **Reasoning**: Gemini acts as a router to decide which tool to execute and generates an initial UI (e.g., a File Selector).
4. **Recursive Interaction**: When the user performs an action (like clicking "OK"), the client sends a **System Event** back to GAS.
5. **Stateful Generation**: Gemini evaluates the **original prompt** + **new selection** from the history to generate the final functional interface (e.g., a dynamic Text Editor).

```mermaid
graph TD
    User((User)) <--> Client[HTML Interface / Sheet Dialog]
    Client <-- google.script.run --> Agent[GAS Server / Gemini API]
    Agent -- 1. Route Intent --> Router{Gemini Router}
    Router -- 2. Execute Tool --> Tools[Apps Script Functions]
    Tools <--> Data[(Sheets / Calendar / Drive)]
    Tools -- 3. Result --> Agent
    Agent -- 4. Generate A2UI JSON --> Client
    Client -- 5. Interaction Event + Selection --> Agent
    Agent -- 6. Re-generate UI based on History --> Client
```

# Usage

### 1. Get Gemini API Key

Obtain a valid API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key).

### 2. Copy a Sample Project

Select a sample below and copy the Google Spreadsheet to your Drive.

| Sample                   | Type       | Description                                               | Link                                                                                             |
| :----------------------- | :--------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **1. Restaurant Finder** | Web App    | Official A2UI port. Search & Book restaurants.            | [Copy](https://docs.google.com/spreadsheets/d/1csYUJO8LzcEFPkt_ickIkdsGZsvim6lb1OEQZHUkB3c/copy) |
| **2. Budget Simulator**  | Web App    | Charts & Sheet updates.                                   | [Copy](https://docs.google.com/spreadsheets/d/1HEfmSD9WMqQfy39aEZEjz7ggFeiZIx0_b2oKkrReEpk/copy) |
| **3. Workspace Sync**    | **Dialog** | Integrated Sidebar/Dialog with Calendar sync.             | [Copy](https://docs.google.com/spreadsheets/d/1NdgN5e2l7-CTw-NTaP50Ta75l8Zbr93ATMyUOlZk1BY/copy) |
| **4. Drive Task Agent**  | **Dialog** | **Recursive Loop!** Dynamic file metadata/content editor. | [Copy](https://docs.google.com/spreadsheets/d/1UB5j-ySSBBsGJjSaKWpBPRYkokl7UtgYhDxqmYW00Vc/copy) |

### 3. Setup Script

1. Open the copied Spreadsheet.
2. Go to **Extensions** > **Apps Script**.
3. Open `main.gs` (or `Code.gs`) and set your API Key to `const apiKey = "###";`.
4. Save the script.

### 4. Run (For Dialog Samples 3 & 4)

1. Reload the Spreadsheet.
2. Click the custom menu **"sample"** > **"run"**.
3. A dialog will open. Enter your request.

---

# Sample Details

## Sample 1: Restaurant Finder (Web App)

This sample reproduces the official A2UI "Restaurant finder" agent as a standalone Web App.

- **Action**: Enter "Find 3 Chinese restaurants in New York".
- **Interaction**: The AI returns list cards. Clicking "Book Now" dynamically generates a reservation form.

| Initial View          | Search Result         | Reservation Form      |
| :-------------------- | :-------------------- | :-------------------- |
| ![](images/fig3a.jpg) | ![](images/fig3b.jpg) | ![](images/fig3c.jpg) |

## Sample 2: Budget Simulator (Web App)

A practical business automation sample that calculates a household budget and updates a Google Sheet.

- **Action**: Ask "Check this month's budget".
- **Interaction**: The AI reads data from the sheet, generates a pie chart (A2UI), and offers a simulation.

| Budget Visualization  | Simulation Result     | Data Updated          |
| :-------------------- | :-------------------- | :-------------------- |
| ![](images/fig4b.jpg) | ![](images/fig4d.jpg) | ![](images/fig4g.jpg) |

## Sample 3: Workspace Sync (Dialog)

This sample demonstrates "Bringing A2UI to Google Workspace". It runs inside a modal dialog within Google Sheets and interacts with local data and Google Calendar.

**Demonstration Video (YouTube):**
[![A2UI on Google Sheets Demo](https://img.youtube.com/vi/aSetL-QF2I0/0.jpg)](https://www.youtube.com/watch?v=aSetL-QF2I0)

**Supported Prompts:**

1. **Restaurant Booking**:
   - _"Find 3 Chinese restaurants in New York"_
   - The agent finds restaurants (mock data) and provides a booking form.
2. **Event Management**:
   - _"Show me events for Jan 17-20"_
   - The agent searches the "data" sheet for events, displays them in a checkbox list, and allows you to **add selected events to your Google Calendar**.

**Source Code:** [sample/A2UI-Google-Sheets](https://github.com/tanaikech/A2UI-for-Google-Apps-Script/tree/master/samples/A2UI-Google-Sheets)

---

## Sample 4: Drive Task Agent (Recursive UI Loop)

This sample demonstrates **Recursive UI Generation**. The agent builds the tool you need based on the conversation history and your interactions.

**Demonstration Video (YouTube):**
[![Drive Task Agent Demo](https://img.youtube.com/vi/6oIJGyn-9TU/0.jpg)](https://youtu.be/6oIJGyn-9TU)

[Mermaid Chart Playground](https://mermaid.ai/play?utm_source=mermaid_live_editor&utm_medium=share#pako:eNqVU12P2jAQ_CsrP1EVKCmfzcNJLRfa9CicCFzVCgm5yRIsEpvaDoUi_ns3CaBrr6hXPyS2d2dmd2wfWKgiZC4z-D1DGeKt4LHm6VwCjQ3XVoRiw6WFmUH9dHeglbQoI6gIGeGuvrJp8uJp2jserouslAtZj81fUt5jKqSAytt7n6JlPNes3dycRVzw6K8N3GuVbixUsB7XYc58-JEzWAUYCQscliLBOTuJnNFEdCrDhY1WIRqT80_yxo2tlJxV-CCMVXp_Ap8QhC3rc2GC3CgpZAwvYapUAn2eJGVymVJ7LDTzFx-D8QgqA3_oLQJv6PWn48kf5L-1OKEvauivMFx_UzsYUj1X3AgwwdAaGFC7hsrpJyJcGzJkfDdnJWakLILaEuEZVoVzJ8GXYOp9WngP3mh6JhNKEtFYi1hITr3lmJ39LyODvbGYeluUz3KzhlueZJzK9HN2S_KXUv5tq3frk5_wCh5877P3HGOn3KxrwQZDsRRhcYJX3L24OdtEVN6cgZDg0QVT-rofWZG7yC_gIlRlQ2FxQViVxVpEzLU6wypLUdNboCU75GxzZleYkohL0wiXPEtsfoZHgtHz-KpUekZqlcUr5i55YmhVCp5e7SWlaLWvMmmZ220XFMw9sB1zHadV7_RavV6z02p2mt0GRfe0_bpZ73XbDcdpOM1213F6xyr7Wag2KNB683gcfwFCXmAp)

**Supported Prompts:**
Replace `'sample'` with the actual folder name in your Google Drive.

1. **View Content**: _"List files in 'sample' and show their content."_
2. **View Metadata**: _"Show me metadata for files in 'sample'."_
3. **Verify and Edit**: _"I want to edit a file in 'sample'. Show me the files first."_

**Key Mechanics:**

- **The "OK" Button**: Clicking OK sends a System Event with selected file IDs. Gemini analyzes the **original intent** to decide whether to render a Viewer, Metadata card, or an Editor.
- **Dynamic Editor**: Supports real-time text file updates (e.g., .txt, .json, .html).

**Source Code:** [sample/Drive-Task-Agent](https://github.com/tanaikech/A2UI-for-Google-Apps-Script/tree/master/samples/A2UI-Drive-Task-Agent)

---

# Summary

- **Recursive Logic**: AI can manage multi-step workflows by generating specialized interfaces on the fly.
- **Dynamic UI**: A2UI enables AI agents to render interactive components (buttons, charts, forms, editors) based on context.
- **GAS-Native**: Leverages `google.script.run` for efficient, serverless client-server communication.
- **Workspace Synergy**: Seamlessly bridges the gap between AI reasoning and Google Workspace data management.

# References

- [A2UI: An open project for agent-driven interfaces](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)
- [Official A2UI Repository](https://github.com/google/A2UI)
- [Article: Bringing A2UI to Google Workspace with Gemini](https://medium.com/google-cloud/bringing-a2ui-to-google-workspace-with-gemini-0d85026969b8)

---

<a name="license"></a>

## Licence

[MIT](LICENCE)

<a name="author"></a>

## Author

[Tanaike](https://tanaikech.github.io/about/)

[TOP](#top)

---

## Update History

- v1.0.0 (January 8, 2026)
  - Initial release.

- v1.0.1 (January 19, 2026)
  - Added a sample 3 "Workspace Sync".

- v1.0.2 (February 3, 2026)
  - Added a sample 4 "Drive Task Agent" with recursive UI generation logic.
