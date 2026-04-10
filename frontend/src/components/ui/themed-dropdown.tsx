import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatarSrc?: string | null;
  avatarFallback?: string;
  description?: string;
  disabled?: boolean;
};

type DropdownMenuProps = {
  value: string;
  options: DropdownOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DropdownMenu({
  value,
  options,
  onValueChange,
  placeholder = "Select an option",
  className,
  triggerClassName,
  menuClassName,
  optionClassName,
  disabled,
  align = "start",
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback((nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
  }, [controlledOpen, onOpenChange]);
  const [activeIndex, setActiveIndex] = React.useState(() => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    if (selectedIndex >= 0) return selectedIndex;
    return options.findIndex((option) => !option.disabled);
  });

  const selectedOption = options.find((option) => option.value === value);

  React.useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    if (selectedIndex >= 0) setActiveIndex(selectedIndex);
    else {
      const firstEnabledIndex = options.findIndex((option) => !option.disabled);
      setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0);
    }
  }, [open, options, value]);

  const moveActive = (delta: number) => {
    if (!options.length) return;
    let nextIndex = activeIndex;
    for (let i = 0; i < options.length; i += 1) {
      nextIndex = (nextIndex + delta + options.length) % options.length;
      if (!options[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        break;
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      const nextIndex = options.findIndex((option) => !option.disabled);
      if (nextIndex >= 0) setActiveIndex(nextIndex);
    } else if (event.key === "End") {
      event.preventDefault();
      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (!options[i].disabled) {
          setActiveIndex(i);
          break;
        }
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option && !option.disabled) {
        onValueChange(option.value);
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className={cn(
            "group inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-2xl border border-border/60 px-3.5 py-2 text-left text-sm font-medium text-foreground shadow-[0_8px_32px_rgba(82,43,91,0.12)] backdrop-blur-xl transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
            "bg-gradient-to-br from-background/90 via-background/70 to-primary/5 dark:from-card/80 dark:via-card/70 dark:to-primary/10",
            "hover:border-primary/35 hover:shadow-[0_14px_40px_rgba(82,43,91,0.18)] hover:from-primary/10 hover:to-primary/15",
            className,
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selectedOption?.icon && <span className="shrink-0 text-muted-foreground">{selectedOption.icon}</span>}
            <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>{selectedOption?.label || placeholder}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={10}
        className={cn(
          "w-[var(--radix-popper-anchor-width)] min-w-56 rounded-3xl border border-border/60 bg-background/85 p-2 text-popover-foreground shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl",
          "dark:bg-card/85",
          menuClassName,
        )}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <div className="max-h-72 overflow-auto pr-1">
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  if (option.disabled) return;
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm outline-none transition-all duration-150",
                  "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-[0_0_0_1px_rgba(82,43,91,0.18)]",
                  active && "bg-gradient-to-r from-primary/12 to-primary/6 shadow-[0_0_0_1px_rgba(82,43,91,0.22)]",
                  selected && "text-foreground",
                  option.disabled && "pointer-events-none opacity-50",
                  optionClassName,
                )}
              >
                {option.avatarSrc ? (
                  <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border/60">
                    <AvatarImage src={option.avatarSrc} alt={option.label} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {option.avatarFallback || option.label.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {option.icon || <span className="h-2 w-2 rounded-full bg-current opacity-35" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description && <span className="block truncate text-xs text-muted-foreground">{option.description}</span>}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
