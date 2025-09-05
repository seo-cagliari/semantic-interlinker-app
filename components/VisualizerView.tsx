import React from 'react';
import dynamic from 'next/dynamic';
import { Report } from '../types';
import { SiteVisualizerSkeleton } from './SiteVisualizerSkeleton';

// Isolate the dynamic import in its own component to resolve build issues.
const SiteVisualizer = dynamic(
  () => import('./SiteVisualizer').then(mod => mod.SiteVisualizer),
  { 
    ssr: false,
    loading: () => <SiteVisualizerSkeleton />
  }
);

interface VisualizerViewProps {
  report: Report;
}

const VisualizerView = ({ report }: VisualizerViewProps) => {
  return <SiteVisualizer report={report} />;
};

export default VisualizerView;