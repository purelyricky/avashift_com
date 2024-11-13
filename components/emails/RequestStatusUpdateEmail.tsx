import { Footer } from "./common/Footer";
import { LogoHeader } from "./common/LogoHeader";

interface RequestStatusUpdateEmailProps {
    userName: string;
    requestType: string;
    newStatus: 'approved' | 'rejected';
    projectName: string;
    shiftDetails?: {
      date: string;
      time: string;
    };
  }
  
  export const RequestStatusUpdateEmail: React.FC<RequestStatusUpdateEmailProps> = ({
    userName,
    requestType,
    newStatus,
    projectName,
    shiftDetails
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
            Request Status Update
          </h1>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            Hello {userName},
          </p>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            Your {requestType} request has been {newStatus}.
          </p>
          <div style={{
            backgroundColor: "#f8fafc",
            padding: "20px",
            borderRadius: "8px",
            margin: "20px 0"
          }}>
            <table width="100%" style={{ borderCollapse: "collapse" }}>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Request Type:</td>
                <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{requestType}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Status:</td>
                <td style={{ 
                  padding: "8px 0",
                  color: newStatus === 'approved' ? '#059669' : '#dc2626',
                  fontWeight: "bold",
                  textTransform: "capitalize"
                }}>
                  {newStatus}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Project:</td>
                <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{projectName}</td>
              </tr>
              {shiftDetails && (
                <>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Shift Date:</td>
                    <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{shiftDetails.date}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Shift Time:</td>
                    <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{shiftDetails.time}</td>
                  </tr>
                </>
              )}
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
              View Dashboard
            </a>
          </div>
        </td>
      </tr>
      <Footer />
    </table>
  );