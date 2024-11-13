# Student Work Management System - Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin1 as Admin 1
    participant Admin2 as Admin 2
    participant Client1 as Client A
    participant Client2 as Client B
    participant Client3 as Client C
    participant SL1 as Shift Leader 1
    participant SL2 as Shift Leader 2
    participant G1 as Gateman A
    participant G2 as Gateman B
    participant S1 as Student X
    participant S2 as Student Y
    participant System as SWMS
    
    Note over Admin1,System: Scenario 1: Multiple Clients Under One Admin
    Admin1->>System: Creates Project A for Client A
    System->>Client1: Notifies about Project A creation
    Admin1->>System: Creates Project B for Client B
    System->>Client2: Notifies about Project B creation
    
    Note over Admin1,System: Setting up Project Rates
    Admin1->>System: Sets rates for Project A
    Admin1->>System: Sets rates for Project B
    
    Note over Client1,System: Client A Managing Project
    Client1->>System: Creates shifts for Project A
    System->>SL1: Assigns as shift leader
    System->>G1: Assigns as gateman
    
    Note over Client2,System: Client B Managing Project
    Client2->>System: Creates shifts for Project B
    System->>SL2: Assigns as shift leader
    System->>G2: Assigns as gateman
    
    Note over Admin2,Client3: Scenario 2: Independent Admin-Client Relationship
    Admin2->>System: Creates Project C for Client C
    System->>Client3: Notifies about Project C creation
    Admin2->>System: Sets rates for Project C
    Client3->>System: Creates shifts for Project C
    System->>SL1: Assigns as shift leader (shared resource)
    System->>G1: Assigns as gateman (shared resource)
    
    Note over S1,System: Scenario 3: Student Working Multiple Projects
    S1->>System: Sets weekly availability
    System->>Admin1: Validates availability
    Admin1->>System: Approves Student X for Project A
    System->>S1: Notifies approval for Project A
    Admin2->>System: Approves Student X for Project C
    System->>S1: Notifies approval for Project C
    
    Note over System,S2: Scenario 4: Parallel Shift Operations
    System->>S2: Assigns to Project B shift
    S2->>System: Confirms shift assignment
    
    Note over S1,G1: Scenario 5: Concurrent Attendance Processing
    S1->>System: Requests QR code for Project A shift
    System->>S1: Generates unique QR code
    S1->>G1: Shows QR code for clock-in
    G1->>System: Verifies QR and records clock-in
    
    Note over SL1,System: Shift Leader Managing Multiple Projects
    SL1->>System: Views assigned shifts (Project A & C)
    SL1->>System: Marks attendance for Project A
    SL1->>System: Submits feedback for Student X
    
    Note over S1,System: Student Schedule Conflict Resolution
    S1->>System: Requests schedule change
    System->>Admin1: Notifies about change request
    Admin1->>System: Reviews and approves change
    System->>Client1: Notifies about schedule update
    
    Note over System,S1: Earnings Calculation
    System->>System: Calculates earnings for multiple projects
    System->>Admin1: Generates earnings report for Project A
    System->>Admin2: Generates earnings report for Project C
    
    Note over S2,G2: Parallel Attendance Verification
    S2->>System: Requests QR code for Project B shift
    System->>S2: Generates unique QR code
    S2->>G2: Shows QR code for clock-in
    G2->>System: Verifies QR and records clock-in
    
    Note over SL2,System: Performance Monitoring
    SL2->>System: Submits shift report
    System->>Client2: Notifies about shift completion
    System->>Admin1: Updates performance metrics
    
    Note over System,Admin1: System Analytics
    System->>Admin1: Generates cross-project analytics
    Admin1->>System: Reviews student performance across projects
    
    Note over Admin1,Client1: Billing and Payment Processing
    Admin1->>System: Initiates payment calculation
    System->>System: Processes multiple project payments
    System->>S1: Notifies payment for Project A & C
    System->>S2: Notifies payment for Project B
    
    Note over System,Client1: Reporting and Feedback
    System->>Client1: Generates Project A performance report
    System->>Client2: Generates Project B performance report
    System->>Client3: Generates Project C performance report
    
    Note over SL1,System: Shift Leader Handover
    SL1->>SL2: Handover notes for overlapping projects
    SL2->>System: Acknowledges handover
    
    Note over System,Admin1: Emergency Handling
    S1->>System: Reports unavailability (emergency)
    System->>Admin1: Alerts about sudden unavailability
    Admin1->>System: Initiates emergency replacement
    System->>S2: Offers replacement shift
    
    Note over System,Client1: Project Completion
    Client1->>System: Marks Project A milestone complete
    System->>Admin1: Updates project status
    System->>SL1: Notifies about milestone completion