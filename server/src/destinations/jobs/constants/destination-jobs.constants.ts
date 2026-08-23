export const DESTINATION_JOBS = {
  PRELOAD_CACHE: 'preload-cache',
  CLEANUP_IMAGES: 'cleanup-orphaned-images',
  UPDATE_STATS: 'update-statistics',
} as const;

export const DESTINATION_QUEUES = {
  CACHE: 'destination-cache',
  CLEANUP: 'destination-cleanup',
  STATS: 'destination-stats',
} as const;

export type DestinationJobName =
  (typeof DESTINATION_JOBS)[keyof typeof DESTINATION_JOBS];
export type DestinationQueueName =
  (typeof DESTINATION_QUEUES)[keyof typeof DESTINATION_QUEUES];
