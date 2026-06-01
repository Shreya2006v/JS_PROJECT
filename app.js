/**
 * AeroQuiz - Interactive Quiz & Analytics Engine
 * Core Application Logic (jQuery & Chart.js)
 */

// Global State
let allQuestions = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timeoutsCount = 0;
let userAnswers = []; // Stores { questionId, selectedIndex, timeSpent, isCorrect, isTimeout }
let selectedCategory = 'all';

// Timer Variables
let timerInterval = null;
const QUESTION_TIME_LIMIT = 15; // seconds per question
let timeLeft = QUESTION_TIME_LIMIT;
let questionStartTime = 0;

// Chart Instance reference
let categoryChart = null;

// Fallback Questions Dataset (in case of CORS/network issues when opening file:// directly)
const fallbackQuestions = [
  {
    "id": 1,
    "category": "JavaScript Core",
    "question": "What is the output of 'typeof null' in JavaScript?",
    "options": ["\"object\"", "\"null\"", "\"undefined\"", "\"number\""],
    "answerIndex": 0,
    "explanation": "In JavaScript, 'typeof null' returns 'object'. This is a well-known legacy bug in the language that has been preserved for backward compatibility."
  },
  {
    "id": 2,
    "category": "JavaScript Core",
    "question": "Which of the following is NOT a primitive data type in JavaScript?",
    "options": ["String", "Boolean", "Array", "Symbol"],
    "answerIndex": 2,
    "explanation": "Arrays are objects in JavaScript, not primitive data types. Primitive types include String, Number, BigInt, Boolean, Undefined, Null, and Symbol."
  },
  {
    "id": 3,
    "category": "JavaScript Core",
    "question": "What does the array method 'map()' return?",
    "options": [
      "A new array containing results of calling a function on every element",
      "The modified original array in-place",
      "A single accumulated value based on a reducer function",
      "An iterator object containing keys and values"
    ],
    "answerIndex": 0,
    "explanation": "'map()' creates a brand new array populated with the results of calling a provided function on every element in the calling array, without mutating the original."
  },
  {
    "id": 4,
    "category": "JavaScript Core",
    "question": "What is the primary purpose of writing \"use strict\" in JavaScript?",
    "options": [
      "To enforce strict variable camelCase naming rules",
      "To run code in strict mode, catching common errors and preventing unsafe actions",
      "To force the browser to disable asynchronous code execution",
      "To compress and optimize the file size during execution"
    ],
    "answerIndex": 1,
    "explanation": "\"use strict\" defines that the code should be executed in 'strict mode'. This helps prevent common mistakes (like using undeclared variables) by throwing explicit errors."
  },
  {
    "id": 5,
    "category": "HTML & CSS",
    "question": "Which CSS property controls the layout alignment along the cross-axis in a Flexbox container?",
    "options": ["justify-content", "align-items", "flex-direction", "align-content"],
    "answerIndex": 1,
    "explanation": "'align-items' determines how items are aligned along the cross-axis (perpendicular to the main-axis) inside a flex container."
  },
  {
    "id": 6,
    "category": "HTML & CSS",
    "question": "In the standard CSS box model, which layer sits directly between the padding and the margin?",
    "options": ["Content", "Border", "Outline", "Scrollbar"],
    "answerIndex": 1,
    "explanation": "The box model layers from the inside out are: Content -> Padding -> Border -> Margin. Therefore, the Border lies between padding and margin."
  },
  {
    "id": 7,
    "category": "HTML & CSS",
    "question": "What does the HTML5 semantic element '<section>' represent?",
    "options": [
      "A section of a page designed specifically to link to other sites",
      "A generic standalone section of a document that lacks a more specific semantic element",
      "An interactive panel meant for setting user preferences",
      "A layout element reserved strictly for sidebar advertisements"
    ],
    "answerIndex": 1,
    "explanation": "The '<section>' tag represents a generic standalone section of a document, usually with a heading, representing a thematic grouping of content."
  },
  {
    "id": 8,
    "category": "HTML & CSS",
    "question": "How do you apply CSS styles only when the viewport width is 768px or wider?",
    "options": [
      "@media (min-width: 768px)",
      "@media (max-width: 768px)",
      "@screen min-width 768px",
      "@viewport width >= 768px"
    ],
    "answerIndex": 0,
    "explanation": "Media queries use 'min-width: 768px' to apply styles only when the screen size is equal to or greater than 768px."
  },
  {
    "id": 9,
    "category": "Web APIs & Browser",
    "question": "Which of the following is true about standard browser 'localStorage'?",
    "options": [
      "Data automatically expires after the browser window is closed",
      "Data is sent back to the server with every outgoing HTTP request",
      "Data has no expiration time and persists even after closing/reopening the browser",
      "It allows storing up to 500MB of relational SQL database queries"
    ],
    "answerIndex": 2,
    "explanation": "Unlike cookies or sessionStorage, 'localStorage' data does not expire and persists even when the browser is closed and reopened, with a capacity limit around 5MB."
  },
  {
    "id": 10,
    "category": "Web APIs & Browser",
    "question": "Which modern API is used to fetch resources asynchronously across the network?",
    "options": ["Fetch API", "XMLHttpRequest API", "WebSocket API", "Geolocation API"],
    "answerIndex": 0,
    "explanation": "The Fetch API provides a modern, clean, Promise-based syntax for making asynchronous HTTP requests, replacing the older and more verbose XMLHttpRequest."
  },
  {
    "id": 11,
    "category": "Web APIs & Browser",
    "question": "What does the DOM stand for in web development?",
    "options": ["Data Object Model", "Document Object Model", "Digital Output Manager", "Dynamic Object Module"],
    "answerIndex": 1,
    "explanation": "DOM stands for Document Object Model. It is an API representation of the HTML document that allows scripting languages like JavaScript to read and modify structure, style, and content."
  },
  {
    "id": 12,
    "category": "Web APIs & Browser",
    "question": "Which event fires when the HTML document is fully parsed, without waiting for stylesheets, images, and subframes to finish loading?",
    "options": ["load", "DOMContentLoaded", "ready", "onload"],
    "answerIndex": 1,
    "explanation": "The 'DOMContentLoaded' event fires as soon as the HTML document is completely parsed. The 'load' event, however, waits for all external resources (images, stylesheets) to load."
  }
];

// Document Ready
$(document).ready(function() {
  loadQuestions();
});

/**
 * Loads questions from questions.json, falling back to local dataset on error
 */
function loadQuestions() {
  $.getJSON('questions.json')
    .done(function(data) {
      allQuestions = data;
      initApp();
    })
    .fail(function(jqXHR, textStatus, error) {
      console.warn("Could not load questions.json (likely due to local CORS browser policy). Falling back to inline data.", textStatus, error);
      allQuestions = fallbackQuestions;
      initApp();
    });
}

/**
 * Initializes listeners and sets up the Category Selection screen
 */
function initApp() {
  // Category Selection click listener
  $('.category-card').on('click', function() {
    $('.category-card').removeClass('active');
    $(this).addClass('active');
    selectedCategory = $(this).attr('data-category');
  });

  // Start button listener
  $('#btn-start').on('click', function() {
    startQuiz();
  });

  // Next button listener
  $('#btn-next').on('click', function() {
    goToNextQuestion();
  });

  // Restart button listener
  $('#btn-restart').on('click', function() {
    startQuiz();
  });

  // Back to home button listener
  $('#btn-home').on('click', function() {
    showScreen('welcome-screen');
  });
}

/**
 * Helper to transition between screens smoothly
 */
function showScreen(screenId) {
  $('.screen').removeClass('active');
  $(`#${screenId}`).addClass('active');
}

/**
 * Begins a new quiz session based on chosen category
 */
function startQuiz() {
  // Reset state variables
  currentQuestionIndex = 0;
  score = 0;
  timeoutsCount = 0;
  userAnswers = [];

  // Filter questions by category
  if (selectedCategory === 'all') {
    // Shuffle all questions to make retries dynamic
    quizQuestions = shuffleArray([...allQuestions]);
  } else {
    // Filter and shuffle
    const filtered = allQuestions.filter(q => q.category === selectedCategory);
    quizQuestions = shuffleArray([...filtered]);
  }

  // Load first question
  loadQuestion(currentQuestionIndex);
  showScreen('quiz-screen');
}

/**
 * Loads question data into the UI
 */
function loadQuestion(index) {
  const question = quizQuestions[index];
  
  // Update progress tracking header
  $('#quiz-category-tag').text(question.category);
  $('#current-question-num').text(index + 1);
  $('#total-questions-num').text(quizQuestions.length);
  
  // Progress Bar
  const progressPercent = ((index + 1) / quizQuestions.length) * 100;
  $('#quiz-progress-bar').css('width', `${progressPercent}%`);

  // Question Text
  $('#quiz-question-text').text(question.question);

  // Clear and Render Options
  const $optionsList = $('#quiz-options-list');
  $optionsList.empty();

  question.options.forEach((option, i) => {
    const $optionButton = $('<button>')
      .addClass('option-card')
      .attr('id', `option-${i}`)
      .attr('data-index', i)
      .html(`
        <span class="option-index">${String.fromCharCode(65 + i)}</span>
        <span class="option-text"></span>
      `);
    
    // Using text() to escape HTML for safety
    $optionButton.find('.option-text').text(option);
    $optionsList.append($optionButton);
  });

  // Bind click listeners for options
  $('.option-card').on('click', function() {
    handleAnswerSelection(parseInt($(this).attr('data-index')));
  });

  // Hide feedback & next button
  $('#quiz-feedback-box').addClass('hidden');
  $('#btn-next').addClass('hidden');

  // Start question timer
  startTimer();
}

/**
 * Controls the Question Countdown Timer
 */
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = QUESTION_TIME_LIMIT;
  questionStartTime = Date.now();
  
  updateTimerUI();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

/**
 * Updates circular countdown indicator and count text
 */
function updateTimerUI() {
  $('#timer-counter').text(timeLeft);

  // SVG Circumference is 151 (r=24)
  const circumference = 151;
  const offset = circumference - (timeLeft / QUESTION_TIME_LIMIT) * circumference;
  
  const $indicator = $('#timer-indicator');
  $indicator.css('stroke-dashoffset', offset);

  // Visual warning colors as time runs out
  if (timeLeft <= 4) {
    $indicator.css('stroke', 'var(--error-neon)');
  } else if (timeLeft <= 8) {
    $indicator.css('stroke', 'var(--warning-neon)');
  } else {
    $indicator.css('stroke', 'var(--primary-neon)');
  }
}

/**
 * Processes option selection by the user
 */
function handleAnswerSelection(selectedIndex) {
  // Stop timer immediately
  clearInterval(timerInterval);
  const timeSpent = Math.min(((Date.now() - questionStartTime) / 1000).toFixed(1), QUESTION_TIME_LIMIT);
  
  const question = quizQuestions[currentQuestionIndex];
  const isCorrect = (selectedIndex === question.answerIndex);
  
  if (isCorrect) score++;

  // Save response details
  userAnswers.push({
    questionId: question.id,
    selectedIndex: selectedIndex,
    timeSpent: parseFloat(timeSpent),
    isCorrect: isCorrect,
    isTimeout: false
  });

  // Lock and color options
  revealCorrectAnswer(selectedIndex, question.answerIndex);

  // Show Feedback block
  showFeedback(isCorrect, question.explanation);
}

/**
 * Handles action when timer expires
 */
function handleTimeout() {
  const question = quizQuestions[currentQuestionIndex];
  timeoutsCount++;

  userAnswers.push({
    questionId: question.id,
    selectedIndex: -1,
    timeSpent: QUESTION_TIME_LIMIT,
    isCorrect: false,
    isTimeout: true
  });

  // Lock and reveal correct answer
  revealCorrectAnswer(-1, question.answerIndex);

  // Show Feedback block as timeout explanation
  showFeedback(false, question.explanation, true);
}

/**
 * Style options based on answer correctness
 */
function revealCorrectAnswer(selectedIndex, correctIndex) {
  $('.option-card').addClass('disabled');
  
  $('.option-card').each(function() {
    const idx = parseInt($(this).attr('data-index'));
    
    if (idx === correctIndex) {
      $(this).addClass('correct');
    } else if (idx === selectedIndex) {
      $(this).addClass('incorrect');
    } else {
      $(this).addClass('faded');
    }
  });
}

/**
 * Displays immediate feedback card with description
 */
function showFeedback(isCorrect, explanation, isTimeout = false) {
  const $feedbackBox = $('#quiz-feedback-box');
  const $iconPlaceholder = $('#feedback-icon-placeholder');
  const $title = $('#feedback-title-text');
  const $explanationText = $('#feedback-explanation-text');

  // Reset classes
  $feedbackBox.removeClass('correct-feedback incorrect-feedback');
  
  if (isTimeout) {
    $feedbackBox.addClass('incorrect-feedback');
    $iconPlaceholder.html(`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    `);
    $title.text("Time's Up!");
  } else if (isCorrect) {
    $feedbackBox.addClass('correct-feedback');
    $iconPlaceholder.html(`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    `);
    $title.text("Correct!");
  } else {
    $feedbackBox.addClass('incorrect-feedback');
    $iconPlaceholder.html(`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide-x-circle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    `);
    $title.text("Incorrect");
  }

  $explanationText.text(explanation);
  $feedbackBox.removeClass('hidden');
  
  // Show next button
  $('#btn-next').removeClass('hidden');
}

/**
 * Proceeds to the next question or completes the assessment
 */
function goToNextQuestion() {
  currentQuestionIndex++;

  if (currentQuestionIndex < quizQuestions.length) {
    loadQuestion(currentQuestionIndex);
  } else {
    finishQuiz();
  }
}

/**
 * Computes scores and loads the final interactive analytics dashboard
 */
function finishQuiz() {
  showScreen('dashboard-screen');

  // 1. Calculate general scores
  const totalQuestions = quizQuestions.length;
  const accuracyPercent = Math.round((score / totalQuestions) * 100);
  
  // Animate Circular Gauge
  $('#final-score-percent').text(`${accuracyPercent}%`);
  $('#final-score-fraction').text(`${score}/${totalQuestions} Correct`);

  // Dashoffset animation: Max circumference is 502.6 (r=80)
  const scoreCircumference = 502.6;
  const offset = scoreCircumference - (score / totalQuestions) * scoreCircumference;
  
  // Trigger SVG offset animation after screen renders
  setTimeout(() => {
    $('#score-ring-indicator').css('stroke-dashoffset', offset);
  }, 100);

  // 2. Calculate average question time
  let totalTime = 0;
  userAnswers.forEach(ans => totalTime += ans.timeSpent);
  const avgTime = (totalQuestions > 0) ? (totalTime / totalQuestions).toFixed(1) : 0;
  $('#metric-avg-time').text(`${avgTime}s`);

  // 3. Set timeouts count
  $('#metric-timeouts').text(timeoutsCount);

  // 4. Focus Strength category
  let focusStrength = "Steady";
  if (avgTime < 5.0 && accuracyPercent >= 70) {
    focusStrength = "Lightning";
  } else if (avgTime >= 10.0) {
    focusStrength = "Deliberate";
  } else if (accuracyPercent < 50) {
    focusStrength = "Refining";
  }
  $('#metric-focus').text(focusStrength);

  // 5. Calculate category-specific scores for Chart.js
  const categoryStats = calculateCategoryAnalytics();

  // 6. Draw Chart.js Visual representation
  renderAnalyticsChart(categoryStats);

  // 7. Render detailed Review Card List
  renderReviewList();
}

/**
 * Computes accuracy percentages grouped by category
 */
function calculateCategoryAnalytics() {
  const stats = {};

  quizQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    
    if (!stats[q.category]) {
      stats[q.category] = { total: 0, correct: 0 };
    }
    
    stats[q.category].total++;
    if (userAns && userAns.isCorrect) {
      stats[q.category].correct++;
    }
  });

  // Calculate percentages
  const labels = [];
  const percentages = [];

  for (const cat in stats) {
    labels.push(cat);
    const pct = Math.round((stats[cat].correct / stats[cat].total) * 100);
    percentages.push(pct);
  }

  return { labels, percentages };
}

/**
 * Draws the dynamic performance chart using Chart.js
 */
function renderAnalyticsChart(categoryStats) {
  // If there is an existing chart, destroy it to prevent memory leaks and hover artifacts
  if (categoryChart) {
    categoryChart.destroy();
  }

  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  categoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categoryStats.labels,
      datasets: [{
        label: 'Accuracy (%)',
        data: categoryStats.percentages,
        backgroundColor: [
          'rgba(99, 102, 241, 0.4)', // Indigo
          'rgba(6, 182, 212, 0.4)',  // Cyan
          'rgba(236, 72, 153, 0.4)'  // Pink
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(6, 182, 212, 1)',
          'rgba(236, 72, 153, 1)'
        ],
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // No legend needed for single dataset
        },
        tooltip: {
          backgroundColor: 'rgba(11, 15, 25, 0.95)',
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'Inter' },
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Accuracy: ${context.raw}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 }
          }
        },
        y: {
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 11 },
            stepSize: 20,
            callback: function(value) {
              return value + "%";
            }
          }
        }
      }
    }
  });
}

/**
 * Builds the Detailed Question Review Cards in the dashboard scroll container
 */
function renderReviewList() {
  const $reviewList = $('#quiz-review-list');
  $reviewList.empty();

  quizQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    const isCorrect = userAns ? userAns.isCorrect : false;
    const isTimeout = userAns ? userAns.isTimeout : true;
    
    const userText = isTimeout 
      ? "Time Expired" 
      : q.options[userAns.selectedIndex];
      
    const correctText = q.options[q.answerIndex];

    const $reviewItem = $('<div>')
      .addClass('review-item')
      .addClass(isCorrect ? 'correct-item' : 'incorrect-item');

    $reviewItem.html(`
      <div class="review-question-header">
        <h4 class="review-question-text">${q.question}</h4>
        <span class="review-badge">${isCorrect ? 'Correct' : isTimeout ? 'Timeout' : 'Incorrect'}</span>
      </div>
      
      <div class="review-answers">
        <div class="review-ans-row">
          <span class="review-ans-label">Your Answer:</span>
          <span class="review-ans-val ${isCorrect ? 'correct-val' : isTimeout ? 'user-val-timeout' : 'user-val-incorrect'}">
            ${userText}
          </span>
        </div>
        <div class="review-ans-row">
          <span class="review-ans-label">Correct:</span>
          <span class="review-ans-val correct-val">${correctText}</span>
        </div>
      </div>
      
      <div class="review-explanation-text">
        <strong>Explanation:</strong> ${q.explanation}
      </div>
    `);

    $reviewList.append($reviewItem);
  });
}

/**
 * Helper to shuffle an array (Fisher-Yates Algorithm)
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
