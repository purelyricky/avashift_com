import { Footer } from "./common/Footer";
import { LogoHeader } from "./common/LogoHeader";

interface AvailabilityUpdateEmailProps {
    userName: string;
    role: string;
    availabilities: Array<{
      day: string;
      type: 'day' | 'night';
    }>;
  }
  
  export const AvailabilityUpdateEmail: React.FC<AvailabilityUpdateEmailProps> = ({
    userName,
    role,
    availabilities,
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
            Availability Update Confirmation
          </h1>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            Hello {userName},
          </p>
          <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#4a5568" }}>
            Your availability has been successfully updated in the Ava Shift system.
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
              Updated Availability Schedule
            </h2>
            <table width="100%" style={{ borderCollapse: "collapse" }}>
              {availabilities.map((availability, index) => (
                <tr key={index} style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc"
                }}>
                  <td style={{ padding: "8px", color: "#64748b" }}>{availability.day}</td>
                  <td style={{ 
                    padding: "8px",
                    color: "#2b3481",
                    fontWeight: "bold",
                    textTransform: "capitalize"
                  }}>
                    {availability.type} Shift
                  </td>
                </tr>
              ))}
            </table>
          </div>
        </td>
      </tr>
      <Footer />
    </table>
  );
  