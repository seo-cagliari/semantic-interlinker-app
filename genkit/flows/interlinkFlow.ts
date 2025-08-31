
import { Report } from '../../types';
import { mockReport } from '../../services/mockData';

// This is a mock implementation of the Genkit flow.
// It simulates the behavior of the real flow for UI development purposes.
export async function interlinkFlow(options: {
  site_root: string;
  date_range?: string;
  maxSuggestionsPerPage?: number;
  scoreThreshold?: number;
  applyDraft: boolean;
}): Promise<Report> {
  console.log("Mock interlinkFlow triggered with options:", options);

  // Simulate network delay and processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!options.site_root) {
      throw new Error("site_root is required for analysis.");
  }

  // In a real scenario, this would generate a new report.
  // Here, we return the static mock report but update the site URL and timestamp.
  const report: Report = {
    ...mockReport,
    site: options.site_root,
    generated_at: new Date().toISOString(),
  };

  return report;
}