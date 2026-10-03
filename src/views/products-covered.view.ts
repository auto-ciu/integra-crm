/**
 * "Products covered" — table widget of Mandate Products, embedded in the AR
 * Mandate record page. The record-page host scopes a relation-bound table
 * widget to the current record, so no filter is declared here.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';

const P = IDS.mandateProduct.fields;
const V = IDS.views.productsCoveredWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Products covered · 覆盖产品',
  objectUniversalIdentifier: IDS.mandateProduct.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconPackages',
  position: 0,
  fields: (
    [
      [P.name, 200],
      [P.productName, 200],
      [P.category, 170],
      [P.dppStatus, 150],
    ] as Array<[string, number]>
  ).map(([fieldMetadataUniversalIdentifier, size], position) => ({
    universalIdentifier: V.fields[position],
    fieldMetadataUniversalIdentifier,
    position,
    size,
    isVisible: true,
  })),
});
