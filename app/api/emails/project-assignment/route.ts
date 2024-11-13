import { NextResponse } from 'next/server';
import { sendProjectAssignmentEmail } from '@/lib/emails';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentName, studentEmail, projectName, startTime, endTime } = body;

    await sendProjectAssignmentEmail({
      studentName,
      studentEmail,
      projectName,
      startTime,
      endTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in project assignment email route:', error);
    return NextResponse.json(
      { error: 'Failed to send project assignment email' },
      { status: 500 }
    );
  }
}