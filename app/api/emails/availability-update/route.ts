import { NextResponse } from 'next/server';
import { sendAvailabilityUpdateEmail } from '@/lib/emails';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userName, userEmail, role, availabilities } = body;

    await sendAvailabilityUpdateEmail({
      userName,
      userEmail,
      role,
      availabilities,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in availability update email route:', error);
    return NextResponse.json(
      { error: 'Failed to send availability update email' },
      { status: 500 }
    );
  }
}