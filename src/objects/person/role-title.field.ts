/** Person.roleTitle — Integra extension of the standard Person object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { ROLE_TITLE } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...select({
    universalIdentifier: IDS.person.fields.roleTitle,
    name: 'roleTitle',
    label: 'Role · 职位',
    icon: 'IconBriefcase',
    options: ROLE_TITLE,
  }),
});
