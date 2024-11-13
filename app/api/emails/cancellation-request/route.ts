import { NextResponse } from 'next/server';
import { sendCancellationRequestEmail } from '@/lib/emails';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      adminName,
      adminEmail,
      requesterName,
      requesterRole,
      projectName,
      shiftDate,
      shiftTime,
      reason,
    } = body;

    await sendCancellationRequestEmail({
      adminName,
      adminEmail,
      requesterName,
      requesterRole,
      projectName,
      shiftDate,
      shiftTime,
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in cancellation request email route:', error);
    return NextResponse.json(
      { error: 'Failed to send cancellation request email' },
      { status: 500 }
    );
  }
}