/**
 * Training Event — the low-trust entry point of the flywheel (webinars,
 * Canton Fair sessions, on-site training). Attendees sign up as Training
 * Registrations (X5); `language` and `location` say who the event is for and
 * where it happens (ops/seed-training-events.mjs).
 */
import { defineObject } from '../lib/sdk';
import { date, manyToOne, number, oneToMany, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { LANGUAGE, TRAINING_CHANNEL } from '../options';

const F = IDS.trainingEvent.fields;

export default defineObject({
  universalIdentifier: IDS.trainingEvent.object,
  nameSingular: 'trainingEvent',
  namePlural: 'trainingEvents',
  labelSingular: 'Training Event',
  labelPlural: 'Training Events',
  description: 'A webinar, fair session or on-site training delivered to a manufacturer',
  icon: 'IconSchool',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    // Kept as Twenty's conventional `name` column (safest label-identifier
    // choice); the operator sees it as "Title".
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Title · 标题',
      icon: 'IconSchool',
    }),
    date({
      universalIdentifier: F.date,
      name: 'date',
      label: 'Date · 日期',
      icon: 'IconCalendarEvent',
    }),
    select({
      universalIdentifier: F.channel,
      name: 'channel',
      label: 'Channel · 渠道',
      icon: 'IconBroadcast',
      options: TRAINING_CHANNEL,
      defaultValue: 'WEBINAR',
    }),
    number({
      universalIdentifier: F.attendeeCount,
      name: 'attendeeCount',
      label: 'Attendees · 参加人数',
      icon: 'IconUsers',
    }),
    manyToOne({
      universalIdentifier: F.company,
      name: 'company',
      label: 'Company · 公司',
      icon: 'IconBuildingSkyscraper',
      targetObjectId: STANDARD.company.object,
      inverseFieldId: IDS.company.fields.trainingEvents,
    }),
    select({
      universalIdentifier: F.language,
      name: 'language',
      label: 'Language · 语言',
      icon: 'IconLanguage',
      options: LANGUAGE,
    }),
    text({
      universalIdentifier: F.location,
      name: 'location',
      label: 'Location · 地点',
      icon: 'IconMapPin',
      description: '"Online", or the city',
    }),
    oneToMany({
      universalIdentifier: F.registrations,
      name: 'registrations',
      label: 'Registrations · 报名',
      icon: 'IconTicket',
      targetObjectId: IDS.trainingRegistration.object,
      inverseFieldId: IDS.trainingRegistration.fields.trainingEvent,
    }),
  ],
});
