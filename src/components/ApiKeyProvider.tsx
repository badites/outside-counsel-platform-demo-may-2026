"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Key, X, ExternalLink } from "lucide-react";

type ApiKeyContextValue = {
  getHeaders: () => Record<string, string>;
  needsKey: boolean;
  showKeyPrompt: () => void;
};

const ApiKeyContext = createContext<ApiKeyContextValue>({
  getHeaders: () => ({}),
  needsKey: false,
  showKeyPrompt: () => {},
});

export function useApiKey() {
  return useContext(ApiKeyContext);
}

const STORAGE_KEY = "ocp_anthropic_api_key";

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [userKey, setUserKey] = useState<string>("");
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUserKey(stored);

    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setHasServerKey(d.hasServerKey))
      .catch(() => setHasServerKey(false));
  }, []);

  const needsKey = hasServerKey === false && !userKey;

  const getHeaders = useCallback((): Record<string, string> => {
    if (userKey) return { "x-anthropic-key": userKey };
    return {};
  }, [userKey]);

  const showKeyPrompt = useCallback(() => setShowModal(true), []);

  function handleSave() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setUserKey(trimmed);
    setKeyInput("");
    setShowModal(false);
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY);
    setUserKey("");
  }

  return (
    <ApiKeyContext.Provider value={{ getHeaders, needsKey, showKeyPrompt }}>
      {children}

      {needsKey && !showModal && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-lg transition-colors hover:bg-amber-100"
          >
            <Key size={16} />
            Enter your Anthropic API key to use AI features
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Key size={20} className="text-teal-600" />
                Anthropic API Key
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              To use AI features (search assistant, RFP assistant), enter your
              Anthropic API key. Your key is stored locally in this browser only
              and never saved on the server.
            </p>

            <div className="mb-4">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="sk-ant-api03-..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between">
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
              >
                Get an API key
                <ExternalLink size={12} />
              </a>
              <div className="flex gap-2">
                {userKey && (
                  <button
                    onClick={handleClear}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove saved key
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!keyInput.trim()}
                  className="rounded-md bg-teal-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ApiKeyContext.Provider>
  );
}
