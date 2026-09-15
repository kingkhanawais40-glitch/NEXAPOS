import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const DEFAULT_SETTINGS = {
  store_name: "General Store",
  store_phone: "",
  store_address: "",
  invoice_footer: "Thank you for shopping with us!",
  currency: "PKR",
  default_tax: 0,
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await api.get("/settings");
      if (response.data?.data) {
        setSettings(response.data.data);
      }
    } catch (error) {
      // Fall back to defaults silently — settings are non-critical
      // for rendering the rest of the app.
      console.error(
        error.response?.data?.message || "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [user, fetchSettings]);

  const currency = settings.currency || "PKR";

  const formatCurrency = (amount) => {
    const value = Number(amount || 0);
    return `${currency} ${value.toLocaleString("en-PK", {
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        currency,
        formatCurrency,
        loading,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
