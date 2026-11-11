import React from 'react';
import { BiochemicalProfileView } from './BiochemicalProfileView';

export default function ProfileMetabolic() {
  return (
    <BiochemicalProfileView
      endpoint="/biochem/profiles/metabolic"
      badgeLabel="MODULE 3.4: GLYCEMIA & METABOLIC SYNDROME"
    />
  );
}
