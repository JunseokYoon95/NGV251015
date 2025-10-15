const timeElement = document.getElementById("clock-time");
const dateElement = document.getElementById("clock-date");
const toggleButton = document.getElementById("format-toggle");

let use24Hour = true;
const DAY_LABELS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function pad(value) {
  return value.toString().padStart(2, "0");
}

function formatTime(date) {
  let hours = date.getHours();

  if (!use24Hour) {
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${pad(hours)}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${ampm}`;
  }

  return `${pad(hours)}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const dayLabel = DAY_LABELS[date.getDay()];
  return `${year}년 ${month}월 ${day}일 ${dayLabel}`;
}

function updateClock() {
  const now = new Date();
  timeElement.textContent = formatTime(now);
  dateElement.textContent = formatDate(now);
}

toggleButton.addEventListener("click", () => {
  use24Hour = !use24Hour;
  toggleButton.textContent = use24Hour ? "24시간 보기" : "12시간 보기";
  updateClock();
});

// Update once immediately before starting the interval so the clock is never stale.
updateClock();
setInterval(updateClock, 500);
