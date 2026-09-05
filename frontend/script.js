/**
 * SmartWasteAI — Frontend Core Logic
 * 
 * Manages waste image selection, live client preview, MobileNetV2 cloud inference
 * via FastAPI on AWS EC2, disposal recommendations, local session history,
 * and statistical distribution analytics.
 */

// =============================================================================
// Constants & Configuration
// =============================================================================

const DEFAULT_API_BASE_URL = "/api";
const STORAGE_KEY_ENDPOINT = "smartwaste_api_endpoint";
const STORAGE_KEY_HISTORY = "smartwaste_prediction_history";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Current active API Base URL (loaded from localStorage or default)
let currentApiBaseUrl = localStorage.getItem(STORAGE_KEY_ENDPOINT) || DEFAULT_API_BASE_URL;

// Active selected file object
let currentFile = null;

// =============================================================================
// Waste Categories & Recycling Knowledge Base (All 10 Classes)
// =============================================================================

const WASTE_GUIDELINES = {
  "battery": {
    name: "Battery",
    badgeColor: "#f59e0b",
    binType: "Hazardous / E-Waste Drop-Off",
    icon: "🔋",
    explanation: "Contains hazardous heavy metals (lead, cadmium, lithium, nickel) that can leach into soil and contaminate groundwater if landfilled.",
    action: "Do NOT place in general trash or curbside recycling. Tape terminal ends and take to designated battery recycling bins or certified e-waste facilities.",
    handling: "Keep in a cool, dry place. If battery appears swollen, leaking, or damaged, handle with gloves and isolate in a non-conductive container."
  },
  "biological": {
    name: "Biological / Organic",
    badgeColor: "#10b981",
    binType: "Green / Compost Bin",
    icon: "🍏",
    explanation: "Biodegradable organic matter including food scraps, garden trimmings, fruit peels, and compostable organic residue.",
    action: "Place in green organics / compost bins or backyard compost heaps for nutrient-rich soil regeneration.",
    handling: "Remove all non-compostable stickers, plastic wraps, rubber bands, or twist-ties before composting."
  },
  "brown-glass": {
    name: "Brown Glass",
    badgeColor: "#b45309",
    binType: "Glass Recycling Bin",
    icon: "🍾",
    explanation: "Amber or brown container glass (commonly beer, medicine, and beverage bottles). Amber glass protects light-sensitive contents.",
    action: "100% recyclable indefinitely. Empty liquids, gently rinse out residues, and deposit in dedicated glass collection containers.",
    handling: "Separate metal caps, corks, or plastic lids. Do not break bottles before recycling; broken shards present safety hazards for sorting staff."
  },
  "cardboard": {
    name: "Cardboard",
    badgeColor: "#d97706",
    binType: "Blue / Paper & Cardboard Bin",
    icon: "📦",
    explanation: "Corrugated shipping boxes, clean cereal boxes, paperboard packaging, and shipping cartons.",
    action: "Flatten all boxes completely to conserve bin capacity and keep dry before placing in the paper/cardboard recycling stream.",
    handling: "Remove plastic bubble wrap, polystyrene inserts, and heavy adhesive packing tape. Greasy pizza box bottoms should be torn off and composted."
  },
  "green-glass": {
    name: "Green Glass",
    badgeColor: "#059669",
    binType: "Glass Recycling Bin",
    icon: "🍷",
    explanation: "Green-tinted container glass (widely used for wine, carbonated waters, and specialty condiment jars).",
    action: "Infinitely recyclable without loss of purity or quality. Rinse lightly and sort into glass recycling.",
    handling: "Remove corks, metal rings, and caps. Never mix with ceramic tableware, Pyrex cookware, or window glass (different melting temperatures)."
  },
  "metal": {
    name: "Metal / Can",
    badgeColor: "#64748b",
    binType: "Yellow / Metals Recycling Bin",
    icon: "🥫",
    explanation: "Ferrous and non-ferrous metals, including aluminum beverage cans, tin food cans, and clean foil packaging.",
    action: "High recycling value with 95% energy savings over virgin extraction. Rinse food remnants clean and place in metal recycling bin.",
    handling: "Clean thoroughly to avoid pest contamination. Labels can generally remain on. Push detached tin lids inside the can."
  },
  "paper": {
    name: "Paper",
    badgeColor: "#38bdf8",
    binType: "Blue / Paper Recycling Bin",
    icon: "📄",
    explanation: "Office paper, newspapers, magazines, brochures, paper envelopes, and clean paper grocery bags.",
    action: "Collect dry, clean paper and deposit into the paper recycling bin for pulping and paper remanufacturing.",
    handling: "Ensure paper is clean and completely dry. Wax-coated, plastic-laminated, or heavily soiled paper should go to general waste."
  },
  "plastic": {
    name: "Plastic",
    badgeColor: "#06b6d4",
    binType: "Yellow / Plastics Recycling Bin",
    icon: "🧴",
    explanation: "Thermoplastic containers, bottles, jugs, and packaging (PET #1, HDPE #2, PP #5).",
    action: "Empty all remaining liquid or food residue. Lightly rinse, re-attach clean caps, and deposit in standard curbside plastic recycling.",
    handling: "Crush bottles to save space. Check the resin identification code on the container to ensure acceptance by your local facility."
  },
  "trash": {
    name: "General Trash / Landfill",
    badgeColor: "#ef4444",
    binType: "Black / Grey Landfill Bin",
    icon: "🗑️",
    explanation: "Non-recyclable mixed materials, composite packaging, heavily contaminated items, broken ceramics, or hygiene products.",
    action: "Dispose of securely in the general waste bin destined for authorized landfill or waste-to-energy incineration.",
    handling: "Tie bags tightly to prevent litter dispersal during municipal collection and transit."
  },
  "white-glass": {
    name: "Clear / White Glass",
    badgeColor: "#14b8a6",
    binType: "Glass Recycling Bin",
    icon: "🫙",
    explanation: "Clear flint glass jars and bottles commonly holding sauces, jams, beverages, and cosmetic items.",
    action: "100% recyclable endlessly into brand-new clear glass products. Empty, rinse, and place into dedicated glass recycling.",
    handling: "Remove lids and pump dispensers. Do not combine with mirrors, light bulbs, crystal, or laboratory glassware."
  }
};

// =============================================================================
// DOM Element Cache
// =============================================================================

const DOM = {
  // Navigation & Status
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  connectionStatus: document.getElementById("connection-status"),
  footerEndpoint: document.getElementById("footer-endpoint-display"),

  // Workstation / Upload Panel
  dropZone: document.getElementById("drop-zone"),
  fileInput: document.getElementById("file-input"),
  browseBtn: document.getElementById("browse-btn"),
  dropEmptyState: document.getElementById("drop-empty-state"),
  previewWrapper: document.getElementById("preview-wrapper"),
  imagePreview: document.getElementById("image-preview"),
  scanBeam: document.getElementById("scan-beam"),
  previewFilename: document.getElementById("preview-filename"),
  previewSpecs: document.getElementById("preview-specs"),
  removeImageBtn: document.getElementById("remove-image-btn"),
  errorBanner: document.getElementById("error-banner"),
  errorMessage: document.getElementById("error-message"),
  classifyBtn: document.getElementById("classify-btn"),
  classifySpinner: document.getElementById("classify-spinner"),
  classifyBtnText: document.getElementById("classify-btn-text"),

  // Results Panel
  resultPlaceholder: document.getElementById("result-placeholder"),
  resultContent: document.getElementById("result-content"),
  resultFilename: document.getElementById("result-filename"),
  resultCategoryBadge: document.getElementById("result-category-badge"),
  resultCategoryIcon: document.getElementById("result-category-icon"),
  resultCategoryName: document.getElementById("result-category-name"),
  resultConfidenceText: document.getElementById("result-confidence-text"),
  resultConfidenceBar: document.getElementById("result-confidence-bar"),
  resultConfidenceMeter: document.getElementById("result-confidence-meter"),
  recBinBadge: document.getElementById("rec-bin-badge"),
  recTitle: document.getElementById("rec-title"),
  recDescription: document.getElementById("rec-description"),
  recAction: document.getElementById("rec-action"),
  recHandling: document.getElementById("rec-handling"),

  // Guidelines Grid
  guidelinesGrid: document.getElementById("guidelines-grid"),

  // History
  historyTable: document.getElementById("history-table"),
  historyTbody: document.getElementById("history-tbody"),
  historyEmpty: document.getElementById("history-empty"),
  clearHistoryBtn: document.getElementById("clear-history-btn"),

  // Analytics Dashboard
  statTotalCount: document.getElementById("stat-total-count"),
  statTopCategory: document.getElementById("stat-top-category"),
  statAvgConfidence: document.getElementById("stat-avg-confidence"),
  statCloudStatus: document.getElementById("stat-cloud-status"),
  statEndpointLabel: document.getElementById("stat-endpoint-label"),
  distributionBars: document.getElementById("distribution-bars"),
  distributionEmptyMsg: document.getElementById("distribution-empty-msg"),

  // Settings Modal
  settingsToggleBtn: document.getElementById("settings-toggle-btn"),
  settingsModal: document.getElementById("settings-modal"),
  settingsCloseBtn: document.getElementById("settings-close-btn"),
  settingsCancelBtn: document.getElementById("settings-cancel-btn"),
  settingsSaveBtn: document.getElementById("settings-save-btn"),
  apiEndpointInput: document.getElementById("api-endpoint-input"),
  presetProdBtn: document.getElementById("preset-prod-btn"),
  presetLocalBtn: document.getElementById("preset-local-btn")
};

// =============================================================================
// Application Initialization
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  // 1. Sync UI with active API endpoint
  updateEndpointDisplay(currentApiBaseUrl);

  // 2. Check health of the backend (single invocation, no polling)
  checkBackendHealth(currentApiBaseUrl);

  // 3. Render the 10 reference guidelines
  renderGuidelines();

  // 4. Load & render stored prediction history from localStorage
  const history = loadHistory();
  renderHistory(history);
  updateAnalytics(history);

  // 5. Register Event Listeners
  attachEventListeners();
}

// =============================================================================
// Backend Connection & Health Check
// =============================================================================

async function checkBackendHealth(baseUrl) {
  setConnectionStatus("checking", "Checking AI Service...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.status === "healthy") {
        setConnectionStatus("online", "AI Service Online");
        if (DOM.statCloudStatus) DOM.statCloudStatus.textContent = "Online";
        return true;
      }
    }
    setConnectionStatus("offline", "AI Service Offline");
    if (DOM.statCloudStatus) DOM.statCloudStatus.textContent = "Unavailable";
    return false;
  } catch (error) {
    console.warn("Backend health check failed:", error);
    setConnectionStatus("offline", "AI Service Offline");
    if (DOM.statCloudStatus) DOM.statCloudStatus.textContent = "Offline";
    return false;
  }
}

function setConnectionStatus(state, text) {
  if (!DOM.statusDot || !DOM.statusText) return;

  DOM.statusDot.className = "status-dot";
  if (state === "online") {
    DOM.statusDot.classList.add("online");
  } else if (state === "offline") {
    DOM.statusDot.classList.add("offline");
  }
  DOM.statusText.textContent = text;
}

function updateEndpointDisplay(url) {
  if (DOM.footerEndpoint) DOM.footerEndpoint.textContent = url;
  if (DOM.apiEndpointInput) DOM.apiEndpointInput.value = url;
  if (DOM.statEndpointLabel) {
    DOM.statEndpointLabel.textContent = url.includes("3.110.45.239") 
      ? "AWS EC2 (3.110.45.239)" 
      : url;
  }
}

// =============================================================================
// File Selection & Drag & Drop Handling
// =============================================================================

function attachEventListeners() {
  // File Input Change
  DOM.fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  // Browse Button trigger
  DOM.browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    DOM.fileInput.click();
  });

  // Drop Zone Click (if empty)
  DOM.dropZone.addEventListener("click", () => {
    if (!currentFile) {
      DOM.fileInput.click();
    }
  });

  // Keyboard accessibility for dropzone
  DOM.dropZone.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !currentFile) {
      e.preventDefault();
      DOM.fileInput.click();
    }
  });

  // Drag Events
  ["dragenter", "dragover"].forEach((eventName) => {
    DOM.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      DOM.dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    DOM.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      DOM.dropZone.classList.remove("dragover");
    });
  });

  // Drop event
  DOM.dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFileSelection(dt.files[0]);
    }
  });

  // Remove Image Action
  DOM.removeImageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUploadState();
  });

  // Classify Button
  DOM.classifyBtn.addEventListener("click", () => {
    if (currentFile) {
      classifyImage(currentFile);
    }
  });

  // Clear History Button
  DOM.clearHistoryBtn.addEventListener("click", () => {
    clearHistory();
  });

  // Settings Modal Triggers
  DOM.settingsToggleBtn.addEventListener("click", () => {
    DOM.settingsModal.classList.remove("hidden");
  });

  DOM.settingsCloseBtn.addEventListener("click", () => {
    DOM.settingsModal.classList.add("hidden");
  });

  DOM.settingsCancelBtn.addEventListener("click", () => {
    DOM.settingsModal.classList.add("hidden");
  });

  DOM.presetProdBtn.addEventListener("click", () => {
    DOM.apiEndpointInput.value = DEFAULT_API_BASE_URL;
  });

  DOM.presetLocalBtn.addEventListener("click", () => {
    DOM.apiEndpointInput.value = "http://localhost:8000";
  });

  DOM.settingsSaveBtn.addEventListener("click", () => {
    const rawVal = DOM.apiEndpointInput.value.trim().replace(/\/+$/, "");
    if (!rawVal) return;

    currentApiBaseUrl = rawVal;
    localStorage.setItem(STORAGE_KEY_ENDPOINT, currentApiBaseUrl);
    updateEndpointDisplay(currentApiBaseUrl);
    DOM.settingsModal.classList.add("hidden");
    checkBackendHealth(currentApiBaseUrl);
  });
}

function handleFileSelection(file) {
  hideError();

  // Validate MIME Type
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    showError("Unsupported format. Please upload a JPG, JPEG, PNG, or WEBP image.");
    return;
  }

  // Validate File Size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    showError("File size exceeds 10 MB. Please choose a smaller image.");
    return;
  }

  currentFile = file;
  previewImage(file);
}

function previewImage(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const imgDataUrl = e.target.result;
    DOM.imagePreview.src = imgDataUrl;

    // Read natural dimensions
    const img = new Image();
    img.onload = () => {
      DOM.previewFilename.textContent = file.name;
      DOM.previewSpecs.textContent = `${formatBytes(file.size)} • ${img.naturalWidth}×${img.naturalHeight}px`;
    };
    img.src = imgDataUrl;

    DOM.dropEmptyState.classList.add("hidden");
    DOM.previewWrapper.classList.remove("hidden");
    DOM.classifyBtn.disabled = false;
  };

  reader.readAsDataURL(file);
}

function resetUploadState() {
  currentFile = null;
  DOM.fileInput.value = "";
  DOM.imagePreview.src = "";
  DOM.previewWrapper.classList.add("hidden");
  DOM.dropEmptyState.classList.remove("hidden");
  DOM.classifyBtn.disabled = true;
  hideError();
}

function showError(msg) {
  DOM.errorMessage.textContent = msg;
  DOM.errorBanner.classList.remove("hidden");
}

function hideError() {
  DOM.errorBanner.classList.add("hidden");
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// =============================================================================
// API Classification Request (POST /predict)
// =============================================================================
async function optimizeImageForUpload(file) {
  const MAX_DIMENSION = 1600;
  const JPEG_QUALITY = 0.75;

  // Already small enough — send the original file.
  if (file.size <= 800 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Resize while preserving aspect ratio.
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = Math.min(
            MAX_DIMENSION / width,
            MAX_DIMENSION / height
          );

          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(new Error("Could not optimize image."));
              return;
            }

            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: Date.now()
              }
            );

            resolve(optimizedFile);
          },
          "image/jpeg",
          JPEG_QUALITY
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    img.src = objectUrl;
  });
}

async function classifyImage(file) {
  if (!file) return;

  setLoadingState(true);
  hideError();

  try {
    // Compress/resize the image before sending it to the cloud API.
    const optimizedFile = await optimizeImageForUpload(file);

    const formData = new FormData();
    formData.append("file", optimizedFile, file.name);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const response = await fetch(`${currentApiBaseUrl}/predict`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Classification failed (HTTP ${response.status})`;

      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errorDetail = errJson.detail;
        }
      } catch (_) {
        // Keep default error message.
      }

      throw new Error(errorDetail);
    }

    const result = await response.json();

    handlePredictionSuccess(result, file.name);

  } catch (err) {
    console.error("Classification error:", err);

    let message = "Network error while calling AI service.";

    if (err.name === "AbortError") {
      message = "Request timed out. The cloud model server took too long to respond.";
    } else if (err.message) {
      message = err.message;
    }

    showError(`${message} Please check that the API endpoint is online.`);
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  if (isLoading) {
    DOM.classifyBtn.disabled = true;
    DOM.classifySpinner.classList.remove("hidden");
    DOM.classifyBtnText.textContent = "Analyzing image...";
    DOM.scanBeam.classList.remove("hidden");
  } else {
    DOM.classifyBtn.disabled = !currentFile;
    DOM.classifySpinner.classList.add("hidden");
    DOM.classifyBtnText.textContent = "Classify Waste";
    DOM.scanBeam.classList.add("hidden");
  }
}

// =============================================================================
// Render Prediction Results & Recommendation
// =============================================================================

function handlePredictionSuccess(result, originalFilename) {
  const categoryKey = (result.prediction || "").toLowerCase().trim();
  const confidenceScore = typeof result.confidence === "number" ? result.confidence : 0;
  const filename = result.filename || originalFilename || "Uploaded Image";

  // 1. Display prediction card
  displayPrediction(categoryKey, confidenceScore, filename);

  // 2. Persist to client-side localStorage history
  const historyItem = {
    id: Date.now(),
    filename: filename,
    prediction: categoryKey,
    confidence: confidenceScore,
    timestamp: new Date().toISOString()
  };
  savePrediction(historyItem);

  // 3. Update History Table & Dashboard Analytics
  const history = loadHistory();
  renderHistory(history);
  updateAnalytics(history);

  // Smoothly scroll to results on small screens if needed
  if (window.innerWidth <= 992) {
    DOM.resultContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function displayPrediction(categoryKey, confidence, filename) {
  const guide = getRecommendation(categoryKey);

  DOM.resultPlaceholder.classList.add("hidden");
  DOM.resultContent.classList.remove("hidden");

  // Filename & Category Pill
  DOM.resultFilename.textContent = filename;
  DOM.resultCategoryName.textContent = guide.name;
  DOM.resultCategoryIcon.textContent = guide.icon;
  DOM.resultCategoryBadge.style.borderColor = guide.badgeColor;

  // Confidence Formatting
  const percent = Math.min(100, Math.max(0, confidence * 100));
  const percentFormatted = percent.toFixed(2) + "%";
  DOM.resultConfidenceText.textContent = percentFormatted;
  DOM.resultConfidenceMeter.setAttribute("aria-valuenow", percent.toFixed(1));
  DOM.resultConfidenceBar.style.width = percentFormatted;

  // Recommendation Card
  DOM.recBinBadge.textContent = guide.binType;
  DOM.recTitle.textContent = `${guide.name} Disposal Guide`;
  DOM.recDescription.textContent = guide.explanation;
  DOM.recAction.textContent = guide.action;
  DOM.recHandling.textContent = guide.handling;
}

function getRecommendation(categoryKey) {
  return WASTE_GUIDELINES[categoryKey] || {
    name: categoryKey.replace("-", " "),
    badgeColor: "#10b981",
    binType: "Segregated Waste Bin",
    icon: "♻️",
    explanation: "Standard recyclable or segregated waste item.",
    action: "Sort into appropriate municipal recycling or disposal stream.",
    handling: "Handle cleanly and refer to standard local waste segregation guidelines."
  };
}

// =============================================================================
// Waste Guidelines Section
// =============================================================================

function renderGuidelines() {
  if (!DOM.guidelinesGrid) return;
  DOM.guidelinesGrid.innerHTML = "";

  Object.keys(WASTE_GUIDELINES).forEach((key) => {
    const item = WASTE_GUIDELINES[key];
    const card = document.createElement("article");
    card.className = "guide-card";
    card.innerHTML = `
      <div class="guide-header">
        <div class="guide-icon" style="color: ${item.badgeColor}; border-color: ${item.badgeColor}33;">
          ${item.icon}
        </div>
        <h3 class="guide-name">${item.name}</h3>
      </div>
      <p class="guide-desc">${item.explanation}</p>
      <div class="guide-action">
        <strong>${item.binType}:</strong> ${item.action}
      </div>
    `;
    DOM.guidelinesGrid.appendChild(card);
  });
}

// =============================================================================
// Prediction History Management (Client-side localStorage)
// Note: Structured cleanly to facilitate replacing with DynamoDB fetch API.
// =============================================================================

function loadHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load history from localStorage:", e);
    return [];
  }
}

function savePrediction(item) {
  try {
    const history = loadHistory();
    history.unshift(item); // prepend latest
    // Limit to latest 50 items
    if (history.length > 50) history.pop();
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save prediction to localStorage:", e);
  }
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  renderHistory([]);
  updateAnalytics([]);
}

function renderHistory(history) {
  if (!DOM.historyTbody || !DOM.historyEmpty) return;

  DOM.historyTbody.innerHTML = "";

  if (!history || history.length === 0) {
    DOM.historyTable.classList.add("hidden");
    DOM.historyEmpty.classList.remove("hidden");
    return;
  }

  DOM.historyTable.classList.remove("hidden");
  DOM.historyEmpty.classList.add("hidden");

  history.slice(0, 10).forEach((item) => {
    const guide = getRecommendation(item.prediction);
    const date = new Date(item.timestamp);
    const dateFormatted = isNaN(date.getTime()) 
      ? "Just now" 
      : date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const confPercent = ((item.confidence || 0) * 100).toFixed(1) + "%";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="history-file">${escapeHtml(item.filename || "image.jpg")}</td>
      <td>
        <span class="history-badge" style="background: ${guide.badgeColor}22; color: ${guide.badgeColor}; border: 1px solid ${guide.badgeColor}44;">
          ${guide.icon} ${guide.name}
        </span>
      </td>
      <td><strong>${confPercent}</strong></td>
      <td class="history-time">${dateFormatted}</td>
    `;
    DOM.historyTbody.appendChild(tr);
  });
}

// =============================================================================
// Analytics Dashboard Calculation
// Note: Currently derived from localStorage history. Structured so it can later
// consume aggregated DynamoDB records from a future GET /analytics endpoint.
// =============================================================================

function updateAnalytics(history) {
  const total = history.length;
  DOM.statTotalCount.textContent = total;

  if (total === 0) {
    DOM.statTopCategory.textContent = "—";
    DOM.statAvgConfidence.textContent = "0.0%";
    if (DOM.distributionBars) {
      DOM.distributionBars.innerHTML = `<p class="text-muted" id="distribution-empty-msg">No distribution data available yet. Run classifications to view frequency distribution.</p>`;
    }
    return;
  }

  // Frequency Map & Confidence Accumulator
  const counts = {};
  let totalConfidence = 0;

  history.forEach((item) => {
    const key = (item.prediction || "other").toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    totalConfidence += (item.confidence || 0);
  });

  // Most Common Category
  let topCategory = "—";
  let maxCount = 0;
  Object.keys(counts).forEach((cat) => {
    if (counts[cat] > maxCount) {
      maxCount = counts[cat];
      topCategory = cat;
    }
  });

  const topGuide = getRecommendation(topCategory);
  DOM.statTopCategory.textContent = topGuide.name;

  // Average Confidence
  const avgConf = (totalConfidence / total) * 100;
  DOM.statAvgConfidence.textContent = avgConf.toFixed(1) + "%";

  // Category Distribution Bar Chart (CSS-based)
  renderDistributionBars(counts, total);
}

function renderDistributionBars(counts, total) {
  if (!DOM.distributionBars) return;
  DOM.distributionBars.innerHTML = "";

  // Sort categories by frequency descending
  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  sorted.forEach((catKey) => {
    const count = counts[catKey];
    const percentage = ((count / total) * 100).toFixed(1);
    const guide = getRecommendation(catKey);

    const barItem = document.createElement("div");
    barItem.className = "dist-bar-item";
    barItem.innerHTML = `
      <div class="dist-bar-labels">
        <span class="dist-cat-name">${guide.icon} ${guide.name}</span>
        <span class="dist-cat-stats">${count} items (${percentage}%)</span>
      </div>
      <div class="dist-progress-track">
        <div class="dist-progress-fill" style="width: ${percentage}%; background-color: ${guide.badgeColor};"></div>
      </div>
    `;
    DOM.distributionBars.appendChild(barItem);
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
