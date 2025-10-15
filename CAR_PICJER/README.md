# Car Picker Quiz — Design & Setup

## Overview
- **Goal**: Browser quiz that shows a random car photo and asks the player to pick the correct make + model from 5 options.
- **Question count**: 10 per session.
- **Scoring**: 10 points per correct answer (max 100).
- **Time limit**: 60 seconds per question, with an on-screen countdown.
- **Assets**: Car photos live in `C:\Users\user\Desktop\CAR_PICKER\data\*.JPG`.

## Architecture
- **Static web app** served from `public/` (pure HTML/CSS/JS).
- **Data manifest** (`public/data/cars.json`) lists each image with parsed `make`, `model`, and `label`.
- **Manifest builder** (`scripts/build_manifest.py`) scans the source image directory, normalises metadata, copies the files into the web app (`public/images/cars/`), and writes `cars.json`.
- **Runtime** (browser):
  1. Load `cars.json`.
  2. Randomly pick 10 unique entries for the session.
  3. For each question, build 5 choices (correct + 4 wrong answers from other makes).
  4. Start a 60-second countdown; moving to the next question on answer or timeout.
  5. Track score, elapsed time, and finished questions.
  6. Show a results screen with total score and review list (correct answer + image thumbnail).

## Key Files
```
CAR_PICJER/
├── README.md                # this design document
├── public/
│   ├── index.html           # markup for start, quiz, and results screens
│   ├── styles.css           # layout, timer styling, and responsive tweaks
│   ├── app.js               # quiz logic, timers, scoring, DOM updates
│   ├── data/
│   │   └── cars.json        # generated metadata manifest (git-ignored)
│   └── images/
│       └── cars/            # copied JPGs for the quiz (git-ignored)
└── scripts/
    └── build_manifest.py    # parses filenames, copies images, writes cars.json
```

## Data Pipeline
1. **Parse filenames**  
   - Expected pattern: `Make_Model_Year_..._suffix.JPG`.  
   - `make` = first token; `model` = tokens until the first 4-digit year or drivetrain marker (`FWD`, `RWD`, `AWD`, `4WD`, `2WD`).  
   - Hyphens/underscores are converted to spaces and title-cased.  
   - Fallback: if no year/drivetrain token exists, use the second token as the model.
2. **Generate manifest**  
   - Each valid image becomes an entry:  
     `{"imagePath": "images/cars/<filename>", "make": "...", "model": "...", "label": "Make Model"}`
   - Duplicate labels with different suffixes are allowed (different images).
   - Unparseable filenames are skipped and logged.
3. **Copy assets**  
   - JPGs copied into `public/images/cars/` so the static server can read them.
   - Large batches can be throttled; optional `--dry-run` shows actions without copying.

## Quiz Logic Highlights
- **Session generation**: random shuffle of manifest entries; first 10 become the quiz (fallback if fewer than 10 available).
- **Choices**:  
  - One correct `label`.  
  - Four distractors filtered to ensure different `make`s.  
  - If not enough unique makes exist, the pool widens (still avoiding duplicate text).
- **Timer**:  
  - 60-second per-question countdown displayed as `mm:ss`.  
  - Timeout auto-submits as incorrect and advances.
- **State machine**:  
  - `start` → `question` (10 iterations) → `results`.  
  - Progress indicator (`current/total`) and running score shown during play.
- **Results**: final score, time spent, list of missed questions with correct labels, restart button.

## Usage Workflow
1. **Install requirements**  
   - Python 3.8+ for manifest script.  
   - No build tool; uses native browser.
2. **Generate manifest & copy images**
   ```powershell
   cd CAR_PICJER
   python scripts/build_manifest.py `
     --source "C:\Users\user\Desktop\CAR_PICKER\data" `
     --dest   ".\public"
   ```
   - Re-run whenever new images are added or renamed.
3. **Serve locally**
   ```powershell
   cd public
   python -m http.server 8000
   ```
   - Open `http://localhost:8000` in a browser.
4. **Play test**
   - Click Start, answer 10 questions, verify timer/score behaviours.

## Extensibility Ideas
- Add difficulty filters (by make frequency or model rarity).
- Introduce streak bonuses or life system.
- Persist high scores using `localStorage` or a lightweight backend.
- Generate thumbnails during manifest build to speed up image loads for very large datasets.

