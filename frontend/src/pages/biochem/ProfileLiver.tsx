import React from 'react';
import { BiochemicalProfileView } from './BiochemicalProfileView';

export default function ProfileLiver() {
  return (
    <BiochemicalProfileView
      endpoint="/biochem/profiles/liver"
      badgeLabel="MODULE 3.1: HEPATOLOGY & LIVER FUNCTION"
    />
  );
}
