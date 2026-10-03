/**
 * PromoteToLeadButton — top of the Enquiry record page (Messages tab).
 *
 * STUB. The conversion (match/create Company, link Person and set leadStatus
 * QUALIFIED, create an Opportunity at stage LEAD, set
 * enquiry.relatedOpportunity, add a NOTE message) comes later as the
 * `enquiry-promote` route. Until then a click only says so, so nobody mistakes
 * a silent button for a done conversion.
 */
import { useState } from 'react';
import { useRecordId } from 'twenty-sdk/front-component';

import { defineFrontComponent } from '../lib/sdk';
import { IDS } from '../ids';
import { card, font, muted } from '../lib/theme';

export const PromoteToLeadButton = () => {
  const recordId = useRecordId();
  const [clicked, setClicked] = useState(false);

  return (
    <div
      data-testid="promote-to-lead"
      style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
    >
      <button
        type="button"
        disabled={!recordId}
        onClick={() => setClicked(true)}
        style={{
          fontFamily: font.body,
          fontSize: 'var(--t-font-size-md, 13px)',
          fontWeight: 500,
          color: 'var(--t-font-color-inverted)',
          background: 'var(--t-color-blue)',
          border: '1px solid var(--t-color-blue)',
          borderRadius: 'var(--t-border-radius-sm, 4px)',
          padding: '6px 12px',
          cursor: recordId ? 'pointer' : 'default',
        }}
      >
        Promote to Lead
      </button>
      {clicked && (
        <span role="status" style={muted}>
          Not available yet: promotion to Company + Person + Opportunity is still being built.
        </span>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: IDS.frontComponents.promoteToLeadButton,
  name: 'PromoteToLeadButton',
  description: 'Promote an enquiry to a lead (stub)',
  component: PromoteToLeadButton,
});
