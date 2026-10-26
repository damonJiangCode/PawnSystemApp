type RendererUrlInput = {
  window?: string;
  screen?: string;
  params?: Record<string, string | number | boolean | undefined>;
};

const rendererBaseUrl = "http://localhost:5173";

export const buildRendererUrl = ({
  window,
  screen,
  params = {},
}: RendererUrlInput = {}) => {
  const searchParams = new URLSearchParams();

  if (window) {
    searchParams.set("window", window);
  }

  if (screen) {
    searchParams.set("screen", screen);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${rendererBaseUrl}?${query}` : rendererBaseUrl;
};
