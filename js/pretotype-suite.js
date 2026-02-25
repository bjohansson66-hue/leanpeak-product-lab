/**
 * pretotype-suite.js
 * Three standalone offline tools for LeanPeak Product Lab.
 * No API calls, no external dependencies — runs entirely in the browser.
 *
 * Tools:
 *   1. Pretotype Builder  → #pretotype-builder-root
 *   2. Survey Designer    → #survey-designer-root
 *   3. Opportunity Mapper → #opportunity-mapper-root
 */

(function () {
  "use strict";

  // ── localStorage keys ──────────────────────────────────────────────────
  var LS_BUILDER = "lp-pretotype-builder";
  var LS_SURVEY  = "lp-survey-designer";
  var LS_OPPS    = "lp-opportunity-mapper";

  // ── Shared helpers ─────────────────────────────────────────────────────

  function loadJSON(key, fallback) {
    try { var d = JSON.parse(localStorage.getItem(key)); return d != null ? d : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* quota full */ }
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

  var S = {
    lbl: { display: "block", fontSize: "0.72rem", color: "var(--lp-color-text-muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "600" },
    inp: { width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "var(--lp-color-text-main)", background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: "6px", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
    card: { borderRadius: "10px", border: "1px solid var(--lp-color-border-subtle)", background: "radial-gradient(circle at top left,#020617,#020617 55%)", padding: "1.25rem", marginBottom: "1.25rem" },
    row: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" },
  };

  function field(label, id, ph, type, value) {
    var isTA = type === "textarea";
    var f = isTA
      ? el("textarea", { id: id, placeholder: ph || "", rows: "3", style: Object.assign({}, S.inp) })
      : el("input", { id: id, type: type || "text", placeholder: ph || "", style: Object.assign({}, S.inp) });
    if (value != null) f.value = value;
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: Object.assign({}, S.lbl) }, label), f,
    ]);
  }

  function numField(label, id, ph, value) {
    var f = el("input", { id: id, type: "number", min: "1", max: "10", placeholder: ph || "1–10", style: Object.assign({}, S.inp, { width: "80px" }) });
    if (value != null) f.value = value;
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: Object.assign({}, S.lbl) }, label), f,
    ]);
  }

  function selectF(label, id, options, value) {
    var sel = el("select", { id: id, style: Object.assign({}, S.inp, { padding: "0.5rem", width: "auto" }) });
    options.forEach(function (o) {
      sel.appendChild(el("option", { value: typeof o === "string" ? o : o.value }, typeof o === "string" ? o : o.label));
    });
    if (value) sel.value = value;
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", { htmlFor: id, style: Object.assign({}, S.lbl) }, label), sel,
    ]);
  }

  function btn(text, onClick, variant) {
    var isPrimary = variant === "primary";
    var isDanger  = variant === "danger";
    var node = el("button", { type: "button", onClick: onClick, style: {
      display: "inline-flex", alignItems: "center", gap: "0.4rem",
      fontSize: "0.875rem", fontWeight: "600", borderRadius: "20px",
      padding: "0.5rem 1.1rem", cursor: "pointer", whiteSpace: "nowrap",
      fontFamily: "inherit", transition: "transform 0.12s ease",
      background: isPrimary ? "linear-gradient(135deg,var(--lp-color-secondary),#f97316)"
                : isDanger  ? "rgba(239,68,68,0.15)" : "rgba(15,23,42,0.9)",
      color:  isPrimary ? "#0b1120" : isDanger ? "#fca5a5" : "var(--lp-color-text-soft)",
      border: isPrimary ? "1px solid transparent"
            : isDanger  ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(148,163,184,0.35)",
    }}, text);
    node.addEventListener("mouseenter", function () { node.style.transform = "translateY(-1px)"; });
    node.addEventListener("mouseleave", function () { node.style.transform = ""; });
    return node;
  }

  function removeBtn(onClick) {
    return el("button", { type: "button", onClick: onClick, title: "Remove", style: {
      background: "none", border: "none", color: "var(--lp-color-danger, #f87171)",
      cursor: "pointer", fontSize: "1.1rem", padding: "0 0.25rem", lineHeight: "1",
    }}, "\u00D7");
  }

  function badge(text, bg, clr, bdr) {
    return el("span", { style: {
      display: "inline-block", fontSize: "0.72rem", fontWeight: "600",
      padding: "0.15rem 0.5rem", borderRadius: "20px", whiteSpace: "nowrap",
      background: bg || "rgba(15,23,42,0.85)",
      color: clr || "var(--lp-color-text-muted)",
      border: "1px solid " + (bdr || "rgba(148,163,184,0.25)"),
    }}, text);
  }

  function cardDiv(children, extraStyle) {
    var s = Object.assign({}, S.card);
    if (extraStyle) Object.assign(s, extraStyle);
    return el("div", { style: s }, Array.isArray(children) ? children : [children]);
  }

  function sectionTitle(text) {
    return el("h3", { style: { fontSize: "1rem", fontWeight: "700", margin: "0 0 0.75rem", color: "var(--lp-color-text-main)" } }, text);
  }

  function divider() {
    return el("hr", { style: { border: "none", borderTop: "1px solid var(--lp-color-border-subtle)", margin: "2rem 0" } });
  }

  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }

  // ═══════════════════════════════════════════════════════════════════════
  //  TOOL 1: PRETOTYPE BUILDER
  // ═══════════════════════════════════════════════════════════════════════

  function initPretotypeBuilder() {
    var root = document.getElementById("pretotype-builder-root");
    if (!root) return;

    var state = loadJSON(LS_BUILDER, { hypothesis: "", targetUsers: "", behaviors: "", successCriteria: "", hasSummary: false });

    root.appendChild(el("div", { style: { marginBottom: "1rem" } }, [
      el("h2", { style: { fontSize: "1.4rem", fontWeight: "700", margin: "0 0 0.35rem" } }, "Pretotype Builder"),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "0.875rem", margin: "0" } },
        "Define your pretotype hypothesis and generate a summary card to share with your team."),
    ]));

    var btnRow = el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" } });
    var buildBtnNode = btn("Build Summary", buildSummary, "primary");
    btnRow.appendChild(buildBtnNode);

    var formCard = cardDiv([
      field("Hypothesis", "pb-hypothesis",
        "We believe [target users] will [expected behavior] because [reason]\u2026", "textarea", state.hypothesis),
      field("Target Users", "pb-users",
        "e.g. Small business owners, first-time parents, remote teams\u2026", "text", state.targetUsers),
      field("Expected Behaviors", "pb-behaviors",
        "What will they do when they encounter the pretotype?", "textarea", state.behaviors),
      field("Success Criteria", "pb-criteria",
        "What outcome would confirm this pretotype works?", "textarea", state.successCriteria),
      btnRow,
    ]);
    root.appendChild(formCard);

    var summaryRoot = el("div", { id: "pb-summary" });
    root.appendChild(summaryRoot);

    // Restore summary if it was previously built
    if (state.hasSummary) renderSummary(state);

    function buildSummary() {
      state.hypothesis      = val("pb-hypothesis");
      state.targetUsers     = val("pb-users");
      state.behaviors       = val("pb-behaviors");
      state.successCriteria = val("pb-criteria");
      if (!state.hypothesis) return;
      state.hasSummary = true;
      save(LS_BUILDER, state);
      renderSummary(state);
      // Show Clear button
      if (!document.getElementById("pb-clear-btn")) {
        var clearNode = btn("Clear", clearBuilder, "danger");
        clearNode.id = "pb-clear-btn";
        btnRow.appendChild(clearNode);
      }
    }

    function clearBuilder() {
      state = { hypothesis: "", targetUsers: "", behaviors: "", successCriteria: "", hasSummary: false };
      save(LS_BUILDER, state);
      ["pb-hypothesis", "pb-users", "pb-behaviors", "pb-criteria"].forEach(function (id) {
        var e = document.getElementById(id); if (e) e.value = "";
      });
      var cb = document.getElementById("pb-clear-btn");
      if (cb) cb.parentNode.removeChild(cb);
      summaryRoot.innerHTML = "";
    }

    function renderSummary(data) {
      summaryRoot.innerHTML = "";
      var rows = [
        ["Hypothesis",        data.hypothesis],
        ["Target Users",      data.targetUsers],
        ["Expected Behaviors",data.behaviors],
        ["Success Criteria",  data.successCriteria],
      ].filter(function (r) { return r[1]; });

      var items = [
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" } }, [
          badge("\u2713 Summary", "rgba(251,191,36,0.12)", "#fbbf24", "rgba(251,191,36,0.35)"),
          el("span", { style: { fontSize: "0.8rem", color: "var(--lp-color-text-muted)" } }, "Pretotype Builder Output"),
        ]),
      ].concat(rows.map(function (r) {
        return el("div", { style: { marginBottom: "0.75rem" } }, [
          el("div", { style: Object.assign({}, S.lbl, { marginBottom: "0.2rem" }) }, r[0]),
          el("div", { style: { fontSize: "0.875rem", color: "var(--lp-color-text-soft)", lineHeight: "1.6" } }, r[1]),
        ]);
      }));

      summaryRoot.appendChild(cardDiv(items, { borderColor: "rgba(251,191,36,0.3)" }));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  TOOL 2: SURVEY DESIGNER
  // ═══════════════════════════════════════════════════════════════════════

  function initSurveyDesigner() {
    var root = document.getElementById("survey-designer-root");
    if (!root) return;

    var state = loadJSON(LS_SURVEY, { questions: [], nextId: 1 });

    root.appendChild(divider());
    root.appendChild(el("div", { style: { marginBottom: "1rem" } }, [
      el("h2", { style: { fontSize: "1.4rem", fontWeight: "700", margin: "0 0 0.35rem" } }, "Survey Designer"),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "0.875rem", margin: "0" } },
        "Build a quick survey for your pretotype. Copy it as plain text to share via email or chat."),
    ]));

    root.appendChild(cardDiv([
      sectionTitle("Add Question"),
      el("div", { style: S.row }, [
        el("div", { style: { flex: "3", minWidth: "200px" } }, [
          field("Question text", "sq-text", "e.g. How often do you face this problem?", "text"),
        ]),
        el("div", { style: { minWidth: "160px" } }, [
          selectF("Answer type", "sq-type", [
            { value: "scale",  label: "Scale 1\u20135" },
            { value: "choice", label: "Multiple Choice" },
            { value: "open",   label: "Open Text" },
          ]),
        ]),
        el("div", { style: { marginBottom: "0.75rem", alignSelf: "flex-end" } }, [
          btn("Add Question", addQuestion, "primary"),
        ]),
      ]),
    ]));

    var listRoot = el("div", { id: "sq-list" });
    root.appendChild(listRoot);

    var textOut = el("textarea", {
      id: "sq-text-out", rows: "10", readonly: "true",
      placeholder: "Your survey will appear here once you add questions.",
      style: Object.assign({}, S.inp, { background: "rgba(15,23,42,0.6)", cursor: "default", marginBottom: "0.5rem" }),
    });
    var copyBtnNode = btn("Copy Survey Text", function () {
      if (!textOut.value) return;
      navigator.clipboard.writeText(textOut.value).then(function () {
        var o = copyBtnNode.textContent; copyBtnNode.textContent = "Copied!";
        setTimeout(function () { copyBtnNode.textContent = o; }, 1500);
      });
    });

    root.appendChild(cardDiv([sectionTitle("Survey as Plain Text"), textOut, copyBtnNode]));

    renderQuestionList();
    buildTextOutput();

    function addQuestion() {
      var text = val("sq-text");
      if (!text) return;
      state.questions.push({ id: state.nextId++, text: text, type: val("sq-type") || "scale" });
      save(LS_SURVEY, state);
      document.getElementById("sq-text").value = "";
      renderQuestionList();
      buildTextOutput();
    }

    function removeQuestion(id) {
      state.questions = state.questions.filter(function (q) { return q.id !== id; });
      save(LS_SURVEY, state);
      renderQuestionList();
      buildTextOutput();
    }

    var typeLabels = { scale: "Scale 1\u20135", choice: "Multiple Choice", open: "Open Text" };
    var typeBadgeColors = {
      scale:  { bg: "rgba(59,130,246,0.15)", clr: "#93c5fd", bdr: "rgba(59,130,246,0.4)" },
      choice: { bg: "rgba(168,85,247,0.15)", clr: "#c4b5fd", bdr: "rgba(168,85,247,0.4)" },
      open:   { bg: "rgba(34,197,94,0.15)",  clr: "#86efac", bdr: "rgba(34,197,94,0.4)" },
    };

    function renderQuestionList() {
      var list = document.getElementById("sq-list");
      if (!list) return;
      list.innerHTML = "";
      if (state.questions.length === 0) return;
      var rows = state.questions.map(function (q, i) {
        var tc = typeBadgeColors[q.type] || typeBadgeColors.open;
        return el("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0", borderBottom: "1px solid rgba(148,163,184,0.1)" } }, [
          el("span", { style: { fontSize: "0.8rem", color: "var(--lp-color-text-muted)", minWidth: "1.2rem" } }, (i + 1) + "."),
          el("span", { style: { flex: "1", fontSize: "0.875rem", color: "var(--lp-color-text-soft)" } }, q.text),
          badge(typeLabels[q.type] || q.type, tc.bg, tc.clr, tc.bdr),
          removeBtn(function () { removeQuestion(q.id); }),
        ]);
      });
      list.appendChild(cardDiv(rows));
    }

    function buildTextOutput() {
      var out = document.getElementById("sq-text-out");
      if (!out) return;
      if (state.questions.length === 0) { out.value = ""; return; }
      var lines = ["SURVEY\n" + "\u2500".repeat(40)];
      state.questions.forEach(function (q, i) {
        lines.push("\n" + (i + 1) + ". " + q.text);
        if (q.type === "scale")  lines.push("   [ ] 1   [ ] 2   [ ] 3   [ ] 4   [ ] 5");
        if (q.type === "choice") lines.push("   [ ] Option A\n   [ ] Option B\n   [ ] Option C");
        if (q.type === "open")   lines.push("   _______________________________________________");
      });
      lines.push("\n" + "\u2500".repeat(40) + "\nThank you for completing this survey!");
      out.value = lines.join("\n");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  TOOL 3: OPPORTUNITY MAPPER
  // ═══════════════════════════════════════════════════════════════════════

  function initOpportunityMapper() {
    var root = document.getElementById("opportunity-mapper-root");
    if (!root) return;

    var state = loadJSON(LS_OPPS, { items: [], nextId: 1 });

    root.appendChild(divider());
    root.appendChild(el("div", { style: { marginBottom: "1rem" } }, [
      el("h2", { style: { fontSize: "1.4rem", fontWeight: "700", margin: "0 0 0.35rem" } }, "Opportunity Mapper"),
      el("p", { style: { color: "var(--lp-color-text-muted)", fontSize: "0.875rem", margin: "0" } },
        "Score opportunities by Impact (1\u201310) and Effort (1\u201310). Priority = Impact \u00F7 Effort \u2014 higher is better."),
    ]));

    root.appendChild(cardDiv([
      sectionTitle("Add Opportunity"),
      el("div", { style: S.row }, [
        el("div", { style: { flex: "3", minWidth: "180px" } }, [
          field("Title", "om-title", "e.g. Enter enterprise segment", "text"),
        ]),
        el("div", { style: { minWidth: "90px" } }, [numField("Impact", "om-impact", "1\u201310")]),
        el("div", { style: { minWidth: "90px" } }, [numField("Effort",  "om-effort", "1\u201310")]),
        el("div", { style: { flex: "2", minWidth: "160px" } }, [
          field("Notes (optional)", "om-notes", "Any context or caveats", "text"),
        ]),
        el("div", { style: { marginBottom: "0.75rem", alignSelf: "flex-end" } }, [
          btn("Add", addOpp, "primary"),
        ]),
      ]),
    ]));

    var tableRoot = el("div", { id: "om-table" });
    root.appendChild(tableRoot);
    renderTable();

    function addOpp() {
      var title  = val("om-title");
      var impact = parseInt(val("om-impact"), 10);
      var effort = parseInt(val("om-effort"), 10);
      if (!title || isNaN(impact) || isNaN(effort) || effort === 0) return;
      state.items.push({
        id: state.nextId++,
        title: title,
        impact: Math.min(10, Math.max(1, impact)),
        effort: Math.min(10, Math.max(1, effort)),
        notes: val("om-notes"),
      });
      save(LS_OPPS, state);
      ["om-title", "om-impact", "om-effort", "om-notes"].forEach(function (id) {
        var e = document.getElementById(id); if (e) e.value = "";
      });
      renderTable();
    }

    function removeOpp(id) {
      state.items = state.items.filter(function (o) { return o.id !== id; });
      save(LS_OPPS, state);
      renderTable();
    }

    var prioTiers = [
      { min: 3.0, bg: "rgba(34,197,94,0.15)",  clr: "#86efac", bdr: "rgba(34,197,94,0.4)" },
      { min: 1.5, bg: "rgba(234,179,8,0.15)",  clr: "#fde68a", bdr: "rgba(234,179,8,0.4)" },
      { min: 0,   bg: "rgba(239,68,68,0.15)",  clr: "#fca5a5", bdr: "rgba(239,68,68,0.4)" },
    ];
    function prioColor(p) {
      for (var i = 0; i < prioTiers.length; i++) {
        if (p >= prioTiers[i].min) return prioTiers[i];
      }
      return prioTiers[prioTiers.length - 1];
    }

    function renderTable() {
      var t = document.getElementById("om-table");
      if (!t) return;
      t.innerHTML = "";
      if (state.items.length === 0) return;

      var sorted = state.items.slice().sort(function (a, b) {
        return (b.impact / b.effort) - (a.impact / a.effort);
      });

      var hs = { padding: "0.45rem 0.75rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "600", color: "var(--lp-color-text-muted)", textAlign: "left", borderBottom: "1px solid rgba(148,163,184,0.2)" };
      var cs = { padding: "0.5rem 0.75rem", fontSize: "0.875rem", borderBottom: "1px solid rgba(148,163,184,0.08)", verticalAlign: "top" };

      var thead = el("tr", null, [
        el("th", { style: Object.assign({}, hs, { width: "35%" }) }, "Opportunity"),
        el("th", { style: Object.assign({}, hs, { textAlign: "center" }) }, "Impact"),
        el("th", { style: Object.assign({}, hs, { textAlign: "center" }) }, "Effort"),
        el("th", { style: Object.assign({}, hs, { textAlign: "center" }) }, "Priority"),
        el("th", { style: hs }, "Notes"),
        el("th", { style: hs }, ""),
      ]);

      var tbody = el("tbody");
      sorted.forEach(function (o) {
        var prio = o.impact / o.effort;
        var pc = prioColor(prio);
        tbody.appendChild(el("tr", null, [
          el("td", { style: Object.assign({}, cs, { fontWeight: "600", color: "var(--lp-color-text-soft)" }) }, o.title),
          el("td", { style: Object.assign({}, cs, { textAlign: "center", color: "var(--lp-color-text-muted)" }) }, String(o.impact)),
          el("td", { style: Object.assign({}, cs, { textAlign: "center", color: "var(--lp-color-text-muted)" }) }, String(o.effort)),
          el("td", { style: Object.assign({}, cs, { textAlign: "center" }) }, [badge(prio.toFixed(1), pc.bg, pc.clr, pc.bdr)]),
          el("td", { style: Object.assign({}, cs, { color: "var(--lp-color-text-muted)", fontSize: "0.8rem" }) }, o.notes || ""),
          el("td", { style: cs }, [removeBtn(function () { removeOpp(o.id); })]),
        ]));
      });

      t.appendChild(cardDiv([
        el("div", { style: { overflowX: "auto" } }, [
          el("table", { style: { width: "100%", borderCollapse: "collapse" } }, [
            el("thead", null, [thead]), tbody,
          ]),
        ]),
        el("p", { style: { fontSize: "0.75rem", color: "var(--lp-color-text-muted)", margin: "0.75rem 0 0", textAlign: "right" } },
          "Priority = Impact \u00F7 Effort \u2014 sorted highest first. \u25A0 Green \u22653.0  \u25A0 Yellow \u22651.5  \u25A0 Red <1.5"),
      ]));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════════════

  function init() {
    initPretotypeBuilder();
    initSurveyDesigner();
    initOpportunityMapper();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
