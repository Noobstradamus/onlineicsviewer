document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");

  // Initialize the calendar with timeZone set to 'local'
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    editable: false,
    selectable: false,
    timeZone: 'local', // Use 'local' to respect each event's time zone
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: [], // Start with no events
    eventClick: function(info) {
      // Display more info when an event is clicked
      alert('Event: ' + info.event.title + '\n' +
            'Start: ' + info.event.start.toLocaleString() + '\n' +
            'End: ' + (info.event.end ? info.event.end.toLocaleString() : 'N/A'));
    }
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

function formatDateTimeWithZone(icalTime) {
  function pad(num) {
    return num < 10 ? '0' + num : num;
  }

  var dateString = icalTime.year + '-' + pad(icalTime.month) + '-' + pad(icalTime.day) + 'T' +
                   pad(icalTime.hour) + ':' + pad(icalTime.minute) + ':' + pad(icalTime.second);

  var zone = icalTime.zone;

  if (zone.tzid === 'UTC' || zone.tzid === 'Z') {
    dateString += 'Z';
  } else {
    var offset = zone.utcOffset(icalTime);

    // In ICAL.js, offsets east of UTC are negative
    // Adjust sign for ISO8601 format
    var offsetSign = offset <= 0 ? '+' : '-';

    offset = Math.abs(offset);

    var offsetHours = Math.floor(offset / 60);
    var offsetMinutes = offset % 60;

    dateString += offsetSign + pad(offsetHours) + ':' + pad(offsetMinutes);
  }

  return dateString;
}

function parseICS(data, calendar) {
  try {
    console.log("Parsing ICS data...");
    var jcalData = ICAL.parse(data);
    console.log("jcalData:", jcalData);

    var comp = new ICAL.Component(jcalData);
    var vevents = comp.getAllSubcomponents("vevent");
    console.log("Found vevents:", vevents.length);

    var events = vevents.map(function (vevent) {
      var event = new ICAL.Event(vevent);
      console.log("Processing event:", event);

      // Extract the time zone identifier (TZID)
      var tzid = event.startDate.zone.tzid || 'UTC';

      // Handle recurrence rules
      var occurrences = [];
      if (event.isRecurring()) {
        var recurExp = event.iterator();
        var next;
        var maxOccurrences = 50; // Limit to prevent infinite loops
        var count = 0;

        while ((next = recurExp.next()) && count < maxOccurrences) {
          var occurrence = event.getOccurrenceDetails(next);
          var occurrenceTzid = occurrence.startDate.zone.tzid || 'UTC';

          occurrences.push({
            title: occurrence.item.summary + ' (' + occurrenceTzid + ')',
            start: formatDateTimeWithZone(occurrence.startDate),
            end: occurrence.endDate ? formatDateTimeWithZone(occurrence.endDate) : null,
            allDay: occurrence.startDate.isDate,
          });
          count++;
        }
      } else {
        occurrences.push({
          title: event.summary + ' (' + tzid + ')',
          start: formatDateTimeWithZone(event.startDate),
          end: event.endDate ? formatDateTimeWithZone(event.endDate) : null,
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
    alert("Error parsing ICS file: " + error.message);
  }
}
