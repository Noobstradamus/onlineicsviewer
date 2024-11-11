document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");
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
        reader.readAsText(file);
      } else {
        alert("Please upload a valid .ics file.");
      }
    });
});

function parseICS(data, calendar) {
  var jcalData = ICAL.parse(data);
  var comp = new ICAL.Component(jcalData);
  var vevents = comp.getAllSubcomponents("vevent");
  var events = vevents.map(function (vevent) {
    var event = new ICAL.Event(vevent);
    return {
      title: event.summary,
      start: event.startDate.toJSDate(),
      end: event.endDate.toJSDate(),
    };
  });

  // Add events to the calendar
  calendar.removeAllEvents();
  calendar.addEventSource(events);
}
