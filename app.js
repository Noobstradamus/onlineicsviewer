document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");

  // Create an element to display time zones
  var timezoneDisplay = document.createElement("div");
  timezoneDisplay.id = "timezoneDisplay";
  timezoneDisplay.style.textAlign = "center";
  timezoneDisplay.style.fontWeight = "bold";
  timezoneDisplay.style.marginBottom = "10px";
  calendarEl.parentNode.insertBefore(timezoneDisplay, calendarEl);

  // Initialize the calendar with desired views
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth", // You can set this to 'timeGridWeek' if preferred
    editable: false,
    selectable: false,
    timeZone: "none", // Do not adjust event times
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: [], // Start with no events
  });
  calendar.render();

  // Handle file input change
  var fileInput = document.getElementById("icsFileInput");
  if (fileInput) {
    fileInput.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (file && file.name.endsWith(".ics")) {
        var reader = new FileReader();

        reader.onload = function (e) {
          var icsData = e.target.result;
          console.log("ICS Data Loaded:", icsData);
          parseICS(icsData, calendar, timezoneDisplay);
        };

        reader.onerror = function (e) {
          console.error("Error reading file:", e);
          alert("Error reading file. Please try again.");
        };

        reader.readAsText(file);
      } else {
        alert("Please upload a valid .ics file.");
      }
    });
  } else {
    console.error("File input element not found");
  }
});

function formatDateTime(icalTime) {
  // Get components
  var year = icalTime.year;
  var month = String(icalTime.month).padStart(2, '0');
  var day = String(icalTime.day).padStart(2, '0');
  var hour = String(icalTime.hour).padStart(2, '0');
  var minute = String(icalTime.minute).padStart(2, '0');
  var second = String(icalTime.second).padStart(2, '0');

  // Check if date-only
  if (icalTime.isDate) {
    return `${year}-${month}-${day}`;
  } else {
    // Get time zone offset in minutes
    var utcOffset = icalTime.zone.utcOffset(icalTime) / 60; // offset in minutes
    var offsetSign = utcOffset >= 0 ? '+' : '-';
    var offsetHours = String(Math.floor(Math.abs(utcOffset) / 60)).padStart(2, '0');
    var offsetMinutes = String(Math.abs(utcOffset) % 60).padStart(2, '0');
    var offset = `${offsetSign}${offsetHours}:${offsetMinutes}`;

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
  }
}

function parseICS(data, calendar, timezoneDisplay) {
  try {
    console.log("Parsing ICS data...");
    var jcalData = ICAL.parse(data);
    console.log("jcalData:", jcalData);

    var comp = new ICAL.Component(jcalData);
    var vevents = comp.getAllSubcomponents("vevent");
    console.log("Found vevents:", vevents.length);

    // Collect all unique time zones
    var timeZones = new Set();

    var events = vevents.map(function (vevent) {
      var event = new ICAL.Event(vevent);
      console.log("Processing event:", event);

      // Determine time zone
      var eventTimeZone = event.startDate.zone.tzid || "UTC";
      timeZones.add(eventTimeZone);

      var occurrences = [];
      if (event.isRecurring()) {
        var recurExp = event.iterator();
        var next;
        var maxOccurrences = 50; // Limit to prevent infinite loops
        var count = 0;

        while ((next = recurExp.next()) && count < maxOccurrences) {
          var occurrence = event.getOccurrenceDetails(next);

          // Determine occurrence time zone
          var occurrenceTimeZone = occurrence.startDate.zone.tzid || "UTC";
          timeZones.add(occurrenceTimeZone);

          // Get date-time strings in ISO format with time zone offset
          var startStr = formatDateTime(occurrence.startDate);
          var endStr = formatDateTime(occurrence.endDate);

          occurrences.push({
            title: occurrence.item.summary,
            start: startStr,
            end: endStr,
            allDay: occurrence.startDate.isDate,
          });
          count++;
        }
      } else {
        var startStr = formatDateTime(event.startDate);
        var endStr = event.endDate ? formatDateTime(event.endDate) : null;

        occurrences.push({
          title: event.summary,
          start: startStr,
          end: endStr,
          allDay: event.startDate.isDate,
        });
      }

      return occurrences;
    });

    // Flatten the occurrences array
    events = events.flat();
    console.log("Parsed Events:", events);

    // Update the time zone display
    timezoneDisplay.innerText =
      "Time Zones in ICS File: " + Array.from(timeZones).join(", ");

    // Add events to the calendar
    calendar.removeAllEvents();
    calendar.addEventSource(events);
  } catch (error) {
    console.error("Error parsing ICS data:", error);
    alert("Error parsing ICS file: " + error.message);
  }
}
