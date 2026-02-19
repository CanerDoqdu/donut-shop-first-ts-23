'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ZodSchema, ZodIssue } from 'zod';

type FieldErrors = Record<string, string | undefined>;

interface UseFormValidationReturn<T> {
  /** Per-field error messages (field name → first error, or undefined) */
  fieldErrors: FieldErrors;
  /** Validate a single field on blur / change */
  validateField: (field: keyof T, value: unknown) => void;
  /** Validate all fields at once — returns true if valid */
  validateAll: (data: unknown) => boolean;
  /** Clear a single field's error (e.g. on focus) */
  clearField: (field: keyof T) => void;
  /** Clear all field errors */
  clearAll: () => void;
  /** Whether any field has an error */
  hasErrors: boolean;
}

/**
 * Hook for real-time client-side Zod validation.
 *
 * Usage:
 * ```ts
 * const { fieldErrors, validateField, validateAll } = useFormValidation(signInSchema);
 * <input onBlur={(e) => validateField('email', e.target.value)} />
 * {fieldErrors.email && <span>{fieldErrors.email}</span>}
 * ```
 */
export function useFormValidation<T>(schema: ZodSchema<T>): UseFormValidationReturn<T> {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const schemaRef = useRef(schema);
  useEffect(() => { schemaRef.current = schema; }, [schema]);

  const validateField = useCallback((field: keyof T, value: unknown) => {
    // Validate a partial object containing just this field
    const partial = { [field]: value } as unknown;
    const result = schemaRef.current.safeParse(partial);

    if (result.success) {
      // This field is OK — clear its error
      setFieldErrors((prev) => {
        if (!prev[field as string]) return prev;
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    } else {
      // Find error for this specific field
      const issue = result.error.issues.find(
        (i: ZodIssue) => i.path[0] === field
      );
      setFieldErrors((prev) => ({
        ...prev,
        [field as string]: issue?.message,
      }));
    }
  }, []);

  const validateAll = useCallback((data: unknown): boolean => {
    const result = schemaRef.current.safeParse(data);
    if (result.success) {
      setFieldErrors({});
      return true;
    }
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '_root');
      if (!errors[key]) errors[key] = issue.message;
    }
    setFieldErrors(errors);
    return false;
  }, []);

  const clearField = useCallback((field: keyof T) => {
    setFieldErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setFieldErrors({}), []);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return { fieldErrors, validateField, validateAll, clearField, clearAll, hasErrors };
}
