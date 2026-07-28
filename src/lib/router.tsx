import React, {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type LocationValue = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
};

type NavigateTarget =
  | string
  | { pathname?: string; search?: string; hash?: string };

type NavigateOptions = { replace?: boolean; state?: unknown };
type Navigate = (target: NavigateTarget | number, options?: NavigateOptions) => void;

const RouterContext = createContext<{
  location: LocationValue;
  navigate: Navigate;
} | null>(null);

function readLocation(): LocationValue {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state,
  };
}

function targetUrl(target: NavigateTarget, current: LocationValue) {
  if (typeof target === "string") return target;
  return `${target.pathname ?? current.pathname}${target.search ?? ""}${target.hash ?? ""}`;
}

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback<Navigate>((target, options) => {
    if (typeof target === "number") {
      if (target === 0) window.location.reload();
      else window.history.go(target);
      return;
    }

    const current = readLocation();
    const url = targetUrl(target, current);
    if (options?.replace) {
      window.history.replaceState(options.state ?? null, "", url);
    } else {
      window.history.pushState(options?.state ?? null, "", url);
    }
    setLocation(readLocation());
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter() {
  const router = useContext(RouterContext);
  if (!router) throw new Error("Router hooks must be used inside BrowserRouter");
  return router;
}

export function useLocation() {
  return useRouter().location;
}

export function useNavigate() {
  return useRouter().navigate;
}

export function useSearchParams() {
  const { location, navigate } = useRouter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const setParams = useCallback(
    (next: URLSearchParams, options?: NavigateOptions) => {
      const search = next.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : "" },
        options,
      );
    },
    [location.pathname, navigate],
  );
  return [params, setParams] as const;
}

export function Link({
  to,
  onClick,
  children,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: NavigateTarget;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const href = targetUrl(to, location);

  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank"
        ) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function Route(_props: { path: string; element: React.ReactNode }) {
  return null;
}

export function Routes({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const routes = React.Children.toArray(children).filter(isValidElement) as Array<
    React.ReactElement<{ path: string; element: React.ReactNode }>
  >;
  const match = routes.find((route) => route.props.path === pathname);
  return <>{match?.props.element ?? null}</>;
}
