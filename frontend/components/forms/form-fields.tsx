"use client";

import { useField, type FieldMetaProps } from "formik";
import { useState, type ReactNode } from "react";

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-white/75 px-4 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--line-strong)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]";

const invalidInputClassName =
  "border-red-300 focus:border-red-500 focus:ring-red-100";

type BaseFieldProps = {
  name: string;
  label: ReactNode;
  id?: string;
  labelAccessory?: ReactNode;
};

type TextFieldProps = BaseFieldProps & {
  autoComplete?: string;
  placeholder?: string;
  type?: "email" | "text";
};

type PasswordFieldProps = BaseFieldProps & {
  autoComplete?: string;
  placeholder?: string;
};

type CheckboxFieldProps = {
  name: string;
  label: ReactNode;
  align?: "center" | "start";
};

function fieldIdFor(name: string, id?: string) {
  return id ?? `${name}-field`;
}

function FieldMessage({
  fieldId,
  meta,
}: {
  fieldId: string;
  meta: FieldMetaProps<unknown>;
}) {
  if (!meta.touched || !meta.error) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="text-xs font-medium text-red-700"
      id={`${fieldId}-error`}
      role="alert"
    >
      {meta.error}
    </p>
  );
}

function fieldDescribedBy(fieldId: string, meta: FieldMetaProps<unknown>) {
  return meta.touched && meta.error ? `${fieldId}-error` : undefined;
}

function FieldLabel({ label, labelAccessory, fieldId }: BaseFieldProps & { fieldId: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label
        className="block text-sm font-semibold text-[var(--ink)]"
        htmlFor={fieldId}
      >
        {label}
      </label>
      {labelAccessory}
    </div>
  );
}

export function TextField({
  autoComplete,
  id,
  label,
  labelAccessory,
  name,
  placeholder,
  type = "text",
}: TextFieldProps) {
  const [field, meta] = useField<string>(name);
  const fieldId = fieldIdFor(name, id);
  const hasError = Boolean(meta.touched && meta.error);

  return (
    <div className="space-y-2">
      <FieldLabel
        fieldId={fieldId}
        label={label}
        labelAccessory={labelAccessory}
        name={name}
      />
      <input
        {...field}
        aria-describedby={fieldDescribedBy(fieldId, meta)}
        aria-invalid={hasError}
        autoComplete={autoComplete}
        className={`${inputClassName} ${hasError ? invalidInputClassName : ""}`}
        id={fieldId}
        placeholder={placeholder}
        type={type}
      />
      <FieldMessage fieldId={fieldId} meta={meta} />
    </div>
  );
}

export function PasswordField({
  autoComplete,
  id,
  label,
  labelAccessory,
  name,
  placeholder,
}: PasswordFieldProps) {
  const [field, meta] = useField<string>(name);
  const [showPassword, setShowPassword] = useState(false);
  const fieldId = fieldIdFor(name, id);
  const hasError = Boolean(meta.touched && meta.error);

  return (
    <div className="space-y-2">
      <FieldLabel
        fieldId={fieldId}
        label={label}
        labelAccessory={labelAccessory}
        name={name}
      />
      <div className="relative">
        <input
          {...field}
          aria-describedby={fieldDescribedBy(fieldId, meta)}
          aria-invalid={hasError}
          autoComplete={autoComplete}
          className={`${inputClassName} pr-20 ${hasError ? invalidInputClassName : ""}`}
          id={fieldId}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          className="absolute inset-y-1 right-1 rounded-xl px-3 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
          onClick={() => setShowPassword((current) => !current)}
          type="button"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      <FieldMessage fieldId={fieldId} meta={meta} />
    </div>
  );
}

export function CheckboxField({
  align = "center",
  label,
  name,
}: CheckboxFieldProps) {
  const [field, meta] = useField<boolean>({ name, type: "checkbox" });
  const fieldId = fieldIdFor(name);
  const hasError = Boolean(meta.touched && meta.error);

  return (
    <div className="space-y-2">
      <label
        className={`flex gap-3 text-sm leading-6 text-[var(--muted)] ${align === "start" ? "items-start" : "items-center"}`}
        htmlFor={fieldId}
      >
        <input
          aria-describedby={fieldDescribedBy(fieldId, meta)}
          aria-invalid={hasError}
          checked={Boolean(field.value)}
          className={`${align === "start" ? "mt-1 " : ""}size-4 shrink-0 rounded border-[var(--line-strong)] accent-[var(--accent)] focus:ring-[var(--accent)]`}
          id={fieldId}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          type="checkbox"
        />
        <span>{label}</span>
      </label>
      <FieldMessage fieldId={fieldId} meta={meta} />
    </div>
  );
}
