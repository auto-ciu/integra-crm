/**
 * Enquiry Routing Rule — category + language → assignee. Intake picks the
 * active rule with the lowest `priority` number that matches; an empty
 * category or language on a rule matches anything.
 */
import { defineObject } from '../lib/sdk';
import { boolean, manyToOne, number, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { ENQUIRY_CATEGORY, ENQUIRY_LANGUAGE } from '../options';

const F = IDS.enquiryRoutingRule.fields;

export default defineObject({
  universalIdentifier: IDS.enquiryRoutingRule.object,
  nameSingular: 'enquiryRoutingRule',
  namePlural: 'enquiryRoutingRules',
  labelSingular: 'Enquiry Routing Rule',
  labelPlural: 'Enquiry Routing Rules',
  description: 'Assigns new enquiries by category and language',
  icon: 'IconRoute',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconRoute',
    }),
    select({
      universalIdentifier: F.category,
      name: 'category',
      label: 'Category · 类别',
      icon: 'IconCategory',
      options: ENQUIRY_CATEGORY,
    }),
    select({
      universalIdentifier: F.language,
      name: 'language',
      label: 'Language · 语言',
      icon: 'IconLanguage',
      options: ENQUIRY_LANGUAGE,
    }),
    manyToOne({
      universalIdentifier: F.assignTo,
      name: 'assignTo',
      label: 'Assign to · 分配给',
      icon: 'IconUserCircle',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.enquiryRoutingRules,
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
    number({
      universalIdentifier: F.priority,
      name: 'priority',
      label: 'Priority · 优先顺序',
      icon: 'IconSortAscendingNumbers',
      description: 'Lower runs first',
    }),
  ],
});
