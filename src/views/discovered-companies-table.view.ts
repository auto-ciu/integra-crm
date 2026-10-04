/**
 * "Discovered Companies" — every company a discovery run found (A2), best
 * score first, so the strongest leads are promoted to the CRM first.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const D = IDS.discoveredCompany.fields;
const V = IDS.views.discoveredCompaniesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Discovered Companies · 发现的公司',
  objectUniversalIdentifier: IDS.discoveredCompany.object,
  type: ViewType.TABLE,
  icon: 'IconBuildingFactory2',
  position: 0,
  fields: columns(V.fields, [
    [D.companyName, 240],
    [D.industry, 200],
    [D.score, 90],
    [D.isExportedToCRM, 110],
    [D.isDuplicate, 110],
    [D.reviewStatus, 120],
    [D.icpTier, 120],
    [D.icpScore, 90],
    [D.isGdprArt14Sent, 130],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: D.score,
      direction: ViewSortDirection.DESC,
    },
  ],
});
