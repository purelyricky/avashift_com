import { Footer } from "./common/Footer";
import { LogoHeader } from "./common/LogoHeader";

interface CancellationRequestEmailProps {
    adminName: string;
    requesterName: string;
    requesterRole: string;
    projectName: string;
    shiftDate: string;
    shiftTime: string;
    reason: string;
  }
  
  export const CancellationRequestEmail: React.FC<CancellationRequestEmailProps> = ({
    adminName,
    requesterName,
    requesterRole,
    projectName,
    shiftDate,
    shiftTime,
    reason,
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
            New Shift Cancellation Request
          </h1>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            Hello {adminName},
          </p>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            A new shift cancellation request has been submitted that requires your attention.
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
              Request Details
            </h2>
            <table width="100%" style={{ borderCollapse: "collapse" }}>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Requester:</td>
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
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #2b3481",
              borderRadius: "4px"
            }}>
              <h3 style={{ 
                margin: "0 0 10px 0",
                color: "#2b3481",
                fontSize: "16px"
              }}>
                Reason for Cancellation:
              </h3>
              <p style={{ margin: "0", color: "#4a5568", lineHeight: "1.5" }}>
                {reason}
              </p>
            </div>
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
              Review Request
            </a>
          </div>
        </td>
      </tr>
      <Footer />
    </table>
  );