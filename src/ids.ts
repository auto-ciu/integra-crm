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
      /** inverse of enquiry.relatedCompany */
      enquiries: '009dc9ed-35ba-4ae7-952c-601646de1a5c',
      /** inverse of fairLead.company */
      fairLeads: '9e48010c-03a2-41b2-ae5b-f6495207294e',
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
      /** inverse of enquiry.relatedPerson */
      enquiries: '90a3371a-5168-4b4f-8703-76bcd727386d',
      /** inverse of fairLead.person */
      fairLeads: '92c347a1-dec4-4fa5-b940-3317c76dc7c4',
      /** inverse of streamContact.person */
      streamContacts: '2e1800e4-f142-46a7-9f1b-46ef4f191408',
    },
  },

  opportunity: {
    fields: {
      productLine: '5d6e7f80-11b2-4c3d-8e4f-506172839405',
      tier: '5d6e7f80-22b2-4d3e-9f50-617283940516',
      /** inverse of enquiry.relatedOpportunity */
      enquiries: 'dbd1e3a1-0d87-4975-8b76-95bbae85c67d',
      /** Fair the opportunity came from (B1; free text until F0.5's leadSource select) */
      leadSource: '51894b4e-22fd-4cd0-888f-cafb56103b71',
    },
  },

  workspaceMember: {
    fields: {
      /** inverse of enquiryRoutingRule.assignTo */
      enquiryRoutingRules: '31d901f7-1e00-47e4-8523-184621a2cfee',
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

  enquiry: {
    object: '2e37c95e-58aa-4584-855e-15e904354635',
    fields: {
      reference: '5a582bd0-7b7e-42ae-acc4-996144d6977d',
      intakeId: '4f50d02e-d059-4166-bfda-48fe2e64c3d2',
      status: '9eda7bb4-ec8e-44fe-b7c6-df00045625ad',
      priority: 'ea49d8cd-5cd5-4665-8dca-47dde1fcc174',
      category: '4e759f63-765d-4135-914c-0546803aae9c',
      subject: '895ad111-7a3e-4172-b24b-a99285ead339',
      language: '23dd3f9c-e808-436d-9aaa-85ba01027da7',
      source: 'f0baa4b8-6c2d-4189-8aec-d3b7350bfc09',
      sourcePage: 'a4f0e993-19ca-402a-b18c-2982d77c1f77',
      utmSource: 'd0f2d440-0660-453f-9432-4aa9d989fd6f',
      utmMedium: '0aff4541-b2d4-4549-9a4b-c69cec6fd641',
      utmCampaign: '1ea75d41-47c7-4200-82e4-5d5a5e60a962',
      spamCheck: 'd93e6fcd-5576-4a2a-b676-95edda2f31df',
      triageNotes: '4c9d6fb3-9155-49d7-b448-7d8781580b99',
      closedAt: 'b71d71f6-4fc1-4e4e-b989-c35dd5168127',
      relatedCompany: '159f7723-57c3-44f6-a0b5-7793f978a4cd',
      relatedPerson: '3b867720-1abf-488a-8ab2-c22e3d1a2de9',
      relatedOpportunity: '97f0dab9-5bd5-414f-839a-a60f51f36e2a',
      /** inverse of enquiryMessage.enquiry */
      messages: 'fad028cd-fd37-432f-a6ba-40613cc61926',
    },
  },

  enquiryMessage: {
    object: '9e8a43aa-adb2-4f73-a437-dd0fa0d2e0e8',
    fields: {
      name: 'ef7d9db9-a816-4f98-bd12-f6dac492b0b4',
      enquiry: 'e51f9d81-6128-47f9-b897-4ac54e44b855',
      direction: '1351b745-de84-4091-ae44-36f7930ab8b6',
      body: '1330639d-ae90-4d16-9196-d0d349a1d8ef',
      senderEmail: '4781ae0b-feb0-4bd5-afe3-072bd0633cab',
      sentAt: '51da74cf-2c9f-4af3-8539-77c312014bc5',
      isAutoReply: '2a51f812-7695-451a-8602-2e2fdd5f66d3',
    },
  },

  enquiryRoutingRule: {
    object: 'c80269d9-2d24-4ddc-8a74-a11b231eec9c',
    fields: {
      name: '11d3fc33-9ad2-44ec-b5ba-bbd69a688e24',
      category: 'f8581c07-6b87-401f-8349-db4d3ecdb63b',
      language: 'b327cec6-b1f5-42bb-948c-e819ae35a3a8',
      assignTo: 'b2617851-90b7-4698-b9bd-e6b146dd381f',
      isActive: '11bf7576-c046-4c96-8bd7-8a36eb50f503',
      priority: 'e3b3e42b-ece7-4480-9b0d-534f5facac7a',
    },
  },

  // ------------------------------------------------ B1 product streams

  productStream: {
    object: '72859466-4111-4865-9b24-04201b039735',
    fields: {
      name: '3c263cec-4d4e-4e05-a7be-0d30181e9a23',
      slug: '65cbb410-e38e-4ca9-8f1f-e10ff52f99c2',
      description: '36570756-809f-468c-95ca-fc59befe9487',
      icon: '9be7e2c8-cc0b-4022-bc32-ffce71e6df84',
      sortOrder: '42230e64-5b5b-4a8c-8d4d-9aaa991cf0ba',
      isActive: '868a0bdf-a1ee-4677-a728-2675832f4b0e',
      activeUpdateCount: 'd8d82dd2-3208-44c6-8fe6-6e411bb2ad6c',
      lastUpdateAt: '16aeb015-78c0-4082-bca5-b5df85e96f33',
      /** inverse of streamUpdate.stream */
      updates: '423e451d-725b-4563-bbb7-8b7d416cf20f',
      /** inverse of streamDocument.stream */
      documents: '6a0a7307-bd71-45bf-b683-5a0154c442c3',
      /** inverse of streamContact.stream */
      contacts: '7923cde6-6833-4beb-bbed-2f35a7a2585e',
    },
  },

  streamUpdate: {
    object: 'a4593d7f-d813-41af-a3e1-859367389d87',
    fields: {
      name: '6c5d111f-a6cb-4a0a-af9b-88f88c09637b',
      stream: 'e4884691-041b-44ce-8328-cb1890ff9089',
      body: 'f98bc8dd-4629-45ec-9a9e-406515ccac4e',
      updateType: 'b23c55e6-81ed-4496-aaa3-1b8478adf4ab',
      publishedAt: '3f7d2132-0625-4b2c-b1a4-de86a72b504a',
      sourceUrl: '1613d9cd-9cb8-4024-8e92-355de581af30',
    },
  },

  streamDocument: {
    object: '2a445564-258f-4bb0-8e8f-5c4e8713438f',
    fields: {
      name: '04c03280-c5c9-414c-9a7f-394f4b7e85ab',
      stream: 'd98124cb-ba3d-4e7c-a658-90a9782d1e35',
      file: '9d2b4a37-df78-44b3-a8c2-64da010d133d',
      version: '99c76a79-325e-4016-b103-418d1ee48d3e',
      effectiveDate: 'dbf6ca10-2201-49fb-b2a0-a46169aa5bf1',
      documentType: '7cc540ce-1de2-41a3-be1b-d966b380dfb7',
    },
  },

  streamContact: {
    object: '576ee776-da32-4638-96b6-4157ad3ab40e',
    fields: {
      name: '07952930-357a-4979-ab92-41bc245993f3',
      stream: 'cdabab14-1d64-40d2-a079-b31f0c00bc23',
      person: '11b6c770-2a56-4f05-ad80-2c55485e2a62',
      role: 'aebd86cb-af9b-4dc6-9064-196e5c01cc85',
      notes: 'c6354b05-b652-4ebd-a13a-c6786cea307d',
    },
  },

  // ------------------------------------------- B1 card capture + A1 score

  fairLead: {
    object: '74beaacf-e15f-4791-bd7d-7ff49573410f',
    fields: {
      scanId: 'b0f62ac7-5963-484a-a566-08a1f0edb5be',
      person: 'ab4ece55-2c9f-45d6-aae4-b97ab358808e',
      company: 'e4580096-6f98-4bd2-a23a-aa9d117f0cd7',
      companyName: '21958a6f-ad7e-4fcf-a390-53c88c7ce5d0',
      source: 'f8c73817-917e-48b3-8deb-7bc14065276e',
      productInterest: 'a1b193ca-5825-4862-a2af-496527568a70',
      notes: 'c3472d31-5596-4cc4-a93c-14639f125b70',
      businessCardImage: 'e75b6f5c-2f09-41b6-b085-be3548ed8d59',
      followUpStatus: 'cf4b22a8-3c4f-4290-bfe8-c9ad1404dc2d',
      capturedAt: '5917d399-d564-4e2d-8169-6cd47ada5828',
      score: '1242c430-35b0-4a57-b4da-a105a1e6057e',
      scoreBreakdown: '9520b91a-3f97-48ee-9c23-2113a472bb0b',
      scoredAt: '97ec14ed-870b-43ca-81b7-376f36679799',
    },
  },

  // ------------------------------------------------------ C1 pricing engine

  pricingStrategy: {
    object: '4a93d535-2940-4f78-b099-6b036937eab8',
    fields: {
      name: '520b9c13-b66b-45b7-ab5f-37b92206c324',
      correlationId: 'd4405c9e-ba52-4052-805a-10f53c39d7e0',
      strategyType: '5bc32922-0be6-41ca-b291-7e85e22ca2e9',
      description: 'a97bc8ca-dc4a-4672-81ff-80750be9f313',
      isActive: 'a0b7cce5-ee7d-462f-b827-4bbb5ca6c436',
      validFrom: '57912e6e-6493-45a2-84c6-547d547fc82c',
      validUntil: '1862e2be-ffc0-4cc6-a003-e50f4f4586ac',
      displayMode: '59706016-bf06-48b0-a711-043333cb7c74',
      sortOrder: '0581954c-ba0d-48e8-8d26-822945505772',
      itemCount: '383ccb1c-da68-45f2-9823-0483c212b5fe',
      /** inverse of priceItem.strategy */
      items: '0419f7fe-7270-4e08-994c-83b8282bfcfb',
    },
  },

  priceItem: {
    object: 'ebd20485-ed8f-423a-89ff-3d1394b39f9b',
    fields: {
      name: 'f20cb2b3-cd1c-4811-a633-72fc79ea9914',
      strategy: '97341d0c-a84e-4ed2-8c73-e496eef95bba',
      productLine: 'b3f73e23-19b6-42fa-ac0e-d229724ffd7c',
      tier: '882935df-e0f1-4eeb-a6e8-4c0e80b4138e',
      description: '00aba843-5f59-4d6f-8c2c-45ad57776b15',
      annualFeeEur: '7315cc14-b389-4884-b7f4-0f6f07232485',
      setupFeeEur: '7c2611de-dd47-4ca6-bb81-67a30b19107a',
      currencyCode: '02c8046f-ec25-43fe-bcb4-de08e8072453',
      isHighlighted: '2d745fc0-2bf0-4ec0-b970-7b053bdbe9ea',
      isOnRequest: '5a6d4ebc-3b67-47cc-b0aa-78f5aa1750dc',
      sortOrder: 'ee63b9b9-462f-4449-8f30-ae7c50a4d853',
      correlationId: '004ccb5b-4fb4-47a1-9912-bda779f78bd0',
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
    enquiriesTable: {
      view: 'd96a3bf1-216d-469e-8ef4-398bfff5aadb',
      fields: [
        '5f17b590-d9a9-4c33-814a-2ca8a978f164',
        'b5fea20d-3616-4ca4-b4b9-7ddd2115361e',
        '9550036f-9a02-472d-bb1a-1dc1cccb1e44',
        'a9e9330d-0792-49cd-b1fa-60e44846a1b7',
        '53b5f630-0f92-4d42-9730-ce29d3d81d0e',
        'c5081ad2-8252-493c-860e-0c51aba23871',
        '3f33f633-cc52-488e-a44d-c78f8991724b',
      ],
      sort: 'b09eae76-0db4-4e60-818d-233dc84d00b8',
    },
    enquiriesKanban: {
      view: '60e4c78d-7215-4db4-b1ee-b78d39bbe7b6',
      groups: [
        '0b47cf81-5ab4-4550-8365-0f1f4e19fe2e',
        '66770c98-d6d1-43e4-a158-def323dffb19',
        '5a418e75-1c06-43d1-88c5-1b70ebe29a72',
        'a250945f-6067-4398-b100-6377092d2036',
        'fcce0074-f063-47d9-bbac-56aeb2582008',
      ],
      fields: [
        '5fba3aa9-91c3-43cc-adf0-93d795b029a1',
        '65c7ca2c-ae57-4aa6-944d-b2f76f3a1699',
        'dd747da0-18fa-4f73-90ea-d1a487efac5d',
        'ee41c88e-9749-4a27-b1c2-4d5dca8b32dd',
      ],
    },
    enquiryRequesterFields: {
      view: '19958f45-8115-46d9-878b-48a4b3370a69',
      fields: [
        '1a5bc500-4216-4f85-adac-32c3a72fae88',
        '0d977514-2c37-4eb6-9fb0-1aee8d84e2ea',
        'e3e314d0-2be6-4e0c-b68e-cc3ddbab67a3',
        '7e86fe12-5ffb-47e7-b1bf-afe2e3c0e189',
        '84175dca-1fb2-4e01-82f8-7c196c41bb28',
        '3d84a86a-3ca2-444c-ab2a-5c28db86def8',
        '638eb0bb-3992-4df5-9eb4-91f75c2dac36',
      ],
    },
    enquiryTriageFields: {
      view: 'eb985052-bceb-4c66-b487-88f11fa53e27',
      fields: [
        '7ebf857e-3731-4e8a-b224-c4b3e6a39aa1',
        '72c95e1d-f46b-4c4c-a3b6-bdae2247159a',
        'bba86e97-5d29-4aba-844e-007ff0dfffff',
        '1bfcd569-1d01-4062-a52c-4cb3a97d3192',
        '0f19cd1d-fe87-4ee3-9b00-b9c8d43de8ee',
        '37761c79-413c-493c-acf8-4b1ea2711505',
        '68589579-508c-4386-b6b1-61b9c5536349',
      ],
    },
    enquiryMessagesWidget: {
      view: '0074185e-21b3-406b-bc29-a92417ed003f',
      fields: [
        '098bb688-f2b9-4248-8a17-34e641a0a564',
        '167be3a7-0510-4d37-8142-ae5e41435cf6',
        '531ceb51-a6ae-4046-9813-0bb32eee1764',
        'd434b0e1-38b7-4a0b-84fb-0215196e8976',
        '2bfabfca-588a-4691-a1ec-9291553102f4',
      ],
      sort: 'a204a1d4-131e-4d7f-affe-a5f338a51e83',
    },
    streamsList: {
      view: '9dfc61d6-2ab5-4025-a0d0-e6f6b0f99e6d',
      fields: [
        'e6f9ef53-1947-4ec0-b839-dad5a381d2b9',
        '5ba0cc62-f220-49e6-aa1e-6a5aefe684e5',
        'cbabbfb6-d7d8-475e-9463-122b7913d077',
        'b9bd650c-8269-4ed4-a181-153c090088c2',
      ],
      sort: '2f0b9005-2847-4339-97ea-2227ac441e4b',
    },
    streamOverviewFields: {
      view: '604ef2aa-a09f-4654-8f43-3d38a33b81d9',
      fields: [
        '7b81ab71-5121-4691-9e02-f727bf3b30cb',
        '07fb09b5-30b8-4013-9765-8c63ddc172c1',
        '620514a8-40e4-4f39-b0a9-9243a35ac7cc',
        'aa31f945-1219-4e53-87fa-0bab7583fad0',
      ],
    },
    streamUpdatesWidget: {
      view: '8eb6d0d5-4bd9-42ea-9181-1fc293d42500',
      fields: [
        'fd7c311c-a63b-4216-b9fa-9ff5564b9a0f',
        '897fd0d2-b6a4-405c-9bba-dd5c03a76955',
        '85a37b63-3310-41ea-a6d9-8c35af5d0760',
        '15e9fe06-a7b6-4b92-84c2-7f4c8e42aa5b',
      ],
      sort: 'f69604c7-3db0-42f4-b33b-b15d9cdc1506',
    },
    streamDocumentsWidget: {
      view: '54911e9e-1d61-42f2-8dd5-bff764eded3f',
      fields: [
        '9bff6be7-54a6-4447-89bc-c0fa764ebbfe',
        '5f1f21c1-aeea-44ce-a388-0e68ded2e7c2',
        '782c6a44-1225-4819-a689-0b630edd7713',
        '3597442b-4a17-4555-94b4-ce465dcc585c',
        '3801ed36-1587-4d8e-9ee5-c272aaaf6ca3',
      ],
      sort: 'a0546ffa-87db-4948-bd00-35c365e39fb1',
    },
    streamContactsWidget: {
      view: '1d3bdd0c-c676-4ac2-961d-3452f5afaa91',
      fields: [
        'a33b0989-5086-4fe9-98ff-e6a7d13e83fb',
        '1d5b96d9-951f-472d-9ae8-7df02ad0cdcc',
        '7c28b39d-5f3b-47b2-a132-b7d40220ddc8',
      ],
    },
    pricingStrategiesTable: {
      view: 'da31d3aa-b9e4-47ac-8063-40e9b5e4fa32',
      fields: [
        '2428385b-6de1-4fd3-8f51-60f577623585',
        'b351700c-9256-4df3-9a18-e3df1dc3f0d4',
        'de6b2249-13e6-4120-b53c-96e5674428bd',
        '20b970ab-d513-45ed-82c2-ede338277542',
        '250165d5-5361-4e70-8d90-33ba937eee4c',
      ],
      sort: 'cb18754e-52f0-442e-a2ce-40ff341bfc36',
    },
    priceItemsTable: {
      view: '0efa6a99-e86f-43e5-bd23-8ebec14a11cf',
      fields: [
        '6e6476cc-7e17-476c-a6a1-d1729e8f2352',
        '2d4f49a8-12f5-4ada-83b5-af4305c1a452',
        '9a0e1b74-80d8-45af-a13d-a92eb5c80fac',
        '83e0c8d3-9e63-49d6-abb4-902645968a69',
        '3682a671-a4a4-4797-bca1-0c515d2b3e15',
      ],
      sort: '69355e6b-ff50-43a3-af1f-441c8177181c',
    },
    pricingStrategyOverviewFields: {
      view: 'bb9cf523-079e-4636-9e1e-66b71482253b',
      fields: [
        '81b8eb95-11d7-4749-bd54-6c9a938264e2',
        'a0a8b6f6-cd22-49ee-9ae6-5994bfe9a84b',
        '9892f016-47a8-4e3a-93f6-756cbcca66b3',
        '47a5363d-8fbd-477d-9afc-81f27a8b46e0',
        '592d29ee-14a3-41de-a3a6-8b3692b75d83',
        'f94062eb-3e94-49ca-ab84-1d694ba608d6',
        '892da0c1-9008-4cf8-a2fa-e7477507660a',
        '8dad10f3-1da4-416d-be60-aea10fa4394e',
        '23366032-b34b-4b05-a8d2-05e133f64208',
      ],
    },
    strategyPriceItemsWidget: {
      view: '71b6a3a8-edba-4900-a8a2-8968de232c57',
      fields: [
        '037abdcd-3607-4321-8541-a1dd6d3fdfd8',
        'a5d54d64-e4aa-4340-a322-6b8ecd01a98f',
        'bfa85c30-93fc-41bc-a76c-ada66365cd6e',
        'f4a84acc-d74e-4186-b7c7-dad20f5d260f',
        'ae30b65a-556c-450b-adc6-3de428526265',
        'e7213861-2790-4b1d-8235-c5ea6e48c5c4',
        '0a6efcfb-fead-4999-8cf4-163d01ad2f5f',
      ],
      sort: '4692047d-c1e9-402e-815e-04e000300eb9',
    },
  },

  frontComponents: {
    renewalBanner: '3d4e5f60-0001-4dde-a9f4-05162738495a',
    renewalCountWidget: '3d4e5f60-0002-4edf-ba05-162738495a6b',
    promoteToLeadButton: 'd736dec8-98e6-4e3f-9798-8983c93d700c',
    pricingDisplay: 'c62acce9-9a0d-441b-a6d7-46604fc14f0a',
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
    enquiryRecord: {
      layout: '82cd5400-83e7-4177-8153-917828d21b9f',
      tabs: {
        messages: '2c7f88e2-8a82-431f-aa2d-be7583f0010f',
        requester: '504014c9-fb52-43f1-b44f-302eb1141676',
        triage: '5ab6db8b-c617-4537-9e86-a91c1eeb95e2',
      },
      widgets: {
        requesterFields: '4c7fab12-15d9-40d7-886d-3c6a8413bef2',
        promoteToLead: 'af57d0a0-d82e-4ee6-a905-406dfdb62906',
        messages: 'f882ebbc-8d90-49cc-9a0a-7eced3b7c297',
        triageFields: '43bc2bc2-0b80-4200-89cd-5d0d34be67ba',
      },
    },
    productStreamRecord: {
      layout: 'bee62304-e06e-40d2-aa01-399f4b934695',
      tabs: {
        overview: '5ed435e3-df65-46ae-8853-4bfefe0dc1c6',
        updates: '2a6c4872-3410-4dba-9d2c-0c60b89f5761',
        documents: '2caf255a-ed5f-4bc8-acb3-525f1c72c5df',
        contacts: '7b706771-355d-4c8e-9bbf-fe9e4ca94f2a',
      },
      widgets: {
        overviewFields: '290a004d-6c6c-4464-8f5e-6e2e11aa7937',
        updates: 'a66684ab-ffe8-4be8-abf9-95bf79eeadda',
        documents: 'c4c7ceb5-e540-4d2d-bf83-65100ab15fc2',
        contacts: '89324e93-99f5-4b46-9923-60635538d353',
      },
    },
    pricingStrategyRecord: {
      layout: '2551cb6a-eb37-48ac-bba3-0b0ec6e32467',
      tabs: {
        overview: '9d0374e2-2609-4bc9-b11a-d8d402fc92e2',
        priceItems: '96e6522a-690c-411a-b2e4-0c7f7c9d9651',
      },
      widgets: {
        pricingPreview: '5b2d1543-c6b3-4ef4-9f17-2221b558cfa3',
        overviewFields: 'c7f604cd-100e-4d44-8dd2-c23bdce173a0',
        priceItems: 'bb1b5aa1-a790-4496-9495-9ba65c05ce7e',
      },
    },
  },

  navigation: {
    today: '60718293-0001-40f1-9c27-38495a6b7c8d',
    arMandates: '60718293-0002-41f2-ad38-495a6b7c8d9e',
    trainingEvents: '60718293-0003-42f3-be49-5a6b7c8d9eaf',
    authorities: '60718293-0004-43f4-8f5a-6b7c8d9eafb0',
    enquiries: '0ddf4836-2b27-4fb2-9276-d1658e37714c',
    productStreams: '6fdbe905-ea65-4ee3-af3d-7d7d6e4b72c3',
    pricing: '506d3e76-f244-41e7-a77b-7d1dce1e395f',
  },

  logicFunctions: {
    healthCheck: '51dcdb47-c1a9-4e7e-8514-71d8cf8ece12',
    companyCreated: 'b362ae3c-eaf9-4d42-a087-2a89a58d605a',
    dailyHeartbeat: 'e0ff6c28-c68a-40d6-a3e6-72871c45560c',
  },
} as const;
