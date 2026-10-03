import { getFieldUniversalIdentifier } from '../lib/sdk';
import { IDS } from '../ids';

/** `[fieldId, size]` pairs → view fields, positioned in order, ids from ids.ts. */
export const columns = (
  ids: readonly string[],
  spec: Array<[fieldId: string, size: number]>,
) =>
  spec.map(([fieldMetadataUniversalIdentifier, size], position) => ({
    universalIdentifier: ids[position],
    fieldMetadataUniversalIdentifier,
    position,
    size,
    isVisible: true,
  }));

/**
 * Universal id of a system field (createdAt, updatedAt, …) on one of THIS
 * app's objects. The server creates those fields, so they are not in ids.ts;
 * the SDK derives their ids deterministically from app + object + name (the
 * same derivation reproduces Twenty's own Person.createdAt id).
 */
export const systemFieldId = (objectUniversalIdentifier: string, name: 'createdAt' | 'updatedAt') =>
  getFieldUniversalIdentifier({ applicationUniversalIdentifier: IDS.app, objectUniversalIdentifier, name });
