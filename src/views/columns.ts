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
