import { Footer } from "./common/Footer";
import { LogoHeader } from "./common/LogoHeader";

interface StudentNoteEmailProps {
    adminName: string;
    studentName: string;
    projectName: string;
    leaderName: string;
    note: string;
  }
  
  export const StudentNoteEmail: React.FC<StudentNoteEmailProps> = ({
    adminName,
    studentName,
    projectName,
    leaderName,
    note,
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
            New Student Performance Note
          </h1>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            Hello {adminName},
          </p>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            A new note has been submitted regarding student performance.
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
              Note Details
            </h2>
            <table width="100%" style={{ borderCollapse: "collapse" }}>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Student:</td>
                <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{studentName}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Project:</td>
                <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{projectName}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Shift Leader:</td>
                <td style={{ padding: "8px 0", color: "#2b3481", fontWeight: "bold" }}>{leaderName}</td>
              </tr>
            </table>
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#ffffff",
              borderLeft: "4px solid #2b3481",
              borderRadius: "4px"
            }}>
              <p style={{ margin: "0", color: "#4a5568", lineHeight: "1.5" }}>
                {note}
              </p>
            </div>
          </div>
        </td>
      </tr>
      <Footer />
    </table>
  );