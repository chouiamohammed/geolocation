const GEOAPIFY_API_KEY = "4127fb8b9c3e418b8693ea38fdb4578b";
const MAX_DELAY_MINUTES = 30;
const MAX_DELAY_MS = MAX_DELAY_MINUTES * 60 * 1000;

const fileInput = document.getElementById("fileInput");
const processBtn = document.getElementById("processBtn");

processBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a JSON file first.");
    return;
  }

  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch (err) {
    alert("Invalid JSON file.");
    return;
  }

  if (!data.fleet || !Array.isArray(data.fleet)) {
    alert("JSON does not contain 'fleet' array.");
    return;
  }

  // Process each vehicle in the fleet
  const fleetGPS = await Promise.all(
    data.fleet.map(async (f) => {
      const Longitude = f.position.LON;
      const Latitude = f.position.LAT;
      const dernierDateStr = f.position.date;
      const dernierDate = new Date(dernierDateStr.replace(" ", "T"));
      const now = new Date();
      const diffMs = now - dernierDate;

      let city = null;
      let gpsStatus = "GPS actif";

      if (diffMs <= MAX_DELAY_MS) {
        try {
          const res = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${Latitude}&lon=${Longitude}&lang=fr&apiKey=${GEOAPIFY_API_KEY}`,
          );
          const cityData = await res.json();
          if (cityData.features && cityData.features.length > 0) {
            city = cityData.features[0].properties.state || null;
          }
        } catch (err) {
          console.error("Error fetching city:", err);
        }
      } else {
        gpsStatus = `GPS n’est pas actualisé depuis ${dernierDateStr}`;
      }

      return {
        Matricule: f.gps_alias,
        Agence: f.car_group,
        Longitude,
        Latitude,
        Dernier_Date: dernierDateStr,
        City: city,
        GPS_Status: gpsStatus,
      };
    }),
  );

  // ✅ Export to Excel
  const worksheet = XLSX.utils.json_to_sheet(fleetGPS);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "FleetGPS");

  // Trigger download
  XLSX.writeFile(workbook, "fleetGPS.xlsx");

  alert("Processing complete! Excel file downloaded.");
});
