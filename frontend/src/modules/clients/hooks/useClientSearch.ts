import { useEffect, useRef, useState } from "react";
import type { Client } from "../../../../../shared/models/client.model";
import { clientApi } from "../client.api";

export const useClientSearch = (
  firstName: string,
  lastName: string,
  dateOfBirth = "",
  searchRequestKey = 0,
  isActive = true,
) => {
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [completedQueryKey, setCompletedQueryKey] = useState("");
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      latestRequestIdRef.current += 1;
      setLoading(false);
      return;
    }

    const normalizedFirst = firstName.trim().toLowerCase();
    const normalizedLast = lastName.trim().toLowerCase();
    const normalizedDob = dateOfBirth.trim();
    const queryKey = `${normalizedFirst}|${normalizedLast}|${normalizedDob}`;
    const hasQuery = Boolean(
      normalizedFirst || normalizedLast || normalizedDob,
    );

    if (!hasQuery) {
      setResults([]);
      setLoading(false);
      setError("");
      setHasCompletedSearch(false);
      setCompletedQueryKey("");
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const run = async () => {
      setResults([]);
      setError("");
      setHasCompletedSearch(false);
      setLoading(true);
      try {
        const data = normalizedDob
          ? await clientApi.searchClientsByDob(normalizedDob)
          : await clientApi.searchClients(normalizedFirst, normalizedLast);
        if (latestRequestIdRef.current !== requestId) return;
        setResults(data);
        setCompletedQueryKey(queryKey);
      } catch (err) {
        if (latestRequestIdRef.current !== requestId) return;
        console.error("Failed to search clients", err);
        setError(
          err instanceof Error ? err.message : "Unable to search clients.",
        );
      } finally {
        if (latestRequestIdRef.current !== requestId) return;
        setLoading(false);
        setHasCompletedSearch(true);
      }
    };
    void run();
  }, [firstName, lastName, dateOfBirth, searchRequestKey, isActive]);

  return { results, loading, error, hasCompletedSearch, completedQueryKey };
};
