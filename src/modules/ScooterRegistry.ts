import type { ScooterModel, ScooterModelId } from '../types';

/**
 * ScooterRegistry — the list of scooter models TuneHub knows about.
 *
 * IMPORTANT: this is a *selection* list, not a hardware identification service.
 * Choosing a model here never proves what hardware is connected.
 *
 * `knownComponents: null` means "unknown": the UI will not assume any firmware
 * target (VCU / MCU / BLE / BMS) exists until it is confirmed by verified research.
 *
 * Images: drop your own, properly licensed files into /public/scooters/<id>.jpg.
 * If a file is missing the card shows a generic silhouette instead.
 */
const MODELS: ScooterModel[] = [
  {
    id: 'ZT3_Pro',
    name: 'Segway ZT3 Pro',
    tagline: 'ZT series',
    imageUrl: '/scooters/ZT3_Pro.jpg',
    silhouette: 'dual',
    compatibility: 'unknown',
    compatibilityNote: 'Hardware compatibility with this tool has not been verified.',
    knownComponents: null,
  },
  {
    id: 'F3',
    name: 'Segway F3',
    tagline: 'F series',
    imageUrl: '/scooters/F3.jpg',
    silhouette: 'standard',
    compatibility: 'unknown',
    compatibilityNote: 'Hardware compatibility with this tool has not been verified.',
    knownComponents: null,
  },
  {
    id: 'F3_Pro',
    name: 'Segway F3 Pro',
    tagline: 'F series',
    imageUrl: '/scooters/F3_Pro.jpg',
    silhouette: 'standard',
    compatibility: 'unknown',
    compatibilityNote: 'Hardware compatibility with this tool has not been verified.',
    knownComponents: null,
  },
  {
    id: 'GT3',
    name: 'Segway GT3',
    tagline: 'GT series',
    imageUrl: '/scooters/GT3.jpg',
    silhouette: 'dual',
    compatibility: 'unknown',
    compatibilityNote: 'Hardware compatibility with this tool has not been verified.',
    knownComponents: null,
  },
  {
    id: 'GT3_Pro',
    name: 'Segway GT3 Pro',
    tagline: 'GT series · if compatible',
    imageUrl: '/scooters/GT3_Pro.jpg',
    silhouette: 'dual',
    compatibility: 'unknown',
    compatibilityNote: 'Listed as "if compatible". Compatibility must be confirmed before any firmware operation.',
    knownComponents: null,
  },
  {
    id: 'MAX_G3',
    name: 'Segway MAX G3',
    tagline: 'MAX series',
    imageUrl: '/scooters/MAX_G3.jpg',
    silhouette: 'tall',
    compatibility: 'unknown',
    compatibilityNote: 'Hardware compatibility with this tool has not been verified.',
    knownComponents: null,
  },
];

export const ScooterRegistry = {
  list(): ScooterModel[] {
    return MODELS;
  },
  get(id: ScooterModelId): ScooterModel {
    const model = MODELS.find((m) => m.id === id);
    if (!model) throw new Error(`Unknown scooter model: ${id}`);
    return model;
  },
  /** Folder-style path segment, e.g. "ZT3_Pro". */
  folderName(id: ScooterModelId): string {
    return id;
  },
};
