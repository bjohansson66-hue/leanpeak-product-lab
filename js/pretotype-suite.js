/**
 * pretotype-suite.js
 * Offline VPO Pipeline for LeanPeak Product Lab.
 * No API calls — runs entirely in the browser with localStorage.
 *
 * Step 1: 8 inputs → "Fake" Sales Brochure (4 pages, 9:16)
 * Step 3: Opportunity Map + Key Decisions (manual entry)
 * Step 4: Pre-Mortem Analysis (manual entry of risks)
 */

(function () {
  "use strict";

  // ── localStorage keys ─────────────────────────────────────────────────
  var LS_INPUTS   = "lp-vpo-inputs";
  var LS_BROCHURE = "lp-vpo-brochure";
  var LS_OPP_MAP  = "lp-vpo-opportunities";
  var LS_DECISIONS = "lp-vpo-decisions";
  var LS_PREMORTEM = "lp-vpo-premortem";

  // ── State ─────────────────────────────────────────────────────────────
  var state = {
    currentStep: 1,
    inputs: loadJSON(LS_INPUTS, null),
    brochure: loadJSON(LS_BROCHURE, null),
    opportunities: loadJSON(LS_OPP_MAP, { items: [], nextId: 1 }),
    decisions: loadJSON(LS_DECISIONS, { items: [], nextId: 1 }),
    premortem: loadJSON(LS_PREMORTEM, { risks: [], killers: ["", "", ""], narrative: "", nextId: 1 }),
  };

  var navEl, contentEl;

  // ═══════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  function loadJSON(key, fallback) {
    try { var d = JSON.parse(localStorage.getItem(key)); return d || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* */ }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "style" && typeof attrs[k] === "object") Object.assign(node.style, attrs[k]);
        else if (k.startsWith("on") && typeof attrs[k] === "function") node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === "className") node.className = attrs[k];
        else if (k === "htmlFor") node.setAttribute("for", attrs[k]);
        else node.setAttribute(k, attrs[k]);
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

  var _lbl = { display: "block", fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: "600" };
  var _inp = { width: "100%", padding: "0.5rem 0.75rem", fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-main)", background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "var(--lp-radius-sm)", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" };

  function inputField(label, id, placeholder, type, value) {
    var f = type === "textarea"
      ? el("textarea", { id: id, placeholder: placeholder || "", rows: "3", style: Object.assign({}, _inp) })
      : el("input", { id: id, type: type || "text", placeholder: placeholder || "", style: Object.assign({}, _inp) });
    if (value) f.value = value;
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: Object.assign({}, _lbl) }, label), f,
    ]);
  }

  function selectField(label, id, options, value) {
    var sel = el("select", { id: id, style: Object.assign({}, _inp, { padding: "0.5rem" }) });
    options.forEach(function (o) {
      var opt = el("option", { value: typeof o === "string" ? o : o.value }, typeof o === "string" ? o : o.label);
      sel.appendChild(opt);
    });
    if (value) sel.value = value;
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: Object.assign({}, _lbl) }, label), sel,
    ]);
  }

  function btn(text, onClick, variant, disabled) {
    var isPrimary = variant === "primary";
    var isDanger = variant === "danger";
    var bg = isPrimary ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)" : isDanger ? "rgba(239,68,68,0.15)" : "rgba(15,23,42,0.9)";
    var clr = isPrimary ? "#0b1120" : isDanger ? "#fca5a5" : "var(--lp-color-text-soft)";
    var bdr = isPrimary ? "transparent" : isDanger ? "rgba(239,68,68,0.4)" : "rgba(148,163,184,0.4)";
    var node = el("button", { type: "button", onClick: disabled ? null : onClick, style: {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
      fontSize: "var(--lp-font-size-sm)", fontWeight: "600", borderRadius: "var(--lp-radius-pill)",
      padding: "0.6rem 1.3rem", border: "1px solid " + bdr, cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap", fontFamily: "inherit", opacity: disabled ? "0.5" : "1",
      background: bg, color: clr, transition: "transform 0.15s ease",
    }}, text);
    if (!disabled) {
      node.addEventListener("mouseenter", function () { node.style.transform = "translateY(-1px)"; });
      node.addEventListener("mouseleave", function () { node.style.transform = ""; });
    }
    return node;
  }

  function card(children, extra) {
    var s = { borderRadius: "var(--lp-radius-md)", border: "1px solid var(--lp-color-border-subtle)", background: "radial-gradient(circle at top left, #020617, #020617 55%)", padding: "var(--lp-space-md)", marginBottom: "var(--lp-space-lg)" };
    if (extra) Object.assign(s, extra);
    return el("div", { style: s }, children);
  }

  function badge(text, bg, clr, bdr) {
    return el("span", { style: {
      display: "inline-flex", alignItems: "center", fontSize: "var(--lp-font-size-xs)",
      padding: "0.15rem 0.55rem", borderRadius: "var(--lp-radius-pill)",
      background: bg || "rgba(15,23,42,0.85)", color: clr || "var(--lp-color-text-muted)",
      border: "1px solid " + (bdr || "rgba(148,163,184,0.3)"), whiteSpace: "nowrap", fontWeight: "600",
    }}, text);
  }

  function heading(text, lvl) {
    var sz = { 2: "var(--lp-font-size-2xl)", 3: "var(--lp-font-size-xl)" };
    return el("h" + lvl, { style: { fontSize: sz[lvl] || "var(--lp-font-size-lg)", margin: "0 0 0.5rem", lineHeight: "1.2" }}, text);
  }

  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }

  function copyText(text, button) {
    navigator.clipboard.writeText(text).then(function () {
      var o = button.textContent; button.textContent = "Copied!";
      setTimeout(function () { button.textContent = o; }, 1500);
    });
  }

  function removeBtn(onClick) {
    return el("button", { type: "button", onClick: onClick, title: "Remove", style: {
      background: "none", border: "none", color: "var(--lp-color-danger)",
      cursor: "pointer", fontSize: "1.1rem", padding: "0 0.3rem", fontFamily: "inherit",
    }}, "\u00D7");
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  var steps = [
    { num: 1, label: "Step 1: Sales Brochure" },
    { num: 3, label: "Step 3: Opportunity Map" },
    { num: 4, label: "Step 4: Pre-Mortem" },
  ];

  function isEnabled(n) {
    if (n === 1) return true;
    if (n === 3) return !!state.brochure;
    if (n === 4) return !!state.brochure;
    return false;
  }

  function renderNav() {
    navEl.innerHTML = "";
    navEl.style.cssText = "display:flex;gap:var(--lp-space-xs);margin-bottom:var(--lp-space-xl);flex-wrap:wrap;";
    steps.forEach(function (s) {
      var active = state.currentStep === s.num;
      var enabled = isEnabled(s.num);
      var t = el("button", { type: "button",
        onClick: enabled ? function () { switchStep(s.num); } : null,
        style: {
          display: "inline-flex", alignItems: "center", fontSize: "var(--lp-font-size-sm)",
          fontWeight: "600", borderRadius: "var(--lp-radius-pill)", padding: "0.55rem 1.2rem",
          border: active ? "1px solid transparent" : "1px solid rgba(148,163,184,0.4)",
          cursor: enabled ? "pointer" : "not-allowed", opacity: enabled ? "1" : "0.35",
          background: active ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)" : "rgba(15,23,42,0.9)",
          color: active ? "#0b1120" : "var(--lp-color-text-soft)", fontFamily: "inherit",
          transition: "transform 0.15s ease",
        }}, s.label);
      if (enabled && !active) {
        t.addEventListener("mouseenter", function () { t.style.transform = "translateY(-1px)"; });
        t.addEventListener("mouseleave", function () { t.style.transform = ""; });
      }
      navEl.appendChild(t);
    });
  }

  function switchStep(n) {
    state.currentStep = n;
    renderNav();
    contentEl.innerHTML = "";
    if (n === 1) renderStep1();
    else if (n === 3) renderStep3();
    else if (n === 4) renderStep4();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 1: "FAKE" SALES BROCHURE
  // ═══════════════════════════════════════════════════════════════════════

  var fieldDefs = [
    { key: "productName",        label: "1. Product / Idea Name",             ph: "e.g. FitTrack Pro" },
    { key: "ideaSummary",        label: "2. Idea Summary",                    ph: "One-sentence elevator pitch" },
    { key: "problemDescription", label: "3. Problem Description",             ph: "What pain does the customer feel?", ta: true },
    { key: "targetCustomer",     label: "4. Target Customer / Segment",       ph: "e.g. Busy professionals aged 30-45" },
    { key: "alternatives",       label: "5. Current Alternatives / Competitors", ph: "e.g. MyFitnessPal, pen & paper" },
    { key: "coreSolution",       label: "6. Core Solution",                   ph: "What does your product actually do?", ta: true },
    { key: "valueProposition",   label: "7. Main Value Proposition",          ph: "Why is this better than alternatives?", ta: true },
    { key: "uncertainties",      label: "8. Top 3 Uncertainties",             ph: "e.g. Will users pay? Is market big enough?", ta: true },
  ];

  function renderStep1() {
    var wrap = el("div");
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      badge("Step 1"), heading("Sales Brochure Generator", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Fill in the 8 fields, then generate a 4-page \"fake\" sales brochure to visualize your product idea."),
    ]));

    var grid = el("div", { style: { display: "grid", gap: "var(--lp-space-xl)", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)" }});

    // Left: form
    var fields = [];
    fieldDefs.forEach(function (fd) {
      var v = state.inputs ? state.inputs[fd.key] || "" : "";
      fields.push(inputField(fd.label, "s1-" + fd.key, fd.ph, fd.ta ? "textarea" : "text", v));
    });
    fields.push(el("div", { id: "s1-error" }));
    fields.push(el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "var(--lp-space-xs)" } }, [
      btn("Generate Brochure", function () { generateBrochure(); }, "primary"),
      state.brochure ? btn("Clear Brochure", function () { clearBrochure(); }, "danger") : null,
    ]));
    grid.appendChild(card(fields));

    // Right: preview
    grid.appendChild(el("div", { id: "s1-preview" }));
    wrap.appendChild(grid);
    contentEl.appendChild(wrap);

    if (state.brochure) renderBrochure();
    else renderBrochurePlaceholder();
  }

  function renderBrochurePlaceholder() {
    var p = document.getElementById("s1-preview");
    if (!p) return;
    p.innerHTML = "";
    p.appendChild(card([
      el("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" } }, [
        el("p", { style: { color: "var(--lp-color-text-muted)", textAlign: "center", padding: "0 2rem" } },
          "Your 4-page sales brochure will appear here after you click Generate."),
      ]),
    ]));
  }

  function getInputs() {
    var o = {};
    fieldDefs.forEach(function (fd) { o[fd.key] = val("s1-" + fd.key); });
    return o;
  }

  function generateBrochure() {
    var inputs = getInputs();
    if (!inputs.productName || !inputs.ideaSummary || !inputs.coreSolution || !inputs.valueProposition) {
      var err = document.getElementById("s1-error");
      if (err) { err.innerHTML = ""; err.appendChild(el("p", { style: { color: "var(--lp-color-danger)", fontSize: "var(--lp-font-size-sm)", marginTop: "0.5rem" } }, "Please fill in at least fields 1, 2, 6, and 7.")); }
      return;
    }
    var errEl = document.getElementById("s1-error");
    if (errEl) errEl.innerHTML = "";

    state.inputs = inputs;
    save(LS_INPUTS, inputs);

    // Build brochure from inputs (template-based, no AI)
    var benefits = [];
    if (inputs.valueProposition) {
      inputs.valueProposition.split(/[.;\n]+/).forEach(function (s) {
        s = s.trim(); if (s) benefits.push(s);
      });
    }
    if (benefits.length === 0) benefits.push(inputs.valueProposition);

    var features = [];
    if (inputs.coreSolution) {
      inputs.coreSolution.split(/[.;\n]+/).forEach(function (s) {
        s = s.trim(); if (s) features.push({ name: s.split(" ").slice(0, 4).join(" "), description: s });
      });
    }
    if (features.length === 0) features.push({ name: "Core Feature", description: inputs.coreSolution });

    state.brochure = {
      page1: {
        productName: inputs.productName,
        tagline: inputs.ideaSummary,
        supportingLine: "Built for " + (inputs.targetCustomer || "customers who need a better way"),
      },
      page2: {
        title: "Why " + inputs.productName + "?",
        benefits: benefits.slice(0, 6),
      },
      page3: {
        title: "How It Works",
        features: features.slice(0, 5),
      },
      page4: {
        title: "What People Are Saying",
        testimonials: [
          { portrait: "A", role: inputs.targetCustomer ? inputs.targetCustomer.split(" ").slice(0, 3).join(" ") : "Early Adopter", quote: "This solves a real problem I've had for years." },
          { portrait: "B", role: "Product Manager", quote: inputs.valueProposition ? inputs.valueProposition.split(".")[0] : "A game changer." },
          { portrait: "C", role: "Beta Tester", quote: "Finally, something that actually works the way I need it to." },
          { portrait: "D", role: "Industry Expert", quote: "I can see this becoming the standard for " + (inputs.targetCustomer || "this market") + "." },
        ],
      },
    };
    save(LS_BROCHURE, state.brochure);
    renderBrochure();
    renderNav();
  }

  function clearBrochure() {
    state.brochure = null;
    state.inputs = null;
    localStorage.removeItem(LS_BROCHURE);
    localStorage.removeItem(LS_INPUTS);
    switchStep(1);
  }

  function renderBrochure() {
    var p = document.getElementById("s1-preview");
    if (!p || !state.brochure) return;
    p.innerHTML = "";
    var b = state.brochure;

    var pageStyle = {
      borderRadius: "var(--lp-radius-lg)", border: "2px solid var(--lp-color-border-strong)",
      background: "linear-gradient(180deg, #0f172a, #020617)", padding: "var(--lp-space-lg)",
      aspectRatio: "9/16", display: "flex", flexDirection: "column", overflow: "hidden",
      marginBottom: "var(--lp-space-lg)",
    };

    // Page 1: Front Cover
    p.appendChild(el("div", { style: Object.assign({}, pageStyle) }, [
      badge("Page 1 \u2014 Front Cover"),
      el("div", { style: { flex: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "0.75rem" } }, [
        el("h2", { style: { fontSize: "var(--lp-font-size-3xl)", fontWeight: "800", margin: "0" } }, b.page1.productName),
        el("p", { style: { fontSize: "var(--lp-font-size-xl)", fontStyle: "italic", color: "var(--lp-color-secondary)", margin: "0" } }, b.page1.tagline),
        el("p", { style: { color: "var(--lp-color-text-muted)", margin: "0" } }, b.page1.supportingLine),
      ]),
      el("div", { style: { textAlign: "center", padding: "var(--lp-space-md)", border: "1px dashed var(--lp-color-border-subtle)", borderRadius: "var(--lp-radius-md)", background: "rgba(15,23,42,0.5)" } }, [
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", margin: "0" } }, "[ Visual concept: Hero image of your product in action ]"),
      ]),
    ]));

    // Page 2: Benefits
    var ul = el("ul", { style: { listStyle: "none", padding: "0", margin: "0" } });
    b.page2.benefits.forEach(function (item) {
      ul.appendChild(el("li", { style: { display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-soft)" } }, [
        el("span", { style: { color: "var(--lp-color-accent)", fontWeight: "700" } }, "\u2713"),
        el("span", null, item),
      ]));
    });
    p.appendChild(el("div", { style: Object.assign({}, pageStyle) }, [
      badge("Page 2 \u2014 Benefits"),
      el("h2", { style: { fontSize: "var(--lp-font-size-2xl)", fontWeight: "700", margin: "var(--lp-space-sm) 0" } }, b.page2.title),
      ul,
      el("div", { style: { marginTop: "auto", textAlign: "center", padding: "var(--lp-space-md)", border: "1px dashed var(--lp-color-border-subtle)", borderRadius: "var(--lp-radius-md)", background: "rgba(15,23,42,0.5)" } }, [
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", margin: "0" } }, "[ Visual concept: Illustration of key benefits ]"),
      ]),
    ]));

    // Page 3: Features
    var feats = el("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" } });
    b.page3.features.forEach(function (f) {
      feats.appendChild(el("div", null, [
        el("h4", { style: { fontSize: "var(--lp-font-size-sm)", fontWeight: "700", margin: "0 0 0.15rem" } }, f.name),
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", margin: "0" } }, f.description),
      ]));
    });
    p.appendChild(el("div", { style: Object.assign({}, pageStyle) }, [
      badge("Page 3 \u2014 Features"),
      el("h2", { style: { fontSize: "var(--lp-font-size-2xl)", fontWeight: "700", margin: "var(--lp-space-sm) 0" } }, b.page3.title),
      feats,
      el("div", { style: { marginTop: "auto", textAlign: "center", padding: "var(--lp-space-md)", border: "1px dashed var(--lp-color-border-subtle)", borderRadius: "var(--lp-radius-md)", background: "rgba(15,23,42,0.5)" } }, [
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", margin: "0" } }, "[ Visual concept: Product feature walkthrough ]"),
      ]),
    ]));

    // Page 4: Testimonials
    var tg = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lp-space-sm)", flex: "1", alignContent: "center" } });
    b.page4.testimonials.forEach(function (t) {
      tg.appendChild(el("div", { style: { border: "1px solid var(--lp-color-border-subtle)", borderRadius: "var(--lp-radius-md)", padding: "var(--lp-space-sm)", display: "flex", flexDirection: "column", gap: "0.5rem" } }, [
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" } }, [
          el("div", { style: { width: "32px", height: "32px", borderRadius: "50%", background: "rgba(148,163,184,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--lp-font-size-xs)", fontWeight: "700" } }, t.portrait),
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", fontWeight: "600" } }, t.role),
        ]),
        el("p", { style: { fontSize: "var(--lp-font-size-xs)", fontStyle: "italic", color: "var(--lp-color-text-muted)", margin: "0" } }, "\u201C" + t.quote + "\u201D"),
      ]));
    });
    p.appendChild(el("div", { style: Object.assign({}, pageStyle) }, [
      badge("Page 4 \u2014 Testimonials"),
      el("h2", { style: { fontSize: "var(--lp-font-size-2xl)", fontWeight: "700", margin: "var(--lp-space-sm) 0" } }, b.page4.title),
      tg,
    ]));

    // Continue button
    p.appendChild(el("div", { style: { display: "flex", justifyContent: "flex-end" } }, [
      btn("Continue to Step 3: Opportunity Map \u2192", function () { switchStep(3); }),
    ]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 3: OPPORTUNITY MAP + KEY DECISIONS
  // ═══════════════════════════════════════════════════════════════════════

  var areaColors = {
    problem:      { bg: "rgba(239,68,68,0.15)",  txt: "#fca5a5", bdr: "rgba(239,68,68,0.4)" },
    segment:      { bg: "rgba(59,130,246,0.15)",  txt: "#93c5fd", bdr: "rgba(59,130,246,0.4)" },
    solution:     { bg: "rgba(34,197,94,0.15)",   txt: "#86efac", bdr: "rgba(34,197,94,0.4)" },
    "value prop": { bg: "rgba(168,85,247,0.15)",  txt: "#c4b5fd", bdr: "rgba(168,85,247,0.4)" },
  };
  var priorityColors = {
    Now:   { bg: "rgba(239,68,68,0.15)", txt: "#fca5a5", bdr: "rgba(239,68,68,0.4)" },
    Next:  { bg: "rgba(234,179,8,0.15)", txt: "#fde68a", bdr: "rgba(234,179,8,0.4)" },
    Later: { bg: "rgba(148,163,184,0.15)", txt: "#94a3b8", bdr: "rgba(148,163,184,0.4)" },
  };

  function renderStep3() {
    if (!state.brochure) {
      contentEl.appendChild(card([
        el("p", { style: { color: "var(--lp-color-text-muted)", textAlign: "center", padding: "2rem" } }, "Complete Step 1 first."),
        btn("\u2190 Go to Step 1", function () { switchStep(1); }),
      ]));
      return;
    }

    var wrap = el("div");
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      badge("Step 3"), heading("Opportunity Map & Key Decisions", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Map opportunities and key decisions based on your product inputs. Add entries manually below."),
    ]));

    // ── Add Opportunity ──
    wrap.appendChild(el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700", marginBottom: "var(--lp-space-sm)" } }, "Add Opportunity"));
    wrap.appendChild(card([
      el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
        el("div", { style: { flex: "1", minWidth: "180px" } }, [inputField("Title", "opp-title", "e.g. Enterprise segment")]),
        el("div", { style: { flex: "2", minWidth: "220px" } }, [inputField("Description", "opp-desc", "Brief description")]),
        el("div", { style: { minWidth: "120px" } }, [selectField("Area", "opp-area", ["problem", "segment", "solution", "value prop"])]),
        el("div", { style: { minWidth: "80px" } }, [selectField("Impact", "opp-impact", ["H", "M", "L"])]),
        el("div", { style: { minWidth: "100px" } }, [selectField("Confidence", "opp-conf", ["H", "M", "L"])]),
        el("div", { style: { marginBottom: "0.75rem" } }, [btn("Add", addOpportunity, "primary")]),
      ]),
    ]));
    wrap.appendChild(el("div", { id: "opp-grid" }));

    // ── Add Decision ──
    wrap.appendChild(el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700", margin: "var(--lp-space-lg) 0 var(--lp-space-sm)" } }, "Add Key Decision"));
    wrap.appendChild(card([
      el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
        el("div", { style: { flex: "1", minWidth: "180px" } }, [inputField("Decision", "dec-stmt", "What needs to be decided?")]),
        el("div", { style: { flex: "1", minWidth: "160px" } }, [inputField("Uncertainty", "dec-unc", "Related uncertainty")]),
        el("div", { style: { flex: "1", minWidth: "160px" } }, [inputField("Experiment", "dec-exp", "How to validate")]),
        el("div", { style: { minWidth: "100px" } }, [selectField("Priority", "dec-pri", ["Now", "Next", "Later"])]),
        el("div", { style: { marginBottom: "0.75rem" } }, [btn("Add", addDecision, "primary")]),
      ]),
    ]));
    wrap.appendChild(el("div", { id: "dec-table" }));

    // Continue
    wrap.appendChild(el("div", { id: "s3-continue", style: { display: "flex", justifyContent: "flex-end", marginTop: "var(--lp-space-sm)" } }, [
      btn("Continue to Step 4: Pre-Mortem \u2192", function () { switchStep(4); }),
    ]));

    contentEl.appendChild(wrap);
    renderOpportunities();
    renderDecisions();
  }

  function addOpportunity() {
    var title = val("opp-title"), desc = val("opp-desc");
    if (!title) return;
    state.opportunities.items.push({ id: state.opportunities.nextId++, title: title, description: desc, area: val("opp-area") || "problem", impact: val("opp-impact") || "M", confidence: val("opp-conf") || "M" });
    save(LS_OPP_MAP, state.opportunities);
    document.getElementById("opp-title").value = "";
    document.getElementById("opp-desc").value = "";
    renderOpportunities();
  }

  function removeOpportunity(id) {
    state.opportunities.items = state.opportunities.items.filter(function (o) { return o.id !== id; });
    save(LS_OPP_MAP, state.opportunities);
    renderOpportunities();
  }

  function renderOpportunities() {
    var g = document.getElementById("opp-grid");
    if (!g) return;
    g.innerHTML = "";
    if (state.opportunities.items.length === 0) return;
    var grid = el("div", { className: "lp-grid-2" });
    state.opportunities.items.forEach(function (c) {
      var ac = areaColors[c.area] || areaColors.problem;
      grid.appendChild(card([
        el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" } }, [
          el("strong", { style: { fontSize: "var(--lp-font-size-md)" } }, c.title),
          el("div", { style: { display: "flex", gap: "0.3rem", alignItems: "center" } }, [
            badge(c.area, ac.bg, ac.txt, ac.bdr),
            removeBtn(function () { removeOpportunity(c.id); }),
          ]),
        ]),
        c.description ? el("p", { style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-muted)", marginBottom: "0.5rem" } }, c.description) : null,
        el("div", { style: { display: "flex", gap: "var(--lp-space-sm)" } }, [
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, ["Impact: ", el("strong", null, c.impact)]),
          el("span", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, ["Confidence: ", el("strong", null, c.confidence)]),
        ]),
      ]));
    });
    g.appendChild(grid);
  }

  function addDecision() {
    var stmt = val("dec-stmt");
    if (!stmt) return;
    state.decisions.items.push({ id: state.decisions.nextId++, statement: stmt, uncertainty: val("dec-unc"), experiment: val("dec-exp"), priority: val("dec-pri") || "Now" });
    save(LS_DECISIONS, state.decisions);
    document.getElementById("dec-stmt").value = "";
    document.getElementById("dec-unc").value = "";
    document.getElementById("dec-exp").value = "";
    renderDecisions();
  }

  function removeDecision(id) {
    state.decisions.items = state.decisions.items.filter(function (d) { return d.id !== id; });
    save(LS_DECISIONS, state.decisions);
    renderDecisions();
  }

  function renderDecisions() {
    var t = document.getElementById("dec-table");
    if (!t) return;
    t.innerHTML = "";
    if (state.decisions.items.length === 0) return;

    var cs = { padding: "0.6rem 0.75rem", fontSize: "var(--lp-font-size-sm)", borderBottom: "1px solid rgba(148,163,184,0.15)", verticalAlign: "top" };
    var hs = Object.assign({}, cs, { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "600" });

    var thead = el("tr");
    ["Decision", "Uncertainty", "Experiment", "Priority", ""].forEach(function (h) {
      thead.appendChild(el("th", { style: Object.assign({}, hs, { textAlign: "left" }) }, h));
    });

    var tbody = el("tbody");
    state.decisions.items.forEach(function (d) {
      var pc = priorityColors[d.priority] || priorityColors.Later;
      tbody.appendChild(el("tr", null, [
        el("td", { style: Object.assign({}, cs, { color: "var(--lp-color-text-soft)" }) }, d.statement),
        el("td", { style: Object.assign({}, cs, { color: "var(--lp-color-text-muted)" }) }, d.uncertainty),
        el("td", { style: Object.assign({}, cs, { color: "var(--lp-color-text-soft)" }) }, d.experiment),
        el("td", { style: cs }, [badge(d.priority, pc.bg, pc.txt, pc.bdr)]),
        el("td", { style: cs }, [removeBtn(function () { removeDecision(d.id); })]),
      ]));
    });

    t.appendChild(card([
      el("div", { style: { overflowX: "auto" } }, [
        el("table", { style: { width: "100%", borderCollapse: "collapse" } }, [el("thead", null, [thead]), tbody]),
      ]),
    ]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  STEP 4: PRE-MORTEM ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  var riskLevelColors = {
    High:   { bg: "rgba(239,68,68,0.15)", txt: "#fca5a5", bdr: "rgba(239,68,68,0.4)" },
    Medium: { bg: "rgba(234,179,8,0.15)", txt: "#fde68a", bdr: "rgba(234,179,8,0.4)" },
    Low:    { bg: "rgba(34,197,94,0.15)", txt: "#86efac", bdr: "rgba(34,197,94,0.4)" },
  };

  function renderStep4() {
    if (!state.brochure) {
      contentEl.appendChild(card([
        el("p", { style: { color: "var(--lp-color-text-muted)", textAlign: "center", padding: "2rem" } }, "Complete Steps 1 and 3 first."),
        btn("\u2190 Go to Step 1", function () { switchStep(1); }),
      ]));
      return;
    }

    var wrap = el("div");
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      badge("Step 4"), heading("Pre-Mortem Analysis", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Imagine this project has failed badly in 2\u20133 years. What went wrong? Add risks, mitigations, and your top 3 killers."),
    ]));

    // Narrative
    wrap.appendChild(card([
      el("div", { style: { fontSize: "var(--lp-font-size-md)", fontWeight: "700", marginBottom: "0.5rem" } }, "\u26A0 Failure Narrative"),
      el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", marginBottom: "0.5rem" } }, "Write 1\u20132 paragraphs as if looking back from the future. What caused the failure?"),
      el("textarea", { id: "pm-narrative", rows: "5", placeholder: "It\u2019s 2028 and the project has been shut down because\u2026", style: Object.assign({}, _inp) }),
    ], { borderColor: "rgba(239,68,68,0.3)" }));

    // Existing narrative
    if (state.premortem.narrative) {
      document.addEventListener("DOMContentLoaded", function () {}); // ensure DOM ready
      setTimeout(function () {
        var na = document.getElementById("pm-narrative");
        if (na) na.value = state.premortem.narrative;
      }, 0);
    }

    // Add risk theme
    wrap.appendChild(el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700", marginBottom: "var(--lp-space-sm)" } }, "Add Risk Theme"));
    wrap.appendChild(card([
      el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
        el("div", { style: { flex: "1", minWidth: "160px" } }, [inputField("Risk Name", "risk-name", "e.g. Market timing")]),
        el("div", { style: { flex: "2", minWidth: "200px" } }, [inputField("Description", "risk-desc", "What could go wrong?")]),
        el("div", { style: { minWidth: "100px" } }, [selectField("Level", "risk-level", ["High", "Medium", "Low"])]),
        el("div", { style: { flex: "1", minWidth: "160px" } }, [inputField("Mitigation", "risk-mit", "How to reduce this risk")]),
        el("div", { style: { flex: "1", minWidth: "160px" } }, [inputField("Experiment", "risk-exp", "How to validate/de-risk")]),
        el("div", { style: { marginBottom: "0.75rem" } }, [btn("Add Risk", addRisk, "primary")]),
      ]),
    ]));

    wrap.appendChild(el("div", { id: "risk-grid" }));

    // Top 3 Killers
    wrap.appendChild(el("div", { style: { margin: "var(--lp-space-lg) 0 var(--lp-space-sm)" } }, [
      el("div", { style: { fontSize: "var(--lp-font-size-lg)", fontWeight: "700" } }, "\u2620 Top 3 Project Killers"),
      el("p", { style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)" } }, "If you had to bet on 3 things that would kill this project\u2026"),
    ]));
    wrap.appendChild(card([
      inputField("Killer #1", "killer-1", "The most likely cause of failure"),
      inputField("Killer #2", "killer-2", "Second most likely"),
      inputField("Killer #3", "killer-3", "Third most likely"),
    ], { borderColor: "rgba(239,68,68,0.3)", background: "linear-gradient(135deg, rgba(127,29,29,0.15), rgba(15,23,42,0.95))" }));

    // Save button
    wrap.appendChild(el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap" } }, [
      btn("Save Pre-Mortem", savePreMortem, "primary"),
      btn("Clear All", clearPreMortem, "danger"),
    ]));

    contentEl.appendChild(wrap);

    // Populate existing data
    setTimeout(function () {
      var na = document.getElementById("pm-narrative");
      if (na && state.premortem.narrative) na.value = state.premortem.narrative;
      for (var i = 0; i < 3; i++) {
        var k = document.getElementById("killer-" + (i + 1));
        if (k && state.premortem.killers[i]) k.value = state.premortem.killers[i];
      }
    }, 0);

    renderRisks();
  }

  function addRisk() {
    var name = val("risk-name");
    if (!name) return;
    state.premortem.risks.push({
      id: state.premortem.nextId++, name: name, description: val("risk-desc"),
      level: val("risk-level") || "Medium", mitigation: val("risk-mit"), experiment: val("risk-exp"),
    });
    save(LS_PREMORTEM, state.premortem);
    document.getElementById("risk-name").value = "";
    document.getElementById("risk-desc").value = "";
    document.getElementById("risk-mit").value = "";
    document.getElementById("risk-exp").value = "";
    renderRisks();
  }

  function removeRisk(id) {
    state.premortem.risks = state.premortem.risks.filter(function (r) { return r.id !== id; });
    save(LS_PREMORTEM, state.premortem);
    renderRisks();
  }

  function renderRisks() {
    var g = document.getElementById("risk-grid");
    if (!g) return;
    g.innerHTML = "";
    if (state.premortem.risks.length === 0) return;

    var grid = el("div", { className: "lp-grid-2" });
    state.premortem.risks.forEach(function (r) {
      var rc = riskLevelColors[r.level] || riskLevelColors.Medium;
      var items = [];
      items.push(el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" } }, [
        el("strong", { style: { fontSize: "var(--lp-font-size-md)" } }, r.name),
        el("div", { style: { display: "flex", gap: "0.3rem", alignItems: "center" } }, [
          badge(r.level, rc.bg, rc.txt, rc.bdr),
          removeBtn(function () { removeRisk(r.id); }),
        ]),
      ]));
      if (r.description) items.push(el("p", { style: { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-muted)", marginBottom: "0.5rem" } }, r.description));
      if (r.mitigation) items.push(el("div", { style: { fontSize: "var(--lp-font-size-xs)", marginBottom: "0.3rem" } }, [
        el("span", { style: { color: "var(--lp-color-accent)" } }, "\u2192 "),
        el("span", { style: { color: "var(--lp-color-text-muted)", fontWeight: "600" } }, "Mitigation: "),
        el("span", { style: { color: "var(--lp-color-text-soft)" } }, r.mitigation),
      ]));
      if (r.experiment) items.push(el("div", { style: { fontSize: "var(--lp-font-size-xs)" } }, [
        el("span", { style: { color: "#60a5fa" } }, "\u2192 "),
        el("span", { style: { color: "var(--lp-color-text-muted)", fontWeight: "600" } }, "Experiment: "),
        el("span", { style: { color: "var(--lp-color-text-soft)" } }, r.experiment),
      ]));
      grid.appendChild(card(items));
    });
    g.appendChild(grid);
  }

  function savePreMortem() {
    state.premortem.narrative = val("pm-narrative");
    state.premortem.killers = [val("killer-1"), val("killer-2"), val("killer-3")];
    save(LS_PREMORTEM, state.premortem);
    alert("Pre-mortem saved!");
  }

  function clearPreMortem() {
    state.premortem = { risks: [], killers: ["", "", ""], narrative: "", nextId: 1 };
    save(LS_PREMORTEM, state.premortem);
    switchStep(4);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════════════

  function init() {
    navEl = document.getElementById("vpo-step-nav");
    contentEl = document.getElementById("vpo-content");
    if (!navEl || !contentEl) return;

    // Add responsive style
    var s = document.createElement("style");
    s.textContent = "@media(max-width:900px){#vpo-content .lp-grid-2{grid-template-columns:1fr!important}#vpo-content div[style*='grid-template-columns: minmax']{grid-template-columns:1fr!important}}";
    document.head.appendChild(s);

    renderNav();
    renderStep1();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
