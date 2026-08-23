// modules/contacts/jobs/contact-jobs.constants.ts
export const CONTACT_CLEANUP_QUEUE = 'contact-cleanup';
export const CONTACT_REMINDER_QUEUE = 'contact-reminder';

export const DELETE_OLD_MESSAGES_JOB = 'delete-old-messages';
export const REMIND_ADMIN_JOB = 'remind-admin';

export const CLEANUP_LAST_RUN_KEY = 'contact:cleanup:last-run';
export const CLEANUP_LOCK_TTL_SECONDS = 7 * 24 * 60 * 60;

export const MESSAGE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
export const REMINDER_THRESHOLD_MS = 24 * 60 * 60 * 1000;
