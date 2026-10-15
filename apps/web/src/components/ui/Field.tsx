/** Campos con etiquetas, marca de obligatoriedad y errores locales asociados al control. */
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type FieldHelp = { label: string; hint?: string; error?: string };
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Traduce restricciones HTML a mensajes breves sin duplicar reglas de negocio del dominio. */
function validationError(control: Control): string {
  const validity = control.validity;
  if (validity.valueMissing) return 'Completa este campo.';
  if (validity.typeMismatch) return 'Escribe un correo válido.';
  if (validity.rangeUnderflow && control instanceof HTMLInputElement)
    return `El mínimo es ${control.min}.`;
  if (validity.rangeOverflow && control instanceof HTMLInputElement)
    return `El máximo es ${control.max}.`;
  return 'Revisa el valor de este campo.';
}

/** Lleva foco al primer control inválido; los mensajes locales reemplazan popups del navegador. */
function focusFirstInvalid(control: Control): void {
  const first = control.form?.querySelector<Control>(
    'input:invalid, select:invalid, textarea:invalid',
  );
  (first ?? control).focus();
}

function FieldLabel({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id}>
      {label}
      {required && (
        <span className="required-mark" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  );
}

export function InputField({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldHelp) {
  const id = useId();
  const [invalid, setInvalid] = useState('');
  const message = error || invalid;
  return (
    <div className="field">
      <FieldLabel id={id} label={label} required={props.required && !props.disabled} />
      <input
        id={id}
        {...props}
        aria-invalid={Boolean(message)}
        aria-describedby={
          [hint && `${id}-hint`, message && `${id}-error`].filter(Boolean).join(' ') || undefined
        }
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(validationError(event.currentTarget));
          focusFirstInvalid(event.currentTarget);
          props.onInvalid?.(event);
        }}
        onInput={(event) => {
          setInvalid('');
          props.onInput?.(event);
        }}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {message && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {message}
        </small>
      )}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldHelp) {
  const id = useId();
  const [invalid, setInvalid] = useState('');
  const message = error || invalid;
  return (
    <div className="field">
      <FieldLabel id={id} label={label} required={props.required && !props.disabled} />
      <select
        id={id}
        {...props}
        aria-invalid={Boolean(message)}
        aria-describedby={
          [hint && `${id}-hint`, message && `${id}-error`].filter(Boolean).join(' ') || undefined
        }
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(validationError(event.currentTarget));
          focusFirstInvalid(event.currentTarget);
          props.onInvalid?.(event);
        }}
        onChange={(event) => {
          setInvalid('');
          props.onChange?.(event);
        }}
      >
        {children}
      </select>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {message && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {message}
        </small>
      )}
    </div>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldHelp) {
  const id = useId();
  const [invalid, setInvalid] = useState('');
  const message = error || invalid;
  return (
    <div className="field">
      <FieldLabel id={id} label={label} required={props.required && !props.disabled} />
      <textarea
        id={id}
        rows={3}
        {...props}
        aria-invalid={Boolean(message)}
        aria-describedby={
          [hint && `${id}-hint`, message && `${id}-error`].filter(Boolean).join(' ') || undefined
        }
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(validationError(event.currentTarget));
          focusFirstInvalid(event.currentTarget);
          props.onInvalid?.(event);
        }}
        onInput={(event) => {
          setInvalid('');
          props.onInput?.(event);
        }}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {message && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {message}
        </small>
      )}
    </div>
  );
}
