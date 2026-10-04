/** WorkspaceMember.discountRulesToApprove — inverse side of DiscountRule.approver. Same unverified-on-2.41 caveat as pricing-publications.field.ts. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.discountRulesToApprove,
    name: 'discountRulesToApprove',
    label: 'Discount rules to approve · 待审批折扣规则',
    icon: 'IconDiscount2',
    targetObjectId: IDS.discountRule.object,
    inverseFieldId: IDS.discountRule.fields.approver,
  }),
});
