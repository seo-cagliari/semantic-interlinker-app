/**
 * API route placeholder for applying draft modifications to WordPress.
 * This endpoint is not yet implemented. It is intended to receive a suggestion
 * and apply it as a draft change on the target WordPress site.
 */

// A convention for serverless functions to not be cached
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // NOTE: The implementation for this endpoint is pending.
  // It will require secure authentication with WordPress and logic
  // to apply the specific HTML changes.
  console.warn('Received request to /api/draft, but the endpoint is not implemented.');

  return Response.json(
    { 
      message: 'Funzionalità non ancora implementata.',
      details: 'La possibilità di applicare le modifiche come bozza direttamente da qui sarà disponibile in una versione futura.'
    }, 
    { 
      status: 501 // 501 Not Implemented
    }
  );
}
