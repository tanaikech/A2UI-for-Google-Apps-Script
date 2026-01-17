/**
 * data.gs
 * Management and search logic for restaurant data.
 */

/**
 * Executes the restaurant retrieval process based on specified criteria.
 * * @param {string|null} [cuisine=null] - The type of cuisine to filter by.
 * @param {string|null} [location=null] - The geographic location to search in.
 * @param {number|null} [count=null] - The maximum number of restaurant results to return.
 * @returns {Object[]} An array of restaurant objects matching the criteria.
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

  /**
   * If you want to put the values into Google Sheets, the following script can also be used.
   * In this sample, it is supposed that the values like above are put into "Sheet1".
   *
   * const allRestaurants = (_ => {
   *  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
   *  const [header, ...values] = sheet.getDataRange().getDisplayValues();
   *  const obj = values.map(e => header.reduce((o, h, j) => (o[h] = e[j], o), {}));
   *  return obj;
   * })();
   */

  convertFilenameToImageUrl(allRestaurants);

  let results = allRestaurants;
  if (count) {
    results = results.slice(0, count);
  }
  return results;
}

/**
 * Converts local/placeholder image filenames within the restaurant data to Google Drive thumbnail URLs.
 * Searches for a specific folder and maps filenames to their respective Drive file IDs.
 * * @param {Object[]} allRestaurants - The array of restaurant objects to update.
 * @throws {Error} Throws an error if the "a2ui-sample-images" folder is not found.
 */
function convertFilenameToImageUrl(allRestaurants) {
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
}

/**
 * Executes the booking submission.
 * @param {Object} obj - The details of the booking extracted by the LLM.
 * @returns {string} The confirmation message.
 */
function executeSubmitBooking(obj = {}) {
  console.log(JSON.stringify(obj));
  // In the case of the sample, the following value is given as `obj`.
  // {"dietary":"sample","partySize":"2","restaurantName":"Han Dynasty","reservationTime":"2026-01-07T15:32"}

  // You can process using your script.
  // const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  // sheet.appendRow([new Date(), JSON.stringify(obj)]);

  return "Reservation completed";
}
