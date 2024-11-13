import { NextResponse } from 'next/server';
import { sendRequestStatusUpdateEmail } from '@/lib/emails';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userName,
      userEmail,
      requestType,
      newStatus,
      projectName,
      shiftDetails,
    } = body;

    await sendRequestStatusUpdateEmail({
      userName,
      userEmail,
      requestType,
      newStatus,
      projectName,
      shiftDetails,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in request status update email route:', error);
    return NextResponse.json(
      { error: 'Failed to send request status update email' },
      { status: 500 }
    );
  }
}