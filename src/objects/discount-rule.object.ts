/**
 * Discount Rule (C2) — how far below the standard price an agreement line may
 * go before someone must approve it. validate-agreement-discounts applies
 * them (shared/agreement-pricing.mjs governingRule):
 *   - a rule for the line's offering beats a global one (offering empty);
 *   - a rule only applies to agreements worth at least minAgreementValueEur,
 *     and the highest applicable minimum wins;
 *   - a line over the governing rule's maxDiscountPercent needs its approver.
 * A line no active rule covers is unrestricted.
 */
import { defineObject } from '../lib/sdk';
import { boolean, manyToOne, number, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';

const F = IDS.discountRule.fields;

export default defineObject({
  universalIdentifier: IDS.discountRule.object,
  nameSingular: 'discountRule',
  namePlural: 'discountRules',
  labelSingular: 'Discount Rule',
  labelPlural: 'Discount Rules',
  description: 'Largest discount allowed without approval, and who approves beyond it',
  icon: 'IconDiscount2',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconDiscount2',
    }),
    manyToOne({
      universalIdentifier: F.offering,
      name: 'offering',
      label: 'Offering · 产品方案',
      icon: 'IconReceipt2',
      description: 'Empty = every offering (a rule for the offering takes precedence)',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.discountRules,
    }),
    number({
      universalIdentifier: F.maxDiscountPercent,
      name: 'maxDiscountPercent',
      label: 'Max discount % · 最大折扣',
      icon: 'IconPercentage',
      decimals: 2,
      description: 'Off the standard price; above it the approver must approve',
    }),
    manyToOne({
      universalIdentifier: F.approver,
      name: 'approver',
      label: 'Approver · 审批人',
      icon: 'IconUserCheck',
      description: 'Approves discounts above the maximum',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.discountRulesToApprove,
    }),
    number({
      universalIdentifier: F.minAgreementValueEur,
      name: 'minAgreementValueEur',
      label: 'Min agreement value (EUR) · 最低协议金额',
      icon: 'IconCurrencyEuro',
      decimals: 2,
      description: 'Only applies to agreements worth at least this (sum of agreed price × quantity); empty = 0',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
  ],
});
