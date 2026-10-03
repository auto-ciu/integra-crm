/**
 * WorkspaceMember.enquiryRoutingRules — inverse side of
 * EnquiryRoutingRule.assignTo.
 *
 * Unverified on a live 2.41 server: whether an app may attach a field to the
 * workspaceMember system object (F0.4). If `twenty dev` rejects it, delete
 * this file and turn EnquiryRoutingRule.assignTo into a TEXT `assigneeEmail`.
 */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.enquiryRoutingRules,
    name: 'enquiryRoutingRules',
    label: 'Enquiry routing rules · 咨询分配规则',
    icon: 'IconRoute',
    targetObjectId: IDS.enquiryRoutingRule.object,
    inverseFieldId: IDS.enquiryRoutingRule.fields.assignTo,
  }),
});
