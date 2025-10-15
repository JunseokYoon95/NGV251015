# NGV251015

A calming browser-based clock that mirrors the user's local time, adds a gentle minute-mark animation, and places the experience over an interactive world map.

## Features
- English UI that follows the browser's locale while keeping date and time formatting consistent.
- One-click toggle between 24-hour and 12-hour displays.
- Soft ripple animation that plays every time the minute changes (automatically disabled when reduced-motion is requested).
- Stylised background world map; select a highlighted region to reveal its current local time.
- Keyboard-accessible interactions and graceful fallbacks when timezone formatting is not available.

## Getting Started
1. Open `index.html` from the project folder in a modern browser.
2. Watch the clock update in real time based on your device's timezone.
3. Toggle the hour format or explore regional times by clicking (or focusing and pressing Enter/Space) on the map.

## Customisation Tips
- Update the colours or gradients inside `style.css` to suit different moods.
- Adjust the `data-tz` values in `index.html` if you want the map regions to reference other cities or timezones.
- Tweak the animation timing in `style.css` (`minuteBloom` keyframes) for a faster or slower ripple effect.
