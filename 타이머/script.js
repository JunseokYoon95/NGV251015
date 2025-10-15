const timeElement = document.getElementById("clock-time");
const dateElement = document.getElementById("clock-date");
const toggleButton = document.getElementById("format-toggle");
const minuteWave = document.getElementById("minute-wave");
const mapInfo = document.getElementById("map-info");
const mapRegions = document.querySelectorAll(".world-map__region");

let use24Hour = true;
let lastMinute = null;
let waveTimeoutId = null;

const browserLocale = navigator.language || "en-US";
const hasIntl = typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function";

function formatClockTime(date) {
  if (!hasIntl) {
    return date.toLocaleTimeString(browserLocale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !use24Hour,
    });
  }

  const locale = use24Hour ? "en-GB" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !use24Hour,
  }).format(date);
}

function formatClockDate(date) {
  if (!hasIntl) {
    return date.toDateString();
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function triggerMinuteAnimation() {
  if (!minuteWave) {
    return;
  }

  minuteWave.classList.remove("is-active");
  // Force reflow so the animation can replay even if triggered quickly.
  void minuteWave.offsetWidth;
  minuteWave.classList.add("is-active");

  if (waveTimeoutId) {
    clearTimeout(waveTimeoutId);
  }

  waveTimeoutId = window.setTimeout(() => {
    minuteWave.classList.remove("is-active");
  }, 6000);
}

function updateClock() {
  const now = new Date();
  timeElement.textContent = formatClockTime(now);
  dateElement.textContent = formatClockDate(now);

  const currentMinute = now.getMinutes();
  if (lastMinute === null) {
    lastMinute = currentMinute;
  } else if (currentMinute !== lastMinute) {
    lastMinute = currentMinute;
    triggerMinuteAnimation();
  }
}

function formatRegionTime(timeZone) {
  const now = new Date();
  try {
    if (!hasIntl) {
      const fallback = now.toLocaleString(browserLocale, { timeZone });
      return { time: fallback, date: "" };
    }

    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone,
    });

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone,
    });

    return {
      time: timeFormatter.format(now),
      date: dateFormatter.format(now),
    };
  } catch (error) {
    console.error("Timezone formatting failed", error);
    const fallback = now.toLocaleString(browserLocale, { timeZone });
    return { time: fallback, date: "" };
  }
}

function handleRegionSelection(region) {
  const zoneName = region.dataset.zone;
  const timeZone = region.dataset.tz;

  if (!zoneName || !timeZone) {
    return;
  }

  mapRegions.forEach((element) => element.classList.remove("is-active"));
  region.classList.add("is-active");

  const { time, date } = formatRegionTime(timeZone);
  const dateSuffix = date ? " - " + date : "";
  mapInfo.textContent = `${zoneName}: ${time}${dateSuffix}`;
}

function enableMapInteractions() {
  mapRegions.forEach((region) => {
    region.addEventListener("click", () => handleRegionSelection(region));
    region.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRegionSelection(region);
      }
    });
  });
}

toggleButton.addEventListener("click", () => {
  use24Hour = !use24Hour;
  toggleButton.textContent = use24Hour
    ? "Switch to 12-hour"
    : "Switch to 24-hour";
  updateClock();
});

enableMapInteractions();
updateClock();
setInterval(updateClock, 1000);
