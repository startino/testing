(() => {
  const STORAGE_KEY = "startino.trip-packing-checklist.v1";
  const CATEGORIES = ["Clothes", "Toiletries", "Documents", "Electronics", "Health", "Other"];
  const FILTER_PREDICATES = {
    all: () => true,
    "to-pack": (item) => !item.packed,
    packed: (item) => item.packed,
  };
  const FILTER_EMPTY_TEXT = {
    all: "",
    "to-pack": "Nothing left to pack.",
    packed: "Nothing is packed yet.",
  };
  const EMPTY_LIST_TEXT = "Your list is empty. Add your first item above.";
  const STORAGE_FAILED_TEXT = "Saving is not available. Your list stays only until you close this page.";
  const DATA_DROPPED_TEXT = "Some saved data could not be read and was removed.";

  const elements = {
    storageNotice: document.getElementById("storage-notice"),
    progressText: document.getElementById("progress-text"),
    progressBar: document.getElementById("progress-bar"),
    addForm: document.getElementById("add-form"),
    nameInput: document.getElementById("item-name"),
    categorySelect: document.getElementById("item-category"),
    formMessage: document.getElementById("form-message"),
    filterRadios: document.querySelectorAll('input[name="filter"]'),
    clearPacked: document.getElementById("clear-packed"),
    startOver: document.getElementById("start-over"),
    emptyState: document.getElementById("empty-state"),
    groups: document.getElementById("groups"),
  };

  const duplicateKey = (name) => name.normalize("NFC").toLowerCase();

  const isValidEntry = (entry) =>
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.id === "string" &&
    entry.id !== "" &&
    typeof entry.name === "string" &&
    entry.name.trim() !== "" &&
    CATEGORIES.includes(entry.category) &&
    typeof entry.packed === "boolean";

  const sanitizeEntries = (entries) => {
    const seenIds = new Set();
    const seenNames = new Set();
    const items = [];
    for (const entry of entries) {
      if (!isValidEntry(entry)) continue;
      const name = entry.name.trim();
      const nameKey = `${entry.category}/${duplicateKey(name)}`;
      if (seenIds.has(entry.id) || seenNames.has(nameKey)) continue;
      seenIds.add(entry.id);
      seenNames.add(nameKey);
      items.push({ id: entry.id, name, category: entry.category, packed: entry.packed });
    }
    return items;
  };

  const parseStoredList = (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { items: [], dropped: true };
    }
    if (!Array.isArray(parsed)) return { items: [], dropped: true };
    const items = sanitizeEntries(parsed);
    return { items, dropped: items.length !== parsed.length };
  };

  const readStoredList = () => {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return { items: [], dropped: false, readable: false };
    }
    if (raw === null) return { items: [], dropped: false, readable: true };
    return { ...parseStoredList(raw), readable: true };
  };

  const writeStoredList = (items) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  };

  const state = {
    items: [],
    filter: "all",
    storageFailed: false,
    dataDropped: false,
  };

  let nextIdSuffix = 0;
  const createItemId = () => {
    nextIdSuffix += 1;
    return `item-${Date.now().toString(36)}-${nextIdSuffix}`;
  };

  const isVisible = (item) => FILTER_PREDICATES[state.filter](item);

  const visibleItemsInDisplayOrder = () =>
    CATEGORIES.flatMap((category) =>
      state.items.filter((item) => item.category === category && isVisible(item)),
    );

  const setTextIfChanged = (element, text) => {
    if (element.textContent !== text) element.textContent = text;
  };

  const showMessage = (text) => {
    elements.formMessage.classList.remove("is-error");
    elements.formMessage.textContent = text;
    elements.nameInput.removeAttribute("aria-invalid");
  };

  const showError = (text) => {
    elements.formMessage.classList.add("is-error");
    elements.formMessage.textContent = text;
    elements.nameInput.setAttribute("aria-invalid", "true");
    elements.nameInput.focus();
  };

  const packedCountOf = (items) => items.filter((item) => item.packed).length;

  const progressLabel = (items) => `${packedCountOf(items)} of ${items.length} packed`;

  const renderItem = (item, checkboxesById) => {
    const row = document.createElement("li");
    row.className = item.packed ? "item is-packed" : "item";

    const label = document.createElement("label");
    label.className = "item-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.packed;
    checkbox.addEventListener("change", () => togglePacked(item.id, checkbox.checked));
    checkboxesById.set(item.id, checkbox);

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;

    label.append(checkbox, name);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button item-remove";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${item.name}`);
    removeButton.addEventListener("click", () => removeItem(item.id));

    row.append(label, removeButton);
    return row;
  };

  const renderGroup = (category, checkboxesById) => {
    const groupItems = state.items.filter((item) => item.category === category);
    const shownItems = groupItems.filter(isVisible);
    if (shownItems.length === 0) return null;

    const group = document.createElement("section");
    group.className = "group";
    group.setAttribute("aria-label", category);

    const header = document.createElement("div");
    header.className = "group-header";

    const heading = document.createElement("h3");
    heading.textContent = category;

    const count = document.createElement("p");
    count.className = "group-count";
    count.textContent = progressLabel(groupItems);

    header.append(heading, count);

    const list = document.createElement("ul");
    list.className = "group-items";
    list.append(...shownItems.map((item) => renderItem(item, checkboxesById)));

    group.append(header, list);
    return group;
  };

  const emptyStateText = () =>
    state.items.length === 0
      ? EMPTY_LIST_TEXT
      : visibleItemsInDisplayOrder().length === 0
        ? FILTER_EMPTY_TEXT[state.filter]
        : "";

  const storageNoticeText = () => {
    if (state.storageFailed) return STORAGE_FAILED_TEXT;
    return state.dataDropped ? DATA_DROPPED_TEXT : "";
  };

  const render = () => {
    const checkboxesById = new Map();
    const groups = CATEGORIES.map((category) => renderGroup(category, checkboxesById)).filter(Boolean);
    elements.groups.replaceChildren(...groups);

    setTextIfChanged(elements.progressText, progressLabel(state.items));
    elements.progressBar.max = Math.max(state.items.length, 1);
    elements.progressBar.value = packedCountOf(state.items);

    setTextIfChanged(elements.emptyState, emptyStateText());
    setTextIfChanged(elements.storageNotice, storageNoticeText());

    elements.clearPacked.disabled = packedCountOf(state.items) === 0;
    elements.startOver.disabled = state.items.length === 0;

    return checkboxesById;
  };

  const commit = () => {
    state.storageFailed = !writeStoredList(state.items);
    state.dataDropped = false;
    return render();
  };

  const focusOrderAround = (itemId) => {
    const shownIds = visibleItemsInDisplayOrder().map((item) => item.id);
    const position = shownIds.indexOf(itemId);
    return [itemId, ...shownIds.slice(position + 1), ...shownIds.slice(0, position).reverse()];
  };

  const focusFirstAvailable = (candidateIds, checkboxesById) => {
    const targetId = candidateIds.find((id) => checkboxesById.has(id));
    if (targetId === undefined) {
      elements.nameInput.focus();
    } else {
      checkboxesById.get(targetId).focus();
    }
  };

  const togglePacked = (itemId, packed) => {
    const focusOrder = focusOrderAround(itemId);
    state.items = state.items.map((item) => (item.id === itemId ? { ...item, packed } : item));
    showMessage("");
    focusFirstAvailable(focusOrder, commit());
  };

  const removeItem = (itemId) => {
    const removed = state.items.find((item) => item.id === itemId);
    const focusOrder = focusOrderAround(itemId);
    state.items = state.items.filter((item) => item.id !== itemId);
    showMessage(`Removed ${removed.name}.`);
    focusFirstAvailable(focusOrder, commit());
  };

  const addItem = (event) => {
    event.preventDefault();
    const name = elements.nameInput.value.trim();
    const category = elements.categorySelect.value;

    if (name === "") {
      showError("Enter an item name.");
      return;
    }

    const existing = state.items.find(
      (item) => item.category === category && duplicateKey(item.name) === duplicateKey(name),
    );
    if (existing) {
      showError(`${existing.name} is already in ${category}.`);
      return;
    }

    state.items = [...state.items, { id: createItemId(), name, category, packed: false }];
    elements.nameInput.value = "";
    showMessage(
      state.filter === "packed"
        ? `Added ${name} to ${category}. The Packed filter hides it until you pack it.`
        : `Added ${name} to ${category}.`,
    );
    commit();
    elements.nameInput.focus();
  };

  const clearPacked = () => {
    const removedCount = packedCountOf(state.items);
    state.items = state.items.filter((item) => !item.packed);
    showMessage(`Removed ${removedCount} packed ${removedCount === 1 ? "item" : "items"}.`);
    commit();
    elements.nameInput.focus();
  };

  const startOver = () => {
    if (!window.confirm("Remove all items from the list?")) return;
    state.items = [];
    showMessage("The list is now empty.");
    commit();
    elements.nameInput.focus();
  };

  const changeFilter = (event) => {
    state.filter = event.target.value;
    showMessage("");
    render();
  };

  const clearErrorOnEdit = () => {
    if (elements.formMessage.classList.contains("is-error")) showMessage("");
  };

  const populateCategories = () => {
    elements.categorySelect.append(
      ...CATEGORIES.map((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        return option;
      }),
    );
  };

  const restoreList = () => {
    const stored = readStoredList();
    state.items = stored.items;
    state.dataDropped = stored.dropped;
    state.storageFailed = stored.dropped ? !writeStoredList(state.items) : !stored.readable;
  };

  const bindEvents = () => {
    elements.addForm.addEventListener("submit", addItem);
    elements.nameInput.addEventListener("input", clearErrorOnEdit);
    elements.clearPacked.addEventListener("click", clearPacked);
    elements.startOver.addEventListener("click", startOver);
    elements.filterRadios.forEach((radio) => {
      radio.checked = radio.value === state.filter;
      radio.addEventListener("change", changeFilter);
    });
  };

  populateCategories();
  restoreList();
  bindEvents();
  render();
})();
