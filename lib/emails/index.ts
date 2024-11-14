import { AvailabilityUpdateEmail } from '@/components/emails/AvailabilityUpdateEmail';
import { CancellationRequestEmail } from '@/components/emails/CancellationRequestEmail';
import { ProjectAssignmentEmail } from '@/components/emails/ProjectAssignmentEmail';
import { RequestStatusUpdateEmail } from '@/components/emails/RequestStatusUpdateEmail';
import { StudentNoteEmail } from '@/components/emails/StudentNoteEmail';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendProjectAssignmentEmail = async ({
  studentName,
  studentEmail,
  projectName,
  startTime,
  endTime,
}: {
  studentName: string;
  studentEmail: string;
  projectName: string;
  startTime: string;
  endTime: string;
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <onboarding@resend.dev>',
      to: studentEmail,
      subject: 'New Shift Assignment',
      react: ProjectAssignmentEmail({
        studentName,
        projectName,
        startTime,
        endTime,
      }),
    });
  } catch (error) {
    console.error('Error sending project assignment email:', error);
    throw error;
  }
};

export const sendAvailabilityUpdateEmail = async ({
  userName,
  userEmail,
  role,
  availabilities,
}: {
  userName: string;
  userEmail: string;
  role: string;
  availabilities: Array<{ day: string; type: 'day' | 'night' }>;
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <onboarding@resend.dev>',
      to: userEmail,
      subject: 'Availability Update Confirmation',
      react: AvailabilityUpdateEmail({
        userName,
        role,
        availabilities,
      }),
    });
  } catch (error) {
    console.error('Error sending availability update email:', error);
    throw error;
  }
};

export const sendStudentNoteEmail = async ({
  adminName,
  adminEmail,
  studentName,
  projectName,
  leaderName,
  note,
}: {
  adminName: string;
  adminEmail: string;
  studentName: string;
  projectName: string;
  leaderName: string;
  note: string;
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <onboarding@resend.dev>',
      to: adminEmail,
      subject: `Student Note: ${studentName}`,
      react: StudentNoteEmail({
        adminName,
        studentName,
        projectName,
        leaderName,
        note,
      }),
    });
  } catch (error) {
    console.error('Error sending student note email:', error);
    throw error;
  }
};

export const sendCancellationRequestEmail = async ({
  adminName,
  adminEmail,
  requesterName,
  requesterRole,
  projectName,
  shiftDate,
  shiftTime,
  reason,
}: {
  adminName: string;
  adminEmail: string;
  requesterName: string;
  requesterRole: string;
  projectName: string;
  shiftDate: string;
  shiftTime: string;
  reason: string;
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <onboarding@resend.dev>',
      to: adminEmail,
      subject: 'New Shift Cancellation Request',
      react: CancellationRequestEmail({
        adminName,
        requesterName,
        requesterRole,
        projectName,
        shiftDate,
        shiftTime,
        reason,
      }),
    });
  } catch (error) {
    console.error('Error sending cancellation request email:', error);
    throw error;
  }
};

export const sendRequestStatusUpdateEmail = async ({
  userName,
  userEmail,
  requestType,
  newStatus,
  projectName,
  shiftDetails,
}: {
  userName: string;
  userEmail: string;
  requestType: string;
  newStatus: 'approved' | 'rejected';
  projectName: string;
  shiftDetails?: {
    date: string;
    time: string;
  };
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <onboarding@resend.dev>',
      to: userEmail,
      subject: `Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}: ${requestType}`,
      react: RequestStatusUpdateEmail({
        userName,
        requestType,
        newStatus,
        projectName,
        shiftDetails,
      }),
    });
  } catch (error) {
    console.error('Error sending request status update email:', error);
    throw error;
  }
};