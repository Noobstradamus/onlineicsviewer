document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");

  // Initialize the calendar
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    editable: false,
    selectable: false,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,dayGridWeek,dayGridDay",
    },
  });
  calendar.render();

  // Handle file input change
  document
    .getElementById("icsFileInput")
    .addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (file && file.name.endsWith(".ics")) {
        var reader = new FileReader();

        reader.onload = function (e) {
          var icsData = e.target.result;
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
});

function parseICS(data, calendar) {
  try {
    var jcalData = ICAL.parse(data);
    var comp = new ICAL.Component(jcalData);
    var vevents = comp.getAllSubcomponents("vevent");

    var events = vevents.map(function (vevent) {
      var event = new ICAL.Event(vevent);
      return {
        title: event.summary,
        start: event.startDate.toJSDate(),
        end: event.endDate ? event.endDate.toJSDate() : null,
        allDay: event.startDate.isDate,
      };
    });

    // Add events to the calendar
    calendar.removeAllEvents();
    calendar.addEventSource(events);
  } catch (error) {
    console.error("Error parsing ICS data:", error);
    alert("There was an error parsing the ICS file.");
  }
}
