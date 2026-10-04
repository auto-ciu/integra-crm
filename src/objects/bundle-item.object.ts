/**
 * Bundle Item (C1) — one component of a BUNDLE Offering, e.g. DPP inside the
 * AR + DPP bundle. The two rules (a relation cannot express them) are checked
 * by shared/public-pricing.mjs `bundleItemProblem`: the seed and the publisher
 * ignore an item that breaks them.
 */
import { defineObject } from '../lib/sdk';
import { boolean, manyToOne, number, text } from '../lib/fields';
import { IDS } from '../ids';

const F = IDS.bundleItem.fields;

export default defineObject({
  universalIdentifier: IDS.bundleItem.object,
  nameSingular: 'bundleItem',
  namePlural: 'bundleItems',
  labelSingular: 'Bundle Item',
  labelPlural: 'Bundle Items',
  description: 'One component offering inside a bundle offering',
  icon: 'IconPackages',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconPackages',
    }),
    manyToOne({
      universalIdentifier: F.bundle,
      name: 'bundle',
      label: 'Bundle · 组合',
      icon: 'IconPackages',
      description: 'The bundle: must be a BUNDLE strategyType offering',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.bundleItems,
    }),
    manyToOne({
      universalIdentifier: F.component,
      name: 'component',
      label: 'Component · 组成部分',
      icon: 'IconReceipt2',
      description: 'The offering included in the bundle: must be a non-BUNDLE offering',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.componentOf,
    }),
    boolean({
      universalIdentifier: F.included,
      name: 'included',
      label: 'Included · 包含',
      icon: 'IconCheck',
      defaultValue: true,
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
    }),
  ],
});
