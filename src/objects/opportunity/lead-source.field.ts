/**
 * Opportunity.leadSource — the fair the opportunity came from, as free text
 * (e.g. "Canton Fair 2026"). B1 keeps it simple; F0.5 plans a cross-object
 * leadSource SELECT, which would replace this field.
 */
import { defineField } from '../../lib/sdk';
import { text } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.opportunity.object,
  ...text({
    universalIdentifier: IDS.opportunity.fields.leadSource,
    name: 'leadSource',
    label: 'Lead source · 线索来源',
    icon: 'IconMapPin',
    description: 'Fair the opportunity came from, e.g. "Canton Fair 2026"',
  }),
});
