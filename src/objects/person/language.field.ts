/** Person.language — Integra extension of the standard Person object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { LANGUAGE } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...select({
    universalIdentifier: IDS.person.fields.language,
    name: 'language',
    label: 'Language · 语言',
    icon: 'IconLanguage',
    options: LANGUAGE,
    defaultValue: 'ZH',
  }),
});
