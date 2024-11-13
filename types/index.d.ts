/* eslint-disable no-unused-vars */

// Basic Props Types
declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// ========================================
// USER AND AUTHENTICATION TYPES
// ========================================

declare type UserRole = 'admin' | 'client' | 'student' | 'shiftLeader' | 'gateman';

// Auth Form Types
declare type SignUpFormData = {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  password: string;
}

declare type SignUpWithRoleData = SignUpFormData & {
  role: UserRole;
}

declare type LoginUser = {
  email: string;
  password: string;
}

// Base User Types
declare type BaseUser = {
  userId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

declare type StudentUser = BaseUser & {
  role: 'student';
  dateOfBirth: string | null;
  availabilityStatus: 'active' | 'inactive';
  punctualityScore: number;
  rating: number;
}

declare type GatemanUser = BaseUser & {
  role: 'gateman';
  clientId: string | null;
}

declare type User = BaseUser | StudentUser | GatemanUser;

// User Response and Info Types
declare type UserResponse = {
  status: 'success' | 'error';
  data: User | null;
  message?: string;
}

declare interface getUserInfoProps {
  userId: string;
}

declare type UserCalculation = {
  userId: string;
  calculationType: 'punctuality' | 'rating' | 'earnings';
  startDate?: string;
  endDate?: string;
}

// Appwrite Document Interface
declare interface AppwriteDocument {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
}

// ========================================
// BANKING AND TRANSACTION TYPES
// ========================================

declare type Account = {
  id: string;
  availableBalance: number;
  currentBalance: number;
  officialName: string;
  mask: string;
  institutionId: string;
  name: string;
  type: string;
  subtype: string;
  appwriteItemId: string;
  shareableId: string;
}

declare type Transaction = {
  id: string;
  $id: string;
  name: string;
  paymentChannel: string;
  type: string;
  accountId: string;
  amount: number;
  pending: boolean;
  category: string;
  date: string;
  image: string;
  channel: string;
  senderBankId: string;
  receiverBankId: string;
}

declare type Bank = {
  $id: string;
  accountId: string;
  bankId: string;
  accessToken: string;
  fundingSourceUrl: string;
  userId: string;
  shareableId: string;
}

declare type AccountTypes = "depository" | "credit" | "loan" | "investment" | "other";
declare type Category = "Food and Drink" | "Travel" | "Transfer";

declare type CategoryCount = {
  name: string;
  count: number;
  totalCount: number;
}

declare type Receiver = {
  firstName: string;
  lastName: string;
}

// ========================================
// COMPONENT PROPS INTERFACES
// ========================================

declare interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

declare interface CreditCardProps {
  account: Account;
  userName: string;
  showBalance?: boolean;
}

declare interface BankInfoProps {
  account: Account;
  appwriteItemId?: string;
  type: "full" | "card";
}

declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
  user?: string;
}

declare interface MobileNavProps {
  user: User;
}

declare interface PageHeaderProps {
  topTitle: string;
  bottomTitle: string;
  topDescription: string;
  bottomDescription: string;
  connectBank?: boolean;
}

declare interface PaginationProps {
  page: number;
  totalPages: number;
}

declare interface PlaidLinkProps {
  user: User;
  variant?: "primary" | "ghost";
  dwollaCustomerId?: string;
}

declare interface BankDropdownProps {
  accounts: Account[];
  setValue?: UseFormSetValue<any>;
  otherStyles?: string;
}

declare interface BankTabItemProps {
  account: Account;
  appwriteItemId?: string;
}

declare interface TotalBalanceBoxProps {
  accounts: Account[];
  totalBanks: number;
  totalCurrentBalance: number;
}

declare interface FooterProps {
  user: User;
  type?: 'mobile' | 'desktop'
}

declare interface RightSidebarProps {
  user: User;
  transactions: Transaction[];
  banks: Bank[] & Account[];
}

declare interface SidebarProps {
  user: BaseUser | StudentUser | GatemanUser | ClientUser | LeaderUser; // If it can handle any user type
}

declare interface RecentTransactionsProps {
  accounts: Account[];
  transactions: Transaction[];
  appwriteItemId: string;
  page: number;
}

declare interface TransactionHistoryTableProps {
  transactions: Transaction[];
  page: number;
}

declare interface CategoryBadgeProps {
  category: string;
}

declare interface TransactionTableProps {
  transactions: Transaction[];
}

declare interface CategoryProps {
  category: CategoryCount;
}

declare interface DoughnutChartProps {
  accounts: Account[];
}

declare interface PaymentTransferFormProps {
  accounts: Account[];
}

//sidebar user types
declare interface SidebarStudentProps {
  user: StudentUser;
}

declare interface SidebarLeaderProps {
  user: BaseUser & { role: 'shiftLeader' };
}

declare interface SidebarGateProps {
  user: GatemanUser;
}

declare interface SidebarAdminProps {
  user: BaseUser & { role: 'admin' };
}

declare interface SidebarClientProps {
  user: BaseUser & { role: 'client' };
}

declare interface MobileNavStudentProps {
  user: StudentUser;
}

declare interface MobileNavLeaderProps {
  user: BaseUser & { role: 'shiftLeader' };
}

declare interface MobileNavGateProps {
  user: GatemanUser;
}

declare interface MobileNavAdminProps {
  user: BaseUser & { role: 'admin' };
}

declare interface MobileNavClientProps {
  user: BaseUser & { role: 'client' };
}

declare interface RightSidebarAdminProps {
  user: BaseUser & { role: 'admin' };
}

declare interface RightSidebarClientProps {
  user: BaseUser & { role: 'client' };
}

// ========================================
// ACTION PROPS INTERFACES
// ========================================

declare interface TransferParams {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
}

declare interface AddFundingSourceParams {
  dwollaCustomerId: string;
  processorToken: string;
  bankName: string;
}

declare interface NewDwollaCustomerParams {
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
}

declare interface getAccountsProps {
  userId: string;
}

declare interface getAccountProps {
  appwriteItemId: string;
}

declare interface getInstitutionProps {
  institutionId: string;
}

declare interface getTransactionsProps {
  accessToken: string;
}

declare interface CreateFundingSourceOptions {
  customerId: string;
  fundingSourceName: string;
  plaidToken: string;
  _links: object;
}

declare interface CreateTransactionProps {
  name: string;
  amount: string;
  senderId: string;
  senderBankId: string;
  receiverId: string;
  receiverBankId: string;
  email: string;
}

declare interface getTransactionsByBankIdProps {
  bankId: string;
}

declare interface signInProps {
  email: string;
  password: string;
}

declare interface exchangePublicTokenProps {
  publicToken: string;
  user: User;
}

declare interface createBankAccountProps {
  accessToken: string;
  userId: string;
  accountId: string;
  bankId: string;
  fundingSourceUrl: string;
  shareableId: string;
}

declare interface getBanksProps {
  userId: string;
}

declare interface getBankProps {
  documentId: string;
}

declare interface getBankByAccountIdProps {
  accountId: string;
}

// ========================================
// CALCULATION PROPS INTERFACES
// ========================================

declare type Shift = {
  shiftId: string;
  projectId: string;
  shiftLeaderId: string;
  gatemanId: string;
  date: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeType: 'day' | 'night';
  startTime: string;
  stopTime: string;
  requiredStudents: number;
  assignedCount: number;
  shiftType: 'normal' | 'filler';
  status: 'draft' | 'published' | 'inProgress' | 'completed' | 'cancelled';
  createdBy: string;
  createdByRole: 'admin' | 'client';
  createdAt: string;
  updatedAt: string;
}

declare type ProjectMember = {
  memberId: string;
  projectId: string;
  userId: string;
  userRole: UserRole;
  membershipType: 'owner' | 'student' | 'shiftLeader' | 'client' | 'manager' | 'member' | 'observer';
  addedBy: string;
  addedByRole: 'admin' | 'client';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

declare type Project = {
  projectId: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'suspended';
  ownerId: string;
  ownerRole: UserRole;
  createdAt: string;
  updatedAt: string;
}

declare interface TotalBalanceBoxStudentProps {
  projectStats: StudentProjectStats;
}

declare interface DoughnutChartStudentProps {
  projects: ProjectTimeStats[];  // Changed from ProjectEarning[]
}

declare interface AnimatedCounterStudentProps {
  hours: number;  // Changed from amount
}



//======================================
//New Declarations 
//========================================

// types.d.ts updates
interface EnhancedStudentProjectStats extends StudentProjectStats {
  completedShiftsCount: number;
  upcomingShiftsCount: number;
  punctualityScore: number;
}

interface ProjectShiftStats {
  projectId: string;
  projectName: string;
  projectStatus: 'active' | 'completed' | 'suspended';
  membershipStatus: 'active' | 'inactive';
  trackedHours: number;
  lostHours: number;
  shiftsCompleted: number;
  color: string;
}

interface StudentProjectStats {
  totalProjects: number;
  activeProjects: number;
  projectHours: ProjectShiftStats[];
  totalMonthlyHours: number;
  totalLostHours: number;
}
interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  trackedHours: number;
  lostHours: number;
  color: string;
}

//==========================================================
//Update Availability ACTIONS PROPS INTERFACES
//==========================================================

// Availability Types
declare type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
declare type TimeOfDay = 'day' | 'night';
declare type AvailabilityStatus = 'active' | 'inactive';

declare type UserAvailability = {
  availabilityId: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  timeType: TimeOfDay;
  status: AvailabilityStatus;
  createdAt: string;
}

// Add these under the "COMPONENT PROPS INTERFACES" section

declare interface AvailabilityFormProps {
  user?: User;
}

declare interface DateRangePickerProps {
  onChange: (dateRange: { startDate: string; endDate: string }) => void;
  startDate?: Date | null;
  endDate?: Date | null;
  className?: string;
}

declare interface AvailabilityItemProps {
  dayOfWeek: DayOfWeek;
  timeType: TimeOfDay;
  onDelete: () => void;
}

// Add these under the "Update Availability ACTIONS PROPS INTERFACES" section


declare type AvailabilityFormData = {
  fromDate: string;
  toDate: string;
  availabilities: Array<{
    dayOfWeek: DayOfWeek;
    timeType: TimeOfDay;
  }>;
}

declare interface GetUserAvailabilityProps {
  userId: string;
  fromDate?: string;
  toDate?: string;
}

declare type UserAvailabilityResponse = {
  status: 'success' | 'error';
  data: UserAvailability[] | null;
  message?: string;
}

// Update the existing UserAvailability type to include all fields
declare type UserAvailability = {
  availabilityId: string;
  userId: string;
  fromDate: string;
  toDate: string;
  dayOfWeek: DayOfWeek;
  timeType: TimeOfDay;
  status: AvailabilityStatus;
  createdAt: string;
  updatedAt?: string;
}

// Request Types
declare type AdminRequestType = 'shiftCancellation' | 'fillerShiftApplication' | 'availabilityChange';
declare type AdminRequestStatus = 'pending' | 'approved' | 'rejected';

declare type AdminRequest = {
  requestId: string;
  requestType: AdminRequestType;
  requesterId: string;
  shiftId?: string;
  assignmentId?: string;
  reason?: string;
  status: AdminRequestStatus;
  reviewedBy?: string;
  createdAt: string;
}

//==========================================================
//This types may be repeated I will come back to this
//==========================================================

// Add these under your existing type declarations in index.d.ts

// Availability Types
declare type AvailabilityTimeType = 'day' | 'night';
declare type AvailabilityStatus = 'active' | 'inactive';
declare type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

declare interface UserAvailability {
  availabilityId: string;
  userId: string;
  fromDate: string;
  toDate: string;
  dayOfWeek: DayOfWeek;
  timeType: AvailabilityTimeType;
  status: AvailabilityStatus;
  createdAt: string;
}

declare interface AvailabilityPeriod {
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  availabilities: Array<{
    dayOfWeek: DayOfWeek;
    timeType: AvailabilityTimeType;
  }>;
}

declare interface AvailabilityResponse {
  status: 'success' | 'error';
  data: AvailabilityPeriod[] | null;
  message?: string;
}

declare interface UpdateAvailabilityParams {
  userId: string;
  fromDate: string;
  toDate: string;
  dayOfWeek: DayOfWeek;
  timeType: AvailabilityTimeType;
  status: AvailabilityStatus;
}

// If you're using form props, add this as well
declare interface UpdateAvailabilityFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

//==========================================================
//Shift Leader Types
//==========================================================

interface LeaderStats {
  totalStudents: number;
  clockedInStudents: number;
  notClockedInStudents: number;
  attendanceRate: number;
  averageRatings: {
    punctuality: number;
    overall: number;
  };
  totalComments: number;
}

interface StudentSegment {
  label: string;
  count: number;
  color: string;
}

interface LeaderShiftStats {
  totalStudents: number;
  studentSegments: StudentSegment[];
}

interface StatCardProps {
  type: 'attendance' | 'ratings' | 'comments';
  value: number;
  label: string;
}

//==========================================================
//Gateman Types
//==========================================================

interface GatemanStats {
  totalExpectedStudents: number;
  clockedInStudents: number;
  notClockedInStudents: number;
}

interface StudentCheckInSegment {
  label: string;
  count: number;
  color: string;
}

interface GatemanShiftStats {
  totalStudents: number;
  studentSegments: StudentCheckInSegment[];
}


//==========================================================
//Admin Types
//==========================================================

interface AdminStats {
  totalProjects: number;
  totalStudents: number;
  projectDistribution: ProjectStudentDistribution[];
}

interface ProjectStudentDistribution {
  projectId: string;
  projectName: string;
  studentCount: number;
  color: string;
}

interface AdminProjectStats {
  totalProjects: number;
  totalStudents: number;
  projectSegments: ProjectStudentDistribution[];
}

//==========================================================
//Client Types
//==========================================================

interface ClientStats {
  totalProjects: number;
  totalStudents: number;
  projectDistribution: ClientProjectDistribution[];
}

interface ClientProjectDistribution {
  projectId: string;
  projectName: string;
  studentCount: number;
  color: string;
}

interface ClientProjectStats {
  totalProjects: number;
  totalStudents: number;
  projectSegments: ClientProjectDistribution[];
}


//==========================================================
//Admin Table Types
//==========================================================

declare interface UserTableProps {
  users: UserWithProjects[];
  type: 'client' | 'student' | 'shiftLeader' | 'security';
}

declare interface UserWithProjects extends BaseUser {
  projects: {
    projectId: string;
    projectName: string;
    status: 'active' | 'inactive';
  }[];
}

declare interface UsersResponse {
  clients: UserWithProjects[];
  students: UserWithProjects[];
  shiftLeaders: UserWithProjects[];
  security: UserWithProjects[];
}


//==========================================================
//Project Creation Types
//==========================================================
interface CreateProjectData {
  name: string;
  description?: string | null;
}

interface ProjectResponse {
  status: 'success' | 'error';
  message?: string;
}


//==========================================================
//Types for dynamic project stats cards
//==========================================================

// Project Types
// Project Types
declare type ProjectMemberInfo = {
  userId: string;
  firstName: string;
  lastName: string;
  membershipType: 'student' | 'shiftLeader';
}

declare type ProjectStats = {
  studentsCount: number;
  shiftLeadersCount: number;
  totalMembers: number;
}

declare type ProjectCardData = {
  projectId: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'suspended';
  stats: ProjectStats;
  // Make members optional since we might not always need the full member details
  members?: {
    students: ProjectMemberInfo[];
    shiftLeaders: ProjectMemberInfo[];
  };
}

// Project Card Component Props
declare interface ProjectCardProps {
  project: ProjectCardData;
  onClick?: (projectId: string) => void;
}

// Projects Page Props
declare interface ProjectsPageProps {
  projects: ProjectCardData[];
}

// Project List Component Props
declare interface ProjectListProps {
  projects: ProjectCardData[];
}

// Project Creation Response
declare interface ProjectCreationResponse {
  status: 'success' | 'error';
  message?: string;
  project?: ProjectCardData;
}

//==========================================================
//Types for adding users to projects
//==========================================================

interface AddWorkerFormData {
  email: string;
  role: 'student' | 'shiftLeader' | 'gateman' | 'client';
  projectId: string;
}

// Props for the form component
interface AddWorkerFormProps {
  user: User;
  projects: Array<{
    projectId: string;
    name: string;
  }>;
  onSubmit: (data: AddWorkerFormData) => Promise<void>;
}

// Response type for the server action
interface AddWorkerResponse {
  status: 'success' | 'error';
  message: string;
}

// Type for checking existing user
interface ExistingUserCheck {
  exists: boolean;
  userId?: string;
  role?: UserRole;
}