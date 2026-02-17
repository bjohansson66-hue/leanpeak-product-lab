/**
 * pretotype-suite.js
 * Plain-JS interactive tools for the LeanPeak VPO Lab.
 * Renders into three containers on vpo/index.html:
 *   #pretotype-builder-root
 *   #survey-designer-root
 *   #opportunity-mapper-root
 */

(function () {
  "use strict";

  // ── Utility helpers ──────────────────────────────────────────────────

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "style" && typeof attrs[k] === "object") {
          Object.assign(node.style, attrs[k]);
        } else if (k.startsWith("on")) {
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

  function inputField(labelText, id, placeholder, type) {
    return el("div", { style: { marginBottom: "0.75rem" } }, [
      el("label", {
        htmlFor: id,
        style: {
          display: "block",
          fontSize: "var(--lp-font-size-xs)",
          color: "var(--lp-color-text-muted)",
          marginBottom: "0.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        },
      }, labelText),
      type === "textarea"
        ? el("textarea", {
            id: id,
            placeholder: placeholder || "",
            rows: "3",
            style: inputStyle(),
          })
        : el("input", {
            id: id,
            type: type || "text",
            placeholder: placeholder || "",
            style: inputStyle(),
          }),
    ]);
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

  function btn(text, onClick, variant) {
    var isPrimary = variant === "primary";
    var node = el("button", {
      type: "button",
      onClick: onClick,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        fontSize: "var(--lp-font-size-sm)",
        fontWeight: "600",
        borderRadius: "var(--lp-radius-pill)",
        padding: "0.55rem 1.2rem",
        border: isPrimary ? "1px solid transparent" : "1px solid rgba(148, 163, 184, 0.4)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        background: isPrimary
          ? "linear-gradient(135deg, var(--lp-color-secondary), #f97316)"
          : "rgba(15, 23, 42, 0.9)",
        color: isPrimary ? "#0b1120" : "var(--lp-color-text-soft)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      },
    }, text);
    node.addEventListener("mouseenter", function () {
      node.style.transform = "translateY(-1px)";
    });
    node.addEventListener("mouseleave", function () {
      node.style.transform = "";
    });
    return node;
  }

  function divider() {
    return el("hr", {
      style: {
        border: "none",
        borderTop: "1px solid rgba(148, 163, 184, 0.2)",
        margin: "1rem 0",
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 1. PRETOTYPE BUILDER
  // ════════════════════════════════════════════════════════════════════════

  function initPretotypeBuilder(root) {
    var summaryBox = null;

    var form = el("div", { style: { marginTop: "1rem" } }, [
      inputField("Hypothesis", "pb-hypothesis", "We believe that…", "textarea"),
      inputField("Target Users", "pb-target", "Who are we testing with?"),
      inputField("Expected Behaviors", "pb-behaviors", "What do we expect them to do?", "textarea"),
      inputField("Success Criteria", "pb-criteria", "How do we measure success?", "textarea"),
    ]);

    var buttonRow = el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap" } }, [
      btn("Generate Summary", function () {
        generateSummary();
      }, "primary"),
      btn("Clear", function () {
        clearForm();
      }),
    ]);

    var outputArea = el("div", { id: "pb-output" });

    root.appendChild(form);
    root.appendChild(buttonRow);
    root.appendChild(outputArea);

    function val(id) {
      var e = document.getElementById(id);
      return e ? e.value.trim() : "";
    }

    function generateSummary() {
      var hypothesis = val("pb-hypothesis");
      var target = val("pb-target");
      var behaviors = val("pb-behaviors");
      var criteria = val("pb-criteria");

      if (!hypothesis && !target && !behaviors && !criteria) return;

      outputArea.innerHTML = "";
      outputArea.appendChild(divider());

      var card = el("div", {
        style: {
          background: "linear-gradient(135deg, rgba(30, 64, 175, 0.25), rgba(15, 23, 42, 0.95))",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          borderRadius: "var(--lp-radius-md)",
          padding: "var(--lp-space-md)",
        },
      }, [
        el("div", {
          style: {
            fontSize: "var(--lp-font-size-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--lp-color-text-muted)",
            marginBottom: "0.5rem",
          },
        }, "Pretotype Summary"),
        hypothesis ? el("p", { style: lineStyle() }, [
          el("strong", null, "Hypothesis: "), hypothesis,
        ]) : null,
        target ? el("p", { style: lineStyle() }, [
          el("strong", null, "Target Users: "), target,
        ]) : null,
        behaviors ? el("p", { style: lineStyle() }, [
          el("strong", null, "Expected Behaviors: "), behaviors,
        ]) : null,
        criteria ? el("p", { style: lineStyle() }, [
          el("strong", null, "Success Criteria: "), criteria,
        ]) : null,
      ]);

      var copyBtn = btn("Copy as Text", function () {
        var text = "";
        if (hypothesis) text += "Hypothesis: " + hypothesis + "\n";
        if (target) text += "Target Users: " + target + "\n";
        if (behaviors) text += "Expected Behaviors: " + behaviors + "\n";
        if (criteria) text += "Success Criteria: " + criteria + "\n";
        navigator.clipboard.writeText(text.trim()).then(function () {
          copyBtn.textContent = "Copied!";
          setTimeout(function () { copyBtn.textContent = "Copy as Text"; }, 1500);
        });
      });

      outputArea.appendChild(card);
      outputArea.appendChild(el("div", { style: { marginTop: "0.5rem" } }, [copyBtn]));
      summaryBox = card;
    }

    function clearForm() {
      ["pb-hypothesis", "pb-target", "pb-behaviors", "pb-criteria"].forEach(function (id) {
        var e = document.getElementById(id);
        if (e) e.value = "";
      });
      outputArea.innerHTML = "";
      summaryBox = null;
    }

    function lineStyle() {
      return {
        fontSize: "var(--lp-font-size-sm)",
        color: "var(--lp-color-text-soft)",
        margin: "0.3rem 0",
        lineHeight: "1.5",
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. SURVEY DESIGNER
  // ════════════════════════════════════════════════════════════════════════

  function initSurveyDesigner(root) {
    var questions = [];
    var nextId = 1;
    var listEl = el("div", { id: "sd-list", style: { marginTop: "1rem" } });

    var questionTypes = [
      { value: "open", label: "Open-ended" },
      { value: "yesno", label: "Yes / No" },
      { value: "scale", label: "Scale (1-5)" },
      { value: "multiple", label: "Multiple Choice" },
    ];

    var addRow = el("div", { style: { display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
      el("div", { style: { flex: "1", minWidth: "180px" } }, [
        inputField("New Question", "sd-new-q", "e.g. How often do you…?"),
      ]),
      el("div", { style: { minWidth: "130px" } }, [
        el("label", {
          style: {
            display: "block",
            fontSize: "var(--lp-font-size-xs)",
            color: "var(--lp-color-text-muted)",
            marginBottom: "0.25rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          },
        }, "Type"),
        (function () {
          var sel = el("select", {
            id: "sd-new-type",
            style: Object.assign({}, inputStyle(), { padding: "0.5rem 0.5rem" }),
          });
          questionTypes.forEach(function (qt) {
            sel.appendChild(el("option", { value: qt.value }, qt.label));
          });
          return sel;
        })(),
      ]),
      el("div", { style: { paddingBottom: "0.75rem" } }, [
        btn("Add", function () { addQuestion(); }, "primary"),
      ]),
    ]);

    var outputArea = el("div", { id: "sd-output" });

    root.appendChild(addRow);
    root.appendChild(listEl);
    root.appendChild(outputArea);

    function addQuestion() {
      var qInput = document.getElementById("sd-new-q");
      var tSelect = document.getElementById("sd-new-type");
      var text = qInput.value.trim();
      if (!text) return;

      var q = { id: nextId++, text: text, type: tSelect.value };
      questions.push(q);
      qInput.value = "";
      renderList();
    }

    function removeQuestion(id) {
      questions = questions.filter(function (q) { return q.id !== id; });
      renderList();
    }

    function typeLabel(val) {
      var match = questionTypes.find(function (qt) { return qt.value === val; });
      return match ? match.label : val;
    }

    function renderList() {
      listEl.innerHTML = "";
      outputArea.innerHTML = "";

      if (questions.length === 0) return;

      questions.forEach(function (q, idx) {
        var row = el("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--lp-radius-sm)",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            marginBottom: "0.4rem",
            fontSize: "var(--lp-font-size-sm)",
          },
        }, [
          el("span", {
            style: {
              fontSize: "var(--lp-font-size-xs)",
              color: "var(--lp-color-text-muted)",
              minWidth: "1.5rem",
            },
          }, String(idx + 1) + "."),
          el("span", { style: { flex: "1", color: "var(--lp-color-text-soft)" } }, q.text),
          el("span", {
            style: {
              fontSize: "var(--lp-font-size-xs)",
              color: "var(--lp-color-secondary)",
              padding: "0.15rem 0.5rem",
              borderRadius: "var(--lp-radius-pill)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              whiteSpace: "nowrap",
            },
          }, typeLabel(q.type)),
          el("button", {
            type: "button",
            onClick: function () { removeQuestion(q.id); },
            style: {
              background: "none",
              border: "none",
              color: "var(--lp-color-danger)",
              cursor: "pointer",
              fontSize: "1rem",
              padding: "0 0.3rem",
              fontFamily: "inherit",
            },
            title: "Remove",
          }, "\u00D7"),
        ]);
        listEl.appendChild(row);
      });

      outputArea.innerHTML = "";
      var copyBtn = btn("Copy Survey as Text", function () {
        var text = questions.map(function (q, i) {
          return (i + 1) + ". [" + typeLabel(q.type) + "] " + q.text;
        }).join("\n");
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = "Copied!";
          setTimeout(function () { copyBtn.textContent = "Copy Survey as Text"; }, 1500);
        });
      });
      outputArea.appendChild(el("div", { style: { marginTop: "0.5rem" } }, [copyBtn]));
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. OPPORTUNITY MAPPER
  // ════════════════════════════════════════════════════════════════════════

  function initOpportunityMapper(root) {
    var opportunities = [];
    var nextId = 1;
    var tableWrap = el("div", { id: "om-table", style: { marginTop: "1rem", overflowX: "auto" } });

    var addRow = el("div", { style: { display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "flex-end" } }, [
      el("div", { style: { flex: "1", minWidth: "160px" } }, [
        inputField("Opportunity", "om-name", "e.g. Partner channel"),
      ]),
      el("div", { style: { minWidth: "90px" } }, [
        selectField("Impact", "om-impact", ["High", "Medium", "Low"]),
      ]),
      el("div", { style: { minWidth: "90px" } }, [
        selectField("Effort", "om-effort", ["Low", "Medium", "High"]),
      ]),
      el("div", { style: { paddingBottom: "0.75rem" } }, [
        btn("Add", function () { addOpportunity(); }, "primary"),
      ]),
    ]);

    root.appendChild(addRow);
    root.appendChild(tableWrap);

    function selectField(labelText, id, options) {
      var sel = el("select", { id: id, style: Object.assign({}, inputStyle(), { padding: "0.5rem 0.5rem" }) });
      options.forEach(function (o) {
        sel.appendChild(el("option", { value: o }, o));
      });
      return el("div", { style: { marginBottom: "0.75rem" } }, [
        el("label", {
          htmlFor: id,
          style: {
            display: "block",
            fontSize: "var(--lp-font-size-xs)",
            color: "var(--lp-color-text-muted)",
            marginBottom: "0.25rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          },
        }, labelText),
        sel,
      ]);
    }

    function priorityScore(impact, effort) {
      var impactMap = { High: 3, Medium: 2, Low: 1 };
      var effortMap = { Low: 3, Medium: 2, High: 1 };
      return impactMap[impact] * effortMap[effort];
    }

    function priorityLabel(score) {
      if (score >= 6) return { text: "High", color: "#22c55e" };
      if (score >= 3) return { text: "Medium", color: "#f59e0b" };
      return { text: "Low", color: "#ef4444" };
    }

    function addOpportunity() {
      var nameInput = document.getElementById("om-name");
      var name = nameInput.value.trim();
      if (!name) return;

      var impact = document.getElementById("om-impact").value;
      var effort = document.getElementById("om-effort").value;
      var score = priorityScore(impact, effort);

      opportunities.push({ id: nextId++, name: name, impact: impact, effort: effort, score: score });
      nameInput.value = "";
      opportunities.sort(function (a, b) { return b.score - a.score; });
      renderTable();
    }

    function removeOpportunity(id) {
      opportunities = opportunities.filter(function (o) { return o.id !== id; });
      renderTable();
    }

    function renderTable() {
      tableWrap.innerHTML = "";
      if (opportunities.length === 0) return;

      var cellStyle = {
        padding: "0.45rem 0.65rem",
        fontSize: "var(--lp-font-size-sm)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
        whiteSpace: "nowrap",
      };

      var headerStyle = Object.assign({}, cellStyle, {
        fontSize: "var(--lp-font-size-xs)",
        color: "var(--lp-color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontWeight: "600",
      });

      var table = el("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          color: "var(--lp-color-text-soft)",
        },
      }, [
        el("thead", null, [
          el("tr", null, [
            el("th", { style: Object.assign({}, headerStyle, { textAlign: "left" }) }, "Opportunity"),
            el("th", { style: headerStyle }, "Impact"),
            el("th", { style: headerStyle }, "Effort"),
            el("th", { style: headerStyle }, "Priority"),
            el("th", { style: headerStyle }, ""),
          ]),
        ]),
        el("tbody", null, opportunities.map(function (opp) {
          var p = priorityLabel(opp.score);
          return el("tr", null, [
            el("td", { style: Object.assign({}, cellStyle, { textAlign: "left", whiteSpace: "normal" }) }, opp.name),
            el("td", { style: Object.assign({}, cellStyle, { textAlign: "center" }) }, opp.impact),
            el("td", { style: Object.assign({}, cellStyle, { textAlign: "center" }) }, opp.effort),
            el("td", { style: Object.assign({}, cellStyle, { textAlign: "center" }) }, [
              el("span", {
                style: {
                  color: p.color,
                  fontWeight: "600",
                  fontSize: "var(--lp-font-size-xs)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--lp-radius-pill)",
                  border: "1px solid " + p.color + "40",
                },
              }, p.text + " (" + opp.score + ")"),
            ]),
            el("td", { style: Object.assign({}, cellStyle, { textAlign: "center" }) }, [
              el("button", {
                type: "button",
                onClick: function () { removeOpportunity(opp.id); },
                style: {
                  background: "none",
                  border: "none",
                  color: "var(--lp-color-danger)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  padding: "0 0.3rem",
                  fontFamily: "inherit",
                },
                title: "Remove",
              }, "\u00D7"),
            ]),
          ]);
        })),
      ]);

      tableWrap.appendChild(table);
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────

  function init() {
    var pb = document.getElementById("pretotype-builder-root");
    var sd = document.getElementById("survey-designer-root");
    var om = document.getElementById("opportunity-mapper-root");

    if (pb) initPretotypeBuilder(pb);
    if (sd) initSurveyDesigner(sd);
    if (om) initOpportunityMapper(om);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
