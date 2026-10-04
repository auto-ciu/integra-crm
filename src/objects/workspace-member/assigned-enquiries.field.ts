/** WorkspaceMember.assignedEnquiries — inverse side of Enquiry.assignedTo (E3). */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.assignedEnquiries,
    name: 'assignedEnquiries',
    label: 'Assigned enquiries · 负责的咨询',
    icon: 'IconInbox',
    targetObjectId: IDS.enquiry.object,
    inverseFieldId: IDS.enquiry.fields.assignedTo,
  }),
});
