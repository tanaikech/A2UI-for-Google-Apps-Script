// -----------------------------------------------------------
// RESTAURANT APP DATA FUNCTIONS
// -----------------------------------------------------------
function executeGetRestaurants(cuisine = null, location = null, count = null) {
  console.log(`Searching for ${cuisine} in ${location}, limit ${count}`);
  const allRestaurants = [
    {
      name: "Xi'an Famous Foods",
      detail: "Spicy and savory hand-pulled noodles.",
      imageUrl: "http://localhost:10002/static/shrimpchowmein.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://www.xianfoods.com/)",
      address: "81 St Marks Pl, New York, NY 10003",
    },
    {
      name: "Han Dynasty",
      detail: "Authentic Szechuan cuisine.",
      imageUrl: "http://localhost:10002/static/mapotofu.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://www.handynasty.net/)",
      address: "90 3rd Ave, New York, NY 10003",
    },
    {
      name: "RedFarm",
      detail: "Modern Chinese with a farm-to-table approach.",
      imageUrl: "http://localhost:10002/static/beefbroccoli.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://www.redfarmnyc.com/)",
      address: "529 Hudson St, New York, NY 10014",
    },
    {
      name: "Mott 32",
      detail: "Upscale Cantonese dining.",
      imageUrl: "http://localhost:10002/static/springrolls.jpeg",
      rating: "★★★★★",
      infoLink: "[More Info](https://mott32.com/newyork/)",
      address: "111 W 57th St, New York, NY 10019",
    },
    {
      name: "Hwa Yuan Szechuan",
      detail: "Famous for its cold noodles with sesame sauce.",
      imageUrl: "http://localhost:10002/static/kungpao.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://hwayuannyc.com/)",
      address: "40 E Broadway, New York, NY 10002",
    },
  ];
  convertFilenameToImageUrl(allRestaurants);
  let results = allRestaurants;
  if (count) {
    results = results.slice(0, count);
  }
  return results;
}

function convertFilenameToImageUrl(allRestaurants) {
  try {
    const folder = DriveApp.getFolderById("1vchEpcPfMaC0f2CTcAS3ofL7TeDBl27D");
    const files = folder.searchFiles("mimeType contains 'image'");
    const imageFiles = {};
    while (files.hasNext()) {
      const file = files.next();
      imageFiles[file.getName().trim().split(".")[0]] =
        `https://drive.google.com/thumbnail?sz=w1000&id=${file.getId()}`;
    }
    allRestaurants.forEach((e) => {
      const filename = e.imageUrl.split("/").pop().trim().split(".")[0];
      e.imageUrl =
        imageFiles[filename] ||
        "https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s96-fcrop64=1,00000000ffffffff-rw";
    });
  } catch (e) {
    console.warn("Image folder not found, using defaults.");
  }
}

/**
 * Saves the booking details to the "Restaurant" sheet.
 */
function executeSubmitBooking(obj = {}) {
  console.log("Booking:", JSON.stringify(obj));

  let sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Restaurant");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Restaurant");
    sheet.appendRow([
      "Timestamp",
      "Restaurant Name",
      "Party Size",
      "Time",
      "Dietary Requirements",
      "Image URL",
    ]);
  }

  const timestamp = new Date();
  sheet.appendRow([
    timestamp,
    obj.restaurantName || "Unknown",
    obj.partySize || "N/A",
    obj.reservationTime || "N/A",
    obj.dietary || "None",
    obj.imageUrl || "",
  ]);

  return "Reservation completed";
}

// -----------------------------------------------------------
// EVENTS APP DATA FUNCTIONS
// -----------------------------------------------------------
function executeGetEvents(startDate, endDate, keyword) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data.shift();
  const startTs = startDate ? new Date(startDate).getTime() : 0;
  const endTs = endDate ? new Date(endDate).getTime() : 9999999999999;

  let results = data.filter((row) => {
    const rowDateStr = row[0];
    const rowDateTs = new Date(rowDateStr).getTime();
    if (isNaN(rowDateTs)) return false;
    if (rowDateTs < startTs || rowDateTs > endTs) return false;
    if (keyword) {
      const content = (row[1] + " " + row[2]).toLowerCase();
      if (!content.includes(keyword.toLowerCase())) return false;
    }
    return true;
  });

  return results.map((row) => {
    // Normalize date to YYYY-MM-DD to ensure consistent JSON parsing later
    const dObj = new Date(row[0]);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, "0");
    const d = String(dObj.getDate()).padStart(2, "0");
    const isoDate = `${y}-${m}-${d}`;
    const shortDate = `${m}/${d}`; // Simple display format

    const evtObj = {
      date: isoDate,
      title: row[1],
      description: row[2],
      startTime: row[3],
      endTime: row[4],
    };
    return {
      date: shortDate,
      timeRange: `${row[3]} - ${row[4]}`,
      title: row[1],
      description: row[2],
      jsonValue: JSON.stringify(evtObj),
    };
  });
}

function executeAddCalendar(events) {
  if (!events || events.length === 0) return "No events selected.";
  const cal = CalendarApp.getDefaultCalendar();
  let count = 0;
  events.forEach((evt) => {
    const dateParts = evt.date.split("-");
    const y = parseInt(dateParts[0], 10);
    const m = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
    const d = parseInt(dateParts[2], 10);

    const startParts = evt.startTime.split(":");
    const endParts = evt.endTime.split(":");

    // Create Date objects representing the exact time in the script's timezone (Asia/Tokyo)
    const startDt = new Date(
      y,
      m,
      d,
      parseInt(startParts[0], 10),
      parseInt(startParts[1], 10),
    );
    const endDt = new Date(
      y,
      m,
      d,
      parseInt(endParts[0], 10),
      parseInt(endParts[1], 10),
    );

    cal.createEvent(evt.title, startDt, endDt, {
      description: evt.description,
    });
    count++;
  });
  return `Successfully added ${count} events to your calendar.`;
}

// -----------------------------------------------------------
// QUIZ APP DATA FUNCTIONS
// -----------------------------------------------------------

function executeSaveQuizResults(resultsArray) {
  if (!resultsArray || resultsArray.length === 0) return "No results to save.";

  // Changed sheet name from 'Result' to 'Quiz' as requested
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Quiz");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Quiz");
    sheet.appendRow([
      "Timestamp",
      "Question",
      "Answer",
      "Options",
      "UserSelection",
      "IsCorrect",
    ]);
  }

  const timestamp = new Date();
  const rows = resultsArray.map((r) => [
    timestamp,
    r.question,
    r.answer,
    JSON.stringify(r.options),
    r.userSelection,
    r.isCorrect,
  ]);

  // Batch write for performance
  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
    .setValues(rows);

  return "Quiz results saved successfully.";
}

function executeGetPastResults(limit = 20) {
  // Changed sheet name from 'Result' to 'Quiz'
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Quiz");
  if (!sheet) return "[]";

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "[]"; // Only header

  // Get data excluding header
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  values.shift(); // Remove header

  if (values.length === 0) return "[]";

  // Get the last 'limit' rows
  const recentData = values.slice(-limit);

  // Map to simple object structure for AI
  const history = recentData.map((row) => ({
    question: row[1],
    correctAnswer: row[2],
    userSelection: row[4],
    isCorrect: row[5],
  }));

  return JSON.stringify(history);
}
