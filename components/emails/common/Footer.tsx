export const Footer: React.FC = () => (
    <tr>
      <td style={{ 
        padding: "20px",
        backgroundColor: "#f7f7f7",
        borderTop: "1px solid #e9ecef",
        color: "#6c757d",
        fontSize: "12px",
        textAlign: "center" 
      }}>
        <p style={{ margin: "0 0 10px 0" }}>
          © {new Date().getFullYear()} Ava Shift. All rights reserved.
        </p>
        <p style={{ margin: "0" }}>
          This is an automated message, please do not reply directly to this email.
        </p>
      </td>
    </tr>
  );