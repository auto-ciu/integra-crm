/** Company.nameZh — Integra extension of the standard Company object. */
import { defineField } from '../../lib/sdk';
import { text } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...text({
    universalIdentifier: IDS.company.fields.nameZh,
    name: 'nameZh',
    label: 'Chinese name · 中文名',
    icon: 'IconLanguage',
    description: 'Company name as written in Chinese',
  }),
});
