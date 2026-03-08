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

let quizMode = "question";
let lastAnswerCorrect = false;

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
const board = document.getElementById("board");

function createBoard() {
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
// QUESTIONS
// 
const allQuestions = [

{
question: "What is culture?",
options: [
"Genetic traits inherited from parents",
"Shared values, beliefs, and behaviors of a group",
"Individual personality traits",
"Biological instincts"
],
answer: "Shared values, beliefs, and behaviors of a group",
explanation: "Culture refers to the shared values, norms, beliefs, and practices that characterize a group and are transmitted through social learning."
},

{
question: "Culture is primarily learned through:",
options: [
"Genetics",
"Social interaction",
"Evolution",
"Random behavior"
],
answer: "Social interaction",
explanation: "Culture is learned through communication, observation, and interaction with others in society."
},

{
question: "Which field studies how culture influences psychological processes?",
options: [
"Social psychology",
"Cultural psychology",
"Clinical psychology",
"Biological psychology"
],
answer: "Cultural psychology",
explanation: "Cultural psychology examines how culture shapes thinking, emotions, and behavior."
},

{
question: "Acculturation refers to:",
options: [
"Losing all original cultural traditions",
"The exchange of cultural traits between groups",
"The development of a new language",
"Biological adaptation"
],
answer: "The exchange of cultural traits between groups",
explanation: "Acculturation occurs when groups from different cultures interact and adopt cultural traits from each other while often maintaining distinct identities."
},

{
question: "Cultural universals are:",
options: [
"Traits unique to one culture",
"Behaviors found in every culture",
"Traditions passed through families",
"Biological instincts only"
],
answer: "Behaviors found in every culture",
explanation: "Cultural universals are behaviors or patterns that appear across many cultures, such as facial expressions of basic emotions."
},

{
question: "The concept of WEIRD populations refers to:",
options: [
"Strange psychological behaviors",
"Western, Educated, Industrialized, Rich, Democratic societies",
"Rare psychological disorders",
"Cultural minorities"
],
answer: "Western, Educated, Industrialized, Rich, Democratic societies",
explanation: "Many psychological studies are conducted mainly on WEIRD populations, which may limit how well findings apply to other cultures."
},

{
question: "Individualism emphasizes:",
options: [
"Group harmony",
"Personal goals and independence",
"Religious traditions",
"Collective identity"
],
answer: "Personal goals and independence",
explanation: "Individualistic cultures prioritize personal achievements, independence, and self-expression."
},

{
question: "Collectivism emphasizes:",
options: [
"Individual competition",
"Personal freedom",
"Group relationships and cooperation",
"Isolation from society"
],
answer: "Group relationships and cooperation",
explanation: "Collectivist cultures emphasize group harmony, family loyalty, and shared goals."
},

{
question: "An allocentric person tends to:",
options: [
"Focus mainly on personal success",
"Focus on group relationships",
"Avoid social interaction",
"Ignore cultural norms"
],
answer: "Focus on group relationships",
explanation: "Allocentric individuals emphasize relationships and group goals, which is common in collectivist cultures."
},

{
question: "An idiocentric person tends to:",
options: [
"Prioritize personal goals",
"Prioritize group needs",
"Avoid decision making",
"Follow traditions strictly"
],
answer: "Prioritize personal goals",
explanation: "Idiocentric individuals focus on personal identity, independence, and individual goals."
},

{
question: "Culture can influence:",
options: [
"Only traditions",
"Only language",
"Thoughts, emotions, and behaviors",
"Only economic activities"
],
answer: "Thoughts, emotions, and behaviors",
explanation: "Culture shapes how people think, feel, communicate, and behave."
},

{
question: "Which psychologist developed cultural dimensions theory?",
options: [
"Sigmund Freud",
"Jean Piaget",
"Geert Hofstede",
"B. F. Skinner"
],
answer: "Geert Hofstede",
explanation: "Geert Hofstede developed a model comparing cultures across several dimensions."
},

{
question: "Power distance refers to:",
options: [
"Distance between countries",
"Acceptance of unequal power distribution",
"Emotional distance between people",
"Economic inequality only"
],
answer: "Acceptance of unequal power distribution",
explanation: "Power distance describes how much inequality in authority people accept in a society."
},

{
question: "Evoked culture refers to:",
options: [
"Cultural traditions taught in school",
"Adaptive responses to environmental conditions",
"Imported cultural traditions",
"Religious practices only"
],
answer: "Adaptive responses to environmental conditions",
explanation: "Evoked culture results from humans adapting psychologically to environmental challenges."
},

{
question: "Transmitted culture refers to:",
options: [
"Cultural values passed through social learning",
"Genetic inheritance",
"Environmental adaptation",
"Economic systems"
],
answer: "Cultural values passed through social learning",
explanation: "Transmitted culture spreads through communication and social interaction."
}

];

let learningQueue = [];
let masteredPool = [];
let currentQuestion = null;

function initializeQuestions() {
    learningQueue = [...allQuestions];
    masteredPool = [];
}

function loadNextQuestion() {
    if (learningQueue.length === 0) {
        learningQueue = [...masteredPool];
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

    currentQuestion.options.forEach(option => {
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

        learningQueue.shift();
        masteredPool.push(currentQuestion);

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
    quizMode="explanation";
    document.getElementById("question").textContent=text;
    document.getElementById("answers").innerHTML="";
    document.getElementById("nextBtn").classList.remove("hidden");
}

document.getElementById("nextBtn").onclick=function(){

    if(quizMode==="explanation"){
        if (lastAnswerCorrect) {
            rollDice();
            lastAnswerCorrect = false; // reset immediately
            if (quizMode === "effect") return;
        }
        loadNextQuestion();
    }
    else if(quizMode==="effect"){
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
    showScreen("game");
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

    document.getElementById("finalTime").textContent =
        "Time: " + gameTime + "s";

    document.getElementById("finalMoves").textContent =
        "Moves: " + totalMoves;

    document.getElementById("finalStreak").textContent =
        "Max Streak: " + maxStreak;

    showScreen("end");
}

function showScreen(screen){
    document.querySelectorAll(".screen")
        .forEach(s=>s.classList.remove("active"));
    document.getElementById(screen+"Screen")
        .classList.add("active");
}

document.getElementById("startBtn").onclick=startGame;
document.getElementById("restartBtn").onclick=startGame;
showScreen("start");