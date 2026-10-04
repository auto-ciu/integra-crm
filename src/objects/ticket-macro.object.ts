/**
 * Ticket Macro — a saved response staff apply to an enquiry with one click (E3).
 * The Macros tab on the Enquiry record lists the active macros that match the
 * enquiry's category and sends the chosen one as an OUTBOUND Enquiry Message.
 *
 * `productCategory` and `serviceInterest` are optional filters: empty = applies
 * to every enquiry. ops/seed-ticket-macros.mjs creates the defaults.
 */
import { defineObject } from '../lib/sdk';
import { boolean, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { ENQUIRY_CATEGORY, MACRO_CATEGORY, PRODUCT_CATEGORY } from '../options';

const F = IDS.ticketMacro.fields;

export default defineObject({
  universalIdentifier: IDS.ticketMacro.object,
  nameSingular: 'ticketMacro',
  namePlural: 'ticketMacros',
  labelSingular: 'Ticket Macro',
  labelPlural: 'Ticket Macros',
  description: 'Saved response staff apply to an enquiry with one click',
  icon: 'IconBolt',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconBolt',
      description: 'e.g. "Acknowledge receipt · EN" (the seed key)',
    }),
    text({
      universalIdentifier: F.shortcut,
      name: 'shortcut',
      label: 'Shortcut · 快捷码',
      icon: 'IconKeyboard',
      description: 'Short code, e.g. "ack-en"',
    }),
    richText({
      universalIdentifier: F.responseTemplate,
      name: 'responseTemplate',
      label: 'Response template · 回复模板',
      icon: 'IconFileText',
      description: 'Supports {{reference}}, {{name}}, {{company}}',
    }),
    select({
      universalIdentifier: F.category,
      name: 'category',
      label: 'Category · 类别',
      icon: 'IconCategory',
      options: MACRO_CATEGORY,
      defaultValue: 'RESPONSE',
    }),
    boolean({
      universalIdentifier: F.appendSignature,
      name: 'appendSignature',
      label: 'Append signature · 附加签名',
      icon: 'IconSignature',
      defaultValue: true,
    }),
    select({
      universalIdentifier: F.productCategory,
      name: 'productCategory',
      label: 'Product category · 产品类别',
      icon: 'IconBatteryCharging',
      options: PRODUCT_CATEGORY,
      description: 'Optional: only offer for this product category',
    }),
    select({
      universalIdentifier: F.serviceInterest,
      name: 'serviceInterest',
      label: 'Service interest · 服务意向',
      icon: 'IconCategory',
      options: ENQUIRY_CATEGORY,
      description: 'Optional: only offer for this service interest (the enquiry category)',
    }),
  ],
});
