"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  WatchWalletChanges,
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

import { fetchXlmBalance, fundWithFriendbot } from "./account";
import { NETWORK } from "./network";

export type WalletStatus = "checking" | "notInstalled" | "disconnected" | "connected";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  network: string | null;
  /** True when Freighter is pointed at a different network than this app. */
  networkMismatch: boolean;
  /** Native XLM balance in stroops. */
  balance: bigint | null;
  balanceLoading: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  fund: () => Promise<void>;
  /** Signs a transaction envelope and hands back the signed XDR. */
  sign: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet phải nằm trong <WalletProvider>");
  return context;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("checking");
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards a stale balance fetch from overwriting a newer one after the user
  // switches accounts inside Freighter.
  const requestIdRef = useRef(0);

  const loadBalance = useCallback(async (target: string | null) => {
    if (!target) {
      setBalance(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    setBalanceLoading(true);
    try {
      const next = await fetchXlmBalance(target);
      if (requestId === requestIdRef.current) setBalance(next);
    } catch {
      if (requestId === requestIdRef.current) setBalance(null);
    } finally {
      if (requestId === requestIdRef.current) setBalanceLoading(false);
    }
  }, []);

  // Restore an already granted connection without prompting.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const installed = await isConnected();
      if (cancelled) return;
      if (installed.error || !installed.isConnected) {
        setStatus("notInstalled");
        return;
      }

      // getAddress stays empty until the site has been granted access.
      const granted = await getAddress();
      if (cancelled) return;
      if (granted.error || !granted.address) {
        setStatus("disconnected");
        return;
      }

      const net = await getNetwork();
      if (cancelled) return;
      setAddress(granted.address);
      setNetwork(net.network ?? null);
      setNetworkPassphrase(net.networkPassphrase ?? null);
      setStatus("connected");
      void loadBalance(granted.address);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadBalance]);

  // Freighter has no event bus for account or network switches, so poll.
  useEffect(() => {
    if (status !== "connected") return;

    const watcher = new WatchWalletChanges(2000);
    watcher.watch(({ address: next, network: nextNetwork, networkPassphrase: nextPassphrase }) => {
      setAddress((current) => {
        if (next && next !== current) void loadBalance(next);
        return next || current;
      });
      if (nextNetwork) setNetwork(nextNetwork);
      if (nextPassphrase) setNetworkPassphrase(nextPassphrase);
    });

    return () => watcher.stop();
  }, [status, loadBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const installed = await isConnected();
      if (installed.error || !installed.isConnected) {
        setStatus("notInstalled");
        return;
      }

      const granted = await requestAccess();
      if (granted.error) throw new Error(granted.error.message);

      const net = await getNetwork();
      if (net.error) throw new Error(net.error.message);

      setAddress(granted.address);
      setNetwork(net.network ?? null);
      setNetworkPassphrase(net.networkPassphrase ?? null);
      setStatus("connected");
      await loadBalance(granted.address);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setConnecting(false);
    }
  }, [loadBalance]);

  const disconnect = useCallback(() => {
    // Freighter grants access per origin from inside the extension, so the app
    // can only forget the session on its own side.
    setAddress(null);
    setBalance(null);
    setNetwork(null);
    setNetworkPassphrase(null);
    setStatus("disconnected");
  }, []);

  const refreshBalance = useCallback(async () => {
    await loadBalance(address);
  }, [address, loadBalance]);

  const fund = useCallback(async () => {
    if (!address) return;
    await fundWithFriendbot(address);
    await loadBalance(address);
  }, [address, loadBalance]);

  const sign = useCallback(
    async (xdr: string) => {
      if (!address) throw new Error("Chưa kết nối ví");
      const result = await signTransaction(xdr, {
        networkPassphrase: NETWORK.passphrase,
        address,
      });
      if (result.error) throw new Error(result.error.message);
      return result.signedTxXdr;
    },
    [address],
  );

  const value = useMemo<WalletState>(
    () => ({
      status,
      address,
      network,
      networkMismatch:
        status === "connected" &&
        networkPassphrase !== null &&
        networkPassphrase !== NETWORK.passphrase,
      balance,
      balanceLoading,
      connecting,
      error,
      connect,
      disconnect,
      refreshBalance,
      fund,
      sign,
    }),
    [
      status,
      address,
      network,
      networkPassphrase,
      balance,
      balanceLoading,
      connecting,
      error,
      connect,
      disconnect,
      refreshBalance,
      fund,
      sign,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
