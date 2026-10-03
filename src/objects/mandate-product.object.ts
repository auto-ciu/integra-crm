/**
 * Mandate Product — one product (model / SKU family) covered by an AR Mandate,
 * with its Digital Product Passport state. Category shares the Company
 * option set so a company's products and its category never disagree.
 */
import { defineObject } from '../lib/sdk';
import { manyToOne, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { DPP_STATUS, PRODUCT_CATEGORY } from '../options';

const F = IDS.mandateProduct.fields;

export default defineObject({
  universalIdentifier: IDS.mandateProduct.object,
  nameSingular: 'mandateProduct',
  namePlural: 'mandateProducts',
  labelSingular: 'Mandate Product',
  labelPlural: 'Mandate Products',
  description: 'A product covered by an AR mandate and its DPP status',
  icon: 'IconPackage',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconPackage',
    }),
    manyToOne({
      universalIdentifier: F.arMandate,
      name: 'arMandate',
      label: 'AR Mandate · 授权委托',
      icon: 'IconFileCertificate',
      targetObjectId: IDS.arMandate.object,
      inverseFieldId: IDS.arMandate.fields.products,
    }),
    text({
      universalIdentifier: F.productName,
      name: 'productName',
      label: 'Product name · 产品名称',
      icon: 'IconTag',
    }),
    select({
      universalIdentifier: F.category,
      name: 'category',
      label: 'Category · 类别',
      icon: 'IconBatteryCharging',
      options: PRODUCT_CATEGORY,
    }),
    select({
      universalIdentifier: F.dppStatus,
      name: 'dppStatus',
      label: 'DPP status · DPP 状态',
      icon: 'IconPassport',
      options: DPP_STATUS,
      defaultValue: 'NONE',
    }),
  ],
});
