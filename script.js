// Portfolio tabs + AI assistant chatbox
// Replace BACKEND_URL with your deployed backend endpoint, for example:
// https://your-api.onrender.com/chat
// const BACKEND_URL = "https://YOUR_BACKEND_DOMAIN/chat";

// const BACKEND_URL = "http://localhost:8000/chat";
const BACKEND_URL = "https://api.render.com/deploy/srv-d9fn2nfjqk9s73eiu4jg?key=Sd5bvXKZCRA/chat"; // Example Render deploy hook URL

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

// Buttons inside panels that jump to another tab (e.g. "Try it" on a project card)
document.querySelectorAll("[data-goto-tab]").forEach((el) => {
  el.addEventListener("click", () => activateTab(el.dataset.gotoTab));
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

// Free-tier hosting sleeps after inactivity; the first request wakes it (~up to a minute).
// If a reply takes a while, show a transient hint so the user knows it's not stuck.
let wakeHintTimer = null;

function showWakingHint() {
  if (!messagesEl || document.getElementById("wake-hint-row")) return;

  const row = document.createElement("div");
  row.className = "chat-row assistant";
  row.id = "wake-hint-row";

  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = "AI";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble assistant wake-hint";
  bubble.textContent =
    "⏳ Waking up the server… The backend runs on free hosting that sleeps after inactivity, so the first reply can take up to a minute.";

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearWakingHint() {
  if (wakeHintTimer) {
    clearTimeout(wakeHintTimer);
    wakeHintTimer = null;
  }
  document.getElementById("wake-hint-row")?.remove();
}

async function sendQuestion(questionFromVoice = false) {
  const question = questionEl?.value.trim();
  if (!question) return;

  appendMessage("user", question);
  questionEl.value = "";
  setLoading(true);
  wakeHintTimer = setTimeout(showWakingHint, 4000);

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

    clearWakingHint();
    appendMessage("assistant", answer);
    conversation.push({ role: "assistant", content: answer });
  } catch (error) {
    clearWakingHint();
    appendMessage(
      "assistant",
      "Sorry, the assistant is currently unavailable. Please try again later."
    );
    console.error("Chatbox error:", error);
  } finally {
    clearWakingHint();
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

// ===== Cookbook tab =====
// Same origin as the chat backend; swap for the deployed backend URL in production
const COOKBOOK_URL = BACKEND_URL.replace(/\/chat$/, "/cookbook");

const cbDropzone = document.getElementById("cb-dropzone");
const cbFileInput = document.getElementById("cb-file");
const cbChooseBtn = document.getElementById("cb-choose");
const cbDzEmpty = document.getElementById("cb-dz-empty");
const cbDzPreview = document.getElementById("cb-dz-preview");
const cbPreviewImg = document.getElementById("cb-preview-img");
const cbPreviewName = document.getElementById("cb-preview-name");
const cbRemovePhoto = document.getElementById("cb-remove-photo");
const cbTagsWrap = document.getElementById("cb-tags");
const cbTagInput = document.getElementById("cb-tag-input");
const cbAnalyzeBtn = document.getElementById("cb-analyze");
const cbStatus = document.getElementById("cb-status");
const cbResults = document.getElementById("cb-results");
const cbSavedList = document.getElementById("cb-saved-list");
const cbSavedStatus = document.getElementById("cb-saved-status");

let cbPhoto = null;
let cbTags = [];
let cbDetectedIngredients = [];

// --- sub-tabs (New search / Saved recipes) ---
document.querySelectorAll(".subtab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".subtab").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".cb-view").forEach((v) => {
      v.classList.toggle("active", v.id === `cb-view-${btn.dataset.cbview}`);
    });
    if (btn.dataset.cbview === "saved") loadSavedRecipes();
  });
});

// --- photo selection ---
function setPhoto(file) {
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) {
    setCbStatus("This photo is larger than 25 MB. Please pick a smaller one.", true);
    return;
  }

  cbPhoto = file;
  cbPreviewName.textContent = file.name;
  cbDzEmpty.hidden = true;
  cbDzPreview.hidden = false;

  // HEIC can't be previewed by most browsers - show a placeholder, upload still works
  if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/.test(file.type)) {
    cbPreviewImg.removeAttribute("src");
    cbPreviewImg.alt = "HEIC photo selected (preview not supported by this browser)";
  } else {
    cbPreviewImg.src = URL.createObjectURL(file);
  }
  setCbStatus("");
}

function clearPhoto() {
  cbPhoto = null;
  cbFileInput.value = "";
  cbDzEmpty.hidden = false;
  cbDzPreview.hidden = true;
  if (cbPreviewImg.src.startsWith("blob:")) URL.revokeObjectURL(cbPreviewImg.src);
  cbPreviewImg.removeAttribute("src");
}

cbChooseBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  cbFileInput.click();
});
cbDropzone?.addEventListener("click", (e) => {
  if (e.target.closest("#cb-remove-photo")) return;
  if (!cbPhoto) cbFileInput.click();
});
cbFileInput?.addEventListener("change", () => setPhoto(cbFileInput.files[0]));
cbRemovePhoto?.addEventListener("click", (e) => {
  e.stopPropagation();
  clearPhoto();
});

["dragover", "dragenter"].forEach((ev) =>
  cbDropzone?.addEventListener(ev, (e) => {
    e.preventDefault();
    cbDropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((ev) =>
  cbDropzone?.addEventListener(ev, (e) => {
    e.preventDefault();
    cbDropzone.classList.remove("dragover");
  })
);
cbDropzone?.addEventListener("drop", (e) => setPhoto(e.dataTransfer.files[0]));

// --- ingredient tags ---
function renderTags() {
  cbTagsWrap.querySelectorAll(".tag").forEach((t) => t.remove());
  cbTags.forEach((tag, i) => {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tag;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${tag}`);
    removeBtn.addEventListener("click", () => {
      cbTags.splice(i, 1);
      renderTags();
    });

    chip.appendChild(removeBtn);
    cbTagsWrap.insertBefore(chip, cbTagInput);
  });
}

function addTagsFromInput() {
  cbTagInput.value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .forEach((t) => {
      if (!cbTags.includes(t) && cbTags.length < 40) cbTags.push(t);
    });
  cbTagInput.value = "";
  renderTags();
}

cbTagInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTagsFromInput();
  } else if (e.key === "Backspace" && !cbTagInput.value && cbTags.length) {
    cbTags.pop();
    renderTags();
  }
});
cbTagInput?.addEventListener("blur", addTagsFromInput);

// --- client-side resize (saves mobile bandwidth; HEIC is left for the server) ---
async function prepareUpload(file) {
  const resizable = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (!resizable || file.size < 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // resize is best-effort; the server normalizes anyway
  }
}

// --- analyze ---
function setCbStatus(text, isError = false) {
  cbStatus.textContent = text;
  cbStatus.classList.toggle("error", isError);
}

async function analyze() {
  addTagsFromInput();

  if (!cbPhoto && cbTags.length === 0) {
    setCbStatus("Add a photo or at least one ingredient first.", true);
    return;
  }

  cbAnalyzeBtn.disabled = true;
  cbAnalyzeBtn.textContent = "Analyzing…";
  setCbStatus("Asking the AI chef… The server may need a minute to wake up on first use.");
  cbResults.innerHTML = "";

  try {
    const form = new FormData();
    if (cbPhoto) form.append("image", await prepareUpload(cbPhoto));
    if (cbTags.length) form.append("ingredients", cbTags.join(","));

    const response = await fetch(COOKBOOK_URL, { method: "POST", body: form });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Backend returned ${response.status}`);
    }

    const data = await response.json();
    renderResults(data);
    setCbStatus("");
  } catch (error) {
    console.error("Cookbook error:", error);
    setCbStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    cbAnalyzeBtn.disabled = false;
    cbAnalyzeBtn.textContent = "Find recipes";
  }
}

cbAnalyzeBtn?.addEventListener("click", analyze);

function renderResults(data) {
  cbResults.innerHTML = "";
  cbDetectedIngredients = data.ingredients || [];

  if (!data.recipes || data.recipes.length === 0) {
    setCbStatus("No ingredients recognized on this photo - try another one.", true);
    return;
  }

  const detected = document.createElement("div");
  detected.className = "cb-detected";
  detected.innerHTML = "<span class='cb-label' style='margin-top:0'>Detected ingredients</span>";
  const chips = document.createElement("div");
  chips.className = "chips";
  cbDetectedIngredients.forEach((ing) => {
    const s = document.createElement("span");
    s.textContent = ing;
    chips.appendChild(s);
  });
  detected.appendChild(chips);
  cbResults.appendChild(detected);

  data.recipes.forEach((recipe) => {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const h = document.createElement("h3");
    h.textContent = recipe.title;
    card.appendChild(h);

    if (recipe.description) {
      const d = document.createElement("p");
      d.textContent = recipe.description;
      card.appendChild(d);
    }

    const ol = document.createElement("ol");
    (recipe.steps || []).forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    });
    card.appendChild(ol);

    const actions = document.createElement("div");
    actions.className = "actions";
    const saveBtn = document.createElement("button");
    saveBtn.className = "project-btn ghost";
    saveBtn.type = "button";
    saveBtn.textContent = "💾 Save recipe";
    saveBtn.addEventListener("click", () => saveRecipe(recipe, saveBtn));
    actions.appendChild(saveBtn);
    card.appendChild(actions);

    cbResults.appendChild(card);
  });
}

// --- save / list / delete ---
async function saveRecipe(recipe, btn) {
  btn.disabled = true;
  try {
    const response = await fetch(`${COOKBOOK_URL}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...recipe, ingredients: cbDetectedIngredients }),
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    btn.textContent = "✓ Saved";
  } catch (error) {
    console.error("Save recipe error:", error);
    btn.disabled = false;
    setCbStatus("Could not save the recipe. Please try again.", true);
  }
}

async function loadSavedRecipes() {
  cbSavedStatus.textContent = "Loading…";
  cbSavedList.innerHTML = "";

  try {
    const response = await fetch(`${COOKBOOK_URL}/recipes?limit=12`);
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const data = await response.json();

    cbSavedStatus.textContent = data.recipes.length
      ? ""
      : "No saved recipes yet - find some in New search!";

    data.recipes.forEach((recipe) => {
      const card = document.createElement("article");
      card.className = "saved-card";

      const h = document.createElement("h3");
      h.textContent = recipe.title;
      card.appendChild(h);

      const t = document.createElement("time");
      const when = new Date(recipe.created_at);
      t.textContent = `${when.toLocaleDateString()} · ${(recipe.ingredients || []).slice(0, 4).join(", ")}`;
      card.appendChild(t);

      if (recipe.description) {
        const d = document.createElement("p");
        d.textContent = recipe.description;
        card.appendChild(d);
      }

      if (recipe.steps?.length) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = `Steps (${recipe.steps.length})`;
        details.appendChild(summary);
        const ol = document.createElement("ol");
        recipe.steps.forEach((step) => {
          const li = document.createElement("li");
          li.textContent = step;
          ol.appendChild(li);
        });
        details.appendChild(ol);
        card.appendChild(details);
      }

      const row = document.createElement("div");
      row.className = "row";
      const del = document.createElement("button");
      del.className = "project-btn ghost";
      del.type = "button";
      del.textContent = "🗑 Delete";
      del.addEventListener("click", async () => {
        del.disabled = true;
        try {
          const res = await fetch(`${COOKBOOK_URL}/recipes/${recipe.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(`Backend returned ${res.status}`);
          card.remove();
          if (!cbSavedList.children.length) {
            cbSavedStatus.textContent = "No saved recipes yet - find some in New search!";
          }
        } catch (error) {
          console.error("Delete recipe error:", error);
          del.disabled = false;
        }
      });
      row.appendChild(del);
      card.appendChild(row);

      cbSavedList.appendChild(card);
    });
  } catch (error) {
    console.error("Load recipes error:", error);
    cbSavedStatus.textContent = "Could not load saved recipes. Is the backend running?";
  }
}
