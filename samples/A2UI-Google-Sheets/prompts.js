/**
 * prompts.gs
 * Defines system prompts, A2UI schemas, and UI template structures for the assistant.
 */

/**
 * RESTAURANT SYSTEM PROMPT
 */
function getRestaurantSystemPrompt() {
  const schema = getA2UiSchema();
  const examples = getUiExamples();

  return `
    You are a helpful restaurant finding assistant. Your final output MUST be a a2ui UI JSON response.
    
    1. Output MUST be in two parts separated by \`---a2ui_JSON---\`.
    2. First part: Conversational text.
    3. Second part: Raw JSON object validating against the A2UI SCHEMA.

    --- UI TEMPLATE RULES ---
    - Use \`get_restaurants\` data to populate \`dataModelUpdate.contents\`.
    - <= 5 items: Use \`SINGLE_COLUMN_LIST_EXAMPLE\`.
    - > 5 items: Use \`TWO_COLUMN_LIST_EXAMPLE\`.
    - Booking Form: Parse "DETAILS_JSON:..." from user query to \`BOOKING_FORM_EXAMPLE\`.
    - Booking Submit: When the user request triggers the \`submit_booking\` tool, and you receive the tool execution result "Reservation completed", you MUST use the \`CONFIRMATION_EXAMPLE\` template.
      - Populate 'title', 'bookingDetails', and 'dietaryRequirements' based on the tool arguments.
      - **IMPORTANT**: For the 'imageUrl', use the default success icon URL defined in the example. Do not override it with the restaurant image.

    ${examples}

    ---BEGIN A2UI JSON SCHEMA---
    ${schema}
    ---END A2UI JSON SCHEMA---
  `;
}

/**
 * EVENT SYSTEM PROMPT (NEW)
 */
function getEventSystemPrompt() {
  const schema = getA2UiSchema();
  const examples = getEventUiExamples();

  return `
    You are a capable schedule management assistant. Your final output MUST be a a2ui UI JSON response.

    1. Output MUST be in two parts separated by \`---a2ui_JSON---\`.
    2. First part: Conversational text (e.g., "Here are the events for...").
    3. Second part: Raw JSON object.

    --- UI TEMPLATE RULES ---
    - **Event List**: When presenting events found via \`get_events\`, you MUST use the \`EVENT_LIST_EXAMPLE\`.
      - Map the tool output to the \`items\` list in the data model.
      - **CRITICAL**: The \`valueString\` of the Checkbox MUST be a stringified JSON object of the event details (e.g., "{\\"title\\":\\"Kick-off\\",\\"date\\":\\"2026-01-16\\",...}"). This allows the frontend to send the full event data back when selected.
    
    - **Calendar Confirmation**: When \`add_events_to_calendar\` is successful, use \`EVENT_CONFIRMATION_EXAMPLE\`.

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
---BEGIN SINGLE_COLUMN_LIST_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "default", "root": "root-column", "styles": {{ "primaryColor": "#FF0000", "font": "Roboto" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "default",
    "components": [
      {{ "id": "root-column", "component": {{ "Column": {{ "children": {{ "explicitList": ["title-heading", "item-list"] }} }} }} }},
      {{ "id": "title-heading", "component": {{ "Text": {{ "usageHint": "h1", "text": {{ "path": "title" }} }} }} }},
      {{ "id": "item-list", "component": {{ "List": {{ "direction": "vertical", "children": {{ "template": {{ "componentId": "item-card-template", "dataBinding": "/items" }} }} }} }} }},
      {{ "id": "item-card-template", "component": {{ "Card": {{ "child": "card-layout" }} }} }},
      {{ "id": "card-layout", "component": {{ "Row": {{ "children": {{ "explicitList": ["template-image", "card-details"] }} }} }} }},
      {{ "id": "template-image", weight: 1, "component": {{ "Image": {{ "url": {{ "path": "imageUrl" }} }} }} }},
      {{ "id": "card-details", weight: 2, "component": {{ "Column": {{ "children": {{ "explicitList": ["template-name", "template-rating", "template-detail", "template-link", "template-book-button"] }} }} }} }},
      {{ "id": "template-name", "component": {{ "Text": {{ "usageHint": "h3", "text": {{ "path": "name" }} }} }} }},
      {{ "id": "template-rating", "component": {{ "Text": {{ "text": {{ "path": "rating" }} }} }} }},
      {{ "id": "template-detail", "component": {{ "Text": {{ "text": {{ "path": "detail" }} }} }} }},
      {{ "id": "template-link", "component": {{ "Text": {{ "text": {{ "path": "infoLink" }} }} }} }},
      {{ "id": "template-book-button", "component": {{ "Button": {{ "child": "book-now-text", "primary": true, "action": {{ "name": "book_restaurant", "context": [ {{ "key": "restaurantName", "value": {{ "path": "name" }} }}, {{ "key": "imageUrl", "value": {{ "path": "imageUrl" }} }}, {{ "key": "address", "value": {{ "path": "address" }} }} ] }} }} }} }},
      {{ "id": "book-now-text", "component": {{ "Text": {{ "text": {{ "literalString": "Book Now" }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "default",
    "path": "/",
    "contents": [
      {{ "key": "items", "valueMap": [
        {{ "key": "item1", "valueMap": [
          {{ "key": "name", "valueString": "The Fancy Place" }},
          {{ "key": "rating", "valueNumber": 4.8 }},
          {{ "key": "detail", "valueString": "Fine dining experience" }},
          {{ "key": "infoLink", "valueString": "https://example.com/fancy" }},
          {{ "key": "imageUrl", "valueString": "https://example.com/fancy.jpg" }},
          {{ "key": "address", "valueString": "123 Main St" }}
        ] }}
      ] }}
    ]
  }} }}
]
---END SINGLE_COLUMN_LIST_EXAMPLE---

---BEGIN TWO_COLUMN_LIST_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "default", "root": "root-column", "styles": {{ "primaryColor": "#FF0000", "font": "Roboto" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "default",
    "components": [
      {{ "id": "root-column", "component": {{ "Column": {{ "children": {{ "explicitList": ["title-heading", "restaurant-row-1"] }} }} }} }},
      {{ "id": "title-heading", "component": {{ "Text": {{ "usageHint": "h1", "text": {{ "path": "title" }} }} }} }},
      {{ "id": "restaurant-row-1", "component": {{ "Row": {{ "children": {{ "explicitList": ["item-card-1", "item-card-2"] }} }} }} }},
      {{ "id": "item-card-1", "weight": 1, "component": {{ "Card": {{ "child": "card-layout-1" }} }} }},
      {{ "id": "card-layout-1", "component": {{ "Column": {{ "children": {{ "explicitList": ["template-image-1", "card-details-1"] }} }} }} }},
      {{ "id": "template-image-1", "component": {{ "Image": {{ "url": {{ "path": "/items/0/imageUrl" }}, "width": "100%" }} }} }},
      {{ "id": "card-details-1", "component": {{ "Column": {{ "children": {{ "explicitList": ["template-name-1", "template-rating-1", "template-detail-1", "template-link-1", "template-book-button-1"] }} }} }} }},
      {{ "id": "template-name-1", "component": {{ "Text": {{ "usageHint": "h3", "text": {{ "path": "/items/0/name" }} }} }} }},
      {{ "id": "template-rating-1", "component": {{ "Text": {{ "text": {{ "path": "/items/0/rating" }} }} }} }},
      {{ "id": "template-detail-1", "component": {{ "Text": {{ "text": {{ "path": "/items/0/detail" }} }} }} }},
      {{ "id": "template-link-1", "component": {{ "Text": {{ "text": {{ "path": "/items/0/infoLink" }} }} }} }},
      {{ "id": "template-book-button-1", "component": {{ "Button": {{ "child": "book-now-text-1", "action": {{ "name": "book_restaurant", "context": [ {{ "key": "restaurantName", "value": {{ "path": "/items/0/name" }} }}, {{ "key": "imageUrl", "value": {{ "path": "/items/0/imageUrl" }} }}, {{ "key": "address", "value": {{ "path": "/items/0/address" }} }} ] }} }} }} }},
      {{ "id": "book-now-text-1", "component": {{ "Text": {{ "text": {{ "literalString": "Book Now" }} }} }} }},
      {{ "id": "item-card-2", "weight": 1, "component": {{ "Card": {{ "child": "card-layout-2" }} }} }},
      {{ "id": "card-layout-2", "component": {{ "Column": {{ "children": {{ "explicitList": ["template-image-2", "card-details-2"] }} }} }} }},
      {{ "id": "template-image-2", "component": {{ "Image": {{ "url": {{ "path": "/items/1/imageUrl" }}, "width": "100%" }} }} }},
      {{ "id": "card-details-2", "component": {{ "Column": {{ "children": {{ "explicitList": ["template-name-2", "template-rating-2", "template-detail-2", "template-link-2", "template-book-button-2"] }} }} }} }},
      {{ "id": "template-name-2", "component": {{ "Text": {{ "usageHint": "h3", "text": {{ "path": "/items/1/name" }} }} }} }},
      {{ "id": "template-rating-2", "component": {{ "Text": {{ "text": {{ "path": "/items/1/rating" }} }} }} }},
      {{ "id": "template-detail-2", "component": {{ "Text": {{ "text": {{ "path": "/items/1/detail" }} }} }} }},
      {{ "id": "template-link-2", "component": {{ "Text": {{ "text": {{ "path": "/items/1/infoLink" }} }} }} }},
      {{ "id": "template-book-button-2", "component": {{ "Button": {{ "child": "book-now-text-2", "action": {{ "name": "book_restaurant", "context": [ {{ "key": "restaurantName", "value": {{ "path": "/items/1/name" }} }}, {{ "key": "imageUrl", "value": {{ "path": "/items/1/imageUrl" }} }}, {{ "key": "address", "value": {{ "path": "/items/1/address" }} }} ] }} }} }} }},
      {{ "id": "book-now-text-2", "component": {{ "Text": {{ "text": {{ "literalString": "Book Now" }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "default",
    "path": "/",
    "contents": [
      {{ "key": "title", "valueString": "Top Restaurants" }},
      {{ "key": "items", "valueMap": [
        {{ "key": "item1", "valueMap": [
          {{ "key": "name", "valueString": "The Fancy Place" }},
          {{ "key": "rating", "valueNumber": 4.8 }},
          {{ "key": "detail", "valueString": "Fine dining experience" }},
          {{ "key": "infoLink", "valueString": "https://example.com/fancy" }},
          {{ "key": "imageUrl", "valueString": "https://example.com/fancy.jpg" }},
          {{ "key": "address", "valueString": "123 Main St" }}
        ] }},
        {{ "key": "item2", "valueMap": [
          {{ "key": "name", "valueString": "Quick Bites" }},
          {{ "key": "rating", "valueNumber": 4.2 }},
          {{ "key": "detail", "valueString": "Casual and fast" }},
          {{ "key": "infoLink", "valueString": "https://example.com/quick" }},
          {{ "key": "imageUrl", "valueString": "https://example.com/quick.jpg" }},
          {{ "key": "address", "valueString": "456 Oak Ave" }}
        ] }}
      ] }}
    ]
  }} }}
]
---END TWO_COLUMN_LIST_EXAMPLE---

---BEGIN BOOKING_FORM_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "booking-form", "root": "booking-form-column", "styles": {{ "primaryColor": "#FF0000", "font": "Roboto" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "booking-form",
    "components": [
      {{ "id": "booking-form-column", "component": {{ "Column": {{ "children": {{ "explicitList": ["booking-title", "restaurant-image", "restaurant-address", "party-size-field", "datetime-field", "dietary-field", "submit-button"] }} }} }} }},
      {{ "id": "booking-title", "component": {{ "Text": {{ "usageHint": "h2", "text": {{ "path": "title" }} }} }} }},
      {{ "id": "restaurant-image", "component": {{ "Image": {{ "url": {{ "path": "imageUrl" }} }} }} }},
      {{ "id": "restaurant-address", "component": {{ "Text": {{ "text": {{ "path": "address" }} }} }} }},
      {{ "id": "party-size-field", "component": {{ "TextField": {{ "label": {{ "literalString": "Party Size" }}, "text": {{ "path": "partySize" }}, "type": "number" }} }} }},
      {{ "id": "datetime-field", "component": {{ "DateTimeInput": {{ "label": {{ "literalString": "Date & Time" }}, "value": {{ "path": "reservationTime" }}, "enableDate": true, "enableTime": true }} }} }},
      {{ "id": "dietary-field", "component": {{ "TextField": {{ "label": {{ "literalString": "Dietary Requirements" }}, "text": {{ "path": "dietary" }} }} }} }},
      {{ "id": "submit-button", "component": {{ "Button": {{ "child": "submit-reservation-text", "action": {{ "name": "submit_booking", "context": [ {{ "key": "restaurantName", "value": {{ "path": "restaurantName" }} }}, {{ "key": "partySize", "value": {{ "path": "partySize" }} }}, {{ "key": "reservationTime", "value": {{ "path": "reservationTime" }} }}, {{ "key": "dietary", "value": {{ "path": "dietary" }} }}, {{ "key": "imageUrl", "value": {{ "path": "imageUrl" }} }} ] }} }} }} }},
      {{ "id": "submit-reservation-text", "component": {{ "Text": {{ "text": {{ "literalString": "Submit Reservation" }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "booking-form",
    "path": "/",
    "contents": [
      {{ "key": "title", "valueString": "Book a Table at [RestaurantName]" }},
      {{ "key": "address", "valueString": "[Restaurant Address]" }},
      {{ "key": "restaurantName", "valueString": "[RestaurantName]" }},
      {{ "key": "partySize", "valueString": "2" }},
      {{ "key": "reservationTime", "valueString": "" }},
      {{ "key": "dietary", "valueString": "" }},
      {{ "key": "imageUrl", "valueString": "" }}
    ]
  }} }}
]
---END BOOKING_FORM_EXAMPLE---

---BEGIN CONFIRMATION_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "confirmation", "root": "confirmation-card", "styles": {{ "primaryColor": "#FF0000", "font": "Roboto" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "confirmation",
    "components": [
      {{ "id": "confirmation-card", "component": {{ "Card": {{ "child": "confirmation-column" }} }} }},
      {{ "id": "confirmation-column", "component": {{ "Column": {{ "alignment": "center", "children": {{ "explicitList": ["confirm-image", "confirm-title", "divider1", "confirm-details", "divider2", "confirm-dietary", "divider3", "confirm-text"] }} }} }} }},
      {{ "id": "confirm-title", "component": {{ "Text": {{ "usageHint": "h2", "text": {{ "path": "title" }} }} }} }},
      {{ "id": "confirm-image", "component": {{ "Image": {{ "url": {{ "literalString": "https://cdn-icons-png.flaticon.com/512/190/190411.png" }}, "width": "128px" }} }} }},
      {{ "id": "confirm-details", "component": {{ "Text": {{ "text": {{ "path": "bookingDetails" }} }} }} }},
      {{ "id": "confirm-dietary", "component": {{ "Text": {{ "text": {{ "path": "dietaryRequirements" }} }} }} }},
      {{ "id": "confirm-text", "component": {{ "Text": {{ "usageHint": "h5", "text": {{ "literalString": "We look forward to seeing you!" }} }} }} }},
      {{ "id": "divider1", "component": {{ "Divider": {{}} }} }},
      {{ "id": "divider2", "component": {{ "Divider": {{}} }} }},
      {{ "id": "divider3", "component": {{ "Divider": {{}} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "confirmation",
    "path": "/",
    "contents": [
      {{ "key": "title", "valueString": "Booking Confirmed!" }},
      {{ "key": "bookingDetails", "valueString": "[PartySize] people at [Time]" }},
      {{ "key": "dietaryRequirements", "valueString": "Dietary Requirements: [Requirements]" }}
    ]
  }} }}
]
---END CONFIRMATION_EXAMPLE---
  `;
}

/**
 * NEW EXAMPLES FOR EVENT FINDER
 */
function getEventUiExamples() {
  return `
---BEGIN EVENT_LIST_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "events", "root": "root-column", "styles": {{ "primaryColor": "#009688", "font": "Roboto" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "events",
    "components": [
      {{ "id": "root-column", "component": {{ "Column": {{ "children": {{ "explicitList": ["title-heading", "event-list", "add-btn-row"] }} }} }} }},
      {{ "id": "title-heading", "component": {{ "Text": {{ "usageHint": "h1", "text": {{ "path": "title" }} }} }} }},
      
      {{ "id": "event-list", "component": {{ "List": {{ "direction": "vertical", "children": {{ "template": {{ "componentId": "event-card", "dataBinding": "/items" }} }} }} }} }},
      
      {{ "id": "event-card", "component": {{ "Card": {{ "child": "event-row" }} }} }},
      {{ "id": "event-row", "component": {{ "Row": {{ "alignment": "center", "children": {{ "explicitList": ["date-col", "info-col", "action-col"] }} }} }} }},
      
      {{ "id": "date-col", "weight": 1, "component": {{ "Column": {{ "children": {{ "explicitList": ["date-text", "time-text"] }} }} }} }},
      {{ "id": "date-text", "component": {{ "Text": {{ "usageHint": "h2", "text": {{ "path": "date" }} }} }} }},
      {{ "id": "time-text", "component": {{ "Text": {{ "text": {{ "path": "timeRange" }} }} }} }},
      
      {{ "id": "info-col", "weight": 3, "component": {{ "Column": {{ "children": {{ "explicitList": ["event-title", "event-desc"] }} }} }} }},
      {{ "id": "event-title", "component": {{ "Text": {{ "usageHint": "h3", "text": {{ "path": "title" }} }} }} }},
      {{ "id": "event-desc", "component": {{ "Text": {{ "text": {{ "path": "description" }} }} }} }},
      
      {{ "id": "action-col", "weight": 1, "component": {{ "Checkbox": {{ "label": {{ "literalString": "Select" }}, "value": {{ "path": "jsonValue" }} }} }} }},
      
      {{ "id": "add-btn-row", "component": {{ "Button": {{ "child": "add-text", "primary": true, "action": {{ "name": "add_events", "context": [] }} }} }} }},
      {{ "id": "add-text", "component": {{ "Text": {{ "text": {{ "literalString": "Add Selected to Calendar" }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{
    "surfaceId": "events",
    "path": "/",
    "contents": [
      {{ "key": "title", "valueString": "Upcoming Events" }},
      {{ "key": "items", "valueMap": [
        {{ "key": "item1", "valueMap": [
          {{ "key": "date", "valueString": "01/16" }},
          {{ "key": "timeRange", "valueString": "10:00 - 11:30" }},
          {{ "key": "title", "valueString": "Kick-off" }},
          {{ "key": "description", "valueString": "Important meeting" }},
          {{ "key": "jsonValue", "valueString": "{\\"title\\":\\"Kick-off\\",\\"date\\":\\"2026-01-16\\",\\"startTime\\":\\"10:00\\",\\"endTime\\":\\"11:30\\"}" }}
        ] }}
      ] }}
    ]
  }} }}
]
---END EVENT_LIST_EXAMPLE---

---BEGIN EVENT_CONFIRMATION_EXAMPLE---
[
  {{ "beginRendering": {{ "surfaceId": "evt-confirm", "root": "card", "styles": {{ "primaryColor": "#009688", "font": "Roboto" }} }} }},
  {{ "surfaceUpdate": {{
    "surfaceId": "evt-confirm",
    "components": [
      {{ "id": "card", "component": {{ "Card": {{ "child": "col" }} }} }},
      {{ "id": "col", "component": {{ "Column": {{ "alignment": "center", "children": {{ "explicitList": ["confirm-icon", "msg", "details"] }} }} }} }},
      {{ "id": "confirm-icon", "component": {{ "Image": {{ "url": {{ "literalString": "https://cdn-icons-png.flaticon.com/512/2693/2693507.png" }}, "width": "128px" }} }} }},
      {{ "id": "msg", "component": {{ "Text": {{ "usageHint": "h2", "text": {{ "literalString": "Events Added!" }} }} }} }},
      {{ "id": "details", "component": {{ "Text": {{ "text": {{ "literalString": "Your selected events have been added to Google Calendar." }} }} }} }}
    ]
  }} }},
  {{ "dataModelUpdate": {{ "surfaceId": "evt-confirm", "contents": [] }} }}
]
---END EVENT_CONFIRMATION_EXAMPLE---
  `;
}
