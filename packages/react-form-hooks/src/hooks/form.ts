import {SubmitHandler, FormMapping, FieldBag, Form} from '../types';
import {useDirty} from './dirty';
import {useReset} from './reset';
import {useSubmit} from './submit';
import {useValidateAll} from './validateAll';
import {useErrorPropagation} from './errorPropagation';

/**
 * A custom hook for managing the state of an entire form. `useForm` wraps up many of the other hooks in this package in one API, and when combined with `useField` and `useList`, allows you to easily build complex forms with smart defaults for common cases.
 *
 * ### Examples
 *
 *```typescript
 * import React from 'react';
 * import {useField, useForm} from '@shopify/react-form-hooks';
 *
 *  function MyComponent() {
 *   const { fields, submit, submitting, dirty, reset, submitErrors } = useForm({
 *     fields: {
 *       title: useField('some default title'),
 *     },
 *     onSubmit: (fieldValues) => {
 *       return {status: "fail", errors: [{message: 'bad form data'}]}
 *     }
 *   });
 *
 *   return (
 *     <form onSubmit={submit}>
 *       {submitting && <p className="loading">loading...</p>}
 *       {submitErrors.length>0 && <p className="error">submitErrors.join(', ')</p>}
 *       <div>
 *         <label for="title">Title</label>
 *         <input
 *           id="title"
 *           name="title"
 *           value={title.value}
 *           onChange={title.onChange}
 *           onBlur={title.onBlur}
 *         />
 *         {title.error && <p className="error">{title.error}</p>}
 *       </div>
 *       <button disabled={!dirty} onClick={reset}>Reset</button>
 *       <button type="submit" disabled={!dirty}>Submit</button>
 *     </form>
 *  );
 *```
 *
 * @param fields - A dictionary of `Field` objects, dictionaries of `Field` objects, and lists of dictionaries of `Field` objects. Generally, you'll want these to be generated by the other hooks in this package, either `useField` or `useList`. This will be returned back out as the `fields` property of the return value.
 *
 * @param onSubmit - An async function to handle submission of the form. If this function returns an object of `{status: 'fail', error: FormError[]}` then the submission is considered a failure. Otherwise, it should return an object with `{status: 'success'}` and the submission will be considered a success. `useForm` will also call all client-side validation methods for the fields passed to it. The `onSubmit` handler will not be called if client validations fails.
 * @returns An object representing the current state of the form, with imperative methods to reset, submit, and validate. Generally, the returned properties correspond 1:1 with the specific hook for their functionality.
 *
 * @remarks
 * **Building your own:** Internally, `useForm` is a convenience wrapper over `useDirty`, `useReset`, `useValidateAll`, `useSubmit`, and `useErrorPropagation`.If you only need some of it's functionality, consider building a custom hook combining a subset of them.
 * **Subforms:** You can have multiple `useForm`s wrapping different subsets of a group of fields. Using this you can submit subsections of the form independently and have all the error and dirty tracking logic "just work" together.
 */
export function useForm<T extends FieldBag>({
  fields,
  onSubmit,
}: {
  fields: T;
  onSubmit?: SubmitHandler<FormMapping<T, 'value'>>;
}): Form<T> {
  const dirty = useDirty(fields);
  const reset = useReset(fields);
  const validate = useValidateAll(fields);
  const [submit, submitting, submitErrors, setSubmitErrors] = useSubmit(
    onSubmit,
    fields,
  );
  useErrorPropagation(fields, submitErrors);

  return {
    fields,
    dirty,
    submitting,
    submitErrors,
    validate,
    submit(event?: React.FormEvent) {
      const clientErrors = validate();
      if (clientErrors.length > 0) {
        setSubmitErrors(clientErrors);
        return;
      }

      submit(event);
    },
    reset() {
      setSubmitErrors([]);
      reset();
    },
  };
}
