/**
 * SLA Policy — response and resolution targets for one enquiry priority (E3).
 * email-to-ticket sets Enquiry.slaTarget = created + the active policy's
 * firstResponseHours. ops/seed-sla-policies.mjs creates the four defaults
 * (shared/sla.mjs).
 */
import { defineObject } from '../lib/sdk';
import { boolean, number, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { ENQUIRY_PRIORITY } from '../options';

const F = IDS.slaPolicy.fields;

export default defineObject({
  universalIdentifier: IDS.slaPolicy.object,
  nameSingular: 'slaPolicy',
  namePlural: 'slaPolicies',
  labelSingular: 'SLA Policy',
  labelPlural: 'SLA Policies',
  description: 'First-response and resolution targets per enquiry priority',
  icon: 'IconClockHour4',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconClockHour4',
    }),
    text({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 说明',
      icon: 'IconNotes',
    }),
    select({
      universalIdentifier: F.priority,
      name: 'priority',
      label: 'Priority · 优先级',
      icon: 'IconFlag',
      options: ENQUIRY_PRIORITY,
      defaultValue: 'NORMAL',
      description: 'The enquiry priority this policy applies to',
    }),
    number({
      universalIdentifier: F.firstResponseHours,
      name: 'firstResponseHours',
      label: 'First response (hours) · 首次响应时限',
      icon: 'IconClockCheck',
    }),
    number({
      universalIdentifier: F.resolutionHours,
      name: 'resolutionHours',
      label: 'Resolution (hours) · 解决时限',
      icon: 'IconCircleCheck',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
  ],
});
