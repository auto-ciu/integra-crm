/**
 * "Messages" — table widget of Enquiry Messages, oldest first, embedded in
 * the Enquiry record page. As with "Products covered", the record-page host
 * is expected to scope the relation-bound table to the current enquiry.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const M = IDS.enquiryMessage.fields;
const V = IDS.views.enquiryMessagesWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Messages · 消息',
  objectUniversalIdentifier: IDS.enquiryMessage.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconMessages',
  position: 0,
  fields: columns(V.fields, [
    [M.sentAt, 150],
    [M.direction, 130],
    [M.senderEmail, 200],
    [M.body, 360],
    [M.isAutoReply, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: M.sentAt,
      direction: ViewSortDirection.ASC,
    },
  ],
});
