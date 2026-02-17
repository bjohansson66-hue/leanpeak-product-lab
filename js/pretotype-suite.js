/**
 * pretotype-suite.js
 * Full VPO Pipeline for LeanPeak Product Lab (static site).
 * Calls a Vercel-deployed Next.js backend for AI generation.
 *
 * Renders into:
 *   #vpo-step-nav   — step tab buttons
 *   #vpo-content    — active step content
 */

(function () {
  "use strict";

  // ── Configuration ─────────────────────────────────────────────────────
  // SET THIS to your Vercel deployment URL (no trailing slash)
  var API_BASE = "https://vercel.com/bengts-projects-1f26266d/nextjs-with-supabase-mbpb/4EVHtHruwhop8Mk6oGN9rJKdqie4";

  // ── State ─────────────────────────────────────────────────────────────
  var state = {
    currentStep: 1,
    inputs: null,
    brochure: null,
    brochureText: null,
    images: {},
    imageErrors: {},
    step3Result: null,
    step4Result: null,
    isGenerating: false,
  };

  // ── DOM refs ──────────────────────────────────────────────────────────
  var navEl, contentEl;

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILITY HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k === "className") {
          node.className = attrs[k];
        } else if (k === "htmlFor") {
          node.setAttribute("for", attrs[k]);
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children != null) {
      if (!Array.isArray(children)) children = [children];
      children.forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function labelStyle() {
    return {
      display: "block",
      fontSize: "var(--lp-font-size-xs)",
      color: "var(--lp-color-text-muted)",
      marginBottom: "0.25rem",
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      fontWeight: "600",
    };
  }

  function inputStyle() {
    return {
      width: "100%",
      padding: "0.5rem 0.75rem",
      fontSize: "var(--lp-font-size-sm)",
      color: "var(--lp-color-text-main)",
      background: "rgba(15, 23, 42, 0.85)",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      borderRadius: "var(--lp-radius-sm)",
      outline: "none",
      fontFamily: "inherit",
      resize: "vertical",
      boxSizing: "border-box",
    };
  }

  function inputField(labelText, id, placeholder, type) {
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: labelStyle() }, labelText),
      type === "textarea"
        ? el("textarea", { id: id, placeholder: placeholder || "", rows: "3", style: inputStyle() })
        : el("input", { id: id, type: type || "text", placeholder: placeholder || "", style: inputStyle() }),
    ]);
  }

  function btn(text, onClick, variant, disabled) {
    var isPrimary = variant === "primary";
    var node = el("button", {
      type: "button",
      onClick: disabled ? null : onClick,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        fontSize: "var(--lp-font-size-sm)",
        fontWeight: "600",
        borderRadius: "var(--lp-radius-pill)",
        padding: "0.6rem 1.3rem",
        border: isPrimary ? "1px solid transparent" : "1px solid rgba(148, 163, 184, 0.4)",
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        opacity: disabled ? "0.5" : "1",
        background: isPrimary
          ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)"
          : "rgba(15, 23, 42, 0.9)",
        color: isPrimary ? "#0b1120" : "var(--lp-color-text-soft)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      },
    }, text);
    if (!disabled) {
      node.addEventListener("mouseenter", function () { node.style.transform = "translateY(-1px)"; });
      node.addEventListener("mouseleave", function () { node.style.transform = ""; });
    }
    return node;
  }

  function card(children, extraStyle) {
    var s = {
      borderRadius: "var(--lp-radius-md)",
      border: "1px solid var(--lp-color-border-subtle)",
      background: "radial-gradient(circle at top left, #020617, #020617 55%)",
      padding: "var(--lp-space-md)",
    };
    if (extraStyle) Object.assign(s, extraStyle);
    return el("div", { style: s }, children);
  }

  function badge(text, bgColor, textColor, borderColor) {
    return el("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        fontSize: "var(--lp-font-size-xs)",
        padding: "0.15rem 0.55rem",
        borderRadius: "var(--lp-radius-pill)",
        background: bgColor || "rgba(15, 23, 42, 0.85)",
        color: textColor || "var(--lp-color-text-muted)",
        border: "1px solid " + (borderColor || "rgba(148, 163, 184, 0.3)"),
        whiteSpace: "nowrap",
        fontWeight: "600",
      },
    }, text);
  }

  function heading(text, level) {
    var sizes = { 1: "var(--lp-font-size-3xl)", 2: "var(--lp-font-size-2xl)", 3: "var(--lp-font-size-xl)" };
    return el("h" + level, {
      style: { fontSize: sizes[level] || "var(--lp-font-size-lg)", margin: "0 0 0.5rem", lineHeight: "1.2" },
    }, text);
  }

  function errorBox(msg) {
    return el("p", {
      style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-danger)", marginTop: "0.75rem" },
    }, msg);
  }

  function spinner() {
    return el("div", { className: "lp-spinner" });
  }

  function loadingCard(text) {
    return card([
      el("div", {
        className: "lp-pulse",
        style: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", gap: "0.75rem" },
      }, [spinner(), el("span", { style: { color: "var(--lp-color-text-muted)" } }, text)]),
    ]);
  }

  // ── API helper ────────────────────────────────────────────────────────

  async function apiPost(endpoint, body) {
    var res = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var data = {};
      try { data = await res.json(); } catch (e) { /* ignore */ }
      throw new Error(data.error || "Request failed (" + res.status + ")");
    }
    return res.json();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  var steps = [
    { num: 1, label: "Step 1: Sales Brochure" },
    { num: 3, label: "Step 3: Opportunity Map" },
    { num: 4, label: "Step 4: Pre-Mortem" },
  ];

  function isStepEnabled(num) {
    if (num === 1) return true;
    if (num === 3) return !!state.brochure;
    if (num === 4) return !!state.step3Result;
    return false;
  }

  function renderStepNav() {
    navEl.innerHTML = "";
    navEl.style.cssText = "display:flex;gap:var(--lp-space-xs);margin-bottom:var(--lp-space-xl);flex-wrap:wrap;";
    steps.forEach(function (s) {
      var active = state.currentStep === s.num;
      var enabled = isStepEnabled(s.num);
      var tabBtn = el("button", {
        type: "button",
        onClick: enabled ? function () { switchStep(s.num); } : null,
        style: {
          display: "inline-flex",
          alignItems: "center",
          fontSize: "var(--lp-font-size-sm)",
          fontWeight: "600",
          borderRadius: "var(--lp-radius-pill)",
          padding: "0.55rem 1.2rem",
          border: active ? "1px solid transparent" : "1px solid rgba(148, 163, 184, 0.4)",
          cursor: enabled ? "pointer" : "not-allowed",
          opacity: enabled ? "1" : "0.35",
          background: active
            ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)"
            : "rgba(15, 23, 42, 0.9)",
          color: active ? "#0b1120" : "var(--lp-color-text-soft)",
          fontFamily: "inherit",
          transition: "transform 0.15s ease",
        },
      }, s.label);
      if (enabled && !active) {
        tabBtn.addEventListener("mouseenter", function () { tabBtn.style.transform = "translateY(-1px)"; });
        tabBtn.addEventListener("mouseleave", function () { tabBtn.style.transform = ""; });
      }
      navEl.appendChild(tabBtn);
    });
  }

  function switchStep(num) {
    state.currentStep = num;
    renderStepNav();
    contentEl.innerHTML = "";
    if (num === 1) renderStep1();
    else if (num === 3) renderStep3();
    else if (num === 4) renderStep4();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 1: SALES BROCHURE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════

  function renderStep1() {
    var wrap = el("div");

    // Header
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      badge("Step 1"),
      heading("Sales Brochure Generator", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Fill in the 8 fields below, then generate a sales-brochure preview to sharpen your product vision."),
    ]));

    // Two-column layout
    var grid = el("div", {
      style: {
        display: "grid",
        gap: "var(--lp-space-xl)",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
      },
    });

    // ── Left: Form ──
    var formCard = card([
      el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700", marginBottom: "var(--lp-space-md)" } }, "Product / Idea Inputs"),
      inputField("1. Product / Idea Name", "s1-productName", "e.g. FitTrack Pro"),
      inputField("2. Idea Summary", "s1-ideaSummary", "One-sentence elevator pitch"),
      inputField("3. Problem Description", "s1-problemDescription", "What pain does the customer feel?", "textarea"),
      inputField("4. Target Customer / Segment", "s1-targetCustomer", "e.g. Busy professionals aged 30-45"),
      inputField("5. Current Alternatives / Competitors", "s1-alternatives", "e.g. MyFitnessPal, pen & paper"),
      inputField("6. Core Solution", "s1-coreSolution", "What does your product actually do?", "textarea"),
      inputField("7. Main Value Proposition", "s1-valueProposition", "Why is this better than alternatives?", "textarea"),
      inputField("8. Top 3 Uncertainties", "s1-uncertainties", "e.g. Will users pay? Is market big enough?", "textarea"),
      el("div", { id: "s1-error" }),
      el("div", { id: "s1-btn-wrap", style: { marginTop: "var(--lp-space-sm)" } }),
    ]);

    // ── Right: Preview ──
    var previewArea = el("div", { id: "s1-preview" });

    grid.appendChild(formCard);
    grid.appendChild(previewArea);
    wrap.appendChild(grid);
    contentEl.appendChild(wrap);

    // Render generate button
    renderStep1Button();

    // If brochure already generated, show it
    if (state.brochure) {
      renderBrochurePreview();
    } else {
      renderBrochurePlaceholder();
    }

    // Pre-fill form if inputs exist
    if (state.inputs) {
      var fields = ["productName", "ideaSummary", "problemDescription", "targetCustomer",
                     "alternatives", "coreSolution", "valueProposition", "uncertainties"];
      fields.forEach(function (f) {
        var inp = document.getElementById("s1-" + f);
        if (inp && state.inputs[f]) inp.value = state.inputs[f];
      });
    }
  }

  function renderStep1Button() {
    var wrap = document.getElementById("s1-btn-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";
    wrap.appendChild(
      btn(
        state.isGenerating ? "Generating\u2026" : "Generate Sales Brochure",
        handleGenerateBrochure,
        "primary",
        state.isGenerating
      )
    );
  }

  function renderBrochurePlaceholder() {
    var preview = document.getElementById("s1-preview");
    if (!preview) return;
    preview.innerHTML = "";
    preview.appendChild(card([
      el("div", {
        style: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" },
      }, [
        el("p", { style: { color: "var(--lp-color-text-muted)", textAlign: "center", padding: "0 2rem" } },
          "Your 4-page sales brochure will appear here after you click Generate."),
      ]),
    ]));
  }

  function getFormFields() {
    var fields = {};
    var keys = ["productName", "ideaSummary", "problemDescription", "targetCustomer",
                "alternatives", "coreSolution", "valueProposition", "uncertainties"];
    keys.forEach(function (k) {
      var inp = document.getElementById("s1-" + k);
      fields[k] = inp ? inp.value.trim() : "";
    });
    return fields;
  }

  async function handleGenerateBrochure() {
    var fields = getFormFields();
    if (!fields.productName || !fields.ideaSummary || !fields.problemDescription ||
        !fields.targetCustomer || !fields.coreSolution || !fields.valueProposition) {
      var errEl = document.getElementById("s1-error");
      if (errEl) { errEl.innerHTML = ""; errEl.appendChild(errorBox("Please fill in all required fields (1-4, 6-7).")); }
      return;
    }

    state.isGenerating = true;
    state.images = {};
    state.imageErrors = {};
    renderStep1Button();

    var errEl = document.getElementById("s1-error");
    if (errEl) errEl.innerHTML = "";

    var preview = document.getElementById("s1-preview");
    if (preview) { preview.innerHTML = ""; preview.appendChild(loadingCard("Generating brochure\u2026")); }

    try {
      var data = await apiPost("/api/generate-brochure", fields);
      state.inputs = fields;
      state.brochure = data.brochure;
      state.brochureText = JSON.stringify(data.brochure);

      renderBrochurePreview();
      renderStepNav(); // unlock Step 3

      // Fire image generation in parallel
      generateImages(data.brochure);
    } catch (err) {
      if (preview) { preview.innerHTML = ""; }
      if (errEl) { errEl.innerHTML = ""; errEl.appendChild(errorBox(err.message)); }
      renderBrochurePlaceholder();
    } finally {
      state.isGenerating = false;
      renderStep1Button();
    }
  }

  function renderBrochurePreview() {
    var preview = document.getElementById("s1-preview");
    if (!preview || !state.brochure) return;
    preview.innerHTML = "";

    var b = state.brochure;

    var brochureCardStyle = {
      borderRadius: "var(--lp-radius-lg)",
      border: "2px solid var(--lp-color-border-strong)",
      background: "linear-gradient(180deg, #0f172a, #020617)",
      padding: "var(--lp-space-lg)",
      aspectRatio: "9/16",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      marginBottom: "var(--lp-space-lg)",
    };

    // ── Page 1: Front Cover ──
    preview.appendChild(el("div", { style: Object.assign({}, brochureCardStyle) }, [
      badge("Page 1 \u2014 Front Cover", "rgba(15,23,42,0.85)", "var(--lp-color-text-muted)"),
      el("div", {
        style: { flex: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "0.75rem" },
      }, [
        el("h2", { style: { fontSize: "var(--lp-font-size-3xl)", fontWeight: "800", margin: "0" } }, b.page1.productName),
        el("p", { style: { fontSize: "var(--lp-font-size-xl)", fontStyle: "italic", color: "var(--lp-color-secondary)", margin: "0" } }, b.page1.tagline),
        el("p", { style: { color: "var(--lp-color-text-muted)", margin: "0" } }, b.page1.supportingLine),
      ]),
      imageSlot("page1", b.page1.visualConcept),
    ]));

    // ── Page 2: Benefits ──
    var benefitsList = el("ul", { style: { listStyle: "none", padding: "0", margin: "0" } });
    (b.page2.benefits || []).forEach(function (item) {
      benefitsList.appendChild(el("li", {
        style: { display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-soft)" },
      }, [
        el("span", { style: { color: "var(--lp-color-accent)", fontWeight: "700", marginTop: "0.1rem" } }, "\u2713"),
        el("span", null, item),
      ]));
    });

    preview.appendChild(el("div", { style: Object.assign({}, brochureCardStyle) }, [
      badge("Page 2 \u2014 Benefits", "rgba(15,23,42,0.85)", "var(--lp-color-text-muted)"),
      el("h2", { style: { fontSize: "var(--lp-font-size-2xl)", fontWeight: "700", margin: "var(--lp-space-sm) 0" } }, b.page2.title),
      benefitsList,
      el("div", { style: { marginTop: "auto" } }, [imageSlot("page2", b.page2.visualConcept)]),
    ]));

    // ── Page 3: Features ──
    var featuresWrap = el("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" } });
    (b.page3.features || []).forEach(function (f) {
      featuresWrap.appendChild(el("div", null, [
        el("h4", { style: { fontSize: "var(--lp-font-size-sm)", fontWeight: "700", margin: "0 0 0.15rem" } }, f.name),
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", margin: "0" } }, f.description),
      ]));
    });

    preview.appendChild(el("div", { style: Object.assign({}, brochureCardStyle) }, [
      badge("Page 3 \u2014 Features", "rgba(15,23,42,0.85)", "var(--lp-color-text-muted)"),
      el("h2", { style: { fontSize: "var(--lp-font-size-2xl)", fontWeight: "700", margin: "var(--lp-space-sm) 0" } }, b.page3.title),
      featuresWrap,
      el("div", { style: { marginTop: "auto" } }, [imageSlot("page3", b.page3.visualConcept)]),
    ]));

    // ── Page 4: Testimonials ──
    var testiGrid = el("div", {
      style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lp-space-sm)", flex: "1", alignContent: "center" },
    });
    (b.page4.testimonials || []).forEach(function (t) {
      testiGrid.appendChild(el("div", {
        style: {
          border: "1px solid var(--lp-color-border-subtle)",
          borderRadius: "var(--lp-radius-md)",
          padding: "var(--lp-space-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        },
      }, [
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" } }, [
          el("div", {
            style: {
              width: "32px", height: "32px", borderRadius: "50%",
              background: "rgba(148, 163, 184, 0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "var(--lp-font-size-xs)", fontWeight: "700",
            },
          }, t.portrait),
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", fontWeight: "600" } }, t.role),
        ]),
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", fontStyle: "italic", color: "var(--lp-color-text-muted)", margin: "0" } },
          "\u201C" + t.quote + "\u201D"),
      ]));
    });

    preview.appendChild(el("div", { style: Object.assign({}, brochureCardStyle) }, [
      badge("Page 4 \u2014 Testimonials", "rgba(15,23,42,0.85)", "var(--lp-color-text-muted)"),
      el("h2", { style: { fontSize: "var(--lp-font-size-2xl)", fontWeight: "700", margin: "var(--lp-space-sm) 0" } }, b.page4.title),
      testiGrid,
    ]));

    // ── Continue button ──
    preview.appendChild(el("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: "var(--lp-space-sm)" } }, [
      btn("Continue to Step 3: Opportunity Map \u2192", function () { switchStep(3); }),
    ]));
  }

  function imageSlot(key, description) {
    var container = el("div", { id: "img-" + key, style: { marginTop: "var(--lp-space-sm)" } });
    renderImageState(container, key, description);
    return container;
  }

  function renderImageState(container, key, description) {
    container.innerHTML = "";
    if (state.images[key]) {
      container.appendChild(el("img", {
        src: state.images[key],
        alt: description,
        style: { width: "100%", borderRadius: "var(--lp-radius-md)", border: "1px solid var(--lp-color-border-subtle)" },
      }));
      container.appendChild(el("p", {
        style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginTop: "0.25rem" },
      }, description));
    } else if (state.imageErrors[key]) {
      container.appendChild(el("div", {
        style: {
          border: "1px dashed var(--lp-color-border-subtle)", borderRadius: "var(--lp-radius-md)",
          padding: "var(--lp-space-sm)", background: "rgba(15,23,42,0.5)",
        },
      }, [
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", margin: "0" } }, [
          el("strong", null, "Visual concept: "), description,
        ]),
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-danger)", marginTop: "0.25rem" } },
          "Image generation failed: " + state.imageErrors[key]),
      ]));
    } else {
      container.appendChild(el("div", {
        style: {
          border: "1px dashed var(--lp-color-border-subtle)", borderRadius: "var(--lp-radius-md)",
          padding: "var(--lp-space-lg)", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "0.5rem",
          background: "rgba(15,23,42,0.5)",
        },
      }, [spinner(), el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, "Generating image\u2026")]));
    }
  }

  async function generateImages(brochure) {
    var concepts = [
      { key: "page1", prompt: brochure.page1.visualConcept },
      { key: "page2", prompt: brochure.page2.visualConcept },
      { key: "page3", prompt: brochure.page3.visualConcept },
    ];

    var results = await Promise.allSettled(
      concepts.map(async function (c) {
        var data = await apiPost("/api/generate-image", { prompt: c.prompt });
        return { key: c.key, url: data.imageUrl };
      })
    );

    results.forEach(function (r, i) {
      var key = concepts[i].key;
      if (r.status === "fulfilled") {
        state.images[key] = r.value.url;
      } else {
        state.imageErrors[key] = r.reason ? r.reason.message : "Failed";
      }
      var container = document.getElementById("img-" + key);
      if (container) renderImageState(container, key, concepts[i].prompt);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 3: OPPORTUNITY MAP & KEY DECISIONS
  // ═══════════════════════════════════════════════════════════════════════

  var areaColors = {
    problem:      { bg: "rgba(239,68,68,0.15)",  text: "#fca5a5", border: "rgba(239,68,68,0.4)" },
    segment:      { bg: "rgba(59,130,246,0.15)",  text: "#93c5fd", border: "rgba(59,130,246,0.4)" },
    solution:     { bg: "rgba(34,197,94,0.15)",   text: "#86efac", border: "rgba(34,197,94,0.4)" },
    "value prop": { bg: "rgba(168,85,247,0.15)",  text: "#c4b5fd", border: "rgba(168,85,247,0.4)" },
  };

  var priorityColors = {
    Now:   { bg: "rgba(239,68,68,0.15)",   text: "#fca5a5", border: "rgba(239,68,68,0.4)" },
    Next:  { bg: "rgba(234,179,8,0.15)",   text: "#fde68a", border: "rgba(234,179,8,0.4)" },
    Later: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", border: "rgba(148,163,184,0.4)" },
  };

  function renderStep3() {
    if (!state.brochure || !state.inputs) {
      contentEl.appendChild(card([
        el("p", { style: { color: "var(--lp-color-text-muted)", textAlign: "center", padding: "2rem" } },
          "No product data found. Please complete Step 1 first."),
        el("div", { style: { textAlign: "center" } }, [
          btn("\u2190 Go to Step 1", function () { switchStep(1); }),
        ]),
      ]));
      return;
    }

    var wrap = el("div");

    // Header
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      badge("Step 3"),
      heading("Opportunity Mapping & Key Decisions", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Review your product inputs, then generate an AI-powered opportunity map and decision framework."),
    ]));

    // Input summary
    var summaryGrid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lp-space-sm)" } });
    var summaryFields = [
      ["Product Name", state.inputs.productName],
      ["Idea Summary", state.inputs.ideaSummary],
      ["Problem", state.inputs.problemDescription],
      ["Target Customer", state.inputs.targetCustomer],
      ["Alternatives", state.inputs.alternatives],
      ["Core Solution", state.inputs.coreSolution],
      ["Value Proposition", state.inputs.valueProposition],
      ["Uncertainties", state.inputs.uncertainties],
    ];
    summaryFields.forEach(function (pair) {
      summaryGrid.appendChild(el("div", null, [
        el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", fontWeight: "600" } }, pair[0]),
        el("p", { style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-soft)", margin: "0.15rem 0 0" } }, pair[1] || "Not provided"),
      ]));
    });

    var summaryCard = card([
      el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700", marginBottom: "var(--lp-space-sm)" } }, "Product Inputs Summary"),
      el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginBottom: "var(--lp-space-sm)" } },
        "From Step 1 \u2014 " + state.inputs.productName),
      summaryGrid,
      state.brochureText ? el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginTop: "var(--lp-space-sm)" } },
        "Brochure data from Step 1 will also be included in the analysis.") : null,
      el("div", { id: "s3-error" }),
      el("div", { id: "s3-btn-wrap", style: { marginTop: "var(--lp-space-sm)" } }),
    ]);
    wrap.appendChild(summaryCard);

    // Results area
    wrap.appendChild(el("div", { id: "s3-results", style: { marginTop: "var(--lp-space-lg)" } }));

    contentEl.appendChild(wrap);

    renderStep3Button();

    if (state.step3Result) {
      renderStep3Results();
    }
  }

  function renderStep3Button() {
    var wrap = document.getElementById("s3-btn-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!state.step3Result) {
      wrap.appendChild(
        btn(
          state.isGenerating ? "Generating\u2026" : "Generate Opportunity Map",
          handleGenerateOpportunityMap,
          "primary",
          state.isGenerating
        )
      );
    }
  }

  async function handleGenerateOpportunityMap() {
    state.isGenerating = true;
    renderStep3Button();

    var errEl = document.getElementById("s3-error");
    if (errEl) errEl.innerHTML = "";

    var results = document.getElementById("s3-results");
    if (results) { results.innerHTML = ""; results.appendChild(loadingCard("Analyzing opportunities and decisions\u2026")); }

    try {
      var data = await apiPost("/api/generate-opportunity-map", Object.assign({}, state.inputs, { brochureText: state.brochureText }));
      state.step3Result = data.result;
      renderStep3Results();
      renderStep3Button();
      renderStepNav(); // unlock Step 4
    } catch (err) {
      if (results) results.innerHTML = "";
      if (errEl) { errEl.innerHTML = ""; errEl.appendChild(errorBox(err.message)); }
    } finally {
      state.isGenerating = false;
      renderStep3Button();
    }
  }

  function renderStep3Results() {
    var results = document.getElementById("s3-results");
    if (!results || !state.step3Result) return;
    results.innerHTML = "";

    var r = state.step3Result;

    // ── Opportunity Map ──
    results.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      heading("Opportunity Map", 3),
    ]));

    var oppGrid = el("div", { className: "lp-grid-2" });
    (r.opportunityMap || []).forEach(function (c) {
      var ac = areaColors[c.area] || { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", border: "rgba(148,163,184,0.4)" };
      oppGrid.appendChild(card([
        el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" } }, [
          el("strong", { style: { fontSize: "var(--lp-font-size-md)" } }, c.title),
          badge(c.area, ac.bg, ac.text, ac.border),
        ]),
        el("p", { style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-muted)", marginBottom: "0.5rem" } }, c.description),
        el("div", { style: { display: "flex", gap: "var(--lp-space-sm)" } }, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, [
            "Impact: ", el("strong", null, c.impact),
          ]),
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, [
            "Confidence: ", el("strong", null, c.confidence),
          ]),
        ]),
      ]));
    });
    results.appendChild(oppGrid);

    // ── Key Decisions Table ──
    results.appendChild(el("div", { style: { marginTop: "var(--lp-space-xl)", marginBottom: "var(--lp-space-sm)" } }, [
      heading("Key Decisions & Knowledge Gaps", 3),
    ]));

    var cellStyle = {
      padding: "0.6rem 0.75rem",
      fontSize: "var(--lp-font-size-sm)",
      borderBottom: "1px solid rgba(148,163,184,0.15)",
      verticalAlign: "top",
    };
    var headerStyle = Object.assign({}, cellStyle, {
      fontSize: "var(--lp-font-size-xs)",
      color: "var(--lp-color-text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontWeight: "600",
    });

    var headers = ["Decision", "Related Uncertainty", "What to Learn", "Suggested Experiment", "Priority"];
    var thead = el("tr");
    headers.forEach(function (h) {
      thead.appendChild(el("th", { style: Object.assign({}, headerStyle, { textAlign: "left" }) }, h));
    });

    var tbody = el("tbody");
    (r.keyDecisions || []).forEach(function (d) {
      var pc = priorityColors[d.priority] || priorityColors.Later;
      tbody.appendChild(el("tr", null, [
        el("td", { style: Object.assign({}, cellStyle, { color: "var(--lp-color-text-soft)" }) }, d.decisionStatement),
        el("td", { style: Object.assign({}, cellStyle, { color: "var(--lp-color-text-muted)" }) }, d.relatedUncertainty),
        el("td", { style: Object.assign({}, cellStyle, { color: "var(--lp-color-text-soft)" }) }, d.whatToLearn),
        el("td", { style: Object.assign({}, cellStyle, { color: "var(--lp-color-text-soft)" }) }, d.suggestedExperiment),
        el("td", { style: cellStyle }, [badge(d.priority, pc.bg, pc.text, pc.border)]),
      ]));
    });

    results.appendChild(card([
      el("div", { style: { overflowX: "auto" } }, [
        el("table", { style: { width: "100%", borderCollapse: "collapse", color: "var(--lp-color-text-soft)" } }, [
          el("thead", null, [thead]),
          tbody,
        ]),
      ]),
    ]));

    // ── Continue to Step 4 ──
    results.appendChild(el("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: "var(--lp-space-lg)" } }, [
      btn("Continue to Step 4: Pre-Mortem \u2192", function () { switchStep(4); }),
    ]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 4: PRE-MORTEM ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  var riskColors = {
    High:   { bg: "rgba(239,68,68,0.15)",   text: "#fca5a5", border: "rgba(239,68,68,0.4)" },
    Medium: { bg: "rgba(234,179,8,0.15)",   text: "#fde68a", border: "rgba(234,179,8,0.4)" },
    Low:    { bg: "rgba(34,197,94,0.15)",    text: "#86efac", border: "rgba(34,197,94,0.4)" },
  };

  function renderStep4() {
    if (!state.inputs || !state.step3Result) {
      contentEl.appendChild(card([
        el("p", { style: { color: "var(--lp-color-text-muted)", textAlign: "center", padding: "2rem" } },
          "No project data found. Please complete Steps 1 and 3 first."),
        el("div", { style: { textAlign: "center" } }, [
          btn("\u2190 Go to Step 3", function () { switchStep(3); }),
        ]),
      ]));
      return;
    }

    var wrap = el("div");

    // Header
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      badge("Step 4"),
      heading("Pre-Mortem Analysis", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Imagine this project has failed badly in 2\u20133 years. What went wrong? Identify risks before they become reality."),
    ]));

    // Context summary
    var contextCard = card([
      el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700", marginBottom: "var(--lp-space-sm)" } }, "Analysis Context"),
      el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginBottom: "var(--lp-space-sm)" } },
        "Using data from Steps 1 & 3 \u2014 " + state.inputs.productName),
      el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--lp-space-sm)" } }, [
        el("div", null, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, "Opportunities identified"),
          el("p", { style: { fontWeight: "700", margin: "0.15rem 0 0" } }, String(state.step3Result.opportunityMap.length)),
        ]),
        el("div", null, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, "Key decisions"),
          el("p", { style: { fontWeight: "700", margin: "0.15rem 0 0" } }, String(state.step3Result.keyDecisions.length)),
        ]),
        el("div", null, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, "Uncertainties"),
          el("p", { style: { fontWeight: "700", margin: "0.15rem 0 0" } }, state.inputs.uncertainties ? "Provided" : "None"),
        ]),
      ]),
      el("div", { id: "s4-error" }),
      el("div", { id: "s4-btn-wrap", style: { marginTop: "var(--lp-space-sm)" } }),
    ]);
    wrap.appendChild(contextCard);

    // Results area
    wrap.appendChild(el("div", { id: "s4-results", style: { marginTop: "var(--lp-space-lg)" } }));

    contentEl.appendChild(wrap);

    renderStep4Button();

    if (state.step4Result) {
      renderStep4Results();
    }
  }

  function renderStep4Button() {
    var wrap = document.getElementById("s4-btn-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!state.step4Result) {
      wrap.appendChild(
        btn(
          state.isGenerating ? "Analyzing\u2026" : "Run Pre-Mortem Analysis",
          handleGeneratePreMortem,
          "primary",
          state.isGenerating
        )
      );
    }
  }

  async function handleGeneratePreMortem() {
    state.isGenerating = true;
    renderStep4Button();

    var errEl = document.getElementById("s4-error");
    if (errEl) errEl.innerHTML = "";

    var results = document.getElementById("s4-results");
    if (results) { results.innerHTML = ""; results.appendChild(loadingCard("Imagining failure scenarios\u2026")); }

    try {
      var data = await apiPost("/api/generate-premortem", Object.assign({}, state.inputs, {
        brochureText: state.brochureText,
        opportunityMap: state.step3Result.opportunityMap,
        keyDecisions: state.step3Result.keyDecisions,
      }));
      state.step4Result = data.result;
      renderStep4Results();
      renderStep4Button();
    } catch (err) {
      if (results) results.innerHTML = "";
      if (errEl) { errEl.innerHTML = ""; errEl.appendChild(errorBox(err.message)); }
    } finally {
      state.isGenerating = false;
      renderStep4Button();
    }
  }

  function renderStep4Results() {
    var results = document.getElementById("s4-results");
    if (!results || !state.step4Result) return;
    results.innerHTML = "";

    var r = state.step4Result;

    // ── Failure Narrative ──
    results.appendChild(card([
      el("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" } }, [
        el("span", { style: { color: "var(--lp-color-danger)", fontSize: "1.1rem" } }, "\u26A0"),
        el("strong", { style: { fontSize: "var(--lp-font-size-lg)" } }, "Failure Narrative"),
      ]),
      el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginBottom: "var(--lp-space-sm)" } },
        "Looking back from 2\u20133 years in the future\u2026"),
      el("p", { style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-soft)", lineHeight: "1.7", whiteSpace: "pre-line" } }, r.narrative),
    ], { borderColor: "rgba(239,68,68,0.4)" }));

    // ── Risk Themes ──
    results.appendChild(el("div", { style: { margin: "var(--lp-space-xl) 0 var(--lp-space-sm)" } }, [
      heading("Risk Themes", 3),
    ]));

    var riskGrid = el("div", { className: "lp-grid-2" });
    (r.riskThemes || []).forEach(function (theme) {
      var rc = riskColors[theme.riskLevel] || riskColors.Medium;

      // Related items badges
      var relatedWrap = null;
      if (theme.relatedItems && theme.relatedItems.length > 0) {
        relatedWrap = el("div", { style: { marginBottom: "0.5rem" } }, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", fontWeight: "600" } }, "Related to:"),
          el("div", { style: { display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.25rem" } },
            theme.relatedItems.map(function (item) { return badge(item); })),
        ]);
      }

      // Mitigations
      var mitigations = el("div", { style: { marginBottom: "0.5rem" } }, [
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.25rem" } }, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", fontWeight: "600" } }, "Mitigations"),
        ]),
        el("ul", { style: { listStyle: "none", padding: "0", margin: "0" } },
          (theme.mitigations || []).map(function (m) {
            return el("li", { style: { fontSize: "var(--lp-font-size-xs)", display: "flex", alignItems: "flex-start", gap: "0.35rem", marginBottom: "0.2rem" } }, [
              el("span", { style: { color: "var(--lp-color-accent)" } }, "\u2192"),
              el("span", { style: { color: "var(--lp-color-text-soft)" } }, m),
            ]);
          })),
      ]);

      // Experiments
      var experiments = el("div", null, [
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.25rem" } }, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", fontWeight: "600" } }, "Experiments"),
        ]),
        el("ul", { style: { listStyle: "none", padding: "0", margin: "0" } },
          (theme.experiments || []).map(function (e) {
            return el("li", { style: { fontSize: "var(--lp-font-size-xs)", display: "flex", alignItems: "flex-start", gap: "0.35rem", marginBottom: "0.2rem" } }, [
              el("span", { style: { color: "#60a5fa" } }, "\u2192"),
              el("span", { style: { color: "var(--lp-color-text-soft)" } }, e),
            ]);
          })),
      ]);

      riskGrid.appendChild(card([
        el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" } }, [
          el("strong", { style: { fontSize: "var(--lp-font-size-md)" } }, theme.name),
          badge(theme.riskLevel, rc.bg, rc.text, rc.border),
        ]),
        el("p", { style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-muted)", marginBottom: "0.5rem" } }, theme.description),
        relatedWrap,
        mitigations,
        experiments,
      ]));
    });
    results.appendChild(riskGrid);

    // ── Top 3 Killers ──
    results.appendChild(el("div", { style: { marginTop: "var(--lp-space-xl)" } }, [
      card([
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "var(--lp-space-sm)" } }, [
          el("span", { style: { fontSize: "1.1rem" } }, "\u2620"),
          el("strong", { style: { fontSize: "var(--lp-font-size-lg)" } }, "If We Had to Bet on 3 Things That Would Kill This Project\u2026"),
        ]),
        el("ol", { style: { listStyle: "none", padding: "0", margin: "0", display: "flex", flexDirection: "column", gap: "0.75rem" } },
          (r.topKillers || []).map(function (killer, i) {
            return el("li", { style: { display: "flex", alignItems: "flex-start", gap: "0.75rem" } }, [
              badge(String(i + 1), "rgba(239,68,68,0.15)", "#fca5a5", "rgba(239,68,68,0.4)"),
              el("span", { style: { fontSize: "var(--lp-font-size-sm)", fontWeight: "600", color: "var(--lp-color-text-soft)" } }, killer),
            ]);
          })),
      ], { borderColor: "rgba(239,68,68,0.3)", background: "linear-gradient(135deg, rgba(127,29,29,0.15), rgba(15,23,42,0.95))" }),
    ]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  RESPONSIVE: collapse grid on mobile
  // ═══════════════════════════════════════════════════════════════════════

  function applyResponsive() {
    var style = document.getElementById("vpo-responsive-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "vpo-responsive-style";
      style.textContent = "@media(max-width:900px){#vpo-content .lp-grid-2{grid-template-columns:1fr !important;}}@media(max-width:900px){#vpo-content>div>div[style*='grid-template-columns: minmax']{grid-template-columns:1fr !important;}}";
      document.head.appendChild(style);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════════════

  function init() {
    navEl = document.getElementById("vpo-step-nav");
    contentEl = document.getElementById("vpo-content");
    if (!navEl || !contentEl) return;

    applyResponsive();
    renderStepNav();
    renderStep1();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
