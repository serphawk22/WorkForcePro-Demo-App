"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getGlobalSearch, GlobalSearchResponse, SearchResult as ApiSearchResult, getApiBaseUrl } from "@/lib/api";

type SearchEntityType = "Feature" | "Employee" | "Project" | "Task";

interface ExtendedSearchResult {
  id: string | number;
  title: string;
  subtitle?: string;
  type: SearchEntityType;
  icon?: string | null;
  priority_score?: number;
  keywords?: string[];
  route?: string;
  score?: number; // Calculated dynamic match score
}

const STATIC_FEATURES: ExtendedSearchResult[] = [
  {
    id: "feat_1",
    title: "Happy Sheet",
    subtitle: "Reflect and track your happiness",
    type: "Feature",
    keywords: ["happy", "happiness", "reflection", "journal", "sheet"],
    route: "/my-space/happy-sheet",
    priority_score: 100,
    icon: "😊"
  },
  {
    id: "feat_2",
    title: "The Lighthouse",
    subtitle: "Your personal growth and task reflection",
    type: "Feature",
    keywords: ["lighthouse", "personal growth", "reflection", "task sheet"],
    route: "/my-space/task-sheet",
    priority_score: 95,
    icon: "🗼"
  },
  {
    id: "feat_3",
    title: "Weekly Progress",
    subtitle: "View and submit weekly reports",
    type: "Feature",
    keywords: ["weekly", "progress", "report", "update"],
    route: "/weekly-progress",
    priority_score: 90,
    icon: "📈"
  },
  {
    id: "feat_4",
    title: "Learning Canvas",
    subtitle: "Educational resources and paths",
    type: "Feature",
    keywords: ["learning", "canvas", "education", "course"],
    route: "/my-space/learning-canvas",
    priority_score: 90,
    icon: "📚"
  },
  {
    id: "feat_5",
    title: "Visionary Canvas",
    subtitle: "Long term goals and vision",
    type: "Feature",
    keywords: ["vision", "canvas", "goals", "long term"],
    route: "/my-space/visionary-canvas",
    priority_score: 90,
    icon: "🎯"
  },
  {
    id: "feat_6",
    title: "Dashboard",
    subtitle: "Main application overview",
    type: "Feature",
    keywords: ["dashboard", "home", "main"],
    route: "/employee-dashboard",
    priority_score: 85,
    icon: "🏠"
  }
];

function scoreResult(item: ExtendedSearchResult, query: string): number {
  const normQuery = query.toLowerCase().trim();
  const normTitle = item.title.toLowerCase();
  
  let matchScore = 0;
  
  if (normTitle === normQuery) {
    matchScore = 1000;
  } else if (normTitle.includes(normQuery)) {
    matchScore = 500;
  } else {
    // Check keywords
    const hasKeywordExact = item.keywords?.some(k => k.toLowerCase() === normQuery);
    if (hasKeywordExact) {
      matchScore = 400;
    } else {
      const hasKeywordPartial = item.keywords?.some(k => k.toLowerCase().includes(normQuery));
      if (hasKeywordPartial) matchScore = 300;
    }
  }

  // Fuzzy matching for spaces/typos (e.g. "hap sheet")
  // Only apply if we haven't found a strong match yet
  if (matchScore === 0 && normQuery.length > 2) {
    const queryParts = normQuery.split(" ").filter(p => p.length > 0);
    const matchedParts = queryParts.filter(part => 
      normTitle.includes(part) || 
      item.keywords?.some(k => k.toLowerCase().includes(part))
    );
    
    if (matchedParts.length > 0 && matchedParts.length === queryParts.length) {
      matchScore = 200; // All parts matched somewhere
    } else if (matchedParts.length > 0) {
      matchScore = 50 * matchedParts.length; // Partial parts match
    }
  }

  if (matchScore === 0) return 0; // No match
  
  // Advanced exact intent matching ("open happy sheet")
  if (normQuery.startsWith("open ") || normQuery.startsWith("go to ")) {
    const intentTarget = normQuery.replace("open ", "").replace("go to ", "").trim();
    if (normTitle === intentTarget || item.keywords?.some(k => k.toLowerCase() === intentTarget)) {
       matchScore += 2000; // Force immediate top score
    }
  }

  // Combine with base priority score
  const basePriority = item.priority_score || 0;
  return matchScore + basePriority;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [apiResults, setApiResults] = useState<GlobalSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hotkey listener for Cmd/Ctrl + K
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch API results backend
  useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery.trim()) {
        setApiResults(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await getGlobalSearch(debouncedQuery);
        if (res.data) {
          setApiResults(res.data);
        }
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, [debouncedQuery]);

  // Merge & Score ALL RESULTS
  const { allFeatures, allEmployees, allProjects, allTasks, flatResults } = useMemo(() => {
    const scoredMatches: ExtendedSearchResult[] = [];
    const q = debouncedQuery.trim();

    if (!q) {
      return { allFeatures: [], allEmployees: [], allProjects: [], allTasks: [], flatResults: [] };
    }

    // 1. Static Features
    for (const feat of STATIC_FEATURES) {
      const score = scoreResult(feat, q);
      if (score > 0) scoredMatches.push({ ...feat, score });
    }

    // 2. Dynamic API Results
    if (apiResults) {
      if (apiResults.employees) {
        apiResults.employees.forEach(e => {
          const mapped: ExtendedSearchResult = { ...e, type: "Employee", priority_score: 80 };
          const score = scoreResult(mapped, q);
          if (score > 0) scoredMatches.push({ ...mapped, score });
        });
      }
      if (apiResults.projects) {
        apiResults.projects.forEach(p => {
          const mapped: ExtendedSearchResult = { ...p, type: "Project", priority_score: 70 };
          const score = scoreResult(mapped, q);
          if (score > 0) scoredMatches.push({ ...mapped, score });
        });
      }
      if (apiResults.tasks) {
        apiResults.tasks.forEach(t => {
          const mapped: ExtendedSearchResult = { ...t, type: "Task", priority_score: 60 };
          const score = scoreResult(mapped, q);
          if (score > 0) scoredMatches.push({ ...mapped, score });
        });
      }
    }

    // Sort heavily by score descending
    scoredMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Distribute into categories and limit to 5 each for clean UI
    const finalFeatures = scoredMatches.filter(m => m.type === "Feature").slice(0, 5);
    const finalEmployees = scoredMatches.filter(m => m.type === "Employee").slice(0, 5);
    const finalProjects = scoredMatches.filter(m => m.type === "Project").slice(0, 5);
    const finalTasks = scoredMatches.filter(m => m.type === "Task").slice(0, 5);

    // Rebuild flattened array for keyboard up/down navigation
    const flat = [...finalFeatures, ...finalEmployees, ...finalProjects, ...finalTasks];

    // Reset selected index when grouping changes to prevent out of bounds
    setSelectedIndex(0);

    return {
      allFeatures: finalFeatures,
      allEmployees: finalEmployees,
      allProjects: finalProjects,
      allTasks: finalTasks,
      flatResults: flat
    };
  }, [debouncedQuery, apiResults]);

  // Keyboard navigation within suggestions
  useEffect(() => {
    function handleNavKeys(event: KeyboardEvent) {
      if (!isOpen || flatResults.length === 0) return;
      
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatResults.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selectedItem = flatResults[selectedIndex];
        if (selectedItem) {
          handleSelect(selectedItem);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
      }
    }
    const input = inputRef.current;
    if (input) {
      input.addEventListener("keydown", handleNavKeys);
    }
    return () => {
      if (input) {
        input.removeEventListener("keydown", handleNavKeys);
      }
    };
  }, [isOpen, flatResults, selectedIndex]);

  const handleSelect = (item: ExtendedSearchResult) => {
    setIsOpen(false);
    setQuery("");
    
    // Explicit route takes absolute precedence
    if (item.route) {
      router.push(item.route);
      return;
    }

    // Dynamic routing fallback
    switch (item.type) {
      case "Employee":
        router.push(`/admin/users/${item.id}`);
        break;
      case "Project":
        router.push(`/project-management/workspaces/${item.id}`);
        break;
      case "Task":
        router.push(`/project-management/${item.id}`);
        break;
      default:
        break;
    }
  };

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    // We clean exact command intents so we still highlight target words
    const cleanTerm = term.toLowerCase().replace("open ", "").replace("go to ", "");
    if (!cleanTerm) return text;
    
    const parts = text.split(new RegExp(`(${cleanTerm})`, "gi"));
    return parts.map((part, i) => 
      part.toLowerCase() === cleanTerm ? 
      <strong key={i} className="text-primary" style={{color: 'hsl(var(--primary))'}}>{part}</strong> : part
    );
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${getApiBaseUrl()}${url}`;
  };

  return (
    <div className="relative z-50 flex items-center" ref={containerRef}>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 w-10 flex items-center justify-center rounded-full bg-background/50 backdrop-blur-md border border-border/50 text-muted-foreground shadow-sm hover:bg-accent/50 hover:text-foreground transition-all"
        title="Global Search (Cmd+K)"
      >
        <Search size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-[320px] md:w-[450px] bg-card dark:bg-[#1f1b32] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-border/50 flex flex-col overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200">
          {/* Input Header */}
          <div className="flex items-center border-b border-border/50 px-4 py-3 bg-background/50">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-foreground text-sm placeholder:text-muted-foreground"
              placeholder="Search features, employees, tasks..."
              autoFocus
            />
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline-block border border-border/50 rounded px-1.5 py-0.5 bg-background/50 shadow-sm ml-2">ESC</span>
          </div>

          {/* Results Body */}
          {(query.trim() !== "" || isLoading) && (
            <div className="overflow-y-auto max-h-[50vh] divide-y divide-border/50 p-2">
              {isLoading && flatResults.length === 0 && (
                <div className="p-4 flex justify-center items-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Searching...</span>
                </div>
              )}

              {!isLoading && flatResults.length === 0 && query.trim() !== "" && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}

              {flatResults.length > 0 && (
                <div className="py-2">
                  
                  {/* FEATURES */}
                  {allFeatures.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Features & Pages</div>
                      {allFeatures.map((item) => {
                        const idx = flatResults.indexOf(item);
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`px-3 py-2 flex items-center cursor-pointer transition-colors rounded-md ${selectedIndex === idx ? "bg-primary/10" : "hover:bg-accent/50"}`}
                          >
                            <div className="w-7 h-7 mr-3 ml-1 rounded-md bg-accent flex-shrink-0 flex items-center justify-center border border-border shadow-sm text-sm">
                               {item.icon || "⚙️"}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="text-sm font-bold text-foreground truncate">{highlightMatch(item.title, debouncedQuery)}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* EMPLOYEES */}
                  {allEmployees.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Employees</div>
                      {allEmployees.map((item) => {
                        const idx = flatResults.indexOf(item);
                        const imageSrc = getImageUrl(item.icon || null);
                        return (
                          <div 
                            key={`emp-${item.id}`} 
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`px-3 py-2 flex items-center cursor-pointer transition-colors rounded-md ${selectedIndex === idx ? "bg-primary/10" : "hover:bg-accent/50"}`}
                          >
                            <div className="w-7 h-7 mr-3 ml-1 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border shadow-sm">
                               {imageSrc ? (
                                <Image src={imageSrc} alt={item.title} width={28} height={28} className="object-cover w-full h-full" />
                               ) : (
                                <span className="text-[11px] font-medium text-primary">{item.title?.[0]}</span>
                               )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="text-sm font-medium text-foreground truncate">{highlightMatch(item.title, debouncedQuery)}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* PROJECTS */}
                  {allProjects.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Projects</div>
                      {allProjects.map((item) => {
                        const idx = flatResults.indexOf(item);
                        return (
                          <div 
                            key={`proj-${item.id}`} 
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`px-3 py-2 flex items-center cursor-pointer transition-colors rounded-md ${selectedIndex === idx ? "bg-primary/10" : "hover:bg-accent/50"}`}
                          >
                            <div className="w-7 h-7 mr-3 ml-1 rounded-md text-lg flex-shrink-0 flex items-center justify-center bg-accent/50 border border-border shadow-sm">
                               {item.icon || "📁"}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="text-sm font-medium text-foreground truncate">{highlightMatch(item.title, debouncedQuery)}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TASKS */}
                  {allTasks.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Tasks</div>
                      {allTasks.map((item) => {
                        const idx = flatResults.indexOf(item);
                        return (
                          <div 
                            key={`task-${item.id}`} 
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`px-3 py-2 flex items-center cursor-pointer transition-colors rounded-md ${selectedIndex === idx ? "bg-primary/10" : "hover:bg-accent/50"}`}
                          >
                            <div className="w-7 h-7 mr-3 ml-1 rounded-md bg-secondary flex-shrink-0 flex items-center justify-center border border-border">
                               <span className="text-[10px] font-medium text-muted-foreground font-mono">T-{item.id}</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="text-sm font-medium text-foreground truncate">{highlightMatch(item.title, debouncedQuery)}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
