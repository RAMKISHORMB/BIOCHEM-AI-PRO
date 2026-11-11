import React from 'react';
import { BiochemicalProfileView } from './BiochemicalProfileView';

export default function ProfileRenal() {
  return (
    <BiochemicalProfileView
      endpoint="/biochem/profiles/renal"
      badgeLabel="MODULE 3.2: NEPHROLOGY & RENAL FUNCTION"
    />
  );
}
