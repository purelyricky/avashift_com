import { Footer } from "./common/Footer";
import { LogoHeader } from "./common/LogoHeader";

interface FillerShiftApplicationEmailProps {
  adminName: string;
  requesterName: string;
  requesterRole: string;
  projectName: string;
  shiftDate: string;
  shiftTime: string;
}

export const FillerShiftApplicationEmail: React.FC<FillerShiftApplicationEmailProps> = ({
  adminName,
  requesterName,
  requesterRole,
  projectName,
  shiftDate,
  shiftTime,
}) => (
  <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: "600px", margin: "0 auto", fontFamily: "'Arial', sans-serif" }}>
    <LogoHeader />
    <tr>
      <td style={{ padding: "30px", backgroundColor: "#ffffff" }}>
        <h1 style={{ 
          color: "#2b3481",
          fontSize: "24px",
          margin: "0 0 20px 0",
          textAlign: "center"
        }}>
          New Filler Shift Application
        </h1>
        <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
          Hello {adminName},
        </p>
        <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
          A new filler shift application has been submitted that requires your attention.
        </p>
        <div style={{
          backgroundColor: "#f8fafc",
          padding: "20px",
          borderRadius: "8px",
          margin: "20px 0"
        }}>
          <h2 style={{ 
            color: "#2b3481",
            fontSize: "18px",
            margin: "0 0 15px 0"
          }}>
            Application Details
          </h2>
          <table width="100%" style={{ borderCollapse: "collapse" }}>
            <tr>
              <td style={{ padding: "8px 0", color: "#64748b" }}>Applicant:</td>
              <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>
                {requesterName} ({requesterRole})
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#64748b" }}>Project:</td>
              <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{projectName}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#64748b" }}>Shift Date:</td>
              <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{shiftDate}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#64748b" }}>Shift Time:</td>
              <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{shiftTime}</td>
            </tr>
          </table>
        </div>
        <div style={{
          textAlign: "center",
          margin: "30px 0"
        }}>
          <a
            href="https://avashift.com/sign-in"
            style={{
              backgroundColor: "#2b3481",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              display: "inline-block"
            }}
          >
            Review Application
          </a>
        </div>
      </td>
    </tr>
    <Footer />
  </table>
); 