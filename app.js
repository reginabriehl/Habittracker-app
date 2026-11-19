"use strict";

const STORAGE_KEY = "essensspur.entries.v1";
const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.78;
const CYCLE_STORAGE_KEY = "essensspur.cycle.v1";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const THEME_STORAGE_KEY = "essensspur.theme";
const THEME_COLORS = { light: "#f5f3ed", dark: "#121815" };

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
const cycleView = document.querySelector("#cycle-view");
const cycleForm = document.querySelector("#cycle-form");
const cycleStartInput = document.querySelector("#cycle-start");
const cycleEndInput = document.querySelector("#cycle-end");
const cycleSummary = document.querySelector("#cycle-summary");
const periodList = document.querySelector("#period-list");
const calendarTitle = document.querySelector("#calendar-title");
const calendarGrid = document.querySelector("#calendar-grid");
const themeToggle = document.querySelector("#theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

let entries = [];
let selectedPhoto = null;
let storageReady = false;
let periods = [];
let cycleStorageReady = false;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

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

const dateTextInputs = new Map();

function formatDateForInput(isoDate) {
  if (!DATE_PATTERN.test(isoDate || "")) {
    return "";
  }
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function parseEuropeanDate(text) {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) {
    return null;
  }
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return localDateValue(date);
}

function validateDateText(dateInput, textInput) {
  const text = textInput.value.trim();
  textInput.setCustomValidity("");
  dateInput.value = "";
  if (!text) {
    return;
  }
  const isoDate = parseEuropeanDate(text);
  if (!isoDate) {
    textInput.setCustomValidity("Bitte gib das Datum im Format TT.MM.JJJJ ein, z. B. 18.11.2026.");
    return;
  }
  if (dateInput.max && isoDate > dateInput.max) {
    textInput.setCustomValidity(`Das Datum darf nicht nach dem ${formatDateForInput(dateInput.max)} liegen.`);
    return;
  }
  dateInput.value = isoDate;
}

function setDateField(dateInput, isoDate) {
  const textInput = dateTextInputs.get(dateInput);
  if (!textInput) {
    dateInput.value = isoDate || "";
    return;
  }
  textInput.value = formatDateForInput(isoDate);
  validateDateText(dateInput, textInput);
}

function enhanceDateInput(dateInput) {
  const wrapper = makeElement("div", "date-field");
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.id = `${dateInput.id}-text`;
  textInput.inputMode = "numeric";
  textInput.autocomplete = "off";
  textInput.placeholder = "TT.MM.JJJJ";
  textInput.required = dateInput.required;

  dateInput.required = false;
  dateInput.tabIndex = -1;
  dateInput.setAttribute("aria-hidden", "true");
  dateInput.classList.add("date-picker-native");

  const pickerButton = makeElement("button", "date-picker-button");
  pickerButton.type = "button";
  pickerButton.setAttribute("aria-label", "Datum im Kalender auswählen");
  pickerButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  pickerButton.addEventListener("click", () => {
    try {
      dateInput.showPicker();
    } catch (error) {
      textInput.focus();
    }
  });

  dateInput.addEventListener("change", () => {
    setDateField(dateInput, dateInput.value);
    textInput.focus();
  });
  textInput.addEventListener("input", () => validateDateText(dateInput, textInput));

  dateInput.replaceWith(wrapper);
  wrapper.append(textInput, pickerButton, dateInput);
  dateTextInputs.set(dateInput, textInput);
}

function setDefaultDateTime() {
  const now = new Date();
  setDateField(entryDateInput, localDateValue(now));
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
    const meta = makeElement("div", "entry-meta");
    meta.append(makeElement("span", "entry-date", formatEntryDate(entry.date)));
    const cycleDay = cycleDayFor(entry.date);
    if (cycleDay !== null) {
      meta.append(makeElement("span", "cycle-badge", `Zyklustag ${cycleDay}`));
    }
    top.append(meta, badge);

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

function readPeriods() {
  let storedValue;
  try {
    storedValue = window.localStorage.getItem(CYCLE_STORAGE_KEY);
  } catch (error) {
    showMessage("Der lokale Speicher ist nicht verfügbar. Deine Zyklusdaten wurden nicht geladen.", true);
    return false;
  }

  if (storedValue === null) {
    periods = [];
    return true;
  }

  try {
    const parsed = JSON.parse(storedValue);
    const validPeriods = Array.isArray(parsed) && parsed.every((period) => (
      period
      && typeof period === "object"
      && typeof period.id === "string"
      && typeof period.start === "string"
      && DATE_PATTERN.test(period.start)
      && (period.end === null || (typeof period.end === "string" && DATE_PATTERN.test(period.end)))
    ));
    if (!validPeriods) {
      throw new TypeError("Gespeicherte Zyklusdaten haben ein ungültiges Format.");
    }
    periods = parsed;
    return true;
  } catch (error) {
    showMessage("Die gespeicherten Zyklusdaten konnten nicht gelesen werden. Sie wurden nicht überschrieben.", true);
    return false;
  }
}

function persistPeriods(nextPeriods) {
  try {
    window.localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(nextPeriods));
    periods = nextPeriods;
    return true;
  } catch (error) {
    showMessage("Die Periode konnte nicht gespeichert werden. Möglicherweise ist der lokale Browserspeicher voll. Deine bisherigen Daten wurden nicht verändert.", true);
    return false;
  }
}

function dayNumber(dateString) {
  if (!DATE_PATTERN.test(dateString || "")) {
    return NaN;
  }
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86400000);
}

function periodsByStart() {
  return [...periods].sort((a, b) => a.start.localeCompare(b.start));
}

function latestPeriodOn(dateString) {
  let latest = null;
  periodsByStart().forEach((period) => {
    if (period.start <= dateString) {
      latest = period;
    }
  });
  return latest;
}

function cycleDayFor(dateString) {
  const target = dayNumber(dateString);
  if (Number.isNaN(target)) {
    return null;
  }
  const period = latestPeriodOn(dateString);
  return period ? target - dayNumber(period.start) + 1 : null;
}

function isPeriodDay(dateString) {
  return periods.some((period) => period.start <= dateString && dateString <= (period.end || period.start));
}

function averageCycleLength() {
  const starts = periodsByStart().map((period) => dayNumber(period.start));
  if (starts.length < 2) {
    return null;
  }
  const lengths = starts.slice(1).map((start, index) => start - starts[index]);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return { days: Math.round(total / lengths.length), cycles: lengths.length };
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(`${dateString}T00:00:00`));
}

function renderCycleSummary() {
  cycleSummary.replaceChildren();
  const today = localDateValue(new Date());
  const cycleDay = cycleDayFor(today);
  const currentPeriod = latestPeriodOn(today);
  const average = averageCycleLength();

  const summaryItems = [
    {
      number: cycleDay === null ? "–" : String(cycleDay),
      label: cycleDay === null ? "Zyklustag heute – trage zuerst eine Periode ein" : "Zyklustag heute"
    },
    {
      number: currentPeriod ? formatShortDate(currentPeriod.start) : "–",
      label: "Beginn des aktuellen Zyklus"
    },
    {
      number: average ? String(average.days) : "–",
      label: average
        ? `Ø Zykluslänge in Tagen (aus ${average.cycles} ${average.cycles === 1 ? "Zyklus" : "Zyklen"})`
        : "Ø Zykluslänge – ab 2 eingetragenen Perioden"
    }
  ];
  summaryItems.forEach((item) => {
    const card = makeElement("div", "summary-card");
    card.append(
      makeElement("span", "summary-number", item.number),
      makeElement("span", "summary-label", item.label)
    );
    cycleSummary.append(card);
  });
}

function renderPeriodList() {
  periodList.replaceChildren();
  const ordered = periodsByStart().reverse();
  if (ordered.length === 0) {
    periodList.append(makeElement("li", "period-empty", "Noch keine Periode eingetragen."));
    return;
  }
  ordered.forEach((period) => {
    const item = makeElement("li", "period-item");
    const text = makeElement("div", "");
    const range = period.end && period.end !== period.start
      ? `${formatEntryDate(period.start)} – ${formatEntryDate(period.end)}`
      : formatEntryDate(period.start);
    const length = period.end ? dayNumber(period.end) - dayNumber(period.start) + 1 : null;
    text.append(
      makeElement("span", "period-dates", range),
      makeElement("span", "period-length", length ? `${length} ${length === 1 ? "Tag" : "Tage"}` : "Letzter Tag noch offen")
    );
    const deleteButton = makeElement("button", "delete-button", "Löschen");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Periode vom ${formatEntryDate(period.start)} löschen`);
    deleteButton.addEventListener("click", () => deletePeriod(period.id));
    item.append(text, deleteButton);
    periodList.append(item);
  });
}

function renderCalendar() {
  calendarGrid.replaceChildren();
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  calendarTitle.textContent = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(calendarMonth);

  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = localDateValue(new Date());

  for (let blank = 0; blank < leadingBlanks; blank += 1) {
    const spacer = makeElement("span", "calendar-blank");
    spacer.setAttribute("aria-hidden", "true");
    calendarGrid.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateString = localDateValue(new Date(year, month, day));
    const cycleDay = dateString <= today ? cycleDayFor(dateString) : null;
    const isStart = periods.some((period) => period.start === dateString);
    const isPeriod = isPeriodDay(dateString);
    const isToday = dateString === today;

    const cell = makeElement("button", "calendar-day");
    cell.type = "button";
    cell.classList.toggle("is-period", isPeriod);
    cell.classList.toggle("is-start", isStart);
    cell.classList.toggle("is-today", isToday);
    cell.append(makeElement("span", "calendar-date", String(day)));
    if (cycleDay !== null) {
      cell.append(makeElement("span", "calendar-cycle-day", `ZT ${cycleDay}`));
    }

    const labelParts = [formatEntryDate(dateString)];
    if (isToday) {
      labelParts.push("heute");
      cell.setAttribute("aria-current", "date");
    }
    if (cycleDay !== null) {
      labelParts.push(`Zyklustag ${cycleDay}`);
    }
    if (isStart) {
      labelParts.push("erster Tag der Periode");
    } else if (isPeriod) {
      labelParts.push("Periode");
    }
    cell.setAttribute("aria-label", labelParts.join(", "));
    cell.addEventListener("click", () => {
      setDateField(cycleStartInput, dateString);
      dateTextInputs.get(cycleStartInput).focus();
    });
    calendarGrid.append(cell);
  }
}

function renderCycle() {
  cycleStartInput.max = localDateValue(new Date());
  renderCycleSummary();
  renderPeriodList();
  renderCalendar();
}

function submitPeriod(event) {
  event.preventDefault();
  clearMessage();
  if (!cycleStorageReady) {
    showMessage("Der lokale Speicher für Zyklusdaten ist nicht bereit. Deine bestehenden Daten wurden nicht verändert.", true);
    return;
  }
  if (!cycleForm.reportValidity()) {
    return;
  }

  const start = cycleStartInput.value;
  const end = cycleEndInput.value || null;
  if (end && end < start) {
    showMessage("Der letzte Tag der Periode darf nicht vor dem ersten Tag liegen.", true);
    return;
  }

  const existing = periods.find((period) => period.start === start);
  if (existing && !end) {
    showMessage(
      existing.end
        ? `Die Periode ab ${formatEntryDate(start)} ist schon mit letztem Tag ${formatEntryDate(existing.end)} gespeichert. Gib einen letzten Tag ein, um ihn zu ändern.`
        : `Die Periode ab ${formatEntryDate(start)} ist schon gespeichert. Gib einen letzten Tag ein, um sie zu ergänzen.`,
      true
    );
    return;
  }

  const others = periods.filter((period) => period !== existing);
  const overlapping = others.find((period) => period.start < start && start <= (period.end || period.start));
  if (overlapping) {
    showMessage(`Dieser Tag liegt innerhalb der Periode ab ${formatEntryDate(overlapping.start)}. Bitte prüfe das Datum.`, true);
    return;
  }
  const enclosed = end ? others.find((period) => period.start > start && period.start <= end) : null;
  if (enclosed) {
    showMessage(`Der Zeitraum überschneidet sich mit der Periode ab ${formatEntryDate(enclosed.start)}. Bitte prüfe die Daten.`, true);
    return;
  }

  let nextPeriods;
  let message;
  if (existing) {
    nextPeriods = periods.map((period) => (period.id === existing.id ? { ...period, end } : period));
    message = "Die Periode wurde aktualisiert und lokal gespeichert.";
  } else {
    nextPeriods = [...periods, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, start, end }];
    message = "Die Periode wurde lokal auf diesem Gerät gespeichert.";
  }

  if (!persistPeriods(nextPeriods)) {
    return;
  }
  cycleForm.reset();
  const [year, month] = start.split("-").map(Number);
  calendarMonth = new Date(year, month - 1, 1);
  renderAll();
  showMessage(message, false);
}

function deletePeriod(id) {
  if (!cycleStorageReady) {
    showMessage("Der lokale Speicher für Zyklusdaten ist nicht bereit. Deine bestehenden Daten wurden nicht verändert.", true);
    return;
  }
  const period = periods.find((item) => item.id === id);
  if (!period || !window.confirm(`Möchtest du die Periode vom ${formatEntryDate(period.start)} wirklich löschen?`)) {
    return;
  }
  clearMessage();
  if (persistPeriods(periods.filter((item) => item.id !== id))) {
    renderAll();
    showMessage("Die Periode wurde aus dem lokalen Zykluskalender gelöscht.", false);
  }
}

function changeCalendarMonth(offset) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
  renderCalendar();
}

function renderAll() {
  renderEntries();
  renderAnalysis();
  renderCycle();
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
  const views = { diary: diaryView, analysis: analysisView, cycle: cycleView };
  Object.entries(views).forEach(([name, view]) => {
    view.hidden = name !== viewName;
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function storedTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch (error) {
    return null;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeColorMeta.setAttribute("content", THEME_COLORS[theme]);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (error) {
    showMessage("Das gewählte Design gilt nur für diesen Besuch, weil der lokale Speicher nicht verfügbar ist. Deine Einträge sind davon nicht betroffen.", false);
  }
}

themeToggle.addEventListener("click", toggleTheme);
systemDarkQuery.addEventListener("change", (event) => {
  if (!storedTheme()) {
    applyTheme(event.matches ? "dark" : "light");
  }
});
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

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
cycleForm.addEventListener("submit", submitPeriod);
document.querySelector("#calendar-prev").addEventListener("click", () => changeCalendarMonth(-1));
document.querySelector("#calendar-next").addEventListener("click", () => changeCalendarMonth(1));

[entryDateInput, cycleStartInput, cycleEndInput].forEach(enhanceDateInput);
setDefaultDateTime();
updateSymptomFields();
storageReady = readEntries();
cycleStorageReady = readPeriods();
renderAll();
