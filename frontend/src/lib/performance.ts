/**
 * Frontend Performance Optimization Utilities
 * 
 * This module provides utilities for optimizing React component rendering:
 * - React.memo for preventing unnecessary re-renders
 * - useMemo for expensive calculations
 * - Debounced handlers for high-frequency events
 * - Virtualization helpers for large lists
 */

import { useMemo, useCallback, useState, useEffect } from "react";

/**
 * Hook for debouncing values - reduces excessive state updates
 * Useful for: search inputs, filter changes, sorting
 * 
 * Example:
 *   const [searchInput, setSearchInput] = useState("");
 *   const debouncedSearch = useDebouncedValue(searchInput, 300);
 *   // debouncedSearch updates 300ms after user stops typing
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls - limits execution frequency
 * Useful for: scroll events, resize events, rapid API calls
 * 
 * Example:
 *   const handleScroll = useThrottledCallback(() => {
 *     loadMoreTasks();
 *   }, 500); // Max 2 calls per second
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  throttleMs: number = 300
): T {
  const [lastRun, setLastRun] = useState(Date.now());

  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastRun > throttleMs) {
        setLastRun(now);
        callback(...args);
      }
    },
    [callback, throttleMs, lastRun]
  ) as T;
}

/**
 * Hook for memoizing API responses
 * Prevents refetching data when component re-renders
 * 
 * Example:
 *   const tasks = useMemoizedAsync(fetchTasks, [userId], {
 *     ttl: 300000, // Cache for 5 minutes
 *   });
 */
export function useMemoizedAsync<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[],
  options?: {
    ttl?: number; // Time to live in ms
    onError?: (error: Error) => void;
  }
): T | null {
  const [data, setData] = useState<T | null>(null);
  const [cacheTime, setCacheTime] = useState<number>(0);
  const now = Date.now();
  const isStale = now - cacheTime > (options?.ttl || 300000);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isStale && data !== null) return;

    fetchFn()
      .then((result) => {
        setData(result);
        setCacheTime(Date.now());
      })
      .catch((error) => {
        options?.onError?.(error);
      });
  }, [isStale, ...dependencies]);

  return data;
}

/**
 * Configuration for optimized task list rendering
 * Implements these best practices:
 * - Pagination to limit DOM nodes
 * - Memoization to prevent unnecessary re-renders
 * - Debounced filtering/searching
 * - Lazy-loading of heavy components
 */
export const TASK_LIST_OPTIMIZATION_CONFIG = {
  // Pagination settings
  pageSize: 50, // Items per page
  preloadPages: 1, // Preload next page
  virtualScrollThreshold: 100, // Use virtual scroll for 100+ items

  // Memoization settings
  memoizeThreshold: 10, // Memoize components rendering 10+ children
  usePureComponent: true,

  // Debouncing settings
  searchDebounceMs: 300,
  filterDebounceMs: 300,
  sortDebounceMs: 200,

  // Comment loading
  lazyLoadComments: true,
  commentsPageSize: 10,

  // Subtask loading
  lazyLoadSubtasks: true,
  subtasksPageSize: 5,

  // Caching
  cacheTaskListMs: 60000, // 1 minute cache
  cacheTaskDetailMs: 300000, // 5 minute cache
};

/**
 * Pagination hook for large lists
 * Handles offset-based pagination with preloading
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = TASK_LIST_OPTIMIZATION_CONFIG.pageSize
) {
  const [currentPage, setCurrentPage] = useState(0);

  const paginatedItems = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, currentPage, pageSize]);

  const hasMore = (currentPage + 1) * pageSize < items.length;

  const loadNext = useCallback(() => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore]);

  const loadPrevious = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const reset = useCallback(() => {
    setCurrentPage(0);
  }, []);

  return {
    items: paginatedItems,
    currentPage,
    hasMore,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
    loadNext,
    loadPrevious,
    reset,
    goto: setCurrentPage,
  };
}

/**
 * Intersection Observer hook for lazy loading
 * Triggers callback when element enters viewport
 * 
 * Example:
 *   const ref = useIntersectionObserver(() => {
 *     loadMoreComments();
 *   });
 *   return <div ref={ref}>Load more</div>
 */
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
): React.RefObject<HTMLDivElement> {
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
}

/**
 * Hook to track which task items are visible in viewport
 * Useful for selective rendering or analytics
 */
export function useVisibleItems(containerRef: React.RefObject<HTMLElement>) {
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const newVisible = new Set(visibleIds);
        entries.forEach((entry) => {
          const id = parseInt((entry.target as HTMLElement).dataset.taskId || "-1");
          if (entry.isIntersecting) {
            newVisible.add(id);
          } else {
            newVisible.delete(id);
          }
        });
        setVisibleIds(newVisible);
      },
      { root: containerRef.current, threshold: 0 }
    );

    // Observe all task items
    const items = containerRef.current?.querySelectorAll("[data-task-id]");
    items?.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [containerRef, visibleIds]);

  return visibleIds;
}

/**
 * Performance monitoring hook
 * Tracks component render time and re-render frequency
 */
export function useRenderMetrics(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTimes, setRenderTimes] = useState<number[]>([]);
  const startTimeRef = React.useRef(Date.now());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRenderCount((prev) => prev + 1);
    const renderTime = Date.now() - startTimeRef.current;
    setRenderTimes((prev) => [...prev, renderTime].slice(-10)); // Keep last 10
    startTimeRef.current = Date.now();
  });

  const avgRenderTime = useMemo(() => {
    if (renderTimes.length === 0) return 0;
    return renderTimes.reduce((a, b) => a + b) / renderTimes.length;
  }, [renderTimes]);

  // Log if render time exceeds 50ms (performance warning threshold)
  useEffect(() => {
    if (avgRenderTime > 50) {
      console.warn(
        `[${componentName}] Slow render: ${avgRenderTime.toFixed(2)}ms (avg)`
      );
    }
  }, [avgRenderTime, componentName]);

  return {
    renderCount,
    avgRenderTime,
    lastRenderTime: renderTimes[renderTimes.length - 1] || 0,
  };
}
