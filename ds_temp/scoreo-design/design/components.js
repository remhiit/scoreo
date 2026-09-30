// Scoreo — base components (Button, Input, Modal). Origin: Ludo Design System, detached 2026-09-30.
// Plain React (global), no build step. Exposed as window.Scoreo.*
(() => {
// Button
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

// Input
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
  }, /*#__PURE__*/React.createElement(Button, {
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
  }, rest)), /*#__PURE__*/React.createElement(Button, {
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

// Modal
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

window.Scoreo = Object.assign(window.Scoreo || {}, { Button, Input, Modal });
})();
