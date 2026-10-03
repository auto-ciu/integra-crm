/**
 * Small constructors for field definitions so the object files read like a
 * schema, not like JSON. Every helper returns the plain manifest shape that
 * both `defineObject({ fields: [...] })` and `defineField({...})` accept.
 */
import { FieldType, RelationType } from './sdk';

/** Twenty's option-pill palette (the SDK's TAG_COLORS; the type is not exported). */
export type TagColor =
  | 'red' | 'ruby' | 'crimson' | 'tomato' | 'orange' | 'amber' | 'yellow' | 'lime' | 'grass'
  | 'green' | 'jade' | 'mint' | 'turquoise' | 'cyan' | 'sky' | 'blue' | 'iris' | 'violet'
  | 'purple' | 'plum' | 'pink' | 'bronze' | 'gold' | 'brown' | 'gray';

export type SelectOption = {
  value: string;
  label: string;
  color: TagColor;
  position: number;
};

type Base = {
  universalIdentifier: string;
  name: string;
  label: string;
  icon?: string;
  description?: string;
};

/** Build a select option list from `[value, label, color][]`, positions in order. */
export const options = (rows: Array<[value: string, label: string, color: TagColor]>): SelectOption[] =>
  rows.map(([value, label, color], position) => ({ value, label, color, position }));

export const text = (f: Base) => ({
  ...f,
  type: FieldType.TEXT as const,
  isNullable: true as const,
  defaultValue: "''",
});

export const richText = (f: Base) => ({
  ...f,
  type: FieldType.RICH_TEXT as const,
  isNullable: true as const,
});

export const date = (f: Base) => ({
  ...f,
  type: FieldType.DATE as const,
  isNullable: true as const,
});

export const number = ({ decimals = 0, ...f }: Base & { decimals?: number }) => ({
  ...f,
  type: FieldType.NUMBER as const,
  isNullable: true as const,
  universalSettings: { decimals },
});

export const currency = ({ currencyCode, ...f }: Base & { currencyCode?: string }) => ({
  ...f,
  type: FieldType.CURRENCY as const,
  isNullable: true as const,
  // Twenty stores currency as {amountMicros, currencyCode}; the default is a
  // composite literal, quoted the way the metadata API expects.
  defaultValue: { amountMicros: null, currencyCode: `'${currencyCode ?? 'EUR'}'` },
});

export const files = (f: Base & { maxNumberOfValues?: number }) => ({
  ...f,
  type: FieldType.FILES as const,
  isNullable: true as const,
  // Required by the SDK's FILES settings type.
  universalSettings: { maxNumberOfValues: f.maxNumberOfValues ?? 10 },
});

export const select = ({
  options,
  defaultValue,
  ...f
}: Base & { options: SelectOption[]; defaultValue?: string | null }) => ({
  ...f,
  type: FieldType.SELECT as const,
  isNullable: true as const,
  options,
  // Select defaults are the option value wrapped in single quotes ("'LEAD'"),
  // matching how Twenty serialises its own standard selects.
  defaultValue: defaultValue === undefined || defaultValue === null ? null : `'${defaultValue}'`,
});

/**
 * MANY_TO_ONE side of a relation (this object holds `<name>Id`). The inverse
 * ONE_TO_MANY field must exist on the target object with `inverseFieldId` as
 * its universalIdentifier — see `oneToMany`.
 */
export const manyToOne = (
  f: Base & { targetObjectId: string; inverseFieldId: string },
) => ({
  universalIdentifier: f.universalIdentifier,
  name: f.name,
  label: f.label,
  icon: f.icon,
  description: f.description,
  type: FieldType.RELATION as const,
  isNullable: true,
  universalSettings: { relationType: RelationType.MANY_TO_ONE, joinColumnName: `${f.name}Id` },
  relationTargetObjectMetadataUniversalIdentifier: f.targetObjectId,
  relationTargetFieldMetadataUniversalIdentifier: f.inverseFieldId,
});

/** ONE_TO_MANY side of a relation (collection on the target object). */
export const oneToMany = (
  f: Base & { targetObjectId: string; inverseFieldId: string },
) => ({
  universalIdentifier: f.universalIdentifier,
  name: f.name,
  label: f.label,
  icon: f.icon,
  description: f.description,
  type: FieldType.RELATION as const,
  isNullable: true,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
  relationTargetObjectMetadataUniversalIdentifier: f.targetObjectId,
  relationTargetFieldMetadataUniversalIdentifier: f.inverseFieldId,
});
