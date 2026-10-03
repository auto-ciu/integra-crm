/**
 * Authority — the regulators, working groups and notified bodies whose
 * recognition closes the flywheel (credibility with Market Surveillance
 * Authorities, CIRPASS-2, notified bodies).
 */
import { defineObject } from '../lib/sdk';
import { richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { AUTHORITY_TYPE } from '../options';

const F = IDS.authority.fields;

export default defineObject({
  universalIdentifier: IDS.authority.object,
  nameSingular: 'authority',
  namePlural: 'authorities',
  labelSingular: 'Authority',
  labelPlural: 'Authorities',
  description: 'Regulatory authority, working group or notified body',
  icon: 'IconBuildingBank',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconBuildingBank',
    }),
    select({
      universalIdentifier: F.authorityType,
      name: 'authorityType',
      label: 'Type · 类型',
      icon: 'IconCategory',
      options: AUTHORITY_TYPE,
      defaultValue: 'OTHER',
    }),
    text({
      universalIdentifier: F.country,
      name: 'country',
      label: 'Country · 国家',
      icon: 'IconWorld',
    }),
    richText({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
  ],
});
