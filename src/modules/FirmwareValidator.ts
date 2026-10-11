import type {
  CheckStatus,
  FirmwareComponent,
  ScooterModelId,
  ValidationCheck,
  ValidationResult,
} from '../types';
import { ScooterRegistry } from './ScooterRegistry';

/**
 * FirmwareValidator — LOCAL, best-effort sanity checks on a firmware file.
 *
 * What this does:  size / emptiness / format signature sniffing / SHA-256 / filename hints.
 * What this does NOT do: prove the file is genuine, signed, or compatible with any hardware.
 * Cryptographic verification and authentication are performed by the device's own bootloader;
 * TuneHub never attempts to bypass them. `compatibilityVerified` is therefore always false.
 */

export const ALLOWED_EXTENSIONS = ['bin', 'hex', 'zip', 'fw', 'dfu', 'img', 'enc', 'pkg'];
export const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** Filename tokens (lowercase, separators stripped) mapped to models. Longest match wins. */
const MODEL_TOKENS: Array<[string, ScooterModelId]> = [
  ['zt3pro', 'ZT3_Pro'],
  ['f3pro', 'F3_Pro'],
  ['gt3pro', 'GT3_Pro'],
  ['maxg3', 'MAX_G3'],
  ['zt3', 'ZT3_Pro'],
  ['gt3', 'GT3'],
  ['f3', 'F3'],
];

const COMPONENT_TOKENS: FirmwareComponent[] = ['VCU', 'MCU', 'BLE', 'BMS'];

export function detectModelFromName(fileName: string): ScooterModelId | null {
  const n = fileName.toLowerCase().replace(/[\s_\-.]+/g, '');
  for (const [token, id] of MODEL_TOKENS) if (n.includes(token)) return id;
  return null;
}

export function detectComponentsFromName(fileName: string): FirmwareComponent[] {
  const n = fileName.toUpperCase();
  return COMPONENT_TOKENS.filter((c) => new RegExp(`(^|[^A-Z])${c}([^A-Z]|$)`).test(n));
}

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : '';
}

export async function sha256Hex(data: ArrayBuffer): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sniffFormat(bytes: Uint8Array): string {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'ZIP archive';
  if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) return 'ELF executable';
  if (bytes.length >= 1 && bytes[0] === 0x3a) {
    const head = new TextDecoder().decode(bytes.slice(0, 16));
    if (/^:[0-9A-Fa-f]{8}/.test(head)) return 'Intel HEX (text)';
  }
  if (bytes.length >= 4 && bytes[0] === 0x1f && bytes[1] === 0x8b) return 'GZIP stream';
  return 'Unrecognized binary';
}

function uniformBytes(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  const first = bytes[0];
  const limit = Math.min(bytes.length, 1 << 16);
  for (let i = 1; i < limit; i++) if (bytes[i] !== first) return false;
  return true;
}

export interface ValidateInput {
  fileName: string;
  size: number;
  data: ArrayBuffer;
  modelId: ScooterModelId;
  component: FirmwareComponent;
}

export const FirmwareValidator = {
  async validate(input: ValidateInput): Promise<{ result: ValidationResult; sha256: string }> {
    const { fileName, size, data, modelId, component } = input;
    const checks: ValidationCheck[] = [];
    const add = (id: string, label: string, status: CheckStatus, detail: string) =>
      checks.push({ id, label, status, detail });

    const bytes = new Uint8Array(data);

    // 1. Non-empty / size ceiling
    if (size === 0) add('size', 'File size', 'fail', 'File is empty.');
    else if (size > MAX_FILE_BYTES) add('size', 'File size', 'fail', `File exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB limit.`);
    else add('size', 'File size', 'pass', `${size.toLocaleString()} bytes.`);

    // 2. Extension
    const ext = extensionOf(fileName);
    if (ALLOWED_EXTENSIONS.includes(ext)) add('ext', 'File type', 'pass', `.${ext} is a recognised firmware container extension.`);
    else add('ext', 'File type', 'warn', ext ? `.${ext} is an unusual extension for firmware.` : 'File has no extension.');

    // 3. Content signature
    const format = sniffFormat(bytes);
    add('format', 'Content signature', format === 'Unrecognized binary' ? 'warn' : 'pass', `Detected: ${format}. This is a heuristic, not a format guarantee.`);

    // 4. Blank / erased image
    if (uniformBytes(bytes)) add('blank', 'Content sanity', 'fail', 'File content is a single repeated byte value (blank or erased image).');
    else if (size > 0) add('blank', 'Content sanity', 'pass', 'Content is not blank.');

    // 5. Hash
    const sha = await sha256Hex(data);
    if (sha) add('hash', 'Integrity hash', 'pass', `SHA-256 ${sha.slice(0, 16)}… computed. Compare it with a publisher-provided hash if you have one.`);
    else add('hash', 'Integrity hash', 'warn', 'SHA-256 is unavailable (requires a secure context).');

    // 6. Filename vs. selected model
    const nameModel = detectModelFromName(fileName);
    const selectedName = ScooterRegistry.get(modelId).name;
    if (nameModel && nameModel !== modelId) {
      add('model-hint', 'Model hint', 'warn', `File name suggests ${ScooterRegistry.get(nameModel).name} but you selected ${selectedName}.`);
    } else if (nameModel === modelId) {
      add('model-hint', 'Model hint', 'pass', 'File name matches the selected model (hint only, not proof).');
    } else {
      add('model-hint', 'Model hint', 'warn', 'File name contains no recognisable model identifier.');
    }

    // 7. Filename vs. selected component
    const nameComps = detectComponentsFromName(fileName);
    if (nameComps.length && !nameComps.includes(component)) {
      add('comp-hint', 'Component hint', 'warn', `File name suggests ${nameComps.join('/')} but you selected ${component}.`);
    } else if (nameComps.includes(component)) {
      add('comp-hint', 'Component hint', 'pass', `File name mentions ${component} (hint only).`);
    } else {
      add('comp-hint', 'Component hint', 'warn', 'File name contains no component identifier (VCU / MCU / BLE / BMS).');
    }

    // 8. Hardware compatibility: honest about what we cannot know
    add(
      'compat',
      'Hardware compatibility',
      'warn',
      'Cannot be verified: TuneHub has no trusted manifest, signature, or hardware-ID check for this file. The device bootloader remains the authority.',
    );

    const status = checks.some((c) => c.status === 'fail')
      ? 'invalid'
      : checks.some((c) => c.status === 'warn')
        ? 'warnings'
        : 'valid';

    return {
      sha256: sha ?? '',
      result: { status, checks, validatedAt: Date.now(), compatibilityVerified: false },
    };
  },
};
