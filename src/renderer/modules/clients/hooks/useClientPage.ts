import { useEffect, useRef, useState } from "react";
import type { ClientNotesAction } from "../../../../shared/payload-contracts/client.contract";
import type { Client, ID } from "../../../../shared/models/client.model";
import { useClientSearch } from "../hooks/useClientSearch";
import { clientApi } from "../client.api";
import { formatIsoDate } from "../../../shared/utils/formatters";

interface UseClientPageParams {
  isActive?: boolean;
  searchFirstName: string;
  searchLastName: string;
  searchDateOfBirth?: string;
  searchRequestKey?: number;
  activeClient?: Client | null;
  onClientSelected?: (client: Client | null) => void;
}

const matchesSearch = (
  client: Client,
  normalizedFirst: string,
  normalizedLast: string,
  normalizedDob: string,
) => {
  const clientFirst = client.first_name?.trim().toLowerCase() ?? "";
  const clientLast = client.last_name?.trim().toLowerCase() ?? "";
  const clientDob = formatIsoDate(client.date_of_birth);

  const firstMatches =
    !normalizedFirst || clientFirst.startsWith(normalizedFirst);
  const lastMatches = !normalizedLast || clientLast.startsWith(normalizedLast);
  const dobMatches = !normalizedDob || clientDob === normalizedDob;

  return firstMatches && lastMatches && dobMatches;
};

export const useClientPage = ({
  isActive = true,
  searchFirstName,
  searchLastName,
  searchDateOfBirth = "",
  searchRequestKey = 0,
  activeClient,
  onClientSelected,
}: UseClientPageParams) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    activeClient ?? null,
  );
  const { results, loading, error, hasCompletedSearch, completedQueryKey } =
    useClientSearch(
      searchFirstName,
      searchLastName,
      searchDateOfBirth,
      searchRequestKey,
      isActive,
    );
  const [displayResults, setDisplayResults] = useState<Client[]>([]);
  const [additionalClients, setAdditionalClients] = useState<Client[]>([]);
  const [clientOverrides, setClientOverrides] = useState<
    Record<number, Client>
  >({});
  const [deletedClientNumbers, setDeletedClientNumbers] = useState<number[]>(
    [],
  );
  const [createdClient, setCreatedClient] = useState<Client | null>(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const lastNoResultPromptKeyRef = useRef<string>("");

  useEffect(() => {
    setAdditionalClients([]);
  }, [searchRequestKey]);

  useEffect(() => {
    const activeClientNumber = activeClient?.client_number;

    if (!activeClientNumber) {
      return;
    }

    setAdditionalClients((prev) => {
      const existingIndex = prev.findIndex(
        (client) => client.client_number === activeClientNumber,
      );

      if (existingIndex >= 0) {
        return prev.map((client, index) =>
          index === existingIndex ? activeClient : client,
        );
      }

      if (
        results.some((client) => client.client_number === activeClientNumber)
      ) {
        return prev;
      }

      return [activeClient, ...prev];
    });
  }, [activeClient, results]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (activeClient) {
      setSelectedClient(
        activeClient.client_number
          ? (clientOverrides[activeClient.client_number] ?? activeClient)
          : activeClient,
      );
    }
  }, [activeClient, clientOverrides, isActive]);

  useEffect(() => {
    setCreatedClient(null);
    setSearchDialogOpen(false);
  }, [searchFirstName, searchLastName, searchDateOfBirth, searchRequestKey]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const normalizedFirst = searchFirstName.trim().toLowerCase();
    const normalizedLast = searchLastName.trim().toLowerCase();
    const normalizedDob = searchDateOfBirth.trim();
    const queryKey = `${normalizedFirst}|${normalizedLast}|${normalizedDob}`;
    const hasQuery = Boolean(
      normalizedFirst || normalizedLast || normalizedDob,
    );

    if (createdClient?.client_number) {
      setDisplayResults([createdClient]);
      setSelectedClient(createdClient);
      lastNoResultPromptKeyRef.current = "";
      return;
    }

    const getClientOverride = (clientNumber?: number) => {
      if (!clientNumber) {
        return null;
      }

      if (clientOverrides[clientNumber]) {
        return clientOverrides[clientNumber];
      }

      if (activeClient?.client_number === clientNumber) {
        return activeClient;
      }

      return null;
    };

    const mergedResults = results
      .map((client) => {
        const clientNumber = client.client_number;
        if (!clientNumber) {
          return client;
        }
        return getClientOverride(clientNumber) ?? client;
      })
      .filter(
        (client) =>
          !client.client_number ||
          !deletedClientNumbers.includes(client.client_number),
      );
    const mergedClientNumbers = new Set(
      mergedResults
        .map((client) => client.client_number)
        .filter((clientNumber): clientNumber is number =>
          Boolean(clientNumber),
        ),
    );
    const overrideResults = hasQuery
      ? [
          ...Object.values(clientOverrides),
          ...[activeClient].filter((client): client is Client =>
            Boolean(client?.client_number),
          ),
        ].filter((client, index, clients) => {
          const clientNumber = client.client_number;
          if (!clientNumber || deletedClientNumbers.includes(clientNumber)) {
            return false;
          }

          if (
            mergedClientNumbers.has(clientNumber) ||
            clients.findIndex(
              (current) => current.client_number === clientNumber,
            ) !== index
          ) {
            return false;
          }

          return matchesSearch(
            client,
            normalizedFirst,
            normalizedLast,
            normalizedDob,
          );
        })
      : [];
    const additionalResults = additionalClients
      .filter(
        (client) =>
          !client.client_number ||
          !deletedClientNumbers.includes(client.client_number),
      )
      .map((client) =>
        client.client_number
          ? (clientOverrides[client.client_number] ?? client)
          : client,
      );
    const combinedResults = [
      ...additionalResults,
      ...overrideResults,
      ...mergedResults,
    ].filter(
      (client, index, clients) =>
        !client.client_number ||
        clients.findIndex(
          (current) => current.client_number === client.client_number,
        ) === index,
    );
    const rowsWithActiveClient =
      activeClient?.client_number &&
      !combinedResults.some(
        (client) => client.client_number === activeClient.client_number,
      )
        ? [
            clientOverrides[activeClient.client_number] ?? activeClient,
            ...combinedResults,
          ]
        : combinedResults;

    setDisplayResults(rowsWithActiveClient);

    if (!hasQuery) {
      setSelectedClient(activeClient ?? null);
      return;
    }

    if (error) {
      setSelectedClient(null);
      lastNoResultPromptKeyRef.current = "";
      return;
    }

    if (loading || !hasCompletedSearch || completedQueryKey !== queryKey) {
      return;
    }

    if (rowsWithActiveClient.length === 0) {
      setSelectedClient(null);
      const searchReturnedNoClients = results.length === 0;
      if (
        searchReturnedNoClients &&
        lastNoResultPromptKeyRef.current !== queryKey
      ) {
        setSearchDialogOpen(true);
        lastNoResultPromptKeyRef.current = queryKey;
        return;
      }
      lastNoResultPromptKeyRef.current = "";
      return;
    }

    lastNoResultPromptKeyRef.current = "";
    const preferredClientNumber = activeClient?.client_number;
    const matchedClient = preferredClientNumber
      ? (rowsWithActiveClient.find(
          (client) => client.client_number === preferredClientNumber,
        ) ?? null)
      : null;
    setSelectedClient((prev) => {
      if (prev?.client_number) {
        const mergedSelected = rowsWithActiveClient.find(
          (client) => client.client_number === prev.client_number,
        );
        if (mergedSelected) {
          return mergedSelected;
        }
      }
      return matchedClient ?? rowsWithActiveClient[0];
    });
  }, [
    createdClient,
    results,
    clientOverrides,
    additionalClients,
    deletedClientNumbers,
    searchFirstName,
    searchLastName,
    searchDateOfBirth,
    loading,
    hasCompletedSearch,
    completedQueryKey,
    error,
    activeClient,
    isActive,
  ]);

  useEffect(() => {
    onClientSelected?.(selectedClient);
  }, [selectedClient, onClientSelected]);

  const handleClientCreated = (newClient: Client) => {
    if (newClient.client_number) {
      setDeletedClientNumbers((prev) =>
        prev.filter((clientNumber) => clientNumber !== newClient.client_number),
      );
      setClientOverrides((prev) => ({
        ...prev,
        [newClient.client_number as number]: newClient,
      }));
    }
    setCreatedClient(newClient);
    setDisplayResults([newClient]);
    setSelectedClient(newClient);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    if (updatedClient.client_number) {
      setDeletedClientNumbers((prev) =>
        prev.filter(
          (clientNumber) => clientNumber !== updatedClient.client_number,
        ),
      );
      setClientOverrides((prev) => ({
        ...prev,
        [updatedClient.client_number as number]: updatedClient,
      }));
    }

    if (createdClient?.client_number === updatedClient.client_number) {
      setCreatedClient(updatedClient);
    }

    setDisplayResults((prev) => {
      const exists = prev.some(
        (client) => client.client_number === updatedClient.client_number,
      );
      if (!exists) {
        return [updatedClient, ...prev];
      }

      return prev.map((client) =>
        client.client_number === updatedClient.client_number
          ? updatedClient
          : client,
      );
    });
    setSelectedClient(updatedClient);
  };

  const handleSaveClientNotes = async ({
    client,
    notes,
    employeePassword,
    notesAction,
  }: {
    client: Client;
    identifications: ID[];
    notes: string;
    employeePassword: string;
    notesAction: ClientNotesAction;
  }) => {
    if (!client.client_number) throw new Error("Select a client to update.");
    const updatedClient = await clientApi.updateClient({
      client: {
        client_number: client.client_number,
        notes,
      },
      notes_action: notesAction,
      employee_password: employeePassword,
    });

    handleClientUpdated(updatedClient);
    return updatedClient;
  };

  return {
    state: {
      selectedClient,
      displayResults,
      loading,
      error,
      searchDialogOpen,
    },
    actions: {
      setSelectedClient,
      handleClientCreated,
      handleClientUpdated,
      handleSaveClientNotes,
      closeSearchDialog: () => setSearchDialogOpen(false),
    },
  };
};
