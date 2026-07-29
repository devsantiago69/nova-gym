export const dynamic = "force-dynamic";

export async function GET() {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const body = publisherId
    ? `google.com, ${publisherId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
    : "# Nova Gym: pendiente de configurar NEXT_PUBLIC_ADSENSE_CLIENT_ID\n";
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
