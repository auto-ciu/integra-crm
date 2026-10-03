/** Person.preferredChannel — Integra extension of the standard Person object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { PREFERRED_CHANNEL } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...select({
    universalIdentifier: IDS.person.fields.preferredChannel,
    name: 'preferredChannel',
    label: 'Preferred channel · 首选渠道',
    icon: 'IconMessageCircle',
    options: PREFERRED_CHANNEL,
    defaultValue: 'WECHAT',
  }),
});
