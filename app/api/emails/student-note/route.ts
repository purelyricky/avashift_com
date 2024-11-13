import { NextResponse } from 'next/server';
import { sendStudentNoteEmail } from '@/lib/emails';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminName, adminEmail, studentName, projectName, leaderName, note } = body;

    await sendStudentNoteEmail({
      adminName,
      adminEmail,
      studentName,
      projectName,
      leaderName,
      note,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in student note email route:', error);
    return NextResponse.json(
      { error: 'Failed to send student note email' },
      { status: 500 }
    );
  }
}