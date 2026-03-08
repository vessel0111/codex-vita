const greetings = [
    "Hello",
    "Xin chào",
    "Ciao",
    "Bonjour",
    "Hola",
    "こんにちは",
    "안녕하세요",
    "مرحبا",
    "Olá",
    "Привет",
    "नमस्ते",
    "Hej",
    "Salam",
    "Halo",
    "Sawasdee",
    "Aloha"
];

const placedElements = [];
const displayDuration = 8000;

function Colliding(rect) {
    for (let el of placedElements) {
        const r = el.getBoundingClientRect();
        if (!(rect.right < r.left ||
              rect.left > r.right ||
              rect.bottom < r.top ||
              rect.top > r.bottom)) {
            return true;
        }
    }
    return false;
}

function createGreeting() {
    const hero = document.querySelector('.hero');
    const greeting = document.createElement("div");
    greeting.className = "greeting";
    greeting.innerText = greetings[Math.floor(Math.random() * greetings.length)];
    hero.appendChild(greeting);

    const maxAttempts = 100;
    let attempts = 0;
    let placed = false;

    while (!placed && attempts < maxAttempts) {
        const x = Math.random() * (window.innerWidth - greeting.offsetWidth);
        const y = Math.random() * (window.innerHeight - greeting.offsetHeight);

        greeting.style.left = x + "px";
        greeting.style.top = y + "px";

        const rect = greeting.getBoundingClientRect();

        if (!Colliding(rect) && y > 60) {
            placed = true;
            placedElements.push(greeting);
        }

        attempts++;
    }

    if (!placed) {
        greeting.remove();
        return;
    }

    setTimeout(() => {
        greeting.remove();
        const index = placedElements.indexOf(greeting);
        if (index > -1) placedElements.splice(index, 1);
    }, displayDuration);
}

setInterval(createGreeting, 700);

const header = document.querySelector(".header");
let lastScrollY = window.scrollY;

// Hide header when scrolling down
// Show header when mouse moves to top
document.addEventListener("mousemove", (e) => {
    if (e.clientY < 60) {
        header.classList.remove("hidden");
    }
});
window.addEventListener("scroll", () => {
    if (window.scrollY > lastScrollY && window.scrollY > 80) {
        header.classList.add("hidden");
    } else {
        header.classList.remove("hidden");
    }
    lastScrollY = window.scrollY;
});