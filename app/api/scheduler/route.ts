import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret=process.env.CRON_SECRET;
  if(secret && request.headers.get("authorization")!==`Bearer ${secret}`) return new NextResponse("Unauthorized",{status:401});
  return NextResponse.json({ok:true,service:"sam-scheduler",timestamp:new Date().toISOString()});
}
