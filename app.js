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
    timeZone: "local", // Adjust as needed
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

      // Add time zone to the set
      var eventTimeZone = event.startDate.zone.tzid || "UTC";
      timeZones.add(eventTimeZone);

      // Handle recurrence rules
      var occurrences = [];
      if (event.isRecurring()) {
        var recurExp = event.iterator();
        var next;
        var maxOccurrences = 50; // Limit to prevent infinite loops
        var count = 0;

        while ((next = recurExp.next()) && count < maxOccurrences) {
          var occurrence = event.getOccurrenceDetails(next);

          // Add occurrence time zone to the set
          var occurrenceTimeZone = occurrence.startDate.zone.tzid || "UTC";
          timeZones.add(occurrenceTimeZone);

          occurrences.push({
            title: occurrence.item.summary,
            start: occurrence.startDate.toJSDate(),
            end: occurrence.endDate.toJSDate(),
            allDay: occurrence.startDate.isDate,
          });
          count++;
        }
      } else {
        occurrences.push({
          title: event.summary,
          start: event.startDate.toJSDate(),
          end: event.endDate ? event.endDate.toJSDate() : null,
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
