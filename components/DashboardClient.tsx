'use client';

import React from 'react';

// This component has been made obsolete.
// Its logic has been merged directly into `app/dashboard/page.tsx`
// to resolve a critical client-side hydration error by simplifying the
// component tree and ensuring state is managed at the page level.
// This file can be safely removed in future refactoring.
const DashboardClient = () => {
  return null;
};

export default DashboardClient;