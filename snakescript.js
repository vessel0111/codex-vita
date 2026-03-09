// 
// GAME STATE
// 
let gameState = "start";
let playerPosition = 1;
let gameTime = 0;
let gameInterval;

let winstreak = 0;
let maxStreak = 0;
let wrongStreak = 0;
let totalMoves = 0;
let tileEffects = {};

let fixedRemaining = 1;
let tempRemaining = 0;

let quizMode = "start";
let lastAnswerCorrect = false;

//
//FECTH QUESTION
//

async function loadQuestions() {
    const response = await fetch("questions.json");
    const data = await response.json();
    allQuestions = data;
}

// 
// DICE SYSTEM
// 
let diceInventory = [
    { type: "d6", turns: -1 }
];

let currentDiceMode = "d6";
let skipMovementTurns = 0;

function getDiceObject(type) {
    return diceInventory.find(d => d.type === type);
}

function addDice(type, turns) {
    let existing = getDiceObject(type);

    if (existing) {
        if (existing.turns !== -1) {
            existing.turns += turns;
        }
    } else {
        diceInventory.push({ type, turns });
    }

    updateDiceDisplay();
}

function consumeDiceTurn(type) {
    let dice = getDiceObject(type);
    if (!dice || dice.turns === -1) return;

    dice.turns--;

    if (dice.turns <= 0) {
        diceInventory = diceInventory.filter(d => d.type !== type);

        if (currentDiceMode === type) {
            currentDiceMode = "d6";
        }
    }

    updateDiceDisplay();
}

function updateDiceDisplay() {
    const container = document.getElementById("diceInventory");
    if (!container) return;

    container.innerHTML = "";

    const all1Exists = getDiceObject("all 1s");

    diceInventory.forEach(d => {
        const btn = document.createElement("button");

        btn.textContent =
            d.type + (d.turns > 0 ? ` (${d.turns})` : "");

        // If all1 exists → force use
        if (all1Exists && d.type !== "all 1s") {
            btn.disabled = true;
        }

        btn.onclick = () => {
            if (!all1Exists) {
                currentDiceMode = d.type;
                updateDiceDisplay();
            }
        };

        if (d.type === currentDiceMode) {
            btn.style.border = "2px solid gold";
        }

        container.appendChild(btn);
    });
}

// 
// ATTEMPT DISPLAY
// 
function updateAttemptDisplay() {
    const el = document.getElementById("attemptDisplay");
    if (!el) return;

    const total = fixedRemaining + tempRemaining;
    el.textContent = `Answer Attempts: ${total}`;
}

// 
// DICE ROLL
// 
function Bonus() {
    if (winstreak >= 10) return 3;
    if (winstreak >= 5) return 2;
    if (winstreak >= 2) return 1;
    return 0;
}
function updateStreakDisplay() {
    const bonus = Bonus();
    document.getElementById("streakDisplay").textContent =
        `Answer Streak: ${winstreak} (+${bonus} bonus move)`;
}
function rollDice() {
    totalMoves++;

    // Force all1 if exists
    const all1Dice = getDiceObject("all 1s");
    if (all1Dice) {
        currentDiceMode = "all 1s";
    }

    const diceType = currentDiceMode;
    consumeDiceTurn(diceType);

    const value = generateDiceResult(diceType);
    const bonus = Bonus()
    const finalMove = value + bonus;

    document.getElementById("diceResult").textContent =
        ` Rolled ${value} + ${bonus} streak bonus = ${finalMove}`;

    if (skipMovementTurns > 0) {
        skipMovementTurns--;
        return;
    }

    movePlayer(finalMove);
}

function generateDiceResult(type) {
    switch (type) {
        case "all 6s": return 6;
        case "all 1s": return 1;
        case "even d6": return [2,2,4,4,6,6][Math.floor(Math.random()*6)];
        case "1357": return [1,3,5,7][Math.floor(Math.random()*4)];
        default: return Math.floor(Math.random()*6)+1;
    }
}

// 
// BOARD
// 
let board;

function createBoard() {
    board = document.getElementById("board");
    board.innerHTML = "";

    for (let i = 100; i >= 1; i--) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.id = "cell-" + i;

        if (i === 99) {
            cell.textContent = "💀";
        } else if (tileEffects[i] === "positive") {
            cell.textContent = "🎁";
        } else if (tileEffects[i] === "negative") {
            cell.textContent = "💀";
        } else if (tileEffects[i] === "mystery") {
            cell.textContent = "❓";
        } else {
            cell.textContent = i;
        }

        board.appendChild(cell);
    }
}

function updatePlayer() {
    document.querySelectorAll(".player").forEach(p => p.remove());
    const cell = document.getElementById("cell-" + playerPosition);
    const player = document.createElement("div");
    player.classList.add("player");
    player.innerText = "P";
    cell.appendChild(player);
}

function movePlayer(steps) {
    playerPosition += steps;
    if (playerPosition > 100) playerPosition = 100;

    updatePlayer();

    if (playerPosition === 100) {
        endGame();
        return;
    }

    applyTileEffect(playerPosition);
}

//
//TILE SYSTEM
//
function generateTileEffects() {
    tileEffects = {};
    const MIN = 2;
    const MAX = 98;

    let positivePlaced = 0;
    while (positivePlaced < 10) {
        let tile = Math.floor(Math.random()*(MAX-MIN+1))+MIN;

        if (!tileEffects[tile]) {
            tileEffects[tile] = "positive";
            positivePlaced++;
        } else if (tileEffects[tile] === "negative") {
            tileEffects[tile] = "mystery";
            positivePlaced++;
        }
    }

    let negativePlaced = 0;
    while (negativePlaced < 10) {
        let tile = Math.floor(Math.random()*(MAX-MIN+1))+MIN;

        if (!tileEffects[tile]) {
            tileEffects[tile] = "negative";
            negativePlaced++;
        } else if (tileEffects[tile] === "positive") {
            tileEffects[tile] = "mystery";
            negativePlaced++;
        }
    }
}

//
//TILE EFFECTS
//
function applyTileEffect(tile) {

    if (tile === 99) {
        playerPosition = 2;
        updatePlayer();
        showEffectMessage("💀 So close!!! But the fox has catched up and drag you back to its lair");
        return;
    }

    const type = tileEffects[tile];
    if (!type) return;

    let message = "";

    if (type === "positive") {
        message = applyPositiveEffect();
    }
    else if (type === "negative") {
        message = applyNegativeEffect();
    }
    else {
        message = Math.random() < 0.5
            ? "❓ Mystery → " + applyPositiveEffect()
            : "❓ Mystery → " + applyNegativeEffect();
    }

    showEffectMessage(message);
}

function applyPositiveEffect() {
    const effects = ["dice","temp1","temp2"];
    const choice = effects[Math.floor(Math.random()*effects.length)];

    if (choice === "dice") {
        const diceTypes = ["all 6s","even d6","1357"];
        const randomDice = diceTypes[Math.floor(Math.random()*diceTypes.length)];
        addDice(randomDice,3);
        return `🎁 Gained ${randomDice} (3 turns)`;
    }

    if (choice === "temp1") {
        tempRemaining += 1;
        updateAttemptDisplay();
        return "🎁 +1 Answer Attempt";
    }

    if (choice === "temp2") {
        tempRemaining += 2;
        updateAttemptDisplay();
        return "🎁 +2 Answer Attempts";
    }
}

function applyNegativeEffect() {
    const effects = ["pushback","lock","skip","reset"];
    const choice = effects[Math.floor(Math.random()*effects.length)];

    if (choice === "pushback") {
        let maxPush = Math.floor(playerPosition / 2);
        let pushAmount = Math.floor(Math.random() * (maxPush - 3 + 1)) + 3;
        playerPosition -= pushAmount;
        updatePlayer();
        return `💀 Pushed back ${pushAmount}`;
    }

    if (choice === "lock") {
        addDice("all 1s",3);
        return "💀 You got injured. Forced to use all 1s dic (3 turns)";
    }

    if (choice === "skip") {
        skipMovementTurns += 2;
        return "💀 You got tired. Skip 2 Rolls";
    }

    if (choice === "reset") {
        winstreak = 0;
        updateStreakDisplay();
        return "💀 The way ahead is treacherous. You decided to slow down. Streak reset";
    }
}

// 
// EFFECT SCREEN
// 
function showEffectMessage(text) {
    quizMode = "effect";
    document.getElementById("question").textContent = text;
    document.getElementById("answers").innerHTML = "";
    document.getElementById("nextBtn").classList.remove("hidden");
}

//
// FISHER-YATE SHUFFLE
//
function shuffleArray(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
        [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

// 
// QUESTIONS
// 
let allQuestions = [];
let learningQueue = [];
let masteredPool = [];
let currentQuestion = null;

function initializeQuestions() {
    learningQueue = shuffleArray(allQuestions);
    masteredPool = [];
}

function loadNextQuestion() {
    if (learningQueue.length === 0) {
        learningQueue = shuffleArray(masteredPool);
        masteredPool = [];
    }

    currentQuestion = learningQueue[0];
    fixedRemaining = 1;
    updateAttemptDisplay();
    quizMode = "question";
    renderQuestion();
}

function renderQuestion() {
    const q = document.getElementById("question");
    const a = document.getElementById("answers");
    const next = document.getElementById("nextBtn");

    next.classList.add("hidden");
    a.innerHTML = "";
    q.textContent = currentQuestion.question;

    const shuffledOptions = shuffleArray(currentQuestion.options);

    shuffledOptions.forEach(option => {
        const btn = document.createElement("button");

        btn.textContent = option;

        btn.onclick = () => handleAnswer(option);

        a.appendChild(btn);
    });

}

function handleAnswer(selected) {

    if (quizMode !== "question") return;

    const buttons = document.querySelectorAll("#answers button");
    buttons.forEach(btn => btn.disabled = true);

    const correct =
        selected.toLowerCase() === currentQuestion.answer.toLowerCase();

  
    lastAnswerCorrect = correct;

    if (correct) {

        selectedHighlight(selected, "green");

        consumeAttempt(); 

        winstreak++;
        updateStreakDisplay();
        if (winstreak > maxStreak) {
            maxStreak = winstreak;
        }

        wrongStreak = 0;


        setTimeout(() => {
            showExplanation(currentQuestion.explanation);
        }, 600);

        return; 
    }

    // WRONG ANSWER PATH

    selectedHighlight(selected, "red");

    consumeAttempt(); 

    const attemptsLeft = fixedRemaining + tempRemaining;  
    if (attemptsLeft > 0) {

        setTimeout(() => {
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.backgroundColor = "";
                btn.style.color = "";
            });
        }, 800);

        return;
    }

    // LAST ATTEMPT FAILED
    winstreak = 0;
    wrongStreak++;
    updateStreakDisplay();


    if (wrongStreak % 3 === 0) {

        const existing = getDiceObject("all 1s");

        if (existing) {
            existing.turns += 3;
        } else {
            diceInventory.push({ type: "all 1s", turns: 3 });
        }

        currentDiceMode = "all 1s";
        updateDiceDisplay();

        setTimeout(() => {
            showEffectMessage("💀 3 Wrong! Forced to use all 1s dice for 3 turns!");
        }, 800);

        return;
    }

    setTimeout(() => {
        showExplanation(currentQuestion.explanation);
    }, 800);
}

function selectedHighlight(text,color){
    document.querySelectorAll("#answers button")
        .forEach(btn=>{
            if(btn.textContent===text){
                btn.style.backgroundColor=color;
                btn.style.color="white";
            }
        });
}

function consumeAttempt(){
    if(fixedRemaining>0) fixedRemaining--;
    else if(tempRemaining>0) tempRemaining--;
    updateAttemptDisplay();
}

function showExplanation(text){

    quizMode = "explanation";

    if (lastAnswerCorrect) {
        learningQueue.shift();
        masteredPool.push(currentQuestion);
    } else {
        learningQueue.shift();
        learningQueue.push(currentQuestion);
    }

    document.getElementById("question").textContent = text;
    document.getElementById("answers").innerHTML = "";
    document.getElementById("nextBtn").classList.remove("hidden");
}

document.getElementById("nextBtn").onclick = function(){

    if (quizMode === "start") return;

    if (quizMode === "explanation") {

        if (lastAnswerCorrect) {
            lastAnswerCorrect = false;
            rollDice();

            if (quizMode === "effect") {
                return;   // wait for next click
            }
        }

        loadNextQuestion();
        return;
    }

    if (quizMode === "effect") {
        loadNextQuestion();
    }
};

// 
// GAME FLOW
// 
function startGame(){
    playerPosition=1;
    gameTime=0;
    winstreak=0;
    wrongStreak=0;
    tempRemaining=0;
    diceInventory=[{type:"d6",turns:-1}];
    currentDiceMode="d6";

    generateTileEffects();
    createBoard();
    updatePlayer();
    initializeQuestions();
    updateDiceDisplay();
    loadNextQuestion();
    startGameTimer();
}

function startGameTimer(){
    clearInterval(gameInterval);
    gameInterval=setInterval(()=>{
        gameTime++;
        document.getElementById("gameTimer").textContent=gameTime;
    },1000);
}

function endGame(){

    clearInterval(gameInterval);

    quizMode = "end";

    document.getElementById("question").textContent =
        " You escape!";

    document.getElementById("answers").innerHTML =
        `<p>Time: ${gameTime}s</p>
         <p>Moves: ${totalMoves}</p>
         <p>Max Streak: ${maxStreak}</p>
         <button id="restartBtn">Play Again</button>`;

    document.getElementById("nextBtn").classList.add("hidden");

    document.getElementById("restartBtn").onclick = startGame;
}


async function showStartScreen(){

    document.getElementById("nextBtn").classList.add("hidden"); 
    await loadQuestions();

    quizMode = "start";

    document.getElementById("question").textContent =
        "Reach tile 100 to escape from the fox";

    document.getElementById("answers").innerHTML =
        `<button id="startGameBtn">Start Game</button>`;

    document.getElementById("startGameBtn").onclick = startGame;
}
window.onload = function () {
    showStartScreen();
};