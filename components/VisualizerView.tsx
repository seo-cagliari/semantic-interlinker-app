import React from 'react';
import dynamic from 'next/dynamic';
import { Report } from '../types';
import { SiteVisualizerSkeleton } from './SiteVisualizerSkeleton';

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

const VisualizerView = (props: VisualizerViewProps) => {
  const { report } = props;
  return <SiteVisualizer report={report} />;
};

export default VisualizerView;