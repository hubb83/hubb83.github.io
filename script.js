// Portfolio tabs + AI assistant chatbox
// Replace BACKEND_URL with your deployed backend endpoint, for example:
// https://your-api.onrender.com/chat
// const BACKEND_URL = "https://YOUR_BACKEND_DOMAIN/chat";
// const BACKEND_URL = "http://localhost:8000/chat";


const BACKEND_URL = "http://localhost:8800/chat";

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const messagesEl = document.getElementById("chat-messages");
const questionEl = document.getElementById("chat-question");
const sendBtn = document.getElementById("chat-send");
const voiceBtn = document.getElementById("chat-voice");
const voiceStatusEl = document.getElementById("voice-status");

let conversation = [];
let recognition = null;
let isListening = false;

function activateTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

function appendMessage(role, text) {
  if (!messagesEl) return;

  const row = document.createElement("div");
  row.className = `chat-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = role === "user" ? "Me" : "AI";

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;

  if (role === "user") {
    row.appendChild(bubble);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(bubble);
  }

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(isLoading) {
  if (!sendBtn || !questionEl) return;

  sendBtn.disabled = isLoading;
  questionEl.disabled = isLoading;
  sendBtn.textContent = isLoading ? "Thinking..." : "Send";
}

function setVoiceStatus(text) {
  if (voiceStatusEl) {
    voiceStatusEl.textContent = text;
  }
}

async function sendQuestion(questionFromVoice = false) {
  const question = questionEl?.value.trim();
  if (!question) return;

  appendMessage("user", question);
  questionEl.value = "";
  setLoading(true);

  conversation.push({ role: "user", content: question });

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        history: conversation,
        source: "portfolio",
        inputMode: questionFromVoice ? "voice" : "text"
      })
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    const answer = data.answer || data.message || "I could not generate an answer.";

    appendMessage("assistant", answer);
    conversation.push({ role: "assistant", content: answer });
  } catch (error) {
    appendMessage(
      "assistant",
      "Sorry, the assistant is currently unavailable. Please try again later."
    );
    console.error("Chatbox error:", error);
  } finally {
    setLoading(false);
    questionEl?.focus();
  }
}

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceBtn?.classList.add("disabled");
    setVoiceStatus("Voice recognition is not supported in this browser yet");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pl-PL";
  // recognition.lang = "en-US"; // Uncomment this line for English
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    voiceBtn?.classList.add("listening");
    if (voiceBtn) voiceBtn.textContent = "Listening...";
    setVoiceStatus("Listening to recruiter question...");
  };

  recognition.onresult = (event) => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }

    if (questionEl) {
      questionEl.value = transcript.trim();
    }
  };

  recognition.onerror = (event) => {
    console.error("Voice recognition error:", event.error);
    setVoiceStatus("Voice recognition stopped. You can type the question instead.");
  };

  recognition.onend = () => {
    isListening = false;
    voiceBtn?.classList.remove("listening");
    if (voiceBtn) voiceBtn.textContent = "🎙 Voice conversation";

    const question = questionEl?.value.trim();
    if (question) {
      setVoiceStatus("Voice captured. Sending question...");
      sendQuestion(true);
    } else {
      setVoiceStatus("Voice mode preview");
    }
  };
}

function toggleVoiceConversation() {
  if (!recognition) {
    setVoiceStatus("Voice recognition is not available in this browser.");
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  recognition.start();
}

sendBtn?.addEventListener("click", () => sendQuestion(false));

questionEl?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendQuestion(false);
  }
});

voiceBtn?.addEventListener("click", toggleVoiceConversation);
setupVoiceRecognition();
