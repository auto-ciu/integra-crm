/** Person.wechatId — Integra extension of the standard Person object. */
import { defineField } from '../../lib/sdk';
import { text } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...text({
    universalIdentifier: IDS.person.fields.wechatId,
    name: 'wechatId',
    label: 'WeChat ID · 微信号',
    icon: 'IconBrandWechat',
  }),
});
