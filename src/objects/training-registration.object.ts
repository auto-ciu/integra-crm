/**
 * Training Registration — one Person signed up for one Training Event (X5).
 * Created by src/functions/register-for-training.ts (status REGISTERED),
 * from the RegisterForTrainingButton on the Training Event record page.
 *
 * `name` ("<event> — <person>") is set by the function and is only there to
 * give the record a readable label identifier.
 */
import { defineObject } from '../lib/sdk';
import { boolean, dateTime, link, manyToOne, oneToMany, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { TRAINING_REGISTRATION_STATUS } from '../options';

const F = IDS.trainingRegistration.fields;

export default defineObject({
  universalIdentifier: IDS.trainingRegistration.object,
  nameSingular: 'trainingRegistration',
  namePlural: 'trainingRegistrations',
  labelSingular: 'Training Registration',
  labelPlural: 'Training Registrations',
  description: 'A person registered for a training event',
  icon: 'IconTicket',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Registration · 报名',
      icon: 'IconTicket',
    }),
    manyToOne({
      universalIdentifier: F.trainingEvent,
      name: 'trainingEvent',
      label: 'Training event · 培训活动',
      icon: 'IconSchool',
      targetObjectId: IDS.trainingEvent.object,
      inverseFieldId: IDS.trainingEvent.fields.registrations,
    }),
    manyToOne({
      universalIdentifier: F.person,
      name: 'person',
      label: 'Person · 联系人',
      icon: 'IconUser',
      targetObjectId: STANDARD.person.object,
      inverseFieldId: IDS.person.fields.trainingRegistrations,
    }),
    manyToOne({
      universalIdentifier: F.company,
      name: 'company',
      label: 'Company · 公司',
      icon: 'IconBuildingSkyscraper',
      targetObjectId: STANDARD.company.object,
      inverseFieldId: IDS.company.fields.trainingRegistrations,
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: TRAINING_REGISTRATION_STATUS,
      defaultValue: 'REGISTERED',
    }),
    dateTime({
      universalIdentifier: F.registrationDate,
      name: 'registrationDate',
      label: 'Registered at · 报名时间',
      icon: 'IconCalendarPlus',
    }),
    dateTime({
      universalIdentifier: F.confirmationSentAt,
      name: 'confirmationSentAt',
      label: 'Confirmation sent · 确认已发送',
      icon: 'IconMailForward',
    }),
    text({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
    text({
      universalIdentifier: F.dietaryRequirements,
      name: 'dietaryRequirements',
      label: 'Dietary requirements · 饮食要求',
      icon: 'IconToolsKitchen2',
    }),
    boolean({
      universalIdentifier: F.certificateIssued,
      name: 'certificateIssued',
      label: 'Certificate issued · 已颁发证书',
      icon: 'IconCertificate',
    }),
    link({
      universalIdentifier: F.certificateUrl,
      name: 'certificateUrl',
      label: 'Certificate · 证书',
      icon: 'IconLink',
    }),
    oneToMany({
      universalIdentifier: F.opportunityLines,
      name: 'opportunityLines',
      label: 'Opportunity lines · 商机明细',
      icon: 'IconListDetails',
      description: 'Pipeline lines pricing this training seat',
      targetObjectId: IDS.opportunityLine.object,
      inverseFieldId: IDS.opportunityLine.fields.trainingRegistration,
    }),
  ],
});
