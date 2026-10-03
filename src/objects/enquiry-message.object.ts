/**
 * Enquiry Message — one entry in an enquiry's conversation: the requester's
 * inbound message, a staff reply, or an internal note.
 */
import { defineObject } from '../lib/sdk';
import { boolean, dateTime, manyToOne, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { MESSAGE_DIRECTION } from '../options';

const F = IDS.enquiryMessage.fields;

export default defineObject({
  universalIdentifier: IDS.enquiryMessage.object,
  nameSingular: 'enquiryMessage',
  namePlural: 'enquiryMessages',
  labelSingular: 'Enquiry Message',
  labelPlural: 'Enquiry Messages',
  description: 'A message or internal note on an enquiry',
  icon: 'IconMessage',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconMessage',
      description: 'e.g. "ENQ-261003-7K2Q · inbound"',
    }),
    manyToOne({
      universalIdentifier: F.enquiry,
      name: 'enquiry',
      label: 'Enquiry · 咨询',
      icon: 'IconInbox',
      targetObjectId: IDS.enquiry.object,
      inverseFieldId: IDS.enquiry.fields.messages,
    }),
    select({
      universalIdentifier: F.direction,
      name: 'direction',
      label: 'Direction · 方向',
      icon: 'IconArrowsExchange',
      options: MESSAGE_DIRECTION,
      defaultValue: 'INBOUND',
    }),
    richText({
      universalIdentifier: F.body,
      name: 'body',
      label: 'Body · 内容',
      icon: 'IconFileText',
    }),
    text({
      universalIdentifier: F.senderEmail,
      name: 'senderEmail',
      label: 'Sender email · 发件人邮箱',
      icon: 'IconAt',
    }),
    dateTime({
      universalIdentifier: F.sentAt,
      name: 'sentAt',
      label: 'Sent at · 发送时间',
      icon: 'IconClock',
    }),
    boolean({
      universalIdentifier: F.isAutoReply,
      name: 'isAutoReply',
      label: 'Auto-reply · 自动回复',
      icon: 'IconRobot',
    }),
  ],
});
