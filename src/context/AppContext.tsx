import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BluetoothManager } from '../modules/BluetoothManager';
import { DeviceInfoService } from '../modules/DeviceInfoService';
import { FirmwareManager } from '../modules/FirmwareManager';
import { Notifications } from '../modules/NotificationSystem';
import type {
  ConnectionState,
  DeviceInfo,
  FirmwareFileRecord,
  FlashHistoryEntry,
  GattServiceReport,
  ScooterModelId,
  TabId,
} from '../types';

interface AppValue {
  tab: TabId;
  setTab: (t: TabId) => void;
  connection: ConnectionState;
  connect: (modelId: ScooterModelId | null) => void;
  disconnect: () => void;
  deviceInfo: DeviceInfo | null;
  services: GattServiceReport[];
  infoLoading: boolean;
  refreshDeviceInfo: () => Promise<void>;
  /** Last model + device the user connected, shown on cards even after disconnect. */
  lastConnected: { modelId: ScooterModelId | null; deviceName: string; at: number } | null;
  files: FirmwareFileRecord[];
  history: FlashHistoryEntry[];
  libraryLoading: boolean;
  libraryError: string | null;
  reloadLibrary: () => Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [connection, setConnection] = useState<ConnectionState>(BluetoothManager.getState());
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [services, setServices] = useState<GattServiceReport[]>([]);
  const [infoLoading, setInfoLoading] = useState(false);
  const [lastConnected, setLastConnected] = useState<AppValue['lastConnected']>(null);

  const [files, setFiles] = useState<FirmwareFileRecord[]>([]);
  const [history, setHistory] = useState<FlashHistoryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const signalRef = useRef<number | null>(null);
  const batteryUnsub = useRef<(() => void) | null>(null);

  const refreshDeviceInfo = useCallback(async () => {
    const server = BluetoothManager.getServer();
    if (!server) return;
    setInfoLoading(true);
    try {
      const { info, services: svc } = await DeviceInfoService.read(server, signalRef.current);
      setDeviceInfo(info);
      setServices(svc);
    } catch (err) {
      Notifications.error('Could not read device information', (err as Error).message);
    } finally {
      setInfoLoading(false);
    }
  }, []);

  const reloadLibrary = useCallback(async () => {
    try {
      const [f, h] = await Promise.all([FirmwareManager.list(), FirmwareManager.history()]);
      setFiles(f);
      setHistory(h);
      setLibraryError(null);
    } catch (err) {
      setLibraryError((err as Error).message);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadLibrary();
  }, [reloadLibrary]);

  useEffect(() => {
    const stopBattery = () => {
      batteryUnsub.current?.();
      batteryUnsub.current = null;
    };

    const unsubState = BluetoothManager.subscribe(setConnection);

    const unsubSignal = BluetoothManager.onSignal((dbm) => {
      signalRef.current = dbm;
      setDeviceInfo((prev) => (prev ? { ...prev, signalDbm: { status: 'ok', value: dbm } } : prev));
    });

    const unsubEvents = BluetoothManager.onEvent((ev) => {
      switch (ev.type) {
        case 'connected': {
          Notifications.success('Scooter connected successfully', ev.deviceName);
          const st = BluetoothManager.getState();
          setLastConnected({ modelId: st.selectedModelId, deviceName: ev.deviceName, at: st.connectedAt ?? Date.now() });
          void (async () => {
            await refreshDeviceInfo();
            const server = BluetoothManager.getServer();
            if (!server) return;
            stopBattery();
            batteryUnsub.current = await DeviceInfoService.watchBattery(server, (pct) =>
              setDeviceInfo((prev) => (prev ? { ...prev, batteryLevel: { status: 'ok', value: pct } } : prev)),
            );
          })();
          break;
        }
        case 'disconnected':
          stopBattery();
          signalRef.current = null;
          setDeviceInfo(null);
          setServices([]);
          if (ev.unexpected) Notifications.warning('Scooter disconnected', `${ev.deviceName} dropped the connection.`);
          else Notifications.info('Scooter disconnected', ev.deviceName);
          break;
        case 'cancelled':
          Notifications.info('No device selected', 'The Bluetooth chooser was closed.');
          break;
        case 'error':
          Notifications.error('Connection failed', ev.message);
          break;
      }
    });

    return () => {
      unsubState();
      unsubSignal();
      unsubEvents();
      stopBattery();
    };
  }, [refreshDeviceInfo]);

  const connect = useCallback((modelId: ScooterModelId | null) => {
    // Called synchronously from a click handler: requestDevice() needs the user gesture.
    void BluetoothManager.connect(modelId);
  }, []);

  const disconnect = useCallback(() => {
    void BluetoothManager.disconnect();
  }, []);

  return (
    <AppContext.Provider
      value={{
        tab,
        setTab,
        connection,
        connect,
        disconnect,
        deviceInfo,
        services,
        infoLoading,
        refreshDeviceInfo,
        lastConnected,
        files,
        history,
        libraryLoading,
        libraryError,
        reloadLibrary,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
