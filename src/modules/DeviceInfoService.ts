import type { DeviceInfo, GattServiceReport, Reading } from '../types';

/**
 * DeviceInfoService — reads ONLY standard Bluetooth SIG services:
 *   - Battery Service (battery_level)
 *   - Device Information Service (manufacturer, model, serial, hardware/firmware/software revision)
 *
 * No vendor-specific services, no invented UUIDs, no writes. Anything that cannot be read is
 * reported as "unavailable" or "not_supported" with the reason, never as a fake value.
 *
 * Battery VOLTAGE has no standard characteristic, so it stays `not_supported` until a verified,
 * device-specific adapter is added.
 */

const decoder = new TextDecoder('utf-8');

function reasonFromError(err: unknown): { status: 'unavailable' | 'not_supported'; reason: string } {
  const e = err as DOMException;
  switch (e?.name) {
    case 'NotFoundError':
      return { status: 'not_supported', reason: 'Not exposed by this device.' };
    case 'SecurityError':
      return { status: 'unavailable', reason: 'Blocked by the browser (Web Bluetooth blocklist or permissions).' };
    case 'NotSupportedError':
      return { status: 'not_supported', reason: 'Operation not supported by this device.' };
    case 'NetworkError':
      return { status: 'unavailable', reason: 'Read failed: the device disconnected or did not respond.' };
    default:
      return { status: 'unavailable', reason: e?.message || 'Read failed.' };
  }
}

async function getService(server: BluetoothRemoteGATTServer, service: BluetoothServiceUUID) {
  return server.getPrimaryService(service);
}

async function readString(
  server: BluetoothRemoteGATTServer,
  characteristic: BluetoothCharacteristicUUID,
): Promise<Reading<string>> {
  try {
    const service = await getService(server, 'device_information');
    const ch = await service.getCharacteristic(characteristic);
    const value = await ch.readValue();
    const text = decoder.decode(value.buffer).replace(/\0+$/g, '').trim();
    if (!text) return { status: 'unavailable', reason: 'Device returned an empty value.' };
    return { status: 'ok', value: text };
  } catch (err) {
    return reasonFromError(err);
  }
}

async function readBatteryLevel(server: BluetoothRemoteGATTServer): Promise<Reading<number>> {
  try {
    const service = await getService(server, 'battery_service');
    const ch = await service.getCharacteristic('battery_level');
    const value = await ch.readValue();
    const pct = value.getUint8(0);
    if (pct > 100) return { status: 'unavailable', reason: `Device reported an invalid value (${pct}).` };
    return { status: 'ok', value: pct };
  } catch (err) {
    return reasonFromError(err);
  }
}

export const DeviceInfoService = {
  async read(
    server: BluetoothRemoteGATTServer,
    signalDbm: number | null,
  ): Promise<{ info: DeviceInfo; services: GattServiceReport[] }> {
    // Sequential reads: many BLE stacks fail with concurrent GATT operations.
    const manufacturer = await readString(server, 'manufacturer_name_string');
    const modelNumber = await readString(server, 'model_number_string');
    const serialNumber = await readString(server, 'serial_number_string');
    const hardwareRevision = await readString(server, 'hardware_revision_string');
    const firmwareRevision = await readString(server, 'firmware_revision_string');
    const softwareRevision = await readString(server, 'software_revision_string');
    const batteryLevel = await readBatteryLevel(server);

    const signal: Reading<number> =
      signalDbm !== null
        ? { status: 'ok', value: signalDbm }
        : {
            status: 'unavailable',
            reason: 'RSSI is only exposed by experimental browser APIs (watchAdvertisements) and was not received.',
          };

    const info: DeviceInfo = {
      manufacturer,
      modelNumber,
      serialNumber,
      hardwareRevision,
      firmwareRevision,
      softwareRevision,
      batteryLevel,
      batteryVoltage: {
        status: 'not_supported',
        reason: 'No standard BLE characteristic exists for pack voltage. Requires a verified device-specific adapter.',
      },
      signalDbm: signal,
      readAt: Date.now(),
    };

    const services: GattServiceReport[] = [
      serviceReport('Device Information (0x180A)', [manufacturer, modelNumber, hardwareRevision, firmwareRevision]),
      serviceReport('Battery Service (0x180F)', [batteryLevel]),
    ];

    return { info, services };
  },

  /** Subscribes to live battery-level notifications if the device supports them. Returns an unsubscribe fn. */
  async watchBattery(
    server: BluetoothRemoteGATTServer,
    onLevel: (pct: number) => void,
  ): Promise<(() => void) | null> {
    try {
      const service = await getService(server, 'battery_service');
      const ch = await service.getCharacteristic('battery_level');
      if (!ch.properties.notify) return null;
      const handler = () => {
        const v = ch.value;
        if (v && v.byteLength > 0) {
          const pct = v.getUint8(0);
          if (pct <= 100) onLevel(pct);
        }
      };
      ch.addEventListener('characteristicvaluechanged', handler);
      await ch.startNotifications();
      return () => {
        ch.removeEventListener('characteristicvaluechanged', handler);
        ch.stopNotifications().catch(() => undefined);
      };
    } catch {
      return null;
    }
  },
};

function serviceReport(name: string, readings: Reading<unknown>[]): GattServiceReport {
  const ok = readings.filter((r) => r.status === 'ok').length;
  if (ok === readings.length) return { name, available: true, detail: 'All checked characteristics were readable.' };
  if (ok > 0) return { name, available: true, detail: `${ok} of ${readings.length} checked characteristics were readable.` };
  const first = readings.find((r) => r.status !== 'ok') as Exclude<Reading<unknown>, { status: 'ok' }> | undefined;
  return { name, available: false, detail: first?.reason ?? 'Not available.' };
}

/** Helper for UI: display a Reading as text. */
export function formatReading<T>(r: Reading<T>, fmt: (v: T) => string = String): string {
  if (r.status === 'ok') return fmt(r.value);
  return r.status === 'not_supported' ? 'Not supported' : 'Unavailable';
}
