
export const dynamic = 'force-dynamic';

export async function GET() {
  const clientIdExists = !!process.env.GOOGLE_CLIENT_ID;
  const clientSecretExists = !!process.env.GOOGLE_CLIENT_SECRET;
  const redirectUriExists = !!process.env.NEXT_PUBLIC_GSC_REDIRECT_URI;

  const diagnostics = {
    clientIdExists,
    clientSecretExists,
    redirectUriExists,
  };

  return Response.json(diagnostics);
}
