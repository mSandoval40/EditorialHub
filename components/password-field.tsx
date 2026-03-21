"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useId, useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  style?: CSSProperties;
  buttonAriaLabelShow?: string;
  buttonAriaLabelHide?: string;
};

export function PasswordField({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  style,
  buttonAriaLabelShow = "Mostrar contrasena",
  buttonAriaLabelHide = "Ocultar contrasena",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const iconId = useId();

  return (
    <div style={wrapperStyle}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{ ...inputStyle, ...style }}
      />
      <button
        type="button"
        aria-label={visible ? buttonAriaLabelHide : buttonAriaLabelShow}
        onClick={() => setVisible((current) => !current)}
        style={toggleButtonStyle}
      >
        {visible ? <EyeOffIcon iconId={iconId} /> : <EyeIcon iconId={iconId} />}
      </button>
    </div>
  );
}

function EyeIcon({ iconId }: { iconId: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={iconStyle}>
      <path
        d="M2.5 12C4.7 8.2 8 6.2 12 6.2S19.3 8.2 21.5 12C19.3 15.8 16 17.8 12 17.8S4.7 15.8 2.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <title id={iconId}>Mostrar contrasena</title>
    </svg>
  );
}

function EyeOffIcon({ iconId }: { iconId: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={iconStyle}>
      <path
        d="M2.5 12C4.7 8.2 8 6.2 12 6.2C14 6.2 15.8 6.7 17.4 7.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M21.5 12C20.2 14.2 18.6 15.8 16.6 16.8C15.2 17.5 13.7 17.8 12 17.8C8 17.8 4.7 15.8 2.5 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 4L20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <title id={iconId}>Ocultar contrasena</title>
    </svg>
  );
}

const wrapperStyle: CSSProperties = {
  position: "relative",
  width: "100%",
};

const inputStyle: CSSProperties = {
  width: "100%",
  paddingRight: "46px",
  boxSizing: "border-box",
};

const toggleButtonStyle: CSSProperties = {
  position: "absolute",
  right: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  backgroundColor: "transparent",
  color: "#4f5b66",
  cursor: "pointer",
  padding: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const iconStyle: CSSProperties = {
  width: "18px",
  height: "18px",
  display: "block",
};
