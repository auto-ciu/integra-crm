/**
 * Training Event — the low-trust entry point of the flywheel (webinars,
 * Canton Fair sessions, on-site training). Many-to-one to Company is enough
 * for now; attendee-level registration is a later requirement.
 */
import { defineObject } from '../lib/sdk';
import { date, manyToOne, number, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { TRAINING_CHANNEL } from '../options';

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
  ],
});
