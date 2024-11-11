document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");

  // Initialize the calendar without timeZoneLabel
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    editable: false,
    selectable: false,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,dayGridWeek,dayGridDay",
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
          parseICS(icsData, calendar);
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

function parseICS(data, calendar) {
  try {
    console.log("Parsing ICS data...");
    var jcalData = ICAL.parse(data);
    console.log("jcalData:", jcalData);

    var comp = new ICAL.Component(jcalData);
    var vevents = comp.getAllSubcomponents("vevent");
    console.log("Found vevents:", vevents.length);

    // Extract the time zone from the VEVENTs
    var timeZonesUsed = new Set();
    vevents.forEach(function(vevent) {
      var dtstartProp = vevent.getFirstProperty('dtstart');
      var tzid = dtstartProp.getParameter('tzid');
      if (tzid) {
        timeZonesUsed.add(tzid);
      }
    });
    // Choose the time zone to display (e.g., the first one)
    var timeZoneName = timeZonesUsed.values().next().value || 'UTC';
    console.log("Extracted Time Zone:", timeZoneName);
    
    // Update the calendar header to display the time zone
    updateCalendarHeader(calendar, timeZoneName);

    var events = vevents.map(function (vevent) {
      var event = new ICAL.Event(vevent);
      console.log("Processing event:", event);

      // Handle recurrence rules
      var occurrences = [];
      if (event.isRecurring()) {
        var recurExp = event.iterator();
        var next;
        var maxOccurrences = 50; // Limit to prevent infinite loops
        var count = 0;

        while ((next = recurExp.next()) && count < maxOccurrences) {
          var occurrence = event.getOccurrenceDetails(next);
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

    // Add events to the calendar
    calendar.removeAllEvents();
    calendar.addEventSource(events);
  } catch (error) {
    console.error("Error parsing ICS data:", error);
    // Display the actual error message to the user
    alert("Error parsing ICS file: " + error.message);
  }
}

function updateCalendarHeader(calendar, timeZoneName) {
  // Update the customButtons with the new time zone
  calendar.setOption('customButtons', {
    timeZoneLabel: {
      text: timeZoneName,
      click: function() {
        // Optional: Define click behavior if needed
      }
    }
  });

  // Update the headerToolbar to include the timeZoneLabel
  calendar.setOption('headerToolbar', {
    left: "prev,next today",
    center: "title",
    right: "timeZoneLabel dayGridMonth,dayGridWeek,dayGridDay",
  });

  // Re-render the header to apply changes
  calendar.render();
}
