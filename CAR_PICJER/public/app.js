const SETTINGS = Object.freeze({
  questionCount: 10,
  choicesPerQuestion: 5,
  secondsPerQuestion: 60,
  manifestPath: "data/cars.json",
});

const MIN_FIREWORK_SCORE = 80;

const selectors = {
  startScreen: document.querySelector("#start-screen"),
  quizScreen: document.querySelector("#quiz-screen"),
  resultsScreen: document.querySelector("#results-screen"),
  startButton: document.querySelector("#start-btn"),
  restartButton: document.querySelector("#restart-btn"),
  backButton: document.querySelector("#back-btn"),
  startStatus: document.querySelector("#start-status"),
  progress: document.querySelector("#progress"),
  score: document.querySelector("#score"),
  timerValue: document.querySelector("#timer-value"),
  questionImage: document.querySelector("#question-image"),
  choices: document.querySelector("#choices"),
  feedback: document.querySelector("#feedback"),
  finalScore: document.querySelector("#final-score"),
  finalTime: document.querySelector("#final-time"),
  review: document.querySelector("#review"),
  choiceTemplate: document.querySelector("#choice-template"),
  reviewTemplate: document.querySelector("#review-item-template"),
  fireworks: document.querySelector("#fireworks"),
};

const state = {
  manifest: [],
  quizItems: [],
  currentIndex: -1,
  score: 0,
  timerId: null,
  secondsRemaining: SETTINGS.secondsPerQuestion,
  locked: false,
  results: [],
  quizStartedAt: null,
  fireworksTimeout: null,
};

init();

async function init() {
  bindEvents();
  resetToStart();
  await preloadManifest();
}

function bindEvents() {
  selectors.startButton.addEventListener("click", () => {
    if (!state.manifest.length) return;
    startQuiz();
  });

  selectors.restartButton.addEventListener("click", () => {
    resetToStart();
  });

  selectors.backButton.addEventListener("click", () => {
    resetToStart();
  });
}

async function preloadManifest() {
  try {
    const response = await fetch(SETTINGS.manifestPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`메타데이터를 불러올 수 없습니다 (${response.status})`);
    }

    const data = await response.json();
    state.manifest = Array.isArray(data) ? data.filter(isValidEntry) : [];

    if (state.manifest.length < SETTINGS.choicesPerQuestion) {
      selectors.startStatus.textContent =
        "이미지가 충분하지 않습니다. 매니페스트를 다시 생성해 주세요.";
      selectors.startButton.disabled = true;
      return;
    }

    selectors.startStatus.textContent =
      "퀴즈를 시작하려면 시작 버튼을 눌러주세요.";
    selectors.startButton.disabled = false;
  } catch (error) {
    selectors.startStatus.textContent = `오류: ${error.message}`;
    selectors.startButton.disabled = true;
    console.error(error);
  }
}

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry.imagePath === "string" &&
    typeof entry.label === "string" &&
    typeof entry.make === "string"
  );
}

function startQuiz() {
  hideFireworks();

  const availableCount = Math.min(
    SETTINGS.questionCount,
    state.manifest.length,
  );

  if (availableCount < SETTINGS.choicesPerQuestion) {
    selectors.startStatus.textContent =
      "퀴즈를 시작하기에 이미지가 부족합니다.";
    selectors.startButton.disabled = true;
    return;
  }

  state.quizItems = generateQuizItems(availableCount);
  state.currentIndex = 0;
  state.score = 0;
  state.results = [];
  state.quizStartedAt = performance.now();
  state.locked = false;

  selectors.score.textContent = "점수: 0";
  selectors.feedback.textContent = "";
  selectors.feedback.classList.remove("is-positive", "is-negative");

  showScreen("quiz");
  renderQuestion();
}

function generateQuizItems(count) {
  const shuffled = shuffle(state.manifest);
  const selected = shuffled.slice(0, count);

  return selected.map((entry) => ({
    entry,
    choices: buildChoices(entry, state.manifest, SETTINGS.choicesPerQuestion),
  }));
}

function buildChoices(correctEntry, pool, targetCount) {
  const normalize = (text) =>
    text.toLowerCase().replace(/\s+/g, " ").replace(/-+/g, " ").trim();

  const uniqueLabels = new Set([normalize(correctEntry.label)]);
  const usedMakes = new Set([correctEntry.make.toLowerCase()]);
  const choices = [correctEntry.label];

  const others = shuffle(pool.filter((item) => item !== correctEntry));
  const differentMake = others.filter(
    (item) => item.make.toLowerCase() !== correctEntry.make.toLowerCase(),
  );
  const sameMake = others.filter(
    (item) => item.make.toLowerCase() === correctEntry.make.toLowerCase(),
  );

  function tryAddCandidate(candidate) {
    if (!candidate) return false;
    const normalized = normalize(candidate.label);
    if (uniqueLabels.has(normalized)) return false;

    const make = candidate.make.toLowerCase();
    if (
      usedMakes.has(make) &&
      choices.length < targetCount &&
      differentMake.length >= targetCount - 1
    ) {
      return false;
    }

    uniqueLabels.add(normalized);
    usedMakes.add(make);
    choices.push(candidate.label);
    return choices.length >= targetCount;
  }

  for (const candidate of differentMake) {
    if (tryAddCandidate(candidate)) break;
  }

  if (choices.length < targetCount) {
    for (const candidate of sameMake) {
      if (tryAddCandidate(candidate)) break;
    }
  }

  if (choices.length < targetCount) {
    for (const candidate of others) {
      if (tryAddCandidate(candidate)) break;
    }
  }

  return shuffle(choices).slice(0, targetCount);
}

function renderQuestion() {
  const question = state.quizItems[state.currentIndex];
  if (!question) {
    renderResults();
    return;
  }

  state.locked = false;
  selectors.progress.textContent = `${
    state.currentIndex + 1
  } / ${state.quizItems.length}`;
  selectors.feedback.textContent = "";
  selectors.feedback.classList.remove("is-positive", "is-negative");

  selectors.questionImage.src = question.entry.imagePath;
  selectors.questionImage.alt = `${question.entry.label} 사진`;

  renderChoices(question);
  startTimer();
  renderTimer(state.secondsRemaining);
}

function renderChoices(question) {
  selectors.choices.innerHTML = "";

  question.choices.forEach((label) => {
    const button = selectors.choiceTemplate.content
      .firstElementChild.cloneNode(true);

    button.dataset.label = label;
    button.textContent = label;
    button.addEventListener("click", () => handleChoice(label));

    selectors.choices.append(button);
  });
}

function handleChoice(selectedLabel) {
  if (state.locked) return;
  state.locked = true;
  stopTimer();

  const question = state.quizItems[state.currentIndex];
  const isCorrect = selectedLabel === question.entry.label;

  if (isCorrect) {
    state.score += 10;
  }

  selectors.score.textContent = `점수: ${state.score}`;

  revealAnswer(question.entry.label, selectedLabel);
  updateFeedback(isCorrect, false);
  recordResult(question, selectedLabel, isCorrect, false);

  setTimeout(nextQuestion, 900);
}

function revealAnswer(correctLabel, selectedLabel) {
  const buttons = selectors.choices.querySelectorAll(".choice");

  buttons.forEach((button) => {
    const label = button.dataset.label;
    button.disabled = true;

    if (label === correctLabel) {
      button.classList.add("is-correct");
    } else if (label === selectedLabel) {
      button.classList.add("is-wrong");
    } else {
      button.classList.add("is-neutral");
    }
  });
}

function updateFeedback(isCorrect, isTimeout) {
  selectors.feedback.classList.remove("is-positive", "is-negative");

  if (isCorrect) {
    selectors.feedback.textContent = "정답입니다! 멋져요.";
    selectors.feedback.classList.add("is-positive");
  } else if (isTimeout) {
    selectors.feedback.textContent = "시간 초과! 정답을 확인해 보세요.";
    selectors.feedback.classList.add("is-negative");
  } else {
    selectors.feedback.textContent = "아쉽네요. 다음 문제로 넘어갑니다.";
    selectors.feedback.classList.add("is-negative");
  }
}

function recordResult(question, selectedLabel, isCorrect, isTimeout) {
  const elapsedSeconds = isTimeout
    ? SETTINGS.secondsPerQuestion
    : SETTINGS.secondsPerQuestion - state.secondsRemaining;

  state.results.push({
    index: state.currentIndex + 1,
    imagePath: question.entry.imagePath,
    correctLabel: question.entry.label,
    selectedLabel,
    isCorrect,
    isTimeout,
    elapsedSeconds: Math.min(
      SETTINGS.secondsPerQuestion,
      Math.max(elapsedSeconds, 0),
    ),
  });
}

function startTimer() {
  stopTimer();
  state.secondsRemaining = SETTINGS.secondsPerQuestion;
  renderTimer(state.secondsRemaining);

  state.timerId = window.setInterval(() => {
    state.secondsRemaining -= 1;

    if (state.secondsRemaining <= 0) {
      stopTimer();
      handleTimeout();
      return;
    }

    renderTimer(state.secondsRemaining);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function handleTimeout() {
  if (state.locked) return;
  state.locked = true;
  state.secondsRemaining = 0;
  renderTimer(0);

  const question = state.quizItems[state.currentIndex];
  revealAnswer(question.entry.label, null);
  updateFeedback(false, true);
  recordResult(question, null, false, true);

  setTimeout(nextQuestion, 1100);
}

function renderTimer(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  selectors.timerValue.textContent = `${m}:${s}`;
}

function nextQuestion() {
  state.currentIndex += 1;

  if (state.currentIndex >= state.quizItems.length) {
    renderResults();
  } else {
    renderQuestion();
  }
}

function renderResults() {
  stopTimer();
  showScreen("results");

  const totalScore = state.score;
  const maxScore = state.quizItems.length * 10;
  selectors.finalScore.textContent = `총점: ${totalScore} / ${maxScore}`;

  const totalElapsedMs =
    performance.now() - (state.quizStartedAt ?? performance.now());
  const totalSeconds = Math.round(totalElapsedMs / 1000);
  selectors.finalTime.textContent = `소요 시간: ${formatDuration(totalSeconds)}`;

  if (totalScore >= MIN_FIREWORK_SCORE) {
    triggerFireworks();
  } else {
    hideFireworks();
  }

  renderReview();
}

function renderReview() {
  selectors.review.innerHTML = "";
  const incorrect = state.results.filter((item) => !item.isCorrect);

  if (!incorrect.length) {
    const message = document.createElement("p");
    message.textContent = "모든 문제를 맞혔습니다! 대단해요.";
    selectors.review.append(message);
    return;
  }

  incorrect.forEach((item) => {
    const node = selectors.reviewTemplate.content
      .firstElementChild.cloneNode(true);
    const img = node.querySelector(".review__thumb");
    const questionText = node.querySelector(".review__question");
    const answerText = node.querySelector(".review__answer");

    img.src = item.imagePath;
    img.alt = `${item.correctLabel} 이미지`;
    questionText.textContent = `${item.index}번 문제`;

    const selected = item.selectedLabel ?? "무응답";
    answerText.textContent = `정답: ${item.correctLabel} · 선택: ${selected}`;

    selectors.review.append(node);
  });
}

function showScreen(target) {
  selectors.startScreen.hidden = target !== "start";
  selectors.quizScreen.hidden = target !== "quiz";
  selectors.resultsScreen.hidden = target !== "results";

  document.body.dataset.screen = target;

  if (target === "quiz") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (target !== "results") {
    hideFireworks();
  }
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds.toString().padStart(2, "0")}초`;
}

function resetToStart() {
  stopTimer();
  hideFireworks();

  state.quizItems = [];
  state.currentIndex = -1;
  state.score = 0;
  state.results = [];
  state.quizStartedAt = null;
  state.secondsRemaining = SETTINGS.secondsPerQuestion;
  state.locked = false;

  selectors.progress.textContent = `0 / ${SETTINGS.questionCount}`;
  selectors.score.textContent = "점수: 0";
  selectors.feedback.textContent = "";
  selectors.feedback.classList.remove("is-positive", "is-negative");
  renderTimer(SETTINGS.secondsPerQuestion);
  selectors.choices.innerHTML = "";
  selectors.questionImage.src = "";
  selectors.questionImage.alt = "자동차 사진";
  selectors.review.innerHTML = "";

  showScreen("start");

  window.requestAnimationFrame(() => {
    selectors.startButton?.focus();
  });
}

function triggerFireworks() {
  const container = selectors.fireworks;
  if (!container) return;

  container.hidden = false;
  container.classList.remove("is-active");
  void container.offsetWidth;
  container.classList.add("is-active");

  clearFireworksTimer();
  state.fireworksTimeout = window.setTimeout(() => {
    hideFireworks();
  }, 5000);
}

function hideFireworks() {
  clearFireworksTimer();
  const container = selectors.fireworks;
  if (!container) return;

  container.classList.remove("is-active");
  container.hidden = true;
}

function clearFireworksTimer() {
  if (state.fireworksTimeout) {
    window.clearTimeout(state.fireworksTimeout);
    state.fireworksTimeout = null;
  }
}
