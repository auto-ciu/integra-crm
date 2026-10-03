/**
 * Every universalIdentifier this app owns, in one place.
 *
 * These are STABLE: Twenty keys objects, fields, views, layouts and widgets by
 * universalIdentifier across installs and upgrades, so renaming a constant is
 * fine but changing a value orphans data. Never reuse a value. verify-model.mjs
 * asserts every value is a well-formed v4 UUID and unique across this file.
 */
export const IDS = {
  app: '7f3e9c1a-5b2d-4e8f-9a6c-0d1e2f3a4b5c',
  /** The application's default role (what the app token runs as). */
  appRole: '19d4fc6f-74fd-4b09-a749-7462f1176287',

  company: {
    fields: {
      nameZh: 'c0a1f2d3-11e4-4a5b-8c6d-7e8f9a0b1c2d',
      wechatId: 'c0a1f2d3-22e4-4b5c-9d6e-8f9a0b1c2d3e',
      province: 'c0a1f2d3-33e4-4c5d-ad6f-9a0b1c2d3e4f',
      productCategory: 'c0a1f2d3-44e4-4d5e-be70-0b1c2d3e4f50',
      exportRevenueBand: 'c0a1f2d3-55e4-4e5f-8f71-1c2d3e4f5061',
      tier: 'c0a1f2d3-66e4-4f60-9072-2d3e4f506172',
      /** inverse of arMandate.company */
      arMandates: 'a4b5c6d7-0004-4182-ad3e-4f5a6b7c8d9e',
      /** inverse of trainingEvent.company */
      trainingEvents: 'c6d7e8f9-0007-48a9-94af-b0c1d2e3f405',
    },
  },

  person: {
    fields: {
      wechatId: '9e0d1c2b-11a3-4b4c-8d5e-6f708192a3b4',
      roleTitle: '9e0d1c2b-22a3-4c4d-9e5f-708192a3b4c5',
      language: '9e0d1c2b-33a3-4d4e-af60-8192a3b4c5d6',
      preferredChannel: '9e0d1c2b-44a3-4e4f-b071-92a3b4c5d6e7',
      lastWeChatContact: '9e0d1c2b-55a3-4f50-8172-a3b4c5d6e7f8',
      leadStatus: '9e0d1c2b-66a3-4051-9283-b4c5d6e7f809',
    },
  },

  opportunity: {
    fields: {
      productLine: '5d6e7f80-11b2-4c3d-8e4f-506172839405',
      tier: '5d6e7f80-22b2-4d3e-9f50-617283940516',
    },
  },

  arMandate: {
    object: 'a4b5c6d7-0001-4e8f-9a0b-1c2d3e4f5a6b',
    fields: {
      name: 'a4b5c6d7-0002-4f80-8b1c-2d3e4f5a6b7c',
      company: 'a4b5c6d7-0003-4081-9c2d-3e4f5a6b7c8d',
      status: 'a4b5c6d7-0005-4283-be4f-5a6b7c8d9eaf',
      startDate: 'a4b5c6d7-0006-4384-8f5a-6b7c8d9eafb0',
      endDate: 'a4b5c6d7-0007-4485-906b-7c8d9eafb0c1',
      renewalDate: 'a4b5c6d7-0008-4586-a17c-8d9eafb0c1d2',
      docusignEnvelopeId: 'a4b5c6d7-0009-4687-b28d-9eafb0c1d2e3',
      annualFee: 'a4b5c6d7-000a-4788-839e-afb0c1d2e3f4',
      signatory: 'a4b5c6d7-000b-4889-94af-b0c1d2e3f405',
      urgency: 'a4b5c6d7-000c-498a-a5b0-c1d2e3f40516',
      documents: 'a4b5c6d7-000d-4a8b-b6c1-d2e3f4051627',
      /** inverse of mandateProduct.arMandate */
      products: 'a4b5c6d7-000e-4b8c-87d2-e3f405162738',
    },
  },

  mandateProduct: {
    object: 'b5c6d7e8-0001-4c9d-98e3-f40516273849',
    fields: {
      name: 'b5c6d7e8-0002-4d9e-a9f4-05162738495a',
      arMandate: 'b5c6d7e8-0003-4e9f-ba05-162738495a6b',
      productName: 'b5c6d7e8-0004-4fa0-8b16-2738495a6b7c',
      category: 'b5c6d7e8-0005-40a1-9c27-38495a6b7c8d',
      dppStatus: 'b5c6d7e8-0006-41a2-ad38-495a6b7c8d9e',
    },
  },

  trainingEvent: {
    object: 'c6d7e8f9-0001-42a3-be49-5a6b7c8d9eaf',
    fields: {
      name: 'c6d7e8f9-0002-43a4-8f5a-6b7c8d9eafb0',
      date: 'c6d7e8f9-0003-44a5-906b-7c8d9eafb0c1',
      channel: 'c6d7e8f9-0004-45a6-a17c-8d9eafb0c1d2',
      attendeeCount: 'c6d7e8f9-0005-46a7-b28d-9eafb0c1d2e3',
      company: 'c6d7e8f9-0006-47a8-839e-afb0c1d2e3f4',
    },
  },

  authority: {
    object: 'd7e8f90a-0001-49aa-a5b0-c1d2e3f40516',
    fields: {
      name: 'd7e8f90a-0002-4aab-b6c1-d2e3f4051627',
      authorityType: 'd7e8f90a-0003-4bac-87d2-e3f405162738',
      country: 'd7e8f90a-0004-4cad-98e3-f40516273849',
      notes: 'd7e8f90a-0005-4dae-a9f4-05162738495a',
    },
  },

  views: {
    companiesTable: {
      view: 'e8f90a1b-0001-4eaf-ba05-162738495a6b',
      fields: [
        'e8f90a1b-0101-4fb0-8b16-2738495a6b7c',
        'e8f90a1b-0102-40b1-9c27-38495a6b7c8d',
        'e8f90a1b-0103-41b2-ad38-495a6b7c8d9e',
        'e8f90a1b-0104-42b3-be49-5a6b7c8d9eaf',
        'e8f90a1b-0105-43b4-8f5a-6b7c8d9eafb0',
        'e8f90a1b-0106-44b5-906b-7c8d9eafb0c1',
        'e8f90a1b-0107-45b6-a17c-8d9eafb0c1d2',
        'e8f90a1b-0108-46b7-b28d-9eafb0c1d2e3',
      ],
    },
    pipelineKanban: {
      view: 'f90a1b2c-0001-47b8-839e-afb0c1d2e3f4',
      groups: [
        'f90a1b2c-0201-48b9-94af-b0c1d2e3f405',
        'f90a1b2c-0202-49ba-a5b0-c1d2e3f40516',
        'f90a1b2c-0203-4abb-b6c1-d2e3f4051627',
        'f90a1b2c-0204-4bbc-87d2-e3f405162738',
        'f90a1b2c-0205-4cbd-98e3-f40516273849',
        'f90a1b2c-0206-4dbe-a9f4-05162738495a',
      ],
      fields: [
        'f90a1b2c-0301-4ebf-ba05-162738495a6b',
        'f90a1b2c-0302-4fc0-8b16-2738495a6b7c',
        'f90a1b2c-0303-40c1-9c27-38495a6b7c8d',
        'f90a1b2c-0304-41c2-ad38-495a6b7c8d9e',
      ],
    },
    renewalsTable: {
      view: '0a1b2c3d-0001-42c3-be49-5a6b7c8d9eaf',
      fields: [
        '0a1b2c3d-0101-43c4-8f5a-6b7c8d9eafb0',
        '0a1b2c3d-0102-44c5-906b-7c8d9eafb0c1',
        '0a1b2c3d-0103-45c6-a17c-8d9eafb0c1d2',
        '0a1b2c3d-0104-46c7-b28d-9eafb0c1d2e3',
        '0a1b2c3d-0105-47c8-839e-afb0c1d2e3f4',
        '0a1b2c3d-0106-48c9-94af-b0c1d2e3f405',
      ],
      sort: '0a1b2c3d-0201-49ca-a5b0-c1d2e3f40516',
    },
    renewalsDueWidget: {
      view: '0a1b2c3d-0301-4acb-b6c1-d2e3f4051627',
      fields: [
        '0a1b2c3d-0401-4bcc-87d2-e3f405162738',
        '0a1b2c3d-0402-4ccd-98e3-f40516273849',
        '0a1b2c3d-0403-4dce-a9f4-05162738495a',
        '0a1b2c3d-0404-4ecf-ba05-162738495a6b',
      ],
      filter: '0a1b2c3d-0501-4fd0-8b16-2738495a6b7c',
      sort: '0a1b2c3d-0502-40d1-9c27-38495a6b7c8d',
    },
    productsCoveredWidget: {
      view: '1b2c3d4e-0001-41d2-ad38-495a6b7c8d9e',
      fields: [
        '1b2c3d4e-0101-42d3-be49-5a6b7c8d9eaf',
        '1b2c3d4e-0102-43d4-8f5a-6b7c8d9eafb0',
        '1b2c3d4e-0103-44d5-906b-7c8d9eafb0c1',
        '1b2c3d4e-0104-45d6-a17c-8d9eafb0c1d2',
      ],
    },
    fairLeadsKanban: {
      view: '2c3d4e5f-0001-46d7-b28d-9eafb0c1d2e3',
      groups: [
        '2c3d4e5f-0201-47d8-839e-afb0c1d2e3f4',
        '2c3d4e5f-0202-48d9-94af-b0c1d2e3f405',
        '2c3d4e5f-0203-49da-a5b0-c1d2e3f40516',
      ],
      fields: [
        '2c3d4e5f-0301-4adb-b6c1-d2e3f4051627',
        '2c3d4e5f-0302-4bdc-87d2-e3f405162738',
        '2c3d4e5f-0303-4cdd-98e3-f40516273849',
      ],
    },
  },

  frontComponents: {
    renewalBanner: '3d4e5f60-0001-4dde-a9f4-05162738495a',
    renewalCountWidget: '3d4e5f60-0002-4edf-ba05-162738495a6b',
  },

  pageLayouts: {
    arMandateRecord: {
      layout: '4e5f6071-0001-4fe0-8b16-2738495a6b7c',
      tabs: {
        overview: '4e5f6071-0101-40e1-9c27-38495a6b7c8d',
        documents: '4e5f6071-0102-41e2-ad38-495a6b7c8d9e',
        productsCovered: '4e5f6071-0103-42e3-be49-5a6b7c8d9eaf',
        renewals: '4e5f6071-0104-43e4-8f5a-6b7c8d9eafb0',
        activity: '4e5f6071-0105-44e5-906b-7c8d9eafb0c1',
      },
      widgets: {
        renewalBanner: '4e5f6071-0201-45e6-a17c-8d9eafb0c1d2',
        overviewFields: '4e5f6071-0202-46e7-b28d-9eafb0c1d2e3',
        documents: '4e5f6071-0203-47e8-839e-afb0c1d2e3f4',
        productsCovered: '4e5f6071-0204-48e9-94af-b0c1d2e3f405',
        renewalsBanner: '4e5f6071-0205-49ea-a5b0-c1d2e3f40516',
        renewalsFields: '4e5f6071-0206-4aeb-b6c1-d2e3f4051627',
        activityTimeline: '4e5f6071-0207-4bec-87d2-e3f405162738',
      },
    },
    todayDashboard: {
      layout: '5f607182-0001-4ced-98e3-f40516273849',
      tabs: { today: '5f607182-0101-4dee-a9f4-05162738495a' },
      widgets: {
        renewalCount: '5f607182-0201-4eef-ba05-162738495a6b',
        renewalsDue: '5f607182-0202-4ff0-8b16-2738495a6b7c',
      },
    },
  },

  navigation: {
    today: '60718293-0001-40f1-9c27-38495a6b7c8d',
    arMandates: '60718293-0002-41f2-ad38-495a6b7c8d9e',
    trainingEvents: '60718293-0003-42f3-be49-5a6b7c8d9eaf',
    authorities: '60718293-0004-43f4-8f5a-6b7c8d9eafb0',
  },
} as const;
