document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");

  // Create an element to display time zones
  var timezoneDisplay = document.createElement("div");
  timezoneDisplay.id = "timezoneDisplay";
  timezoneDisplay.style.textAlign = "center";
  timezoneDisplay.style.fontWeight = "bold";
  timezoneDisplay.style.marginBottom = "10px";
  calendarEl.parentNode.insertBefore(timezoneDisplay, calendarEl);

  // Get the user's local time zone
  var userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // Initialize the calendar with desired views
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    editable: false,
    selectable: false,
    timeZone: userTimeZone, // Use the user's local time zone
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
          parseICS(icsData, calendar, timezoneDisplay, userTimeZone);
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

function parseICS(data, calendar, timezoneDisplay, userTimeZone) {
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

      var occurrences = [];
      if (event.isRecurring()) {
        var recurExp = event.iterator();
        var next;
        var maxOccurrences = 50; // Limit to prevent infinite loops
        var count = 0;

        while ((next = recurExp.next()) && count < maxOccurrences) {
          var occurrence = event.getOccurrenceDetails(next);

          var occurrenceStartDate = occurrence.startDate;
          var occurrenceEndDate = occurrence.endDate;

          // Determine time zone
          var occurrenceTimeZone = occurrenceStartDate.zone.tzid || "UTC";

          if (occurrenceTimeZone === "UTC") {
            // Convert UTC to user's local time zone
            occurrenceStartDate = occurrenceStartDate.convertToZone(ICAL.Timezone.localTimezone);
            occurrenceEndDate = occurrenceEndDate.convertToZone(ICAL.Timezone.localTimezone);
            occurrenceTimeZone = userTimeZone;
          }

          // Add occurrence time zone to the set
          timeZones.add(occurrenceTimeZone);

          occurrences.push({
            title: occurrence.item.summary,
            start: occurrenceStartDate.toJSDate(),
            end: occurrenceEndDate.toJSDate(),
            allDay: occurrenceStartDate.isDate,
          });
          count++;
        }
      } else {
        var eventStartDate = event.startDate;
        var eventEndDate = event.endDate;

        // Determine time zone
        var eventTimeZone = eventStartDate.zone.tzid || "UTC";

        if (eventTimeZone === "UTC") {
          // Convert UTC to user's local time zone
          eventStartDate = eventStartDate.convertToZone(ICAL.Timezone.localTimezone);
          if (eventEndDate) {
            eventEndDate = eventEndDate.convertToZone(ICAL.Timezone.localTimezone);
          }
          eventTimeZone = userTimeZone;
        }

        // Add event time zone to the set
        timeZones.add(eventTimeZone);

        occurrences.push({
          title: event.summary,
          start: eventStartDate.toJSDate(),
          end: eventEndDate ? eventEndDate.toJSDate() : null,
          allDay: eventStartDate.isDate,
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
