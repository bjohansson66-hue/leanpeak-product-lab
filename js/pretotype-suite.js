/**
 * pretotype-suite.js
 * Fully offline Pretotype Tool Suite for LeanPeak Product Lab.
 * No API calls — everything runs in the browser with optional localStorage.
 *
 * Renders into:
 *   #vpo-step-nav   — tool tab buttons
 *   #vpo-content    — active tool content
 */

(function () {
  "use strict";

  // ── localStorage keys ─────────────────────────────────────────────────
  var LS_BUILDER  = "lp-pretotype-builder";
  var LS_SURVEY   = "lp-survey-designer";
  var LS_MAPPER   = "lp-opportunity-mapper";

  // ── State ─────────────────────────────────────────────────────────────
  var state = {
    activeTab: "builder",
    builder: loadJSON(LS_BUILDER, {
      hypothesis: "", target: "", behaviors: "", criteria: "",
    }),
    survey: loadJSON(LS_SURVEY, { questions: [], nextId: 1 }),
    mapper: loadJSON(LS_MAPPER, { items: [], nextId: 1 }),
  };

  var navEl, contentEl;

  // ═══════════════════════════════════════════════════════════════════════
  //  UTILITY HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  function loadJSON(key, fallback) {
    try { var d = JSON.parse(localStorage.getItem(key)); return d || fallback; }
    catch (e) { return fallback; }
  }

  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* quota */ }
  }

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

  function inputField(labelText, id, placeholder, type, value) {
    var field = type === "textarea"
      ? el("textarea", { id: id, placeholder: placeholder || "", rows: "3", style: inputStyle() })
      : el("input", { id: id, type: type || "text", placeholder: placeholder || "", style: inputStyle() });
    if (value) field.value = value;
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: labelStyle() }, labelText),
      field,
    ]);
  }

  function btn(text, onClick, variant, disabled) {
    var isPrimary = variant === "primary";
    var isDanger = variant === "danger";
    var bgColor = isPrimary
      ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)"
      : isDanger
        ? "rgba(239, 68, 68, 0.15)"
        : "rgba(15, 23, 42, 0.9)";
    var textColor = isPrimary ? "#0b1120" : isDanger ? "#fca5a5" : "var(--lp-color-text-soft)";
    var borderColor = isPrimary ? "transparent" : isDanger ? "rgba(239,68,68,0.4)" : "rgba(148, 163, 184, 0.4)";

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
        border: "1px solid " + borderColor,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        opacity: disabled ? "0.5" : "1",
        background: bgColor,
        color: textColor,
        transition: "transform 0.15s ease",
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
      marginBottom: "var(--lp-space-lg)",
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
    var sizes = { 2: "var(--lp-font-size-2xl)", 3: "var(--lp-font-size-xl)" };
    return el("h" + level, {
      style: { fontSize: sizes[level] || "var(--lp-font-size-lg)", margin: "0 0 0.5rem", lineHeight: "1.2" },
    }, text);
  }

  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(function () {
      var orig = button.textContent;
      button.textContent = "Copied!";
      setTimeout(function () { button.textContent = orig; }, 1500);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  var tabs = [
    { id: "builder", label: "Pretotype Builder" },
    { id: "survey",  label: "Survey Designer" },
    { id: "mapper",  label: "Opportunity Mapper" },
  ];

  function renderNav() {
    navEl.innerHTML = "";
    navEl.style.cssText = "display:flex;gap:var(--lp-space-xs);margin-bottom:var(--lp-space-xl);flex-wrap:wrap;";
    tabs.forEach(function (t) {
      var active = state.activeTab === t.id;
      var tabBtn = el("button", {
        type: "button",
        onClick: function () { switchTab(t.id); },
        style: {
          display: "inline-flex",
          alignItems: "center",
          fontSize: "var(--lp-font-size-sm)",
          fontWeight: "600",
          borderRadius: "var(--lp-radius-pill)",
          padding: "0.55rem 1.2rem",
          border: active ? "1px solid transparent" : "1px solid rgba(148, 163, 184, 0.4)",
          cursor: "pointer",
          background: active
            ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)"
            : "rgba(15, 23, 42, 0.9)",
          color: active ? "#0b1120" : "var(--lp-color-text-soft)",
          fontFamily: "inherit",
          transition: "transform 0.15s ease",
        },
      }, t.label);
      if (!active) {
        tabBtn.addEventListener("mouseenter", function () { tabBtn.style.transform = "translateY(-1px)"; });
        tabBtn.addEventListener("mouseleave", function () { tabBtn.style.transform = ""; });
      }
      navEl.appendChild(tabBtn);
    });
  }

  function switchTab(id) {
    state.activeTab = id;
    renderNav();
    contentEl.innerHTML = "";
    if (id === "builder") renderBuilder();
    else if (id === "survey") renderSurvey();
    else if (id === "mapper") renderMapper();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  1. PRETOTYPE BUILDER
  // ═══════════════════════════════════════════════════════════════════════

  function renderBuilder() {
    var b = state.builder;

    var wrap = el("div");
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      heading("Pretotype Builder", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Define your hypothesis, target users, expected behaviors, and success criteria. Data is saved automatically in your browser."),
    ]));

    var formCard = card([
      inputField("Hypothesis", "pb-hypothesis", "We believe that\u2026", "textarea", b.hypothesis),
      inputField("Target Users", "pb-target", "Who are we testing with?", "text", b.target),
      inputField("Expected Behaviors", "pb-behaviors", "What do we expect them to do?", "textarea", b.behaviors),
      inputField("Success Criteria", "pb-criteria", "How do we measure success?", "textarea", b.criteria),
      el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "var(--lp-space-xs)" } }, [
        btn("Generate Summary", function () { saveBuilderAndRender(); }, "primary"),
        btn("Clear All", function () { clearBuilder(); }, "danger"),
      ]),
    ]);
    wrap.appendChild(formCard);

    wrap.appendChild(el("div", { id: "pb-output" }));
    contentEl.appendChild(wrap);

    // Auto-save on input
    ["pb-hypothesis", "pb-target", "pb-behaviors", "pb-criteria"].forEach(function (id) {
      var inp = document.getElementById(id);
      if (inp) inp.addEventListener("input", saveBuilderState);
    });

    // Show summary if data exists
    if (b.hypothesis || b.target || b.behaviors || b.criteria) {
      renderBuilderSummary();
    }
  }

  function saveBuilderState() {
    state.builder = {
      hypothesis: val("pb-hypothesis"),
      target: val("pb-target"),
      behaviors: val("pb-behaviors"),
      criteria: val("pb-criteria"),
    };
    save(LS_BUILDER, state.builder);
  }

  function saveBuilderAndRender() {
    saveBuilderState();
    renderBuilderSummary();
  }

  function clearBuilder() {
    state.builder = { hypothesis: "", target: "", behaviors: "", criteria: "" };
    save(LS_BUILDER, state.builder);
    switchTab("builder");
  }

  function val(id) {
    var e = document.getElementById(id);
    return e ? e.value.trim() : "";
  }

  function renderBuilderSummary() {
    var out = document.getElementById("pb-output");
    if (!out) return;
    out.innerHTML = "";

    var b = state.builder;
    if (!b.hypothesis && !b.target && !b.behaviors && !b.criteria) return;

    var lines = [];
    if (b.hypothesis) lines.push(el("p", { style: lineStyle() }, [el("strong", null, "Hypothesis: "), b.hypothesis]));
    if (b.target)     lines.push(el("p", { style: lineStyle() }, [el("strong", null, "Target Users: "), b.target]));
    if (b.behaviors)  lines.push(el("p", { style: lineStyle() }, [el("strong", null, "Expected Behaviors: "), b.behaviors]));
    if (b.criteria)   lines.push(el("p", { style: lineStyle() }, [el("strong", null, "Success Criteria: "), b.criteria]));

    var summaryCard = card(
      [
        el("div", {
          style: { fontSize: "var(--lp-font-size-xs)", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--lp-color-text-muted)", marginBottom: "0.5rem" },
        }, "Pretotype Summary"),
      ].concat(lines),
      { background: "linear-gradient(135deg, rgba(30, 64, 175, 0.25), rgba(15, 23, 42, 0.95))" }
    );

    var copyBtn = btn("Copy as Text", function () {
      var text = "";
      if (b.hypothesis) text += "Hypothesis: " + b.hypothesis + "\n";
      if (b.target)     text += "Target Users: " + b.target + "\n";
      if (b.behaviors)  text += "Expected Behaviors: " + b.behaviors + "\n";
      if (b.criteria)   text += "Success Criteria: " + b.criteria + "\n";
      copyToClipboard(text.trim(), copyBtn);
    });

    out.appendChild(summaryCard);
    out.appendChild(el("div", { style: { marginTop: "-0.75rem" } }, [copyBtn]));
  }

  function lineStyle() {
    return { fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-soft)", margin: "0.3rem 0", lineHeight: "1.5" };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  2. SURVEY DESIGNER
  // ═══════════════════════════════════════════════════════════════════════

  var questionTypes = [
    { value: "open",     label: "Open-ended" },
    { value: "yesno",    label: "Yes / No" },
    { value: "scale",    label: "Scale (1\u20135)" },
    { value: "multiple", label: "Multiple Choice" },
  ];

  function renderSurvey() {
    var wrap = el("div");
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      heading("Survey Designer", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Draft lean survey questions linked to your pretotyping experiments. Questions are saved automatically."),
    ]));

    // Add question form
    var typeSelect = el("select", { id: "sd-type", style: Object.assign({}, inputStyle(), { padding: "0.5rem" }) });
    questionTypes.forEach(function (qt) {
      typeSelect.appendChild(el("option", { value: qt.value }, qt.label));
    });

    wrap.appendChild(card([
      el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
        el("div", { style: { flex: "1", minWidth: "200px" } }, [
          inputField("New Question", "sd-question", "e.g. How often do you\u2026?"),
        ]),
        el("div", { style: { minWidth: "140px", marginBottom: "0.75rem" } }, [
          el("label", { style: labelStyle() }, "Type"),
          typeSelect,
        ]),
        el("div", { style: { marginBottom: "0.75rem" } }, [
          btn("Add Question", function () { addSurveyQuestion(); }, "primary"),
        ]),
      ]),
    ]));

    // Question list
    wrap.appendChild(el("div", { id: "sd-list" }));
    wrap.appendChild(el("div", { id: "sd-actions" }));

    contentEl.appendChild(wrap);
    renderSurveyList();
  }

  function addSurveyQuestion() {
    var qInput = document.getElementById("sd-question");
    var tSelect = document.getElementById("sd-type");
    var text = qInput.value.trim();
    if (!text) return;

    state.survey.questions.push({ id: state.survey.nextId++, text: text, type: tSelect.value });
    save(LS_SURVEY, state.survey);
    qInput.value = "";
    renderSurveyList();
  }

  function removeSurveyQuestion(id) {
    state.survey.questions = state.survey.questions.filter(function (q) { return q.id !== id; });
    save(LS_SURVEY, state.survey);
    renderSurveyList();
  }

  function typeLabel(val) {
    var m = questionTypes.find(function (qt) { return qt.value === val; });
    return m ? m.label : val;
  }

  function renderSurveyList() {
    var list = document.getElementById("sd-list");
    var actions = document.getElementById("sd-actions");
    if (!list || !actions) return;
    list.innerHTML = "";
    actions.innerHTML = "";

    if (state.survey.questions.length === 0) {
      list.appendChild(el("p", {
        style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)", textAlign: "center", padding: "var(--lp-space-lg) 0" },
      }, "No questions yet. Add your first question above."));
      return;
    }

    state.survey.questions.forEach(function (q, idx) {
      list.appendChild(el("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 0.75rem",
          borderRadius: "var(--lp-radius-sm)",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          marginBottom: "0.4rem",
        },
      }, [
        el("span", {
          style: { fontSize: "var(--lp-font-size-xs)", color: "var(--lp-color-text-muted)", minWidth: "1.8rem" },
        }, String(idx + 1) + "."),
        el("span", { style: { flex: "1", fontSize: "var(--lp-font-size-sm)", color: "var(--lp-color-text-soft)" } }, q.text),
        badge(typeLabel(q.type), "rgba(245,158,11,0.1)", "var(--lp-color-secondary)", "rgba(245,158,11,0.3)"),
        el("button", {
          type: "button",
          onClick: function () { removeSurveyQuestion(q.id); },
          title: "Remove",
          style: {
            background: "none", border: "none", color: "var(--lp-color-danger)",
            cursor: "pointer", fontSize: "1.1rem", padding: "0 0.3rem", fontFamily: "inherit",
          },
        }, "\u00D7"),
      ]));
    });

    var copyBtn = btn("Copy Survey as Text", function () {
      var text = state.survey.questions.map(function (q, i) {
        return (i + 1) + ". [" + typeLabel(q.type) + "] " + q.text;
      }).join("\n");
      copyToClipboard(text, copyBtn);
    });
    var clearBtn = btn("Clear All Questions", function () {
      state.survey.questions = [];
      state.survey.nextId = 1;
      save(LS_SURVEY, state.survey);
      renderSurveyList();
    }, "danger");

    actions.appendChild(el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "var(--lp-space-sm)" } }, [
      copyBtn, clearBtn,
    ]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  3. OPPORTUNITY MAPPER
  // ═══════════════════════════════════════════════════════════════════════

  function renderMapper() {
    var wrap = el("div");
    wrap.appendChild(el("div", { style: { marginBottom: "var(--lp-space-lg)" } }, [
      heading("Opportunity Mapper", 2),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)" } },
        "Add opportunities and prioritize them by impact and effort. Table auto-sorts by priority score."),
    ]));

    // Add row form
    var impactSelect = el("select", { id: "om-impact", style: Object.assign({}, inputStyle(), { padding: "0.5rem" }) });
    ["High", "Medium", "Low"].forEach(function (o) { impactSelect.appendChild(el("option", { value: o }, o)); });

    var effortSelect = el("select", { id: "om-effort", style: Object.assign({}, inputStyle(), { padding: "0.5rem" }) });
    ["Low", "Medium", "High"].forEach(function (o) { effortSelect.appendChild(el("option", { value: o }, o)); });

    wrap.appendChild(card([
      el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
        el("div", { style: { flex: "1", minWidth: "180px" } }, [
          inputField("Opportunity", "om-name", "e.g. Partner channel"),
        ]),
        el("div", { style: { minWidth: "100px", marginBottom: "0.75rem" } }, [
          el("label", { style: labelStyle() }, "Impact"),
          impactSelect,
        ]),
        el("div", { style: { minWidth: "100px", marginBottom: "0.75rem" } }, [
          el("label", { style: labelStyle() }, "Effort"),
          effortSelect,
        ]),
        el("div", { style: { marginBottom: "0.75rem" } }, [
          btn("Add", function () { addOpportunity(); }, "primary"),
        ]),
      ]),
    ]));

    wrap.appendChild(el("div", { id: "om-table" }));
    wrap.appendChild(el("div", { id: "om-actions" }));

    contentEl.appendChild(wrap);
    renderMapperTable();
  }

  function priorityScore(impact, effort) {
    var iMap = { High: 3, Medium: 2, Low: 1 };
    var eMap = { Low: 3, Medium: 2, High: 1 };
    return (iMap[impact] || 1) * (eMap[effort] || 1);
  }

  function priorityLabel(score) {
    if (score >= 6) return { text: "High",   color: "#22c55e", bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)" };
    if (score >= 3) return { text: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)" };
    return              { text: "Low",    color: "#ef4444", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)" };
  }

  function addOpportunity() {
    var nameInput = document.getElementById("om-name");
    var name = nameInput.value.trim();
    if (!name) return;

    var impact = document.getElementById("om-impact").value;
    var effort = document.getElementById("om-effort").value;
    var score = priorityScore(impact, effort);

    state.mapper.items.push({ id: state.mapper.nextId++, name: name, impact: impact, effort: effort, score: score });
    state.mapper.items.sort(function (a, b) { return b.score - a.score; });
    save(LS_MAPPER, state.mapper);
    nameInput.value = "";
    renderMapperTable();
  }

  function removeOpportunity(id) {
    state.mapper.items = state.mapper.items.filter(function (o) { return o.id !== id; });
    save(LS_MAPPER, state.mapper);
    renderMapperTable();
  }

  function renderMapperTable() {
    var tableWrap = document.getElementById("om-table");
    var actionsWrap = document.getElementById("om-actions");
    if (!tableWrap || !actionsWrap) return;
    tableWrap.innerHTML = "";
    actionsWrap.innerHTML = "";

    if (state.mapper.items.length === 0) {
      tableWrap.appendChild(el("p", {
        style: { color: "var(--lp-color-text-muted)", fontSize: "var(--lp-font-size-sm)", textAlign: "center", padding: "var(--lp-space-lg) 0" },
      }, "No opportunities yet. Add your first one above."));
      return;
    }

    var cellStyle = {
      padding: "0.5rem 0.65rem",
      fontSize: "var(--lp-font-size-sm)",
      borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
    };
    var headerStyle = Object.assign({}, cellStyle, {
      fontSize: "var(--lp-font-size-xs)",
      color: "var(--lp-color-text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontWeight: "600",
    });

    var headers = ["Opportunity", "Impact", "Effort", "Priority", ""];
    var thead = el("tr");
    headers.forEach(function (h, i) {
      thead.appendChild(el("th", { style: Object.assign({}, headerStyle, { textAlign: i === 0 ? "left" : "center" }) }, h));
    });

    var tbody = el("tbody");
    state.mapper.items.forEach(function (opp) {
      var p = priorityLabel(opp.score);
      tbody.appendChild(el("tr", null, [
        el("td", { style: Object.assign({}, cellStyle, { textAlign: "left", color: "var(--lp-color-text-soft)" }) }, opp.name),
        el("td", { style: Object.assign({}, cellStyle, { textAlign: "center", color: "var(--lp-color-text-muted)" }) }, opp.impact),
        el("td", { style: Object.assign({}, cellStyle, { textAlign: "center", color: "var(--lp-color-text-muted)" }) }, opp.effort),
        el("td", { style: Object.assign({}, cellStyle, { textAlign: "center" }) }, [
          badge(p.text + " (" + opp.score + ")", p.bg, p.color, p.border),
        ]),
        el("td", { style: Object.assign({}, cellStyle, { textAlign: "center" }) }, [
          el("button", {
            type: "button",
            onClick: function () { removeOpportunity(opp.id); },
            title: "Remove",
            style: {
              background: "none", border: "none", color: "var(--lp-color-danger)",
              cursor: "pointer", fontSize: "1.1rem", padding: "0 0.3rem", fontFamily: "inherit",
            },
          }, "\u00D7"),
        ]),
      ]));
    });

    tableWrap.appendChild(card([
      el("div", { style: { overflowX: "auto" } }, [
        el("table", { style: { width: "100%", borderCollapse: "collapse" } }, [
          el("thead", null, [thead]),
          tbody,
        ]),
      ]),
    ]));

    var clearBtn = btn("Clear All Opportunities", function () {
      state.mapper.items = [];
      state.mapper.nextId = 1;
      save(LS_MAPPER, state.mapper);
      renderMapperTable();
    }, "danger");

    actionsWrap.appendChild(el("div", { style: { marginTop: "var(--lp-space-xs)" } }, [clearBtn]));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════════════

  function init() {
    navEl = document.getElementById("vpo-step-nav");
    contentEl = document.getElementById("vpo-content");
    if (!navEl || !contentEl) return;

    renderNav();
    renderBuilder();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
