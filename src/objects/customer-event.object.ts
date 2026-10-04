/**
 * Customer Event (C3) — one thing a customer did on the portal or in Stripe:
 * a purchase, renewal, cancellation, plan change, support request or login.
 * Created by src/functions/sync-portal-event.ts from the portal's POST.
 *
 * `customer` is an e-mail address or a company name, as the portal knows the
 * customer; it is matched to a Person / Company when an event opens an
 * Opportunity. `data` is the portal's JSON payload as given. `stripeEventId`
 * is set for events that come from Stripe, and de-duplicates its retries.
 * `name` ("<EVENT_TYPE> — <customer>") is set by the function and is only
 * there to give the record a readable label identifier.
 */
import { defineObject } from '../lib/sdk';
import { dateTime, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { CUSTOMER_EVENT_SOURCE, CUSTOMER_EVENT_TYPE } from '../options';

const F = IDS.customerEvent.fields;

export default defineObject({
  universalIdentifier: IDS.customerEvent.object,
  nameSingular: 'customerEvent',
  namePlural: 'customerEvents',
  labelSingular: 'Customer Event',
  labelPlural: 'Customer Events',
  description: 'A customer action reported by the portal or Stripe (purchase, renewal, cancellation, …)',
  icon: 'IconActivity',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Event · 事件',
      icon: 'IconActivity',
    }),
    select({
      universalIdentifier: F.eventType,
      name: 'eventType',
      label: 'Event type · 事件类型',
      icon: 'IconBolt',
      options: CUSTOMER_EVENT_TYPE,
    }),
    text({
      universalIdentifier: F.customer,
      name: 'customer',
      label: 'Customer · 客户',
      icon: 'IconUser',
      description: 'E-mail address or company name',
    }),
    richText({
      universalIdentifier: F.data,
      name: 'data',
      label: 'Data · 数据',
      icon: 'IconBraces',
      description: 'The portal\'s JSON payload',
    }),
    select({
      universalIdentifier: F.source,
      name: 'source',
      label: 'Source · 来源',
      icon: 'IconPlugConnected',
      options: CUSTOMER_EVENT_SOURCE,
      defaultValue: 'PORTAL',
    }),
    text({
      universalIdentifier: F.stripeEventId,
      name: 'stripeEventId',
      label: 'Stripe event ID',
      icon: 'IconBrandStripe',
    }),
    dateTime({
      universalIdentifier: F.processedAt,
      name: 'processedAt',
      label: 'Processed at · 处理时间',
      icon: 'IconClockCheck',
    }),
    text({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
  ],
});
