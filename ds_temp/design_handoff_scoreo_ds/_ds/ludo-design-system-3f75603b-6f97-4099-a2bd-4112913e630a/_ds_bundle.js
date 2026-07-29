/* @ds-bundle: {"format":4,"namespace":"LudoDesignSystem_3f7560","components":[{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Modal","sourcePath":"components/overlays/Modal.jsx"},{"name":"ScoreCounterApp","sourcePath":"ui_kits/score-counter/ScoreCounterApp.jsx"}],"sourceHashes":{"components/data/Table.jsx":"749d228f9ca4","components/forms/Button.jsx":"f3b22d072f34","components/forms/Input.jsx":"58dccd1b35db","components/overlays/Modal.jsx":"6b9eadf8b78b","ui_kits/score-counter/ScoreCounterApp.jsx":"63aafb936ed4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LudoDesignSystem_3f7560 = window.LudoDesignSystem_3f7560 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/Table.jsx
try { (() => {
/**
 * Table — the scoreboard grid: players as columns, rounds as rows,
 * with a pinned totals row. Also works as a plain list table.
 */
function Table({
  columns = [],
  rows = [],
  footer,
  striped = true,
  dense = false,
  style
}) {
  const cellPad = dense ? "8px 10px" : "12px 14px";
  return /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-sm)",
      background: "var(--surface-card)",
      border: "var(--border-width) solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map((col, i) => /*#__PURE__*/React.createElement("th", {
    key: col.key || i,
    style: {
      textAlign: col.align || (i === 0 ? "left" : "right"),
      padding: cellPad,
      color: "var(--text-muted)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      letterSpacing: "var(--tracking-wide)",
      textTransform: "uppercase",
      background: "var(--surface-sunken)",
      borderBottom: "var(--border-width) solid var(--border-subtle)"
    }
  }, col.header)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, ri) => /*#__PURE__*/React.createElement("tr", {
    key: row.key || ri,
    style: {
      background: striped && ri % 2 === 1 ? "var(--surface-sunken)" : "transparent"
    }
  }, columns.map((col, ci) => /*#__PURE__*/React.createElement("td", {
    key: col.key || ci,
    style: {
      padding: cellPad,
      textAlign: col.align || (ci === 0 ? "left" : "right"),
      color: "var(--text-body)",
      fontVariantNumeric: "tabular-nums",
      borderBottom: ri === rows.length - 1 && !footer ? "none" : "var(--border-width) solid var(--border-subtle)"
    }
  }, col.render ? col.render(row) : row[col.key]))))), footer && /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, columns.map((col, i) => /*#__PURE__*/React.createElement("td", {
    key: col.key || i,
    style: {
      padding: cellPad,
      textAlign: col.align || (i === 0 ? "left" : "right"),
      fontWeight: "var(--weight-bold)",
      fontVariantNumeric: "tabular-nums",
      color: "var(--text-heading)",
      background: "var(--surface-raised)",
      borderTop: "var(--border-width) solid var(--border-default)"
    }
  }, footer.render ? footer.render(col, i) : i === 0 ? footer.label : footer[col.key])))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    h: "36px",
    pad: "0 12px",
    font: "var(--text-sm)",
    gap: "6px"
  },
  md: {
    h: "var(--tap-target)",
    pad: "0 18px",
    font: "var(--text-md)",
    gap: "8px"
  },
  lg: {
    h: "52px",
    pad: "0 24px",
    font: "var(--text-lg)",
    gap: "10px"
  }
};
function variantStyle(variant) {
  switch (variant) {
    case "primary":
      return {
        background: "var(--color-primary)",
        color: "var(--text-on-accent)",
        border: "1px solid transparent"
      };
    case "secondary":
      return {
        background: "var(--surface-raised)",
        color: "var(--text-body)",
        border: "1px solid var(--border-default)"
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--text-body)",
        border: "1px solid transparent"
      };
    case "danger":
      return {
        background: "var(--color-danger)",
        color: "var(--text-on-danger)",
        border: "1px solid transparent"
      };
    default:
      return {};
  }
}

/**
 * Button — the single interactive-action primitive. Covers primary/
 * secondary/ghost/danger intents and an icon-only square mode used for
 * the +/- score steppers.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  iconOnly = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const vs = variantStyle(variant);
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  let background = vs.background;
  if (!disabled && variant !== "ghost" && variant !== "secondary") {
    if (active) background = variant === "primary" ? "var(--color-primary-active)" : background;else if (hover) background = variant === "primary" ? "var(--color-primary-hover)" : background;
  }
  if (!disabled && variant === "secondary" && hover) background = "var(--surface-hover)";
  if (!disabled && variant === "ghost" && hover) background = "var(--surface-hover)";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      height: s.h,
      width: iconOnly ? s.h : undefined,
      padding: iconOnly ? 0 : s.pad,
      fontFamily: "var(--font-ui)",
      fontSize: s.font,
      fontWeight: "var(--weight-semibold)",
      borderRadius: iconOnly ? "var(--radius-pill)" : "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
      transform: active && !disabled ? "scale(0.97)" : "scale(1)",
      ...vs,
      background,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text and number fields. Number inputs render as a stepper
 * (−, value, +) sized for one-thumb tapping on a scoreboard; pass
 * `stepper={false}` for a plain numeric field.
 */
function Input({
  type = "text",
  label,
  value,
  onChange,
  placeholder,
  step = 1,
  min,
  max,
  stepper = true,
  size = "md",
  disabled = false,
  style,
  id,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const autoId = React.useId();
  const inputId = id || autoId;
  const height = size === "lg" ? "56px" : size === "sm" ? "36px" : "var(--tap-target)";
  const fontSize = size === "lg" ? "var(--text-xl)" : size === "sm" ? "var(--text-sm)" : "var(--text-md)";
  const baseFieldStyle = {
    height,
    fontFamily: type === "number" ? "var(--font-score)" : "var(--font-ui)",
    fontSize,
    fontWeight: type === "number" ? "var(--weight-semibold)" : "var(--weight-regular)",
    color: disabled ? "var(--text-disabled)" : "var(--text-body)",
    background: "var(--surface-card)",
    border: `var(--border-width) solid ${focused ? "var(--border-focus)" : "var(--border-default)"}`,
    borderRadius: "var(--radius-md)",
    outline: focused ? `2px solid color-mix(in srgb, var(--color-primary) 30%, transparent)` : "none",
    outlineOffset: "1px",
    transition: "border-color var(--duration-fast) var(--ease-standard)",
    cursor: disabled ? "not-allowed" : "text"
  };
  function clamp(n) {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }
  const wrapper = /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-muted)"
    }
  }, label), type === "number" && stepper ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: size,
    iconOnly: true,
    disabled: disabled || min !== undefined && Number(value) <= min,
    "aria-label": "Decrease",
    onClick: () => onChange && onChange(clamp(Number(value || 0) - step))
  }, "\u2212"), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: "number",
    inputMode: "numeric",
    value: value,
    min: min,
    max: max,
    step: step,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: e => onChange && onChange(clamp(Number(e.target.value))),
    style: {
      ...baseFieldStyle,
      width: "72px",
      textAlign: "center",
      padding: "0 4px",
      MozAppearance: "textfield"
    }
  }, rest)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: size,
    iconOnly: true,
    disabled: disabled || max !== undefined && Number(value) >= max,
    "aria-label": "Increase",
    onClick: () => onChange && onChange(clamp(Number(value || 0) + step))
  }, "+")) : /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    placeholder: placeholder,
    min: min,
    max: max,
    step: type === "number" ? step : undefined,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: e => onChange && onChange(type === "number" ? Number(e.target.value) : e.target.value),
    style: {
      ...baseFieldStyle,
      width: "100%",
      padding: "0 var(--space-3)"
    }
  }, rest)));
  return wrapper;
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Modal.jsx
try { (() => {
/**
 * Modal — centered dialog with scrim, used for adding/editing players,
 * confirming a reset, or showing rules. Closes on scrim click or Escape.
 */
function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  width = "420px"
}) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && onClose) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "var(--scrim)",
      backdropFilter: "blur(2px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-4)",
      zIndex: 100,
      animation: "ds-modal-scrim var(--duration-normal) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === "string" ? title : undefined,
    onClick: e => e.stopPropagation(),
    style: {
      width,
      maxWidth: "100%",
      maxHeight: "85vh",
      overflowY: "auto",
      background: "var(--surface-card)",
      border: "var(--border-width) solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      animation: "ds-modal-pop var(--duration-normal) var(--ease-standard)"
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-5)",
      borderBottom: "var(--border-width) solid var(--border-subtle)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-ui)",
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Close",
    onClick: onClose,
    style: {
      width: "32px",
      height: "32px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      background: "transparent",
      color: "var(--text-muted)",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      fontSize: "var(--text-lg)",
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-5)",
      borderTop: "var(--border-width) solid var(--border-subtle)",
      display: "flex",
      justifyContent: "flex-end",
      gap: "var(--space-3)"
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, `
        @keyframes ds-modal-scrim { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ds-modal-pop { from { opacity: 0; transform: scale(0.96) translateY(4px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Modal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/score-counter/ScoreCounterApp.jsx
try { (() => {
const ACCENTS = ["mauve", "blue", "green", "peach", "red", "teal"];
const THEMES = ["latte", "frappe", "macchiato", "mocha"];
function ScoreCounterApp() {
  const [theme, setTheme] = React.useState("latte");
  const [accent, setAccent] = React.useState("mauve");
  const [players, setPlayers] = React.useState([{
    id: 1,
    name: "Amir",
    rounds: [12, 5, 18]
  }, {
    id: 2,
    name: "Léa",
    rounds: [8, 14, 10]
  }, {
    id: 3,
    name: "Sam",
    rounds: [15, 9, 7]
  }]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-accent", accent);
  }, [theme, accent]);
  const roundCount = Math.max(...players.map(p => p.rounds.length));
  const columns = [{
    key: "round",
    header: "Round"
  }, ...players.map(p => ({
    key: `p${p.id}`,
    header: p.name
  }))];
  const rows = Array.from({
    length: roundCount
  }, (_, ri) => {
    const row = {
      round: ri + 1
    };
    players.forEach(p => {
      row[`p${p.id}`] = p.rounds[ri] ?? "—";
    });
    return row;
  });
  const totals = {
    label: "Total"
  };
  players.forEach(p => {
    totals[`p${p.id}`] = p.rounds.reduce((a, b) => a + b, 0);
  });
  function setCurrent(playerId, value) {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const rounds = [...p.rounds];
      rounds[rounds.length - 1] = Math.max(0, Number(value) || 0);
      return {
        ...p,
        rounds
      };
    }));
  }
  function addPlayer() {
    if (!newName.trim()) return;
    setPlayers(prev => [...prev, {
      id: Date.now(),
      name: newName.trim(),
      rounds: [0]
    }]);
    setNewName("");
    setAddOpen(false);
  }
  function nextRound() {
    setPlayers(prev => prev.map(p => ({
      ...p,
      rounds: [...p.rounds, 0]
    })));
  }
  function resetGame() {
    setPlayers(prev => prev.map(p => ({
      ...p,
      rounds: [0]
    })));
    setResetOpen(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "var(--surface-app)",
      fontFamily: "var(--font-ui)",
      padding: "var(--space-6) var(--space-4)",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: "var(--container-max)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-heading)"
    }
  }, "Belote \u2014 Round ", roundCount), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, players.length, " players")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    onClick: () => setResetOpen(true)
  }, "Reset"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    onClick: () => setAddOpen(true)
  }, "+ Player"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    onClick: nextRound
  }, "Next round"))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-sunken)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-heading)"
    }
  }, "Enter round ", roundCount, " scores"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)"
    }
  }, "This round \u2192 running total")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      flexWrap: "wrap"
    }
  }, players.map(p => {
    const total = p.rounds.reduce((a, b) => a + b, 0);
    const current = p.rounds[p.rounds.length - 1] || 0;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        flex: "1 1 200px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-md)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-heading)"
      }
    }, p.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)"
      }
    }, "total", " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-score)",
        fontVariantNumeric: "tabular-nums",
        fontSize: "var(--text-lg)",
        fontWeight: "var(--weight-bold)",
        color: "var(--color-primary)"
      }
    }, total))), /*#__PURE__*/React.createElement(__ds_scope.Input, {
      type: "number",
      min: 0,
      value: current,
      onChange: v => setCurrent(p.id, v)
    }));
  }))), /*#__PURE__*/React.createElement(__ds_scope.Table, {
    columns: columns,
    rows: rows,
    footer: totals
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      gap: "var(--space-4)",
      flexWrap: "wrap",
      alignItems: "center",
      paddingTop: "var(--space-2)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)"
    }
  }, "Theme"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "6px"
    }
  }, THEMES.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTheme(t),
    style: {
      border: t === theme ? "2px solid var(--color-primary)" : "1px solid var(--border-default)",
      background: "transparent",
      color: "var(--text-body)",
      borderRadius: "var(--radius-pill)",
      padding: "4px 10px",
      fontSize: "var(--text-xs)",
      cursor: "pointer",
      textTransform: "capitalize"
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)"
    }
  }, "Accent"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "6px"
    }
  }, ACCENTS.map(a => /*#__PURE__*/React.createElement("button", {
    key: a,
    "aria-label": a,
    onClick: () => setAccent(a),
    style: {
      width: "22px",
      height: "22px",
      borderRadius: "var(--radius-pill)",
      border: a === accent ? "2px solid var(--text-heading)" : "1px solid var(--border-default)",
      background: `var(--ctp-${a})`,
      cursor: "pointer"
    }
  }))))), /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: addOpen,
    title: "Add player",
    onClose: () => setAddOpen(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "secondary",
      onClick: () => setAddOpen(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "primary",
      onClick: addPlayer
    }, "Add"))
  }, /*#__PURE__*/React.createElement(__ds_scope.Input, {
    label: "Name",
    value: newName,
    onChange: setNewName,
    placeholder: "Player name"
  })), /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: resetOpen,
    title: "Reset scoreboard?",
    onClose: () => setResetOpen(false),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "secondary",
      onClick: () => setResetOpen(false)
    }, "Cancel"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "danger",
      onClick: resetGame
    }, "Reset"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-body)",
      fontSize: "var(--text-md)"
    }
  }, "This clears every player back to round 1, score 0. This can't be undone.")));
}
Object.assign(__ds_scope, { ScoreCounterApp });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/score-counter/ScoreCounterApp.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.ScoreCounterApp = __ds_scope.ScoreCounterApp;

})();
