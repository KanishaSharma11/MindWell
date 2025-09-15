// ========== GLOBALS ==========
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");
const avatarBtn = document.getElementById("avatar-btn");
const callBtn = document.getElementById("call-btn");
const statusEl = document.getElementById("status");

let voiceMode = false;   // Mic input only
let callMode = false;    // Mic input + female TTS output
let avatarMode = false;
let femaleVoice = null;
let isResizingChat = false;
let isResizingScene = false;

// ========== VOICE SELECTION ==========
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  // Prioritize female voices
  femaleVoice =
    voices.find(v => v.name.toLowerCase().includes("female")) ||
    voices.find(v => v.name.toLowerCase().includes("samantha")) ||
    voices.find(v => v.name.toLowerCase().includes("google uk english female")) ||
    voices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("google")) ||
    voices[0]; // fallback
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// ========== PARTICLES ==========
function createParticle() {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = Math.random() * 100 + '%';
  particle.style.width = particle.style.height = Math.random() * 4 + 2 + 'px';
  particle.style.animationDuration = (Math.random() * 15 + 15) + 's';
  particle.style.animationDelay = Math.random() * 5 + 's';
  document.getElementById('scene-container').appendChild(particle);

  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, 20000);
}
setInterval(createParticle, 3000);
for (let i = 0; i < 5; i++) setTimeout(createParticle, i * 1000);

// ========== CHAT FUNCTIONS ==========
function appendMsg(sender, text) {
  let div = document.createElement("div");
  div.className = "msg " + sender;
  div.textContent = sender.toUpperCase() + ": " + text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendText(text) {
  appendMsg("user", text);
  input.value = "";

  let res = await fetch("http://127.0.0.1:5000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  });

  let data = await res.json();
  let botReply = data.response;
  appendMsg("bot", botReply);

  if (callMode) {
    speakWithFemaleVoice(botReply);  // only in call mode
  }
  if (avatarMode) animateAvatar(botReply);

  return botReply;
}

sendBtn.onclick = () => {
  if (input.value.trim()) sendText(input.value.trim());
};
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ========== SPEECH RECOGNITION ==========
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = SR ? new SR() : null;
if (recognition) {
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (e) => {
    const userText = e.results[0][0].transcript;
    sendText(userText);
  };
}

// ========== VOICE MODE (mic input only) ==========
voiceBtn.onclick = () => {
  voiceMode = !voiceMode;
  if (voiceMode) {
    voiceBtn.style.background = "lightgreen";
    statusEl.textContent = "🎤 Listening (voice mode)...";
    if (recognition) {
      recognition.start();
      recognition.onend = () => {
        if (voiceMode) recognition.start(); // keep listening
      };
    }
  } else {
    voiceBtn.style.background = "";
    statusEl.textContent = "";
    if (recognition) recognition.stop();
  }
};

// ========== CALL MODE (mic input + female TTS output) ==========
callBtn.onclick = () => {
  callMode = !callMode;
  if (callMode) {
    callBtn.style.background = "lightgreen";
    statusEl.textContent = "📞 Call in progress...";
    if (recognition) {
      recognition.start();
      recognition.onresult = (e) => {
        const userText = e.results[0][0].transcript;
        sendText(userText);
      };
      recognition.onend = () => {
        if (callMode) recognition.start(); // keep listening
      };
    }
  } else {
    callBtn.style.background = "";
    statusEl.textContent = "Call ended ❌";
    if (recognition) recognition.stop();
  }
};

// ========== FEMALE TTS ==========
function cleanText(text) {
  text = text.replace(/\(.*?\)/g, ""); // remove (actions)
  text = text.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu, ""); // emojis
  text = text.replace(/[^\w\s.,!?'"-]/g, ""); // extra symbols
  return text.trim();
}
function getFemaleVoice() {
  let voices = speechSynthesis.getVoices();
  return (
    voices.find(v => v.name.toLowerCase().includes("female")) ||
    voices.find(v => v.name.toLowerCase().includes("samantha")) ||
    voices.find(v => v.name.toLowerCase().includes("google uk english female")) ||
    voices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("google")) ||
    voices[0] // fallback
  );
}
function speakWithFemaleVoice(text) {
  if (!text) return;
  const clean = cleanText(text);
  const utter = new SpeechSynthesisUtterance(clean);

  femaleVoice = getFemaleVoice(); // always refresh voices
  if (femaleVoice) utter.voice = femaleVoice;

  utter.lang = "en-US";
  utter.pitch = 1.2;
  utter.rate = 1;
  utter.onend = () => stopLipSync();

  // ⚠ Remove cancel() before speak, or it may cancel too fast
  // speechSynthesis.cancel(); ❌

  speechSynthesis.speak(utter);
  lipSync(text);
}

// ========== 3D AVATAR ==========
const container = document.getElementById("scene-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 1.5, 3);
camera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.innerHTML = "";
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);

const loader = new THREE.GLTFLoader();
loader.load("./9004381664212338590.vrm", (gltf) => {
  THREE.VRM.from(gltf).then((vrm) => {
    vrm.scene.rotation.y = Math.PI;  // face camera
    scene.add(vrm.scene);
    window.currentVrm = vrm;
    animate();
  });
});



function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

avatarBtn.onclick = () => {
  avatarMode = !avatarMode;
  if (avatarMode && window.currentVrm) {
    camera.position.set(0, 1.5, 0.6);
    camera.lookAt(0, 1.5, 0);
  } else {
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 1.5, 0);
  }
};

// ========== LIP SYNC ==========
let lipInterval = null;
function lipSync(text) {
  if (!window.currentVrm) return;
  const blend = window.currentVrm.blendShapeProxy;
  if (!blend) return;
  const mouthShapes = ["A", "I", "U", "E", "O"];
  let i = 0;
  lipInterval = setInterval(() => {
    const shape = mouthShapes[i % mouthShapes.length];
    blend.setValue(shape, 1.0);
    if (i > 0) {
      const prev = mouthShapes[(i - 1) % mouthShapes.length];
      blend.setValue(prev, 0.0);
    }
    i++;
  }, 120);
}
function stopLipSync() {
  if (!window.currentVrm || !lipInterval) return;
  clearInterval(lipInterval);
  lipInterval = null;
  const blend = window.currentVrm.blendShapeProxy;
  if (blend) ["A", "I", "U", "E", "O"].forEach(s => blend.setValue(s, 0.0));
}

/*
// ========== SCREEN RECORDING VIDEO ==========
const videoEl = document.getElementById("screen-recording");

let videoVisible = false;

avatarBtn.addEventListener("click", () => {
  videoVisible = !videoVisible;

  if (videoVisible) {
    videoEl.style.display = "block";
    videoEl.play().catch(e => {
      console.warn("Video play failed:", e);
    });
    avatarBtn.style.background = "lightgreen";
  } else {
    videoEl.pause();
    videoEl.currentTime = 0;
    videoEl.style.display = "none";
    avatarBtn.style.background = "";
  }
});



// ========== RESIZABLE PANELS ==========
const chatPanel = document.getElementById("chat-panel");
const scenePanel = document.getElementById("scene-panel");
const divider = document.getElementById("divider");

divider.addEventListener("mousedown", (e) => {
  if (e.clientX < window.innerWidth / 2) {
    isResizingChat = true;
  } else {
    isResizingScene = true;
  }
  document.body.style.cursor = "col-resize";
} 
);
document.addEventListener("mousemove", (e) => {
  if (isResizingChat) {
    let newWidth = e.clientX;
    if (newWidth < 200) newWidth = 200; // min width
    if (newWidth > window.innerWidth - 200) newWidth = window.innerWidth - 200;
    chatPanel.style.width = newWidth + "px";
    scenePanel.style.width = (window.innerWidth - newWidth - divider.offsetWidth) + "px";
    camera.aspect = scenePanel.clientWidth / scenePanel.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(scenePanel.clientWidth, scenePanel.clientHeight);
  }
  if (isResizingScene) {
    let newWidth = window.innerWidth - e.clientX - divider.offsetWidth;
    if (newWidth < 200) newWidth = 200; // min width
    if (newWidth > window.innerWidth - 200) newWidth = window.innerWidth - 200;
    scenePanel.style.width = newWidth + "px";
    chatPanel.style.width = (window.innerWidth - newWidth - divider.offsetWidth) + "px";
    camera.aspect = scenePanel.clientWidth / scenePanel.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(scenePanel.clientWidth, scenePanel.clientHeight);
  } 
});
document.addEventListener("mouseup", () => {
  isResizingChat = false;
  isResizingScene = false;
  document.body.style.cursor = "";
}
);
// Initial resize to set correct sizes
window.dispatchEvent(new Event("mousemove"));
// ========== END ==========*/
