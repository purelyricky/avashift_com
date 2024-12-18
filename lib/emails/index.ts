import { AvailabilityUpdateEmail } from '@/components/emails/AvailabilityUpdateEmail';
import { CancellationRequestEmail } from '@/components/emails/CancellationRequestEmail';
import { ProjectAssignmentEmail } from '@/components/emails/ProjectAssignmentEmail';
import { RequestStatusUpdateEmail } from '@/components/emails/RequestStatusUpdateEmail';
import { StudentNoteEmail } from '@/components/emails/StudentNoteEmail';
import { Resend } from 'resend';
import { FillerShiftApplicationEmail } from '@/components/emails/FillerShiftApplicationEmail';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}
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
      from: 'Ava Shift <send@avashift.com>',
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
    console.log('Attempting to send availability update email to:', userEmail);
    console.log('Email data:', { userName, role, availabilities });
    
    const result = await resend.emails.send({
      from: 'Ava Shift <send@avashift.com>',
      to: userEmail,
      subject: 'Availability Update Confirmation',
      react: AvailabilityUpdateEmail({
        userName,
        role,
        availabilities,
      }),
    });
    
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Detailed error sending availability update email:', {
      error,
      userData: { userName, userEmail, role },
    });
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
  shiftDate,
}: {
  adminName: string;
  adminEmail: string;
  studentName: string;
  projectName: string;
  leaderName: string;
  note: string;
  shiftDate: string;
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <send@avashift.com>',
      to: adminEmail,
      subject: 'New Student Note from Shift Leader',
      react: StudentNoteEmail({
        adminName,
        adminEmail,
        studentName,
        projectName,
        leaderName,
        note,
        shiftDate,
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
      from: 'Ava Shift <send@avashift.com>',
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
      from: 'Ava Shift <send@avashift.com>',
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

export const sendFillerShiftApplicationEmail = async ({
  adminName,
  adminEmail,
  requesterName,
  requesterRole,
  projectName,
  shiftDate,
  shiftTime,
}: {
  adminName: string;
  adminEmail: string;
  requesterName: string;
  requesterRole: string;
  projectName: string;
  shiftDate: string;
  shiftTime: string;
}) => {
  try {
    await resend.emails.send({
      from: 'Ava Shift <send@avashift.com>',
      to: adminEmail,
      subject: 'New Filler Shift Application',
      react: FillerShiftApplicationEmail({
        adminName,
        requesterName,
        requesterRole,
        projectName,
        shiftDate,
        shiftTime,
      }),
    });
  } catch (error) {
    console.error('Error sending filler shift application email:', error);
    throw error;
  }
};