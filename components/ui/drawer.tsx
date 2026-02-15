"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode
} from "react";

type DrawerContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext(): DrawerContextValue {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("Drawer components must be used within <Drawer>");
  }
  return context;
}

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Drawer({ open, onOpenChange, children }: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  const value = useMemo(
    () => ({
      open,
      setOpen: onOpenChange
    }),
    [onOpenChange, open]
  );

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

type DrawerTriggerProps = {
  asChild?: boolean;
  children: ReactNode;
};

export function DrawerTrigger({ asChild = false, children }: DrawerTriggerProps) {
  const { setOpen } = useDrawerContext();

  if (asChild && isValidElement(children)) {
    const element = children as ReactElement<{ onClick?: () => void }>;
    return cloneElement(element, {
      onClick: () => {
        element.props.onClick?.();
        setOpen(true);
      }
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

type DrawerContentProps = HTMLAttributes<HTMLDivElement> & {
  side?: "left" | "right";
};

export function DrawerContent({ side = "right", className, children, ...props }: DrawerContentProps) {
  const { open, setOpen } = useDrawerContext();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70"
        onClick={() => setOpen(false)}
        aria-label="Close drawer"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute top-0 h-full w-[92vw] max-w-md overflow-y-auto border-slate-700 bg-slate-900 p-4 shadow-2xl transition-transform duration-200 ease-out",
          side === "left"
            ? cn("left-0 border-r", entered ? "translate-x-0" : "-translate-x-full")
            : cn("right-0 border-l", entered ? "translate-x-0" : "translate-x-full"),
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-xl font-black tracking-tight text-cyan-100", className)} {...props} />;
}

export function DrawerDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-300", className)} {...props} />;
}

type DrawerCloseProps = {
  asChild?: boolean;
  children: ReactNode;
};

export function DrawerClose({ asChild = false, children }: DrawerCloseProps) {
  const { setOpen } = useDrawerContext();

  if (asChild && isValidElement(children)) {
    const element = children as ReactElement<{ onClick?: () => void }>;
    return cloneElement(element, {
      onClick: () => {
        element.props.onClick?.();
        setOpen(false);
      }
    });
  }

  return (
    <button type="button" onClick={() => setOpen(false)}>
      {children}
    </button>
  );
}
