/** Person.lastWeChatContact — Integra extension of the standard Person object. */
import { defineField } from '../../lib/sdk';
import { date } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...date({
    universalIdentifier: IDS.person.fields.lastWeChatContact,
    name: 'lastWeChatContact',
    label: 'Last WeChat contact · 最近微信联系',
    icon: 'IconCalendarClock',
  }),
});
