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

  /** App variables (src/index.ts), read by front components. */
  applicationVariables: {
    sidecarUrl: 'bb4f84fe-1f4f-4655-83d8-b0498e6e48ad',
    registrationToken: 'b3cb7d1c-83ad-464c-a2e9-44dba968df49',
  },

  company: {
    fields: {
      nameZh: 'c0a1f2d3-11e4-4a5b-8c6d-7e8f9a0b1c2d',
      wechatId: 'c0a1f2d3-22e4-4b5c-9d6e-8f9a0b1c2d3e',
      province: 'c0a1f2d3-33e4-4c5d-ad6f-9a0b1c2d3e4f',
      productCategory: 'c0a1f2d3-44e4-4d5e-be70-0b1c2d3e4f50',
      exportRevenueBand: 'c0a1f2d3-55e4-4e5f-8f71-1c2d3e4f5061',
      tier: 'c0a1f2d3-66e4-4f60-9072-2d3e4f506172',
      leadSource: 'c0a1f2d3-77e4-4f61-9184-3e4f50617283',
      /** inverse of arMandate.company */
      arMandates: 'a4b5c6d7-0004-4182-ad3e-4f5a6b7c8d9e',
      /** inverse of trainingEvent.company */
      trainingEvents: 'c6d7e8f9-0007-48a9-94af-b0c1d2e3f405',
      /** inverse of enquiry.relatedCompany */
      enquiries: '009dc9ed-35ba-4ae7-952c-601646de1a5c',
      /** inverse of fairLead.company */
      fairLeads: '9e48010c-03a2-41b2-ae5b-f6495207294e',
      /** inverse of trainingRegistration.company */
      trainingRegistrations: '310c403f-499f-4228-9acd-57cf73e3351b',
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
      leadSource: '9e0d1c2b-77a3-4f52-9384-c5d6e7f80a10',
      /** inverse of enquiry.relatedPerson */
      enquiries: '90a3371a-5168-4b4f-8703-76bcd727386d',
      /** inverse of fairLead.person */
      fairLeads: '92c347a1-dec4-4fa5-b940-3317c76dc7c4',
      /** inverse of streamContact.person */
      streamContacts: '2e1800e4-f142-46a7-9f1b-46ef4f191408',
      /** inverse of trainingRegistration.person */
      trainingRegistrations: 'ffd839c7-84c1-4870-8462-28f7d3d5d6c0',
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
      language: 'f856755b-32f4-4efd-b1d6-221045625c24',
      location: '045bfcba-55de-4e73-a348-710f327596eb',
      /** inverse of trainingRegistration.trainingEvent */
      registrations: 'fc3c81d4-3bff-426d-864a-8377d381e0da',
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

  /** E2: auto-reply templates (category × language). */
  replyTemplate: {
    object: 'd9f42420-bc32-4939-8441-2ece82bdaf23',
    fields: {
      name: '29413693-c01f-49e5-9a8a-796f120da16b',
      category: '1c7bebfa-3711-4d96-ae21-4cae2cad6f1d',
      language: 'ee62cd27-e910-4466-ae34-c64dbdd70521',
      subject: '76929eca-56a9-4889-a159-f46f3d18e56f',
      body: 'cc3c117e-7f4c-466c-95a6-97cdf6356d7c',
      isActive: '1d1b5db1-f3cc-4637-b573-161aa67b7a41',
      sortOrder: '9654c1d7-aa17-41ed-9c5e-4c6a9725562c',
    },
  },

  // --------------------------------------------- A2 LinkedIn lead discovery

  /** One Apify actor run (harvestapi/linkedin-company). */
  leadDiscoveryRun: {
    object: 'ea47faee-1ca9-42f6-ae33-087b0fc69aa2',
    fields: {
      name: '26211887-f323-444a-bdce-3ba03897abad',
      status: 'e375dde3-a19a-4030-a7e9-0b7516d3b7b3',
      source: '4c377b1c-9765-414b-93ab-103f8d12297a',
      query: '361efceb-3f51-4d14-82db-4d798b9fd0f0',
      resultsCount: '834ab41e-2fd2-474f-9107-4bae1dd1787b',
      resultsNew: '7643254d-9e85-4fdc-8f97-c8ad859b3c08',
      costUsd: '1956f0b0-bb1f-4f2e-a2dc-f4d14c018b76',
      runId: '5d9963f5-c4bf-4a51-8427-94f94dd11272',
      startedAt: '5ebd3006-a4c3-4a30-b403-2f8893f9a7bd',
      completedAt: 'ad5a1781-f585-4f14-a31f-e724aa1901d2',
      errorMessage: 'c8f5e353-e586-4161-8453-21317fea2dd2',
      /** inverse of discoveredCompany.discoveryRun */
      discoveredCompanies: 'ca198873-0eef-4c99-ba67-99b23bd0eaae',
    },
  },

  discoveredCompany: {
    object: '21e4dd96-32d6-4dd5-b96f-059639532279',
    fields: {
      discoveryRun: '8ebc20c5-ac7b-423d-9248-09911d5df800',
      companyName: 'a5614fda-e88c-4a57-94c7-909710c37d80',
      companyNameZh: '46e079e0-9680-4872-8880-9c78b57a156a',
      website: '2fdc3625-7b54-4a5c-8c23-d79dab1c1b43',
      linkedinUrl: '5eba51cc-91c8-4f50-839d-06704ffe7f39',
      industry: '72c2aee6-3532-4878-8b7c-a62effc0e8f5',
      companySize: 'ab5f7549-7268-4b07-b1b5-23249d9b5a48',
      headquarters: '9983883a-e3f9-4a31-9121-07332045a773',
      productCategories: '68b5214f-3035-4da9-8587-e69ff4010d54',
      description: 'aa3baa9d-86d6-4243-b576-d537e585a2b7',
      emailDomains: '052278a4-4bf1-456b-b4be-6528679b444b',
      isExportedToCRM: '86f0f546-dbab-4b8c-b764-a57e617f3838',
      exportedCompanyId: '1405460e-d0f9-4a89-a7b4-4f2c76ad14eb',
      isDuplicate: '8076b7e3-d86f-41d5-a205-6bd3ebbee9b8',
      score: '7a6f379c-caa6-4366-9555-f7deaddfb4e7',
      scoreBreakdown: 'd02918ef-af9a-4eec-a910-0999ef6bc876',
    },
  },

  // ------------------------------------------------- X5 training registration

  trainingRegistration: {
    object: 'd7ea3aa1-b3c0-4002-8c9c-257dd4302195',
    fields: {
      name: '25d1e4bc-e3b5-469d-80fc-caf50857733f',
      trainingEvent: '02b39ee2-6b5a-4884-864d-99f19ea6538a',
      person: 'a2cdb554-73ce-41a7-9384-6270be475d71',
      company: '5cdfffa0-b939-4719-ac18-3f7594496208',
      status: '18b4c5e8-25e9-49cd-b301-4a489d8c2aaa',
      registrationDate: '8b564c49-7700-45c0-9d22-8a385a8d1314',
      confirmationSentAt: 'f009b26b-0c2d-4824-adc7-c436d0cf7422',
      notes: 'cf261217-9dfc-4a15-a4a3-d21f21aa2a73',
      dietaryRequirements: 'd07ceda4-3937-4617-84c2-b9a4d6c1aca2',
      certificateIssued: '7c15d680-7657-49f8-8cbb-a92747a98816',
      certificateUrl: '3566fe9a-9841-4482-9da6-eb52443af2ee',
    },
  },

  // ------------------------------------------------- C3 portal sync

  customerEvent: {
    object: 'd570f2dc-ab08-44c3-bec3-2dec378a0cff',
    fields: {
      name: '1e8d94bc-cc3f-4db0-b033-0d0791b5f54c',
      eventType: '2128d828-5db4-493a-aca7-0741927961cf',
      customer: 'b41036f0-43a8-4da4-8f57-906e4789a2f0',
      data: 'c408ffa2-9fa8-44cf-a0cc-5e87e881172d',
      source: 'caca0e97-d244-4b11-8932-386eecb444e0',
      stripeEventId: '817dc3be-ff95-4c5b-b38d-d1e1a69cd46b',
      processedAt: 'd4f616dd-13e9-44bb-9999-94bd38798235',
      notes: 'f0f0a778-0f69-484b-865b-46ee07802733',
    },
  },

  // ------------------------------------------------- D1-D2 AI market research

  researchBrief: {
    object: '5f587b73-e6ce-4ddf-8c1c-f0b62241af01',
    fields: {
      title: '526ec13f-4815-415a-b387-3c3df4878570',
      topic: '174a57c6-3e47-454a-b140-d2bde3abb8b8',
      scope: '34f4d439-9051-46da-8e1d-eaa06584ba50',
      depth: 'dc39570e-3972-4b80-9c36-07be4aca4ea2',
      prompt: '31abde87-4005-4986-b63d-850461dc4105',
      status: '6fe800fd-1b18-4f18-8b97-d4aa1ed92d35',
      result: 'd59cf536-d506-4231-894b-c9cf3aeae872',
      resultJson: 'c6c0c1de-db7c-4956-94ae-c119f735cbea',
      costUsd: 'c47dc277-ee79-45b6-9c4a-57d56d56f609',
      submittedAt: 'cb96bb6c-eff4-4225-bf63-686f7e4a9d9c',
      completedAt: '54ef6b1d-f477-4919-9bdb-3e02a27e716e',
      sourceUrls: 'a103bcd3-6627-4876-9cb5-580609964e22',
      isVerified: '97445c6a-d988-4eee-85f2-504ad544f539',
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
    replyTemplatesTable: {
      view: '851e7855-99f0-4236-9526-379a11049d36',
      fields: [
        '727e8eaf-30e0-4682-a9f1-b64aef05885c',
        'dcda2603-727f-45e9-915e-7c2c17cf0042',
        '68a81f99-b9b4-4a1b-a890-c8da75dd779b',
        '944ed5bf-b27e-4eb7-82a9-5953e7a2c1fc',
      ],
      sort: 'a7f69b77-a9d5-4136-a06e-89030942a5d0',
    },    leadDiscoveryRunsTable: {
      view: '26a0d67d-a171-461f-8dd1-6b89d3233d91',
      fields: [
        '67700238-32f1-4d25-bdd4-3fafdcd91334',
        '4a55dd50-8954-4800-92c9-de1e09fed3d2',
        '0612c217-475a-4988-86cd-519bcbe64ab3',
        '9214c84d-4716-414e-b9ee-011bf77e2e59',
        '2f1962ea-0775-40f1-b2f6-ca9b33bd53b8',
        '3e4237d9-8af0-4560-9158-959d2d8ca5ed',
        '592ac1c0-79a8-4f67-8f4f-df9b260ba2cd',
      ],
      sort: 'ddb00f38-925f-47fe-b776-464a24c6baca',
    },
    discoveredCompaniesTable: {
      view: '89cbbb30-9edc-47fb-b651-1a2c3eb68079',
      fields: [
        'af534dbb-683a-45e2-ad3a-0c214ee97830',
        '2cac99af-a8f2-46af-ae21-f14b553f9c4c',
        'a283ff03-b050-441b-819d-8c8c04a5780b',
        '5cfbe6e2-b8e9-4bcd-b49b-2956f92fcd38',
        '59a863d9-7479-4ffa-bcb6-e018ae2c0426',
      ],
      sort: '0088517a-8865-4274-b6fd-f6ce4b2b0c23',
    },
    trainingRegistrationsTable: {
      view: 'd4e48721-494b-48ad-844b-35cde8d0f772',
      fields: [
        '7c52298c-0e64-4524-bd76-838019c56aff',
        '97e06ba6-851d-485d-b2c3-b99dcb959ebf',
        '49eb6145-cdc1-4c82-a2f4-27fbb3e5f377',
        '1f7cccf2-7b95-4e3a-8ccb-fc98675a9a2c',
        'e0fcd470-0e98-432a-9851-61242888b928',
      ],
      sort: '879abb88-943b-4f3c-8052-aa0db06a59b8',
    },
    trainingEventRegistrationsWidget: {
      view: '1f63e9b8-4f18-4e71-bf83-fbd933eb9a5c',
      fields: [
        'c7fc2558-48b9-46e9-8be8-09cd1c2a690a',
        'b2d3f195-301c-451a-96ce-4b7025a5c108',
        'c0daba0e-111d-48c4-8395-30f1f302a7e3',
        'e18dc87e-ab6a-466d-9148-160b54487632',
        '0a5bf4a0-3575-4446-8d38-ea345a13bf3e',
      ],
      sort: '9894b771-13e4-416a-98b3-c628fc5bb021',
    },
    trainingEventOverviewFields: {
      view: 'a66993ac-59df-4385-a342-a6afc59422fd',
      fields: [
        'e4092d6c-a8b7-41d0-9f6b-82a600dfee0d',
        '0454f669-f5e5-4058-98e0-60dfe8950053',
        'c4dd9d82-5f7a-45f1-9cfa-1a30b97c5e55',
        '06169218-5e3e-4cd8-8486-b3a07667960f',
        '6b3da6ef-f3d8-4892-9f70-82fd14d71e84',
        '49c3ff95-4963-4df6-b15f-13adb0d10026',
      ],
    },
    customerEventsTable: {
      view: 'd0be6fd5-570b-4474-af29-5b62042aa87f',
      fields: [
        '80a55da9-b440-4b87-b325-24c668bca22d',
        'a1ac1fd1-259c-4766-b558-28b86a5ec8ae',
        '69a1a942-7c58-4cfb-af1c-86169dbf3080',
        'f40c01b2-dc87-47f8-9cdb-4eb34049f349',
      ],
      sort: '9fa179a9-eed7-4b70-a95e-3e2e2470d9bc',
    },
    researchBriefsTable: {
      view: 'bbbb44d9-7cd9-43a4-8cbc-1fa5bdf046f3',
      fields: [
        '5151a2ff-df8d-4179-a154-fbffa0cb736f',
        '8892453e-95f7-41e8-a63f-f8c4696cc210',
        '39d36a76-ce88-4038-97c6-5eca448845dd',
        '3422d25b-4930-4110-985f-c70ceb42b95d',
        'd56809d9-0a32-48b9-a2e2-d863f182e6bf',
        'd3b256be-91e3-40e8-9226-260192aa86d2',
      ],
      sort: '95c3cd82-bd3b-413e-8573-8769b564db01',
    },
    researchBriefOverviewFields: {
      view: 'ddafdd8b-c045-4b5b-99e4-bd78fa23c109',
      fields: [
        'f6788cdf-f75b-4871-9877-4df2b02bf446',
        'e7b5a121-ec6f-4e9b-8cc0-8ac53af65b10',
        '6fd6ce33-fe6f-41ea-8741-64c866028601',
        'bea794f7-d5d3-471a-a17d-48c0ac7bb937',
        '884e7a25-663e-496e-984e-a19dd226fc39',
        '3705720b-3f81-4aad-b9a4-15182ee837cd',
        '04b1342d-0e48-4116-843b-fbc8f2d6bee0',
        'd1f45f09-8920-4c35-8ba8-19f05c125c99',
        '33a47507-5762-44b0-8da7-b40a3806876b',
        '9918a20b-f555-4894-adee-c61ab7cdda47',
        '00628f57-a553-4e5a-a7b9-0dbd79dbf6c4',
        '89b5541f-f7bc-4da9-80b2-21410eaafe24',
        'c24b225a-473b-4fa8-8409-5586d37f4dc7',
      ],
    },
    researchBriefResultFields: {
      view: 'bdae03bc-ea74-4f10-a07c-d1a322458d9e',
      fields: [
        '863cc67a-1ecf-493c-ad86-45e6dcc30c52',
      ],
    },
  },

  frontComponents: {
    renewalBanner: '3d4e5f60-0001-4dde-a9f4-05162738495a',
    renewalCountWidget: '3d4e5f60-0002-4edf-ba05-162738495a6b',
    promoteToLeadButton: 'd736dec8-98e6-4e3f-9798-8983c93d700c',
    pricingDisplay: 'c62acce9-9a0d-441b-a6d7-46604fc14f0a',
    registerForTrainingButton: '453e813e-efe6-4f54-91ae-d83592da0768',
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
    trainingEventRecord: {
      layout: 'e4081265-97fd-41ca-8d02-bc97075dbe18',
      tabs: {
        overview: '7e1e627f-7973-48c1-9044-888246a591c3',
        registrations: 'cee239f0-f623-4396-8116-426daf339d0e',
      },
      widgets: {
        registerButton: 'c796810e-22ad-49ac-8232-18fec4a2c066',
        overviewFields: 'd9fcef81-6049-4c18-a8a2-716f33983ffe',
        registrations: 'b3e632d5-c434-4bc3-9a6c-44060066301c',
      },
    },
    researchBriefRecord: {
      layout: '00d62429-77bc-407b-b7d7-7e6aeba90c1e',
      tabs: {
        overview: '26ecb350-3b9d-4c96-b658-d145ae47b294',
        rawResult: '66ec8bae-0f40-4674-8f3d-12da33fbca88',
      },
      widgets: {
        overviewFields: 'e3e45fb8-896d-4c4a-8224-3e9e3599ac17',
        rawResult: '35ab25e2-d9d6-429e-8d90-4c6a545c1020',
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
    leadDiscovery: 'b85ea1d6-f8cd-460c-8491-5e66a540c065',
    portalEvents: '9c08b4b3-230b-40be-b966-d41c742efef5',
    marketResearch: '67888fed-5e50-4f6e-aaf8-f4ca4e4c3014',
  },

  logicFunctions: {
    healthCheck: '51dcdb47-c1a9-4e7e-8514-71d8cf8ece12',
    companyCreated: 'b362ae3c-eaf9-4d42-a087-2a89a58d605a',
    dailyHeartbeat: 'e0ff6c28-c68a-40d6-a3e6-72871c45560c',
  },
} as const;
