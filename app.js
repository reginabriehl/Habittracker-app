"use strict";

const STORAGE_KEY = "essensspur.entries.v1";
const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.78;

const form = document.querySelector("#entry-form");
const entryDateInput = document.querySelector("#entry-date");
const entryTimeInput = document.querySelector("#entry-time");
const photoInput = document.querySelector("#entry-photo");
const photoPreview = document.querySelector("#photo-preview");
const photoPreviewImage = document.querySelector("#photo-preview-image");
const removePhotoButton = document.querySelector("#remove-photo");
const symptomDetails = document.querySelector("#symptom-details");
const entryList = document.querySelector("#entry-list");
const entryCount = document.querySelector("#entry-count");
const appMessage = document.querySelector("#app-message");
const patternList = document.querySelector("#pattern-list");
const analysisSummary = document.querySelector("#analysis-summary");
const diaryView = document.querySelector("#diary-view");
const analysisView = document.querySelector("#analysis-view");

let entries = [];
let selectedPhoto = null;
let storageReady = false;

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showMessage(message, isError) {
  appMessage.textContent = message;
  appMessage.classList.toggle("is-error", Boolean(isError));
  appMessage.hidden = false;
}

function clearMessage() {
  appMessage.textContent = "";
  appMessage.classList.remove("is-error");
  appMessage.hidden = true;
}

function readEntries() {
  let storedValue;
  try {
    storedValue = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    showMessage("Der lokale Speicher ist nicht verfügbar. Bitte prüfe die Browser-Einstellungen. Deine Einträge wurden nicht geladen.", true);
    return false;
  }

  if (storedValue === null) {
    entries = [];
    return true;
  }

  try {
    const parsed = JSON.parse(storedValue);
    const validEntries = Array.isArray(parsed) && parsed.every((entry) => (
      entry
      && typeof entry === "object"
      && typeof entry.id === "string"
      && typeof entry.date === "string"
      && typeof entry.time === "string"
      && Array.isArray(entry.foods)
      && entry.foods.every((food) => food && typeof food.name === "string")
      && typeof entry.hasSymptoms === "boolean"
      && (entry.photo === null || typeof entry.photo === "string")
    ));
    if (!validEntries) {
      throw new TypeError("Gespeicherte Einträge haben ein ungültiges Format.");
    }
    entries = parsed;
    return true;
  } catch (error) {
    showMessage("Die gespeicherten Einträge konnten nicht gelesen werden. Sie wurden nicht überschrieben. Bitte sichere den Browser-Speicher, bevor du Änderungen vornimmst.", true);
    return false;
  }
}

function persistEntries(nextEntries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
    entries = nextEntries;
    return true;
  } catch (error) {
    showMessage("Der Eintrag konnte nicht gespeichert werden. Möglicherweise ist der lokale Browserspeicher voll. Lösche keine Daten; entferne gegebenenfalls ein Foto und versuche es erneut.", true);
    return false;
  }
}

function setDefaultDateTime() {
  const now = new Date();
  entryDateInput.value = localDateValue(now);
  entryTimeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function selectedHasSymptoms() {
  return form.querySelector('input[name="hasSymptoms"]:checked')?.value === "yes";
}

function updateSymptomFields() {
  const showDetails = selectedHasSymptoms();
  symptomDetails.hidden = !showDetails;
  document.querySelector("#entry-symptoms").required = showDetails;
}

function normalizeFoodName(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("de");
}

function parseFoods(value) {
  const uniqueFoods = new Map();
  value.split(/[,;\n]+/).forEach((part) => {
    const name = part.trim().replace(/\s+/g, " ");
    const key = normalizeFoodName(name);
    if (key && !uniqueFoods.has(key)) {
      uniqueFoods.set(key, name);
    }
  });
  return Array.from(uniqueFoods, ([key, name]) => ({ key, name }));
}

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function formatEntryDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Datum unbekannt";
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function sortedEntries() {
  return [...entries].sort((a, b) => {
    const aDate = `${a.date || ""}T${a.time || "00:00"}`;
    const bDate = `${b.date || ""}T${b.time || "00:00"}`;
    return bDate.localeCompare(aDate);
  });
}

function renderEmptyState(container, heading, description) {
  const state = makeElement("div", "empty-state");
  state.append(
    makeElement("span", "empty-state-mark", "✳"),
    makeElement("strong", "", heading),
    makeElement("p", "", description)
  );
  container.append(state);
}

function renderEntries() {
  entryList.replaceChildren();
  const ordered = sortedEntries();
  entryCount.textContent = `${ordered.length} ${ordered.length === 1 ? "Eintrag" : "Einträge"}`;

  if (ordered.length === 0) {
    renderEmptyState(entryList, "Dein Tagebuch beginnt hier.", "Halte deine erste Mahlzeit fest und beobachte, wie es dir danach geht.");
    return;
  }

  ordered.forEach((entry) => {
    const card = makeElement("article", "entry-card");
    const top = makeElement("div", "entry-card-top");
    const badge = makeElement(
      "span",
      `symptom-badge${entry.hasSymptoms ? " has-symptoms" : ""}`,
      entry.hasSymptoms ? "Symptome notiert" : "Keine Symptome"
    );
    top.append(
      makeElement("span", "entry-date", formatEntryDate(entry.date)),
      badge
    );

    card.append(
      top,
      makeElement("p", "entry-foods", (entry.foods || []).map((food) => food.name).join(", "))
    );

    if (entry.hasSymptoms && entry.symptoms) {
      card.append(makeElement("p", "entry-symptoms", `Symptome: ${entry.symptoms}`));
    }
    if (entry.hasSymptoms && entry.symptomTime) {
      card.append(makeElement("p", "entry-symptom-time", `Beginn der Symptome: ${entry.symptomTime} Uhr`));
    }
    if (entry.photo) {
      const image = makeElement("img", "entry-photo");
      image.src = entry.photo;
      image.alt = `Essensfoto vom ${formatEntryDate(entry.date)}`;
      card.append(image);
    }

    const bottom = makeElement("div", "entry-card-bottom");
    bottom.append(makeElement("span", "entry-time", `${entry.time || "Uhrzeit unbekannt"} Uhr`));
    const deleteButton = makeElement("button", "delete-button", "Eintrag löschen");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteEntry(entry.id));
    bottom.append(deleteButton);
    card.append(bottom);
    entryList.append(card);
  });
}

function analyzeEntries() {
  const foodGroups = new Map();
  entries.forEach((entry) => {
    (entry.foods || []).forEach((food) => {
      const key = food.key || normalizeFoodName(food.name || "");
      if (!key) {
        return;
      }
      if (!foodGroups.has(key)) {
        foodGroups.set(key, { name: food.name || key, total: 0, symptoms: 0, dates: [] });
      }
      const group = foodGroups.get(key);
      group.total += 1;
      if (entry.hasSymptoms) {
        group.symptoms += 1;
        group.dates.push(entry.date);
      }
    });
  });

  return Array.from(foodGroups.values())
    .filter((group) => group.total >= 2 && group.symptoms >= 2)
    .sort((a, b) => (b.symptoms / b.total) - (a.symptoms / a.total) || b.symptoms - a.symptoms || a.name.localeCompare(b.name, "de"));
}

function renderAnalysis() {
  analysisSummary.replaceChildren();
  patternList.replaceChildren();
  const patterns = analyzeEntries();
  const totalWithSymptoms = entries.filter((entry) => entry.hasSymptoms).length;

  const summaryItems = [
    { number: entries.length, label: "Einträge insgesamt" },
    { number: totalWithSymptoms, label: "mit Symptomen notiert" },
    { number: patterns.length, label: "wiederkehrende Muster" }
  ];
  summaryItems.forEach((item) => {
    const card = makeElement("div", "summary-card");
    card.append(
      makeElement("span", "summary-number", String(item.number)),
      makeElement("span", "summary-label", item.label)
    );
    analysisSummary.append(card);
  });

  if (patterns.length === 0) {
    renderEmptyState(
      patternList,
      entries.length < 2 ? "Noch zu wenig Einträge." : "Noch kein wiederkehrendes Muster.",
      "Für ein Muster muss ein Lebensmittel mindestens zweimal eingetragen worden sein und in mindestens zwei dieser Einträge mit Symptomen vorkommen. Schreib weiter mit – die Übersicht aktualisiert sich automatisch."
    );
    return;
  }

  patterns.forEach((pattern) => {
    const card = makeElement("article", "pattern-card");
    const rate = Math.round((pattern.symptoms / pattern.total) * 100);
    const heading = makeElement("h3", "", pattern.name);
    const rateLine = makeElement("p", "pattern-rate", `Symptome in ${pattern.symptoms} von ${pattern.total} Einträgen (${rate} %)`);
    const explanation = makeElement("p", "", `Dieses Lebensmittel wurde ${pattern.total} Mal notiert. In ${pattern.total - pattern.symptoms} ${pattern.total - pattern.symptoms === 1 ? "Eintrag" : "Einträgen"} dazu wurden keine Symptome festgehalten.`);
    const dates = pattern.dates
      .filter(Boolean)
      .sort()
      .slice(-3)
      .map(formatEntryDate);
    card.append(heading, rateLine, explanation);
    if (dates.length > 0) {
      card.append(makeElement("p", "pattern-dates", `Symptome notiert am: ${dates.join(" · ")}`));
    }
    patternList.append(card);
  });
}

function renderAll() {
  renderEntries();
  renderAnalysis();
}

function savePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Bitte wähle eine Bilddatei aus."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Das Foto konnte nicht gelesen werden."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Das ausgewählte Foto konnte nicht verarbeitet werden."));
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Das Foto konnte nicht verkleinert werden."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function clearSelectedPhoto() {
  selectedPhoto = null;
  photoInput.value = "";
  photoPreview.hidden = true;
  photoPreviewImage.removeAttribute("src");
}

async function handlePhotoSelection() {
  clearMessage();
  const file = photoInput.files && photoInput.files[0];
  if (!file) {
    return;
  }
  try {
    selectedPhoto = await savePhoto(file);
    photoPreviewImage.src = selectedPhoto;
    photoPreview.hidden = false;
  } catch (error) {
    clearSelectedPhoto();
    showMessage(error.message, true);
  }
}

async function submitEntry(event) {
  event.preventDefault();
  clearMessage();
  if (!storageReady) {
    showMessage("Der lokale Speicher ist nicht bereit. Deine bestehenden Daten wurden nicht verändert.", true);
    return;
  }
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  const hasSymptoms = formData.get("hasSymptoms") === "yes";
  const foods = parseFoods(String(formData.get("food") || ""));
  if (foods.length === 0) {
    showMessage("Bitte gib mindestens ein Lebensmittel ein.", true);
    return;
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: String(formData.get("date")),
    time: String(formData.get("time")),
    foods,
    photo: selectedPhoto,
    hasSymptoms,
    symptoms: hasSymptoms ? String(formData.get("symptoms") || "").trim() : "",
    symptomTime: hasSymptoms ? String(formData.get("symptomTime") || "") : ""
  };

  if (!persistEntries([...entries, entry])) {
    return;
  }

  form.reset();
  clearSelectedPhoto();
  setDefaultDateTime();
  updateSymptomFields();
  renderAll();
  showMessage("Dein Eintrag wurde lokal auf diesem Gerät gespeichert.", false);
}

function deleteEntry(id) {
  if (!storageReady) {
    showMessage("Der lokale Speicher ist nicht bereit. Deine bestehenden Daten wurden nicht verändert.", true);
    return;
  }
  const entry = entries.find((item) => item.id === id);
  if (!entry || !window.confirm("Möchtest du diesen Tagebucheintrag wirklich löschen?")) {
    return;
  }
  clearMessage();
  if (persistEntries(entries.filter((item) => item.id !== id))) {
    renderAll();
    showMessage("Der Eintrag wurde aus dem lokalen Tagebuch gelöscht.", false);
  }
}

function switchView(viewName) {
  const showDiary = viewName === "diary";
  diaryView.hidden = !showDiary;
  analysisView.hidden = showDiary;
  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});
form.addEventListener("change", (event) => {
  if (event.target.name === "hasSymptoms") {
    updateSymptomFields();
  }
});
form.addEventListener("submit", submitEntry);
photoInput.addEventListener("change", handlePhotoSelection);
removePhotoButton.addEventListener("click", clearSelectedPhoto);

setDefaultDateTime();
updateSymptomFields();
storageReady = readEntries();
renderAll();
