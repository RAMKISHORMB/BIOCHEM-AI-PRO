import React from 'react';
import { BiochemicalProfileView } from './BiochemicalProfileView';

export default function ProfileElectrolyte() {
  return (
    <BiochemicalProfileView
      endpoint="/biochem/profiles/electrolyte"
      badgeLabel="MODULE 3.3: ELECTROLYTES, MINERALS & TONICITY"
    />
  );
}
