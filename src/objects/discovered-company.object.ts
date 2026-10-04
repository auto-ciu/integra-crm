/**
 * Discovered Company — one LinkedIn company page found by a Lead Discovery
 * Run (A2), before anyone has decided it is a lead. Created by
 * src/functions/apify-webhook.ts (company pages with a website only), scored
 * by score-discovered-company.ts and turned into a CRM Company by
 * promote-discovered-company.ts.
 *
 * `isDuplicate` flags a LinkedIn page already found by an earlier run or
 * already on a CRM Company. `exportedCompanyId` is plain text (the Company's
 * UUID), not a relation, as the plan specifies.
 */
import { defineObject } from '../lib/sdk';
import { boolean, link, manyToOne, multiSelect, number, richText, text } from '../lib/fields';
import { IDS } from '../ids';
import { PRODUCT_CATEGORY } from '../options';

const F = IDS.discoveredCompany.fields;

export default defineObject({
  universalIdentifier: IDS.discoveredCompany.object,
  nameSingular: 'discoveredCompany',
  namePlural: 'discoveredCompanies',
  labelSingular: 'Discovered Company',
  labelPlural: 'Discovered Companies',
  description: 'A LinkedIn company page found by a lead discovery run, with its score',
  icon: 'IconBuildingFactory2',
  labelIdentifierFieldMetadataUniversalIdentifier: F.companyName,
  fields: [
    manyToOne({
      universalIdentifier: F.discoveryRun,
      name: 'discoveryRun',
      label: 'Discovery run · 发现批次',
      icon: 'IconRadar',
      targetObjectId: IDS.leadDiscoveryRun.object,
      inverseFieldId: IDS.leadDiscoveryRun.fields.discoveredCompanies,
    }),
    text({
      universalIdentifier: F.companyName,
      name: 'companyName',
      label: 'Company name · 公司名称',
      icon: 'IconBuilding',
    }),
    text({
      universalIdentifier: F.companyNameZh,
      name: 'companyNameZh',
      label: 'Chinese name · 中文名称',
      icon: 'IconLanguage',
    }),
    link({
      universalIdentifier: F.website,
      name: 'website',
      label: 'Website · 网站',
      icon: 'IconWorld',
    }),
    link({
      universalIdentifier: F.linkedinUrl,
      name: 'linkedinUrl',
      label: 'LinkedIn page',
      icon: 'IconBrandLinkedin',
      description: 'Normalised https://www.linkedin.com/company/<slug>; the de-duplication key',
    }),
    text({
      universalIdentifier: F.industry,
      name: 'industry',
      label: 'Industry · 行业',
      icon: 'IconBriefcase',
    }),
    text({
      universalIdentifier: F.companySize,
      name: 'companySize',
      label: 'Company size · 公司规模',
      icon: 'IconUsers',
      description: 'LinkedIn employee band, e.g. "51-200"',
    }),
    text({
      universalIdentifier: F.headquarters,
      name: 'headquarters',
      label: 'Headquarters · 总部',
      icon: 'IconMapPin',
    }),
    multiSelect({
      universalIdentifier: F.productCategories,
      name: 'productCategories',
      label: 'Product categories · 产品类别',
      icon: 'IconPackages',
      options: PRODUCT_CATEGORY,
    }),
    richText({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 简介',
      icon: 'IconFileDescription',
    }),
    text({
      universalIdentifier: F.emailDomains,
      name: 'emailDomains',
      label: 'E-mail domains · 邮箱域名',
      icon: 'IconAt',
      description: 'Comma-separated company e-mail domains (not filled by LinkedIn)',
    }),
    boolean({
      universalIdentifier: F.isExportedToCRM,
      name: 'isExportedToCRM',
      label: 'In CRM · 已导入',
      icon: 'IconCircleCheck',
    }),
    text({
      universalIdentifier: F.exportedCompanyId,
      name: 'exportedCompanyId',
      label: 'CRM Company ID',
      icon: 'IconId',
    }),
    boolean({
      universalIdentifier: F.isDuplicate,
      name: 'isDuplicate',
      label: 'Duplicate · 重复',
      icon: 'IconCopy',
      description: 'Same LinkedIn page found by an earlier run, or already on a CRM Company',
    }),
    number({
      universalIdentifier: F.score,
      name: 'score',
      label: 'Score · 评分',
      icon: 'IconGauge',
      description: '0–100, from score-discovered-company (deterministic rules)',
    }),
    richText({
      universalIdentifier: F.scoreBreakdown,
      name: 'scoreBreakdown',
      label: 'Score breakdown · 评分明细',
      icon: 'IconListDetails',
    }),
  ],
});
