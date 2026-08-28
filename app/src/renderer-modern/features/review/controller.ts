import type {
  ResearchReviewIssue,
  ResearchReviewQueue,
  ResearchReviewTask,
  ReviewIssueId,
  ReviewSeverity
} from './model';

export interface ReviewWorkbenchFilters {
  issue: ReviewIssueId | '';
  zone: string;
  severity: ReviewSeverity | '';
  search: string;
}

export interface ReviewWorkbenchSnapshot {
  queue: Readonly<ResearchReviewQueue>;
  visibleTasks: readonly Readonly<ResearchReviewTask>[];
  selectedTaskId: string;
  currentTask: Readonly<ResearchReviewTask> | null;
  filters: Readonly<ReviewWorkbenchFilters>;
}

export interface ReviewWorkbenchController {
  readonly version: 'review-workbench-controller-v1';
  readonly queue: Readonly<ResearchReviewQueue>;
  readonly visibleTasks: readonly Readonly<ResearchReviewTask>[];
  readonly selectedTaskId: string;
  readonly currentTask: Readonly<ResearchReviewTask> | null;
  readonly filters: Readonly<ReviewWorkbenchFilters>;
  replace(queue: ResearchReviewQueue, searchAliases?: unknown): Readonly<ReviewWorkbenchSnapshot>;
  setFilters(filters: Partial<ReviewWorkbenchFilters>): Readonly<ReviewWorkbenchSnapshot>;
  resetFilters(): Readonly<ReviewWorkbenchSnapshot>;
  select(taskId: string): Readonly<ResearchReviewTask> | null;
  navigate(direction: number): Readonly<ResearchReviewTask> | null;
  inspect(): Readonly<ReviewWorkbenchSnapshot>;
}

const EMPTY_FILTERS: Readonly<ReviewWorkbenchFilters> = Object.freeze({
  issue: '',
  zone: '',
  severity: '',
  search: ''
});

const EMPTY_QUEUE: Readonly<ResearchReviewQueue> = Object.freeze({
  totalPoints: 0,
  readyPoints: 0,
  pendingPoints: 0,
  openIssueCount: 0,
  progressPercent: 0,
  tasks: Object.freeze([]),
  issueCounts: Object.freeze({}) as Readonly<Record<ReviewIssueId, number>>
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function cleanText(value: unknown): string {
  const text = String(value ?? '').trim();
  return ['null', 'undefined'].includes(text.toLocaleLowerCase()) ? '' : text;
}

function freezeIssue(issue: ResearchReviewIssue): Readonly<ResearchReviewIssue> {
  return Object.freeze({ ...issue });
}

function freezeTask(task: ResearchReviewTask): Readonly<ResearchReviewTask> {
  return Object.freeze({
    ...task,
    issues: Object.freeze(task.issues.map(freezeIssue))
  });
}

function freezeQueue(input: ResearchReviewQueue): Readonly<ResearchReviewQueue> {
  return Object.freeze({
    totalPoints: Number(input.totalPoints) || 0,
    readyPoints: Number(input.readyPoints) || 0,
    pendingPoints: Number(input.pendingPoints) || 0,
    openIssueCount: Number(input.openIssueCount) || 0,
    progressPercent: Number(input.progressPercent) || 0,
    tasks: Object.freeze(input.tasks.map(task => freezeTask(task as ResearchReviewTask))),
    issueCounts: Object.freeze({ ...input.issueCounts })
  });
}

function normalizeAliases(value: unknown): Readonly<Record<string, string>> {
  const aliases = Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, alias]) => [key, cleanText(alias).toLocaleLowerCase()])
  );
  return Object.freeze(aliases);
}

function nextFilters(
  current: Readonly<ReviewWorkbenchFilters>,
  patchValue: Partial<ReviewWorkbenchFilters>
): Readonly<ReviewWorkbenchFilters> {
  const patch = asRecord(patchValue);
  const severityValue = Object.prototype.hasOwnProperty.call(patch, 'severity')
    ? cleanText(patch.severity)
    : current.severity;
  const severity = ['', 'high', 'medium', 'low'].includes(severityValue) ? (severityValue as ReviewSeverity | '') : '';
  return Object.freeze({
    issue: (Object.prototype.hasOwnProperty.call(patch, 'issue') ? cleanText(patch.issue) : current.issue) as
      | ReviewIssueId
      | '',
    zone: Object.prototype.hasOwnProperty.call(patch, 'zone') ? cleanText(patch.zone) : current.zone,
    severity,
    search: (Object.prototype.hasOwnProperty.call(patch, 'search')
      ? cleanText(patch.search)
      : current.search
    ).toLocaleLowerCase()
  });
}

export function createReviewWorkbenchController(): ReviewWorkbenchController {
  let queue = EMPTY_QUEUE;
  let visibleTasks: readonly Readonly<ResearchReviewTask>[] = Object.freeze([]);
  let selectedTaskId = '';
  let filters = EMPTY_FILTERS;
  let searchAliases: Readonly<Record<string, string>> = Object.freeze({});

  const currentTask = (): Readonly<ResearchReviewTask> | null =>
    visibleTasks.find(task => task.id === selectedTaskId) || null;

  const inspect = (): Readonly<ReviewWorkbenchSnapshot> =>
    Object.freeze({
      queue,
      visibleTasks,
      selectedTaskId,
      currentTask: currentTask(),
      filters
    });

  const applyFilters = () => {
    visibleTasks = Object.freeze(
      queue.tasks.filter(task => {
        if (filters.issue && !task.issues.some(issue => issue.id === filters.issue)) return false;
        if (filters.zone && (task.zoneInternalId || '__unassigned__') !== filters.zone) return false;
        if (filters.severity && task.severity !== filters.severity) return false;
        if (filters.search) {
          const searchText = `${task.searchText} ${searchAliases[task.id] || ''}`.toLocaleLowerCase();
          if (!searchText.includes(filters.search)) return false;
        }
        return true;
      })
    );
    if (!visibleTasks.some(task => task.id === selectedTaskId)) {
      selectedTaskId = visibleTasks[0]?.id || '';
    }
  };

  const controller: ReviewWorkbenchController = {
    version: 'review-workbench-controller-v1',
    get queue() {
      return queue;
    },
    get visibleTasks() {
      return visibleTasks;
    },
    get selectedTaskId() {
      return selectedTaskId;
    },
    get currentTask() {
      return currentTask();
    },
    get filters() {
      return filters;
    },
    replace(nextQueue, aliases = {}) {
      queue = freezeQueue(nextQueue);
      searchAliases = normalizeAliases(aliases);
      applyFilters();
      return inspect();
    },
    setFilters(patch) {
      filters = nextFilters(filters, patch);
      applyFilters();
      return inspect();
    },
    resetFilters() {
      filters = EMPTY_FILTERS;
      applyFilters();
      return inspect();
    },
    select(taskId) {
      const task = visibleTasks.find(item => item.id === cleanText(taskId)) || null;
      if (task) selectedTaskId = task.id;
      return task;
    },
    navigate(direction) {
      if (!visibleTasks.length) return null;
      const currentIndex = Math.max(
        0,
        visibleTasks.findIndex(task => task.id === selectedTaskId)
      );
      const numericDirection = Number(direction);
      const offset = Number.isFinite(numericDirection) ? Math.trunc(numericDirection) : 0;
      const nextIndex = (currentIndex + (offset % visibleTasks.length) + visibleTasks.length) % visibleTasks.length;
      selectedTaskId = visibleTasks[nextIndex].id;
      return visibleTasks[nextIndex];
    },
    inspect
  };

  return Object.freeze(controller);
}
