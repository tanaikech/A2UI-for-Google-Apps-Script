/**
 * data.gs
 * Management and search logic for restaurant and event data.
 */

/* ================= RESTAURANT LOGIC ================= */

/**
 * Executes the restaurant retrieval process based on specified criteria.
 */
function executeGetRestaurants(cuisine = null, location = null, count = null) {
  console.log(`Searching for ${cuisine} in ${location}, limit ${count}`);

  // Mock data: Content close to actual sample data
  // Reference: https://github.com/google/A2UI/blob/d7996656ef2bc0cdffad499452fc5b282d878d45/samples/agent/adk/restaurant_finder/restaurant_data.json
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
    {
      name: "Cafe China",
      detail: "Szechuan food in a 1930s Shanghai setting.",
      imageUrl: "http://localhost:10002/static/mapotofu.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://www.cafechinanyc.com/)",
      address: "59 W 37th St, New York, NY 10018",
    },
    {
      name: "Philippe Chow",
      detail: "High-end Beijing-style cuisine.",
      imageUrl: "http://localhost:10002/static/beefbroccoli.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://www.philippechow.com/)",
      address: "33 E 60th St, New York, NY 10022",
    },
    {
      name: "Chinese Tuxedo",
      detail: "Contemporary Chinese in a former opera house.",
      imageUrl: "http://localhost:10002/static/mapotofu.jpeg",
      rating: "★★★★☆",
      infoLink: "[More Info](https://chinesetuxedo.com/)",
      address: "5 Doyers St, New York, NY 10013",
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
      imageFiles[
        file.getName().trim().split(".")[0]
      ] = `https://drive.google.com/thumbnail?sz=w1000&id=${file.getId()}`;
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

function executeSubmitBooking(obj = {}) {
  console.log("Booking:", JSON.stringify(obj));

  // In the case of the sample, the following value is given as `obj`.
  // {"dietary":"sample","partySize":"2","restaurantName":"Han Dynasty","reservationTime":"2026-01-07T15:32"}

  // You can process using your script.
  // const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  // sheet.appendRow([new Date(), JSON.stringify(obj)]);

  return "Reservation completed";
}

/* ================= EVENT LOGIC ================= */

/**
 * Searches for events in the 'data' sheet.
 */
function executeGetEvents(startDate, endDate, keyword) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
  if (!sheet) return [];

  const data = sheet.getDataRange().getDisplayValues();
  const headers = data.shift(); // Remove header: Date, Event Title, Description, Start Time, End Time

  // Convert dates to timestamps for comparison
  const startTs = startDate ? new Date(startDate).getTime() : 0;
  const endTs = endDate ? new Date(endDate).getTime() : 9999999999999;

  let results = data.filter((row) => {
    const rowDateStr = row[0];
    const rowDateTs = new Date(rowDateStr).getTime();

    // Date Filter
    if (rowDateTs < startTs || rowDateTs > endTs) return false;

    // Keyword Filter
    if (keyword) {
      const content = (row[1] + " " + row[2]).toLowerCase();
      if (!content.includes(keyword.toLowerCase())) return false;
    }
    return true;
  });

  // Map to A2UI-friendly structure
  return results.map((row) => {
    // Row: [Date, Title, Desc, Start, End]
    const dateStr = row[0];
    const shortDate = dateStr.substring(5).replace("-", "/"); // 01/16

    const evtObj = {
      date: dateStr,
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
      // Store full object in jsonValue so checkbox can return it all
      jsonValue: JSON.stringify(evtObj),
    };
  });
}

/**
 * Adds selected events to the default Google Calendar.
 * @param {Array} events - List of event objects {date, title, description, startTime, endTime}
 */
function executeAddCalendar(events) {
  if (!events || events.length === 0) return "No events selected.";

  const cal = CalendarApp.getDefaultCalendar();
  let count = 0;

  events.forEach((evt) => {
    // Parse Date and Time
    // evt.date = "2026-01-16", evt.startTime = "10:00"
    const startDt = new Date(`${evt.date}T${evt.startTime}:00`);
    const endDt = new Date(`${evt.date}T${evt.endTime}:00`);

    cal.createEvent(evt.title, startDt, endDt, {
      description: evt.description,
    });
    count++;
  });

  return `Successfully added ${count} events to your calendar.`;
}
