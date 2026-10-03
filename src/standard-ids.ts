/**
 * Universal identifiers of Twenty's STANDARD objects and fields that this app
 * extends or references. These are Twenty's own constants (the `20202020-…`
 * namespace), read from twenty-front's generated metadata for the v2.41 line;
 * they are stable across workspaces, which is what lets an App attach fields
 * and views to Company / Person / Opportunity without knowing workspace ids.
 */
export const STANDARD = {
  company: {
    object: '20202020-b374-4779-a561-80086cb2e17f',
    fields: {
      name: '20202020-4d99-4e2e-a84c-4a27837b1ece',
      domainName: '20202020-0c28-43d8-8ba5-3659924d3489',
    },
  },
  person: {
    object: '20202020-e674-48e5-a542-72570eee7213',
    fields: {
      name: '20202020-3875-44d5-8c33-a6239011cab8',
      company: '20202020-e2f3-448e-b34c-2d625f0025fd',
      jobTitle: '20202020-b0d0-415a-bef9-640a26dacd9b',
    },
  },
  opportunity: {
    object: '20202020-9549-49dd-b2b2-883999db8938',
    fields: {
      name: '20202020-8609-4f65-a2d9-44009eb422b5',
      amount: '20202020-583e-4642-8533-db761d5fa82f',
      closeDate: '20202020-527e-44d6-b1ac-c4158d307b97',
      /** The stock SELECT whose options ops/sync-opportunity-stages.mjs replaces. */
      stage: '20202020-6f76-477d-8551-28cd65b2b4b9',
      company: '20202020-cbac-457e-b565-adece5fc815f',
      pointOfContact: '20202020-8dfb-42fc-92b6-01afb759ed16',
    },
  },
  /** Staff seats. Enquiry routing rules assign to a member, not to a Person. */
  workspaceMember: {
    object: '20202020-3319-4234-a34c-82d5c0e881a6',
  },
} as const;
