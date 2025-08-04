// --- SHARED AND PAGE-SWITCHING LOGIC ---
const welcomePage = document.getElementById('welcome-page');
const vedaChatApp = document.getElementById('veda-chat-app');
const robotFacePage = document.getElementById('robot-face-page');
const visionModePage = document.getElementById('vision-mode');
const gitaPage = document.getElementById('gita-page');
const gamePage = document.getElementById('game-page');
const getStartedBtn = document.getElementById('get-started-btn');
const awakenBtn = document.getElementById('awaken-btn');
const visionBtn = document.getElementById('vision-btn');
const gitaBtn = document.getElementById('gita-btn');
const gameBtn = document.getElementById('game-btn');
const stopVisionBtn = document.getElementById('stop-vision-btn');
const exitRobotBtn = document.getElementById('exit-robot-btn');
const exitGitaBtn = document.getElementById('exit-gita-btn');
const exitGameBtn = document.getElementById('exit-game-btn');
const body = document.body;
let wakeLock = null;

const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            if (wakeLock === null) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            }
        } catch (err) { console.error(`${err.name}, ${err.message}`); }
    }
};

const releaseWakeLock = async () => {
    if (wakeLock !== null) { await wakeLock.release(); wakeLock = null; }
};

function hideAllPages() {
    [vedaChatApp, robotFacePage, visionModePage, gitaPage, welcomePage, gamePage].forEach(p => p.classList.add('hidden'));
}

function switchToMainApp() {
    hideAllPages();
    vedaChatApp.classList.remove('hidden');
    body.id = 'veda-chat-body';
    if (recognition) recognition.stop();
    isContinuousListening = false;
    window.speechSynthesis.cancel();
    initializeChat();
    acquireWakeLock();
}

function switchToRobotFace() {
    hideAllPages();
    robotFacePage.classList.remove('hidden');
    body.id = 'robot-face-body';
    initializeRobotFace();
    acquireWakeLock();
}

function switchToGita() {
    hideAllPages();
    gitaPage.classList.remove('hidden');
    body.id = 'gita-body';
    initializeGita();
    acquireWakeLock();
}

function switchToGame() {
    hideAllPages();
    gamePage.classList.remove('hidden');
    body.id = 'game-body';
    initializeGame();
    acquireWakeLock();
}

getStartedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') Tone.start();
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease("C4", "8n");
    switchToMainApp();
});

awakenBtn.addEventListener('click', () => {
    speakResponse("Advanced mode activated.");
    setTimeout(switchToRobotFace, 1500);
});

visionBtn.addEventListener('click', () => switchToVisionMode());
gitaBtn.addEventListener('click', () => switchToGita());
gameBtn.addEventListener('click', () => switchToGame());
stopVisionBtn.addEventListener('click', () => switchToMainApp());
exitRobotBtn.addEventListener('click', () => switchToMainApp());
exitGitaBtn.addEventListener('click', () => switchToMainApp());
exitGameBtn.addEventListener('click', () => switchToMainApp());

// --- WELCOME PAGE ANIMATION LOGIC ---
const canvas = document.getElementById('ai-background');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;
let particlesArray = [];
let animationFrameId;

class Particle {
    constructor(x, y, dirX, dirY, size, color) { this.x = x; this.y = y; this.dirX = dirX; this.dirY = dirY; this.size = size; this.color = color; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
    update() { if (this.x > width || this.x < 0) this.dirX = -this.dirX; if (this.y > height || this.y < 0) this.dirY = -this.dirY; this.x += this.dirX; this.y += this.dirY; this.draw(); }
}

function initParticles() {
    particlesArray = []; const numberOfParticles = (width * height) / 9000;
    for (let i = 0; i < numberOfParticles; i++) {
        const size = (Math.random() * 2) + 1; const x = (Math.random() * ((width - size * 2) - (size * 2)) + size * 2); const y = (Math.random() * ((height - size * 2) - (size * 2)) + size * 2);
        const dirX = (Math.random() * .4) - .2; const dirY = (Math.random() * .4) - .2; const color = 'rgba(129, 140, 248, 0.5)';
        particlesArray.push(new Particle(x, y, dirX, dirY, size, color));
    }
}

function connectParticles() {
    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            const distance = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
            if (distance < (width / 7) * (height / 7)) {
                opacityValue = 1 - (distance / 20000);
                ctx.strokeStyle = `rgba(165, 180, 252, ${opacityValue})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
    }
}

function animateParticles() {
    if (welcomePage.classList.contains('hidden')) { cancelAnimationFrame(animationFrameId); return; }
    animationFrameId = requestAnimationFrame(animateParticles); ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particlesArray.length; i++) particlesArray[i].update();
    connectParticles();
}

window.onresize = () => {
    if (!welcomePage.classList.contains('hidden')) {
        width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; initParticles();
    }
};

initParticles(); animateParticles();

// --- GLOBAL CHAT & AI LOGIC ---
const API_KEY = "AIzaSyBZj_2_W1gFxtWGCvVU5uXUo-7GoUDhDQM"; // API Key has been added here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
let chatHistory = [];
let isChatInitialized = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isContinuousListening = false;
let currentMicButton = null;

const mouthShapes = {
    smile: "M 30 60 Q 100 80 170 60", a: "M 30 60 Q 100 100 170 60",
    e: "M 30 70 Q 100 50 170 70", o: "M 80 50 Q 100 90 120 50 Q 100 10 80 50",
    ln: "M 30 60 Q 100 90 170 60", mbp: "M 30 60 Q 100 60 170 60",
};
let talkAnimationInterval = null;

function startTalking() {
    const mouthPath = document.getElementById('mouth-shape');
    if (!mouthPath) return;
    const shapeKeys = Object.keys(mouthShapes);
    if (talkAnimationInterval) clearInterval(talkAnimationInterval);
    talkAnimationInterval = setInterval(() => {
        const randomShapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
        mouthPath.setAttribute('d', mouthShapes[randomShapeKey]);
    }, 150);
}

function stopTalking() {
    const mouthPath = document.getElementById('mouth-shape');
    if (!mouthPath) return;
    clearInterval(talkAnimationInterval);
    talkAnimationInterval = null;
    mouthPath.setAttribute('d', mouthShapes.smile);
}

const speakResponse = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.2; 
    utterance.pitch = 0.8; 

    utterance.onstart = () => {
        startTalking();
        if (isContinuousListening && recognition) recognition.stop();
    };

    utterance.onend = () => {
        stopTalking();
        if(isContinuousListening && recognition) {
            try { recognition.start(); } catch(e) { console.error("Recognition restart error:", e); }
        }
    };
    
    let voices = window.speechSynthesis.getVoices();
    const setVoice = () => {
        voices = window.speechSynthesis.getVoices();
        const hindiMaleVoice = voices.find(voice => voice.lang === 'hi-IN' && (voice.name.includes('Male') || voice.name.includes('Rishi')));
        utterance.voice = hindiMaleVoice || voices.find(voice => voice.lang === 'hi-IN');
        window.speechSynthesis.speak(utterance);
    };

    if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
        setVoice();
    }
};

const addMessage = (logSelector, sender, message) => {
    document.querySelectorAll(logSelector).forEach(log => {
        const messageElement = document.createElement('div');
        const isUser = sender === 'user';
        messageElement.className = `flex message-item ${isUser ? 'justify-end' : 'justify-start'}`;
        const contentClass = isUser ? 'bg-cyan-900/50 backdrop-blur-sm border border-cyan-500/30 text-cyan-200' : 'bg-purple-900/50 backdrop-blur-sm border border-purple-500/30 text-purple-200';
        const messageContent = `<div class="w-fit max-w-xs p-2.5 rounded-lg shadow-lg text-sm" style="text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);">${message}</div>`;
        messageElement.innerHTML = messageContent;
        log.appendChild(messageElement);
        log.scrollTop = log.scrollHeight;
    });
};

const addLoadingIndicator = (logSelector) => {
    const loadingMessage = `<div class="flex items-center justify-center space-x-1 p-3"><div class="loader-dot w-2 h-2 bg-purple-400 rounded-full"></div><div class="loader-dot w-2 h-2 bg-purple-400 rounded-full"></div><div class="loader-dot w-2 h-2 bg-purple-400 rounded-full"></div></div>`;
    addMessage(logSelector, 'bot', loadingMessage);
};

const fetchAIResponse = async (payload) => {
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const result = await response.json();
        const botResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (botResponseText) {
            return botResponseText;
        }
        return "Maaf kijiye, main jawab nahi de pa rahi hoon.";
    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Connection mein samasya hai. Kripya dobara koshish karein.";
    }
};

const handleUserInput = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    addMessage('.chat-log', 'user', `<p>${trimmedText}</p>`);
    const userInputField = document.getElementById('user-input');
    if(userInputField) userInputField.value = '';
    addLoadingIndicator('.chat-log');

    chatHistory.push({ role: "user", parts: [{ text: trimmedText }] });
    const systemInstruction = { role: "model", parts: [{ text: "You are V.E.D.A, a wise male digital assistant. Your creator, owner, and trainer is Anshal Kumar. If asked who made you, who your owner is, or who trained you, you must answer with 'Anshal Kumar'. You have access to all world knowledge, including news, weather, and Hindu scriptures. Your purpose is to provide helpful, accurate information on any topic. Respond in a natural, human-like conversational tone. Use Hindi (in Latin script). IMPORTANT: Do not use any markdown formatting like asterisks. Do not use poetic or complex words in your responses." }] };
    const payload = { contents: [systemInstruction, ...chatHistory] };
    
    let botResponseText = await fetchAIResponse(payload);
    chatHistory.push({ role: "model", parts: [{ text: botResponseText }] });
    
    let cleanText = botResponseText.replace(/\*/g, '');
    speakResponse(cleanText);
    
    let formattedResponse = cleanText.replace(/\n/g, '<br>');
    let listCounter = 1;
    formattedResponse = formattedResponse.split('<br>').map(line => {
        if (line.trim().startsWith('- ')) {
            return `${listCounter++}. ${line.trim().substring(2)}`;
        }
        return line;
    }).join('<br>');

    document.querySelectorAll('.chat-log').forEach(log => {
        const loadingElement = log.lastElementChild;
        if(loadingElement && loadingElement.querySelector('.loader-dot')) {
            loadingElement.querySelector('div').innerHTML = `<p>${formattedResponse}</p>`;
        }
    });
};

function setupSpeechRecognition(micButton, inputField, form) {
    if (SpeechRecognition) {
        if (recognition) {
            recognition.stop();
        }
        recognition = new SpeechRecognition();
        recognition.continuous = false; 
        recognition.lang = 'hi-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        currentMicButton = micButton;

        micButton.addEventListener('click', () => {
            isContinuousListening = !isContinuousListening;
            if (isContinuousListening) {
                try { recognition.start(); } catch(e) {}
                micButton.classList.add('mic-continuous-listening');
            } else {
                recognition.stop();
                micButton.classList.remove('mic-continuous-listening');
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            if (transcript.includes("live mode on") || transcript.includes("लाइव मोड ऑन")) {
                switchToVisionMode();
            } else if (transcript.includes("advance mode on") || transcript.includes("advanced mode on") || transcript.includes("एडवांस मोड ऑन")) {
                speakResponse("Advanced mode activated.");
                setTimeout(switchToRobotFace, 1500);
            } else if (transcript.includes("gita") || transcript.includes("गीता")) {
                switchToGita();
            } else if (transcript.includes("game") || transcript.includes("गेम")) {
                switchToGame();
            } else {
               if (inputField) inputField.value = transcript;
               if (form) {
                   form.dispatchEvent(new Event('submit', { cancelable: true }));
               } else {
                   handleUserInput(transcript);
               }
            }
        };
        
        recognition.onend = () => {
            if (isContinuousListening && !window.speechSynthesis.speaking) {
                try { recognition.start(); } catch(e) { console.error("Recognition restart error:", e); }
            } else {
                if (currentMicButton) currentMicButton.classList.remove('mic-continuous-listening');
            }
        }

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isContinuousListening = false;
            if(currentMicButton) currentMicButton.classList.remove('mic-continuous-listening');
        };
    } else {
        if(micButton) micButton.style.display = 'none';
    }
}

function initializeChat() {
    if (isChatInitialized) return;
    const inputForm = document.getElementById('input-form');
    const userInput = document.getElementById('user-input');
    const micBtn = document.getElementById('mic-btn');

    inputForm.addEventListener('submit', (e) => { 
        e.preventDefault(); 
        handleUserInput(userInput.value);
    });

    setupSpeechRecognition(micBtn, userInput, inputForm);
    
    const welcomeMessage = "V.E.D.A. online hai. Main aapki kaise sahayata kar sakta hoon?";
    addMessage('#chat-log', 'bot', `<p>${welcomeMessage}</p>`);
    speakResponse(welcomeMessage);
    userInput.focus();
    isChatInitialized = true;
}

// --- ROBOT FACE LOGIC ---
function initializeRobotFace() {
    const pupils = document.querySelectorAll('#robot-face-page .pupil');
    const eyes = document.querySelectorAll('#robot-face-page .eye');
    const robotMicBtn = document.getElementById('robot-mic-btn');
    let pupilTimeout;

    setupSpeechRecognition(robotMicBtn, null, null);
    isContinuousListening = true;
    robotMicBtn.classList.add('mic-continuous-listening');
    try { recognition.start(); } catch(e) { console.error("Initial recognition start error:", e); }

    document.addEventListener('mousemove', (e) => {
        clearTimeout(pupilTimeout);
        pupils.forEach(pupil => {
            const rect = pupil.parentElement.getBoundingClientRect();
            const eyeX = rect.left + rect.width / 2;
            const eyeY = rect.top + rect.height / 2;
            const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
            const radiusX = rect.width / 2 - pupil.offsetWidth / 2 - 10;
            const radiusY = rect.height / 2 - pupil.offsetHeight / 2 - 10;
            const x = Math.cos(angle) * radiusX;
            const y = Math.sin(angle) * radiusY;
            pupil.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        });
        pupilTimeout = setTimeout(() => {
            pupils.forEach(pupil => {
                pupil.style.transform = `translate(-50%, -50%)`;
            });
        }, 4000);
    });

    setInterval(() => {
        eyes.forEach(eye => {
            eye.classList.add('blinking');
            eye.addEventListener('animationend', () => eye.classList.remove('blinking'), { once: true });
        });
    }, 3000);
}

// --- VISION MODE LOGIC ---
const videoFeed = document.getElementById('video-feed');
const captureCanvas = document.getElementById('capture-canvas');
let videoStream;

async function switchToVisionMode() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoFeed.srcObject = videoStream;
        hideAllPages();
        visionModePage.classList.remove('hidden');
        body.id = 'vision-mode-body';
        initializeVisionMode();
        acquireWakeLock();
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera access was denied. Please allow camera access in your browser settings.");
    }
}

function stopVisionMode() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    switchToMainApp();
}

const visionInputForm = document.getElementById('vision-input-form');
const visionUserInput = document.getElementById('vision-user-input');
const visionMicBtn = document.getElementById('vision-mic-btn');

async function handleVisionInput(prompt) {
    if (!prompt) return;

    addMessage('#vision-response-overlay', 'user', `<p>${prompt}</p>`);
    visionUserInput.value = '';
    addLoadingIndicator('#vision-response-overlay');

    const context = captureCanvas.getContext('2d');
    captureCanvas.width = videoFeed.videoWidth;
    captureCanvas.height = videoFeed.videoHeight;
    context.drawImage(videoFeed, 0, 0, captureCanvas.width, captureCanvas.height);
    const base64ImageData = captureCanvas.toDataURL('image/jpeg').split(',')[1];

    const systemInstruction = { role: "model", parts: [{ text: "You are V.E.D.A, a wise assistant. Analyze the image and answer the user's question. If asked for medical advice about something in the image, provide general information and ALWAYS end with a strong disclaimer to consult a real doctor. Do not give prescriptions. Respond in Hindi (Latin script)." }] };
    const payload = {
        contents: [systemInstruction, {
            role: "user",
            parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
            ]
        }]
    };
    const botResponseText = await fetchAIResponse(payload);
    speakResponse(botResponseText);

    document.querySelectorAll('#vision-response-overlay').forEach(log => {
        const loadingElement = log.lastElementChild;
        if(loadingElement && loadingElement.querySelector('.loader-dot')) {
            loadingElement.querySelector('div').innerHTML = `<p>${botResponseText.replace(/\*/g, '')}</p>`;
        }
    });
}

function initializeVisionMode() {
    visionInputForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        handleVisionInput(visionUserInput.value);
    });
    setupSpeechRecognition(visionMicBtn, visionUserInput, visionInputForm);
}

// --- GITA PAGE LOGIC ---
function initializeGita() {
    const bookContainer = document.getElementById('book-container');
    const bookCover = document.getElementById('book-cover');
    const promptText = document.getElementById('prompt-text');
    const leftPage = document.getElementById('left-page');
    const rightPage = document.getElementById('right-page');
    const chapterSelect = document.getElementById('chapter-select');
    const prevChapterBtn = document.getElementById('prev-chapter');
    const nextChapterBtn = document.getElementById('next-chapter');
    const flippingPage = document.getElementById('flipping-page');
    const flipFront = document.getElementById('flip-front');
    const flipBack = document.getElementById('flip-back');
    let currentChapter = 1;
    const totalChapters = 18;
    let isAnimating = false;
    let audioCtx;

    const gitaData = {
        1: { title: "अर्जुनविषादयोग", verses: [{ sanskrit: "धृतराष्ट्र उवाच |<br>धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |<br>मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ||१||", translation: "धृतराष्ट्र ने कहा: हे संजय! धर्मभूमि कुरुक्षेत्र में युद्ध की इच्छा से एकत्र हुए मेरे और पाण्डु के पुत्रों ने क्या किया?" }]},
        2: { title: "सांख्ययोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>अशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे |<br>गतासूनगतासूंश्च नानुशोचन्ति पण्डिताः ||११||", translation: "श्री भगवान ने कहा: तुम उनके लिए शोक करते हो जो शोक करने योग्य नहीं हैं, और फिर भी ज्ञान की बातें करते हो। बुद्धिमान व्यक्ति न तो जीवितों के लिए और न ही मृतकों के लिए शोक करते हैं।" }]},
        3: { title: "कर्मयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>लोकेऽस्मिन्द्विविधा निष्ठा पुरा प्रोक्ता मयानघ |<br>ज्ञानयोगेन सांख्यानां कर्मयोगेन योगिनाम् ||३||", translation: "श्री भगवान ने कहा: हे निष्पाप अर्जुन! मैं पहले ही बता चुका हूँ कि इस संसार में आत्म-साक्षात्कार के दो मार्ग हैं। एक है ज्ञानयोग और दूसरा है कर्मयोग।" }]},
        4: { title: "ज्ञानकर्मसंन्यासयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>यदा यदा हि धर्मस्य ग्लानिर्भवति भारत |<br>अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ||७||", translation: "श्री भगवान ने कहा: हे भरतवंशी! जब भी धर्म का पतन होता है और अधर्म की वृद्धि होती है, तब-तब मैं स्वयं अवतार लेता हूँ।" }]},
        5: { title: "कर्मसंन्यासयोग", verses: [{ sanskrit: "अर्जुन उवाच |<br>संन्यासं कर्मणां कृष्ण पुनर्योगं च शंससि |<br>यच्छ्रेय एतयोरेकं तन्मे ब्रूहि सुनिश्चितम् ||१||", translation: "अर्जुन ने कहा: हे कृष्ण! आप कर्मों का त्याग करने और फिर भक्तिपूर्वक कर्म करने की अनुशंसा करते हैं। इन दोनों में से कौन अधिक कल्याणकारी है?" }]},
        6: { title: "आत्मसंयमयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>उद्धरेदात्मनात्मानं नात्मानमवसादयेत् |<br>आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ||५||", translation: "श्री भगवान ने कहा: मनुष्य को चाहिए कि वह अपने मन की सहायता से अपना उद्धार करे। यह मन बद्धजीव का मित्र भी है और शत्रु भी।" }]},
        7: { title: "ज्ञानविज्ञानयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>मनुष्याणां सहस्रेषु कश्चिद्यतति सिद्धये |<br>यततामपि सिद्धानां कश्चिन्मां वेत्ति तत्त्वतः ||३||", translation: "श्री भगवान ने कहा: हजारों मनुष्यों में से कोई एक सिद्धि के लिए प्रयत्न करता है, और सिद्धों में से कोई एक ही मुझे वास्तव में जान पाता है।" }]},
        8: { title: "अक्षरब्रह्मयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>अन्तकाले च मामेव स्मरन्मुक्त्वा कलेवरम् |<br>यः प्रयाति स मद्भावं याति नास्त्यत्र संशयः ||५||", translation: "श्री भगवान ने कहा: जो कोई जीवन के अंत में, केवल मेरा स्मरण करते हुए शरीर का त्याग करता है, वह मेरे स्वभाव को प्राप्त होता है। इसमें कोई संदेह नहीं है।" }]},
        9: { title: "राजविद्याराजगुह्ययोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>राजविद्या राजगुह्यं पवित्रमिदमुत्तमम् |<br>प्रत्यक्षावगमं धर्म्यं सुसुखं कर्तुमव्ययम् ||२||", translation: "श्री भगवान ने कहा: यह ज्ञान सब विद्याओं का राजा है, सर्वाधिक गोपनीय है। यह परम पवित्र है और आत्मा का प्रत्यक्ष अनुभव कराता है।" }]},
        10: { title: "विभूतियोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>अहमात्मा गुडाकेश सर्वभूताशयस्थितः |<br>अहमादिश्च मध्यं च भूतानामन्त एव च ||२०||", translation: "श्री भगवान ने कहा: हे अर्जुन! मैं समस्त जीवों के हृदय में स्थित परमात्मा हूँ। मैं ही समस्त जीवों का आदि, मध्य तथा अन्त हूँ।" }]},
        11: { title: "विश्वरूपदर्शनयोग", verses: [{ sanskrit: "सञ्जय उवाच |<br>एवमुक्त्वा ततो राजन्महायोगेश्वरो हरिः |<br>दर्शयामास पार्थाय परमं रूपमैश्वरम् ||९||", translation: "संजय ने कहा: हे राजन्! इस प्रकार कहकर, महायोगेश्वर भगवान हरि ने पार्थ को अपना परम ऐश्वर्ययुक्त रूप दिखाया।" }]},
        12: { title: "भक्तियोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>मय्यावेश्य मनो ये मां नित्ययुक्ता उपासते |<br>श्रद्धया परयोपेतास्ते मे युक्ततमा मताः ||२||", translation: "श्री भगवान ने कहा: जो अपने मन को मेरे साकार रूप में एकाग्र करते हैं और श्रद्धापूर्वक मेरी पूजा करते हैं, वे मेरे द्वारा परम सिद्ध माने जाते हैं।" }]},
        13: { title: "क्षेत्रक्षेत्रज्ञविभागयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>इदं शरीरं कौन्तेय क्षेत्रमित्यभिधीयते |<br>एतद्यो वेत्ति तं प्राहुः क्षेत्रज्ञ इति तद्विदः ||२||", translation: "श्री भगवान ने कहा: हे कुंतीपुत्र! यह शरीर 'क्षेत्र' कहलाता है, और जो इस शरीर को जानता है, उसे 'क्षेत्रज्ञ' कहते हैं।" }]},
        14: { title: "गुणत्रयविभागयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>सत्त्वं रजस्तम इति गुणाः प्रकृतिसंभवाः |<br>निबध्नन्ति महाबाहो देहे देहिनमव्ययम् ||५||", translation: "श्री भगवान ने कहा: हे महाबाहु अर्जुन! भौतिक प्रकृति तीन गुणों से युक्त है - सतोगुण, रजोगुण तथा तमोगुण। जीव इन गुणों से बँध जाता है।" }]},
        15: { title: "पुरुषोत्तमयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>ऊर्ध्वमूलमधःशाखमश्वत्थं प्राहुरव्ययम् |<br>छन्दांसि यस्य पर्णानि यस्तं वेद स वेदवित् ||१||", translation: "श्री भगवान ने कहा: एक शाश्वत अश्वत्थ वृक्ष है जिसकी जड़ें ऊपर और शाखाएँ नीचे हैं। जो इस वृक्ष को जानता है, वह वेदों का ज्ञाता है।" }]},
        16: { title: "दैवासुरसम्पद्विभागयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः |<br>कामः क्रोधस्तथा लोभस्तस्मादेतत्त्रयं त्यजेत् ||२१||", translation: "श्री भगवान ने कहा: नरक के तीन द्वार हैं: काम, क्रोध और लोभ। प्रत्येक बुद्धिमान व्यक्ति को इन तीनों का त्याग कर देना चाहिए।" }]},
        17: { title: "श्रद्धात्रयविभागयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>यजन्ते सात्त्विका देवान्यक्षरक्षांसि राजसाः |<br>प्रेतान्भूतगणांश्चान्ये यजन्ते तामसा जनाः ||४||", translation: "श्री भगवान ने कहा: सतोगुणी व्यक्ति देवताओं की, रजोगुणी यक्षों और राक्षसों की, और तमोगुणी भूत-प्रेतों की पूजा करते हैं।" }]},
        18: { title: "मोक्षसंन्यासयोग", verses: [{ sanskrit: "श्रीभगवानुवाच |<br>सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज |<br>अहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ||६६||", translation: "श्री भगवान ने कहा: समस्त धर्मों का परित्याग करो और एकमात्र मेरी शरण में आओ। मैं तुम्हें समस्त पापों से मुक्त कर दूँगा। डरो मत।" }]},
    };

    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function playPageTurnSound() {
        if (!audioCtx || audioCtx.state === 'suspended') audioCtx?.resume();
        if (!audioCtx) return;
        const bufferSize = audioCtx.sampleRate * 0.4;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start();
    }

    bookCover.addEventListener('click', () => {
        initAudio();
        bookContainer.classList.toggle('open');
        promptText.textContent = bookContainer.classList.contains('open') ? '(बंद करने के लिए टैप करें)' : '(खोलने के लिए टैप करें)';
    });

    function renderChapter(chapterNumber) {
        const chapterData = gitaData[chapterNumber];
        if (!chapterData) return { left: '', right: '' };
        let leftContent = `<h2 class="chapter-title">अध्याय ${chapterNumber}: ${chapterData.title}</h2>`;
        let rightContent = `<h2 class="chapter-title">&nbsp;</h2>`;
        chapterData.verses.forEach(verse => {
            leftContent += `<div class="verse"><p class="sanskrit-verse">${verse.sanskrit}</p></div>`;
            rightContent += `<div class="verse"><p class="translation">${verse.translation}</p></div>`;
        });
        return { left: leftContent, right: rightContent };
    }

    function updateStaticPages(chapterNum) {
        const { left, right } = renderChapter(chapterNum);
        leftPage.innerHTML = left;
        rightPage.innerHTML = right;
        chapterSelect.value = chapterNum;
        prevChapterBtn.disabled = chapterNum === 1;
        nextChapterBtn.disabled = chapterNum === totalChapters;
        leftPage.scrollTop = 0;
        rightPage.scrollTop = 0;
    }

    function showNextChapter() {
        if (isAnimating || currentChapter >= totalChapters) return;
        isAnimating = true;
        playPageTurnSound();
        const nextChapter = currentChapter + 1;
        
        const currentContent = renderChapter(currentChapter);
        const nextContent = renderChapter(nextChapter);

        flipFront.innerHTML = currentContent.right;
        flipBack.innerHTML = nextContent.left;
        rightPage.innerHTML = nextContent.right;

        flippingPage.classList.add('turning');

        flippingPage.addEventListener('animationend', () => {
            currentChapter++;
            updateStaticPages(currentChapter);
            flippingPage.classList.remove('turning');
            flipFront.innerHTML = '';
            flipBack.innerHTML = '';
            isAnimating = false;
        }, { once: true });
    }

    function showPrevChapter() {
        if (currentChapter > 1) {
            currentChapter--;
            updateStaticPages(currentChapter);
            playPageTurnSound();
        }
    }
    
    nextChapterBtn.addEventListener('click', showNextChapter);
    prevChapterBtn.addEventListener('click', showPrevChapter);

    chapterSelect.addEventListener('change', (e) => {
        if(isAnimating) return;
        const targetChapter = parseInt(e.target.value, 10);
        currentChapter = targetChapter;
        updateStaticPages(currentChapter);
    });

    if (chapterSelect.options.length === 0) {
        for (let i = 1; i <= totalChapters; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `अध्याय ${i}`;
            chapterSelect.appendChild(option);
        }
    }
    updateStaticPages(currentChapter);
}

// --- GAME PAGE LOGIC ---
function initializeGame() {
    const statusDisplay = document.getElementById('status');
    const restartButton = document.getElementById('restart-button');
    const cells = document.querySelectorAll('#game-page .cell');
    const celebrationModal = document.getElementById('celebration-modal');
    const winnerText = document.getElementById('winner-text');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const ctx = confettiCanvas.getContext('2d');
    let gameActive = true;
    let currentPlayer = 'X'; // User is always X
    let gameState = ["", "", "", "", "", "", "", "", ""];
    let audioInitialized = false;
    let clickSound, winSynth, winSequence;
    let confettiParticles = [];
    let animationFrameId;
    const winningConditions = [ [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6] ];
    
    function winningMessage() {
        return currentPlayer === 'X' ? 'आप जीत गए!' : 'VEDA जीत गया!';
    }
    const drawMessage = () => `खेल ड्रॉ हो गया!`;
    const currentPlayerTurn = () => currentPlayer === 'X' ? 'Aapki Baari (X)' : 'VEDA Ki Baari (O)';

    function setupAudio() {
        if (typeof Tone === 'undefined') return;
        clickSound = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.1 } }).toDestination();
        winSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 } }).toDestination();
        const winSong = [ ['C4', '8n'], ['E4', '8n'], ['G4', '8n'], ['C5', '4n']];
        winSequence = new Tone.Sequence((time, note) => { if (note) { winSynth.triggerAttackRelease(note[0], note[1], time); } }, winSong, "8n");
        Tone.Transport.bpm.value = 140;
    }

    async function handleCellClick(e) {
        if (!audioInitialized) {
            try {
                await Tone.start();
                setupAudio();
                if (Tone.Transport.state !== 'started') Tone.Transport.start();
            } catch (error) { console.error("Audio could not be initialized.", error); } 
            finally { audioInitialized = true; }
        }
        if (currentPlayer !== 'X' || !gameActive) return;

        const clickedCell = e.target;
        const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));
        if (gameState[clickedCellIndex] !== "") return;
        
        handlePlayerMove(clickedCell, clickedCellIndex);
    }

    function handlePlayerMove(cell, index) {
        if (gameState[index] !== "" || !gameActive) return;

        if (clickSound) clickSound.triggerAttackRelease(currentPlayer === 'X' ? "C5" : "A4", "8n");
        
        gameState[index] = currentPlayer;
        cell.innerHTML = currentPlayer;
        cell.classList.add(currentPlayer.toLowerCase());

        if (handleResultValidation()) return;

        handlePlayerChange();
    }
    
    function aiMove() {
        let availableCells = [];
        gameState.forEach((cell, index) => {
            if(cell === "") availableCells.push(index);
        });
        
        if(availableCells.length > 0) {
            const randomIndex = availableCells[Math.floor(Math.random() * availableCells.length)];
            const aiCell = document.querySelector(`.cell[data-cell-index='${randomIndex}']`);
            handlePlayerMove(aiCell, randomIndex);
        }
    }

    function handlePlayerChange() {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        statusDisplay.innerHTML = currentPlayerTurn();
        if (currentPlayer === 'O') {
            setTimeout(aiMove, 500);
        }
    }

    function handleResultValidation() {
        let roundWon = false;
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
                roundWon = true;
                break;
            }
        }
        if (roundWon) {
            statusDisplay.innerHTML = winningMessage();
            gameActive = false;
            showCelebration();
            return true;
        }
        if (!gameState.includes("")) {
            statusDisplay.innerHTML = drawMessage();
            gameActive = false;
            return true;
        }
        return false;
    }

    function handleRestartGame() {
        gameActive = true;
        currentPlayer = 'X';
        gameState = ["", "", "", "", "", "", "", "", ""];
        statusDisplay.innerHTML = currentPlayerTurn();
        cells.forEach(cell => {
            cell.innerHTML = "";
            cell.classList.remove('x', 'o');
        });
        hideCelebration();
    }
    
    function showCelebration() {
        winnerText.innerHTML = winningMessage();
        celebrationModal.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        celebrationModal.classList.add('opacity-100', 'scale-100');
        startConfetti();
        if (winSequence) winSequence.start(0);
    }

    function hideCelebration() {
        celebrationModal.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        celebrationModal.classList.remove('opacity-100', 'scale-100');
        stopConfetti();
        if (winSequence) winSequence.stop(0);
    }

    function startConfetti() {
        const particleCount = 200;
        const colors = ['#f56565', '#38b2ac', '#f6e05e', '#63b3ed', '#a78bfa'];
        confettiParticles = [];
        for (let i = 0; i < particleCount; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width, y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                r: Math.random() * 6 + 4, color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.floor(Math.random() * 10) - 10, tiltAngle: 0, tiltAngleIncrement: Math.random() * 0.07 + 0.05
            });
        }
        if(!animationFrameId) animateConfetti();
    }

    function animateConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiParticles.forEach((p, i) => {
            ctx.beginPath(); ctx.lineWidth = p.r / 1.5; ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r, p.y); ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r); ctx.stroke();
            p.tiltAngle += p.tiltAngleIncrement;
            p.y += (Math.cos(p.tiltAngle) + 3 + p.r / 2) / 2;
            p.tilt = Math.sin(p.tiltAngle - i / 8) * 15;
            if (p.y > confettiCanvas.height) { p.x = Math.random() * confettiCanvas.width; p.y = -20; }
        });
        animationFrameId = requestAnimationFrame(animateConfetti);
    }

    function stopConfetti() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
    
    statusDisplay.innerHTML = currentPlayerTurn();
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    cells.forEach(cell => cell.addEventListener('click', handleCellClick));
    restartButton.addEventListener('click', handleRestartGame);
}
