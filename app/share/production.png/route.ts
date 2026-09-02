import { createProductionImageResponse } from "./_image";

export const dynamic = "force-static";

export async function GET() {
  return createProductionImageResponse();
}
