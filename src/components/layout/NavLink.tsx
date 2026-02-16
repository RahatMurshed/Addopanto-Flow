import { NavLink as RouterNavLink, NavLinkProps, useNavigate } from "react-router-dom";
import { forwardRef, useCallback, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { useNavigationBlocker } from "@/contexts/NavigationBlockerContext";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onClick, ...props }, ref) => {
    const { checkNavigation, isBlocking, setPendingNavigation } = useNavigationBlocker();
    const navigate = useNavigate();

    const handleClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        const targetPath = typeof to === "string" ? to : to.pathname || "";
        
        if (isBlocking && checkNavigation(targetPath)) {
          e.preventDefault();
          setPendingNavigation(targetPath);
          return;
        }

        onClick?.(e);
      },
      [to, isBlocking, checkNavigation, setPendingNavigation, onClick]
    );

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onClick={handleClick}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
