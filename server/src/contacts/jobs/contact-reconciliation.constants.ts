// modules/contacts/jobs/contact-reconciliation.constants.ts
export const CONTACT_RECONCILIATION_QUEUE = 'contact-reconciliation';

export const RECONCILE_CREATE_JOB = 'reconcile-create';
export const RECONCILE_REPLY_JOB = 'reconcile-reply';

export const RECONCILIATION_ATTEMPTS = 5;
export const RECONCILIATION_BACKOFF_MS = 3000;
