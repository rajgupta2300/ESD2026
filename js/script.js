// DOM Elements
const yearSelect = document.getElementById('yearSelect');
const modeSelect = document.getElementById('modeSelect');
const startBtn = document.getElementById('startBtn');
const quizArea = document.getElementById('quizArea');
const resultArea = document.getElementById('resultArea');
const contentArea = document.getElementById('contentArea');
const progressTitle = document.getElementById('progressTitle');
const currentScoreEl = document.getElementById('currentScore');
const totalScoreWrapper = document.getElementById('totalScoreWrapper');
const totalQuestionsEl = document.getElementById('totalQuestions');
let currentActionBtn = document.getElementById('mainActionBtn');
const restartBtn = document.getElementById('restartBtn');
const finalScoreEl = document.getElementById('finalScore');
const finalTotalEl = document.getElementById('finalTotal');
const backBtn = document.getElementById('backBtn');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');

// Global State
let mode = 'mixed'; // 'mixed' or 'weekly'
let score = 0;
let questionsAnsweredInBlock = 0; // Tracks questions answered per page (batch of 10)
let currentBlockTotalQ = 0; // Tracks expected questions in current view

// Mixed Mode State
let mixedQuestions = [];
let mixedCurrentPage = 0;

// Weekly Mode State
let currentWeekIdx = 1;


function init() {
    if (typeof weekData2026 === 'undefined' || typeof weekData2022 === 'undefined' || typeof weekData2025 === 'undefined') {
        console.warn("Some questions data did not load properly.");
    }
    startBtn.addEventListener('click', startPractice);
    restartBtn.addEventListener('click', resetQuiz);
    if(backBtn) backBtn.addEventListener('click', resetQuiz);
    
    if(scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    if(scrollBottomBtn) {
        scrollBottomBtn.addEventListener('click', () => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });
    }
}

function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

function startPractice() {
    const yearSelection = yearSelect.value;
    const modeSelection = modeSelect.value;
    
    // Dynamically pick dataset
    let currentData = weekData2026;
    if (yearSelection === '2022') currentData = weekData2022;
    if (yearSelection === '2025') currentData = weekData2025;
    
    document.querySelector('header').classList.add('hidden');
    resultArea.classList.add('hidden');
    quizArea.classList.remove('hidden');
    
    score = 0;
    currentScoreEl.textContent = score;

    if (modeSelection === 'mixed') {
        mode = 'mixed';
        
        // Prepare shuffled questions
        mixedQuestions = [];
        currentData.forEach(week => {
            mixedQuestions = mixedQuestions.concat(week.questions);
        });
        mixedQuestions = shuffleArray(mixedQuestions);
        mixedCurrentPage = 0;

        totalScoreWrapper.classList.add('hidden'); // Simplified cumulative score
        
        setupActionBtn('mixed', currentData);
        loadMixedBatch(currentData);
        
    } else {
        mode = 'weekly';
        currentWeekIdx = parseInt(modeSelection);
        
        totalScoreWrapper.classList.add('hidden');
        
        setupActionBtn('weekly', currentData);
        loadWeek(currentWeekIdx, currentData);
    }
}

function setupActionBtn(activeMode, currentData) {
    // Clone and replace button to clear old event listeners
    const newBtn = currentActionBtn.cloneNode(true);
    currentActionBtn.parentNode.replaceChild(newBtn, currentActionBtn);
    currentActionBtn = newBtn;
    currentActionBtn.classList.add('hidden');

    if (activeMode === 'mixed') {
        currentActionBtn.addEventListener('click', () => {
            mixedCurrentPage++;
            loadMixedBatch(currentData);
        });
    } else {
        currentActionBtn.addEventListener('click', () => {
            currentWeekIdx++;
            loadWeek(currentWeekIdx, currentData);
        });
    }
}

// ---------------------------
// MIXED MODE LOGIC (10 by 10)
// ---------------------------
function loadMixedBatch(currentData) {
    const startIndex = mixedCurrentPage * 10;
    if (startIndex >= mixedQuestions.length) {
        endQuiz();
        return;
    }

    const endIndex = Math.min(startIndex + 10, mixedQuestions.length);
    const batch = mixedQuestions.slice(startIndex, endIndex);

    currentBlockTotalQ = batch.length;
    questionsAnsweredInBlock = 0;

    progressTitle.textContent = `Mixed Exam: Questions ${startIndex + 1} to ${endIndex} of ${mixedQuestions.length}`;
    
    contentArea.innerHTML = '';
    currentActionBtn.classList.add('hidden');

    batch.forEach((q, index) => {
        const globalIndex = startIndex + index + 1;
        const qContainer = createQuestionDOM(q, `Q${globalIndex}. `);
        qContainer.style.marginBottom = '2rem';
        contentArea.appendChild(qContainer);
    });
}

// ---------------------------
// WEEKLY MODE LOGIC (10 by 10)
// ---------------------------
function loadWeek(weekNum, currentData) {
    if (weekNum > currentData.length) {
        endQuiz();
        return;
    }

    const weekInfo = currentData.find(w => w.week === weekNum);
    if (!weekInfo || weekInfo.questions.length === 0) {
        contentArea.innerHTML = `<p>No questions found for Week ${weekNum}. Skipping...</p>`;
        currentActionBtn.textContent = 'Proceed to Next Week \u2192';
        currentActionBtn.classList.remove('hidden');
        return;
    }

    currentBlockTotalQ = weekInfo.questions.length;
    questionsAnsweredInBlock = 0;

    progressTitle.textContent = `Practicing: Week ${weekNum}`;
    
    contentArea.innerHTML = '';
    currentActionBtn.classList.add('hidden');

    weekInfo.questions.forEach((q, index) => {
        const qContainer = createQuestionDOM(q, `Q${index + 1}. `);
        qContainer.style.marginBottom = '2rem';
        contentArea.appendChild(qContainer);
    });
}

// ---------------------------
// SHARED DOM RENDERING
// ---------------------------
function createQuestionDOM(q, prefixTitle = '') {
    const qContainer = document.createElement('div');
    qContainer.className = 'question-container glass-card';

    const qTitle = document.createElement('h3');
    qTitle.style.marginBottom = '1.5rem';
    qTitle.style.lineHeight = '1.5';
    qTitle.textContent = `${prefixTitle}${q.question}`;
    qContainer.appendChild(qTitle);

    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'options-grid';
    
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-box hidden';

    const correctOptionObj = q.options.find(o => o.id === q.answer_id) || q.options[0];
    const correctText = q.answer || (correctOptionObj ? correctOptionObj.text : "");

    const shuffledOptions = shuffleArray(q.options);

    shuffledOptions.forEach(opt => {
        const optBtn = document.createElement('div');
        optBtn.className = 'option';
        optBtn.textContent = opt.text;
        
        optBtn.addEventListener('click', () => {
            if(optBtn.classList.contains('disabled')) return;
            handleAnswerSelect(optBtn, optionsGrid, feedbackDiv, opt.text === correctText, correctText, q);
        });
        
        optionsGrid.appendChild(optBtn);
    });

    qContainer.appendChild(optionsGrid);
    qContainer.appendChild(feedbackDiv);
    return qContainer;
}

function handleAnswerSelect(selectedEl, optionsGrid, feedbackDiv, isCorrect, correctText, questionData) {
    // Disable grid
    const allOptions = optionsGrid.querySelectorAll('.option');
    allOptions.forEach(opt => {
        opt.classList.add('disabled');
        opt.style.pointerEvents = 'none';

        if (opt.textContent === correctText) {
            opt.classList.add('correct');
        }
    });

    if (isCorrect) {
        score++;
        currentScoreEl.textContent = score;
        selectedEl.classList.add('correct');
        feedbackDiv.classList.add('correct');
        feedbackDiv.innerHTML = `<div style="color: #34d399; font-weight: bold;">Correct!</div>`;
    } else {
        selectedEl.classList.add('incorrect');
        feedbackDiv.classList.add('incorrect');
        feedbackDiv.innerHTML = `<div style="color: #f87171; font-weight: bold;">Incorrect!</div>`;
    }

    feedbackDiv.classList.remove('hidden');
    
    // Add correct answer output, WITHOUT the explanation
    const expDiv = document.createElement('div');
    expDiv.className = 'explanation';
    expDiv.style.marginTop = '0.5rem';
    expDiv.innerHTML = `<strong>Correct Answer:</strong> ${correctText}`;
    feedbackDiv.appendChild(expDiv);

    // Track progression handling for 10-item blocks
    questionsAnsweredInBlock++;
    if(questionsAnsweredInBlock >= currentBlockTotalQ) {
        currentActionBtn.classList.remove('hidden');
        
        if (mode === 'mixed') {
            const isLastPage = ((mixedCurrentPage + 1) * 10) >= mixedQuestions.length;
            currentActionBtn.textContent = isLastPage ? 'Finish Practice \u2192' : 'Load Next 10 Questions \u2192';
        } else {
            if (currentWeekIdx >= 12) {
                currentActionBtn.textContent = 'Finish Course \u2192';
            } else {
                currentActionBtn.textContent = `Proceed to Week ${currentWeekIdx + 1} \u2192`;
            }
        }
    }
}

function endQuiz() {
    quizArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    finalScoreEl.textContent = score;
    if (mode === 'mixed') {
        finalTotalEl.textContent = mixedQuestions.length;
    } else {
        finalTotalEl.textContent = "120 (All Weeks Combined)";
    }
}

function resetQuiz() {
    document.querySelector('header').classList.remove('hidden');
    resultArea.classList.add('hidden');
    quizArea.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);
