// Datamart Mobile API Client
// Matches exactly the web frontend's client.ts endpoints

import {
  getApiErrorMessage,
  isAccessTokenExpired,
  isNetworkFailureStatus,
  isSessionRevoked,
  notifySessionExpired,
  resolveSessionLogoutReason,
  shouldLogoutFromAuthFailure,
  shouldRefreshSession,
  type TokenRefreshOutcome,
} from './session';
import { tryNormalizePhone } from './phone';
import { videoToDataUri } from './face-liveness-media-utils';

// Set in .env — switch local/live by commenting/uncommenting EXPO_PUBLIC_API_BASE_URL
const API_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:4000/api/v1';

// ============ Types ============
export interface ApiResponse<T = unknown> {
  status?: 'success' | 'error';
  success?: boolean;
  message: string;
  request_id?: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: { code: string; type: string; details?: string } | string | null;
}

export interface UserRole {
  id: string;
  name: string;
  displayName?: string;
  permissions?: Array<{ id: string; name: string; slug: string }>;
}

export interface User {
  id: string;
  phone?: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  kycStatus: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'EMAIL' | 'AUTHENTICATOR' | 'SMS' | null;
  biometricEnabled: boolean;
  hasPin?: boolean;
  roles: Array<string | UserRole>;
  permissions: string[];
  referralCode?: string;
}

export function getUserRoleLabel(role: string | UserRole): string {
  if (typeof role === 'string') return role;
  return role.displayName || role.name || '';
}

export function getPrimaryUserRoleLabel(roles?: Array<string | UserRole>): string | null {
  if (!roles?.length) return null;
  for (const role of roles) {
    const label = getUserRoleLabel(role).trim();
    if (label && label.toUpperCase() !== 'USER') return label;
  }
  return null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresTwoFactor?: boolean;
  userId?: string;
  twoFactorMethod?: 'EMAIL' | 'AUTHENTICATOR' | 'SMS';
  destination?: string;
}

export type TwoFactorMethodType = 'EMAIL' | 'AUTHENTICATOR' | 'SMS';

export interface TwoFactorMethodOption {
  method: TwoFactorMethodType;
  label: string;
  description?: string | null;
  enabled: boolean;
  available: boolean;
  inactiveReason?: string | null;
}

export interface Enable2FAResponse {
  method: TwoFactorMethodType;
  message: string;
  destination?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  secret?: string;
  backupCodes?: string[];
}

export type AppNotificationType = 'info' | 'warning' | 'success' | 'error';

export type AppNotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS';
export type AppNotificationCategory = 'TRANSACTIONAL' | 'MARKETING' | 'SECURITY' | 'SYSTEM';

export interface UserTypeSnapshot {
  id: string;
  code: string;
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  isProgram?: boolean;
}

export interface UpgradeProgram {
  pathId: string;
  fromUserTypeId: string;
  toUserType: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isProgram: boolean;
  };
  upgradePrice: string;
  upgradePriceNaira: number;
}

export interface UserTypeUpgradeRecord {
  id: string;
  status: string;
  amountPaid: string;
  createdAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
  toUserType?: { name: string; code: string };
  fromUserType?: { name: string; code: string };
}

export interface ApiAccessRequestRecord {
  id: string;
  clientName: string;
  requestedResponseFormat: 'PLATFORM' | 'MSORG';
  requestedAllowedServices: string[];
  requestedWebhookUrl?: string | null;
  userNote?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNote?: string | null;
  createdAt: string;
}

export interface ApiClientSnapshot {
  id: string;
  name: string;
  isActive: boolean;
  responseFormat: 'PLATFORM' | 'MSORG';
  allowedServices: string[];
  allowedIps?: string[];
  webhookUrl?: string | null;
  testPublicKey: string;
  livePublicKey: string;
  lastUsedAt?: string | null;
}

export interface ExtendableServiceType {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
}

export interface DeveloperPortalSnapshot {
  baseUrl: string;
  authHeader: string;
  extendableServices: ExtendableServiceType[];
  client: {
    id: string;
    name: string | null;
    environment: 'TEST' | 'LIVE';
    responseFormat: 'PLATFORM' | 'MSORG';
    allowedServices: string[];
    allowedIps: string[];
    maskedPublicKey: string | null;
    testPublicKey: string | null;
    livePublicKey: string | null;
    webhookUrl?: string | null;
    rateLimit: number;
    lastUsedAt?: string | null;
  } | null;
}

export interface DeveloperApiEndpointDoc {
  id: string;
  serviceCode?: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  fields?: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
  samples: {
    curl: string;
    php: string;
    python: string;
    node: string;
  };
}

export interface DeveloperDocumentation {
  baseUrl: string;
  responseFormat: 'PLATFORM' | 'MSORG';
  hasActiveClient: boolean;
  endpoints: DeveloperApiEndpointDoc[];
}

export interface ApiAccessSnapshot {
  pending: ApiAccessRequestRecord | null;
  latest: (ApiAccessRequestRecord & { apiClient?: ApiClientSnapshot | null }) | null;
  activeClient: ApiClientSnapshot | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: AppNotificationType;
  channel?: AppNotificationChannel;
  category?: AppNotificationCategory;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: AppNotification[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export type NotificationSettingField =
  | 'pushNotificationsEnabled'
  | 'marketingPushNotificationsEnabled'
  | 'transactionEmailNotificationsEnabled'
  | 'transactionSmsNotificationsEnabled';

export interface NotificationOption {
  key: string;
  title: string;
  description: string;
  adminEnabled: boolean;
  userEnabled: boolean;
  settingKey: NotificationSettingField;
}

export interface NotificationSettings {
  transactionEmailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  marketingPushNotificationsEnabled: boolean;
  transactionSmsNotificationsEnabled: boolean;
  masterEnabled: boolean;
  options: NotificationOption[];
}

export interface RegisterData {
  phone: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referralCode?: string;
}

export interface ReferralSummary {
  referralCode: string;
  shareLink: string;
  shareMessage: string;
  activePrograms: Array<{
    id: string;
    name: string;
    description?: string | null;
    triggerEvent: string;
    kycTier?: string | null;
    referrerRewardKobo: string;
    refereeRewardKobo: string;
  }>;
  referredUsers: Array<{
    firstName: string;
    lastName: string;
    joinedAt: string;
  }>;
  stats: {
    totalReferred: number;
    totalEarnedKobo: string;
  };
}

export interface LedgerEntry {
  id: string;
  walletId?: string;
  type: 'CREDIT' | 'DEBIT';
  amount: string;
  balanceBefore?: string;
  balanceAfter: string;
  reference: string;
  description: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  formattedAmount?: string;
  provider?: string;
  network?: string;
  phone?: string;
  reference: string;
  providerRef?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  category?: string;
  displayStatus?: 'pending' | 'processing' | 'successful' | 'failed';
  displayStatusLabel?: string;
  displayTitle?: string;
  subtitle?: string;
  logoType?: 'provider' | 'bank' | 'service';
  logoKey?: string;
  isCredit?: boolean;
  displayAmount?: string;
  formattedDisplayAmount?: string;
  totalDebited?: string;
  formattedTotalDebited?: string;
  fee?: string;
  formattedFee?: string;
  providerRef?: string;
  balanceBefore?: string;
  balanceAfter?: string;
  formattedBalanceBefore?: string;
  formattedBalanceAfter?: string;
  transferDetails?: {
    accountNumber?: string;
    accountName?: string;
    bankCode?: string;
    narration?: string;
    sessionId?: string | null;
    completedAt?: string | null;
    fee?: string;
    transferAmount?: string;
    status?: string;
  } | null;
}

export interface VirtualAccount {
  id?: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  accountName?: string;
  accountReference?: string;
  accountType?: string;
  isPermanent?: boolean;
  isActive?: boolean;
  expiresAt?: string | null;
}

export interface VirtualAccountResponse extends VirtualAccount {
  existing?: boolean;
  allAccounts?: VirtualAccount[];
}

export interface WalletFundingMethods {
  paystackCheckout: boolean;
  payvesselCheckout: boolean;
  permanentVirtualAccount: boolean;
  dynamicVirtualAccount: boolean;
}

export interface PayvesselCheckoutSdkSession {
  mode: 'sdk';
  reference: string;
  apiKey: string;
  customerEmail: string;
  customerName: string;
  customerPhoneNumber: string;
  amount: number;
  currency: string;
  channels: string[];
  metadata: Record<string, unknown>;
}

export interface PayvesselCheckoutLinkSession {
  mode: 'link';
  paymentLink: string;
  reference: string;
  checkoutReference?: string;
}

export type PayvesselCheckoutSession = PayvesselCheckoutSdkSession | PayvesselCheckoutLinkSession;

export interface KycStatusUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bvnVerifiedAt?: string | null;
  kycStatus?: string;
  dateOfBirth?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface KycTierRequirement {
  title: string;
  description: string;
  requirements: Array<{ id: string; label: string; completed: boolean }>;
  benefits: string[];
  completed: boolean;
  limits?: { daily: string; monthly: string; single: string };
}

export interface KycStatusData {
  user: KycStatusUser;
  currentTier?: string;
  tierRequirements?: Record<string, KycTierRequirement>;
  documents?: Array<{
    id: string;
    type: string;
    status: string;
    rejectionReason?: string | null;
  }>;
}

export function getKycTierLabel(tier?: string): string {
  switch (tier) {
    case 'TIER_1': return 'Tier 1';
    case 'TIER_2': return 'Tier 2';
    case 'TIER_3': return 'Tier 3';
    case 'REJECTED': return 'Rejected';
    default: return 'Pending';
  }
}

export function isKycFullyVerified(data?: KycStatusData | null): boolean {
  if (!data) return false;
  return data.currentTier === 'TIER_3';
}

export interface FundingBank {
  id?: string;
  code: string;
  name: string;
  shortName?: string;
  logoUrl?: string | null;
  logoVersion?: number;
  supportsStatic?: boolean;
  supportsDynamic?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export function hasBvnVerified(data?: KycStatusData | null): boolean {
  if (!data) return false;
  const tier = data.currentTier ?? data.user?.kycStatus;
  return !!data.user?.bvnVerifiedAt || tier === 'TIER_2' || tier === 'TIER_3';
}

export interface AirtimeProvider {
  id: string;
  name: string;
  code: string;
  imageUrl?: string | null;
}

export interface DataPlan {
  id: string;
  name: string;
  size?: string;
  validity?: string;
  price: number;
  platformPrice?: number;
  validityDays?: number;
  categoryId?: string;
  categoryName?: string;
  includeCategoryInName?: boolean;
  sizeBytes?: number;
}

export interface DataCategory {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
}

export interface ElectricityProvider {
  id: string;
  name: string;
  code: string;
  meterTypes?: string[];
  imageUrl?: string | null;
  updatedAt?: string | null;
}

export interface BettingPlatform {
  id: string;
  name: string;
  code: string;
  imageUrl?: string | null;
  minAmount: number;
  maxAmount: number;
  itemName?: string | null;
  updatedAt?: string | null;
}

export interface CableProvider {
  id: string;
  name: string;
  code: string;
  displayName?: string;
  isActive?: boolean;
  imageUrl?: string | null;
}

export interface CablePlan {
  id: string;
  name: string;
  validity: string;
  price: number;
  platformPrice?: number;
  validityDays?: number;
}

export interface EducationProvider {
  id: string;
  name: string;
  code: string;
  displayName?: string;
  isActive?: boolean;
  imageUrl?: string | null;
  requiresProfile?: boolean;
}

export interface EducationPlan {
  id: string;
  name: string;
  price: number;
  platformPrice?: number;
  description?: string | null;
}

export interface Bank {
  name: string;
  code: string;
  shortName?: string;
  logoUrl?: string | null;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface BankAccountMatch {
  bankCode: string;
  bankName: string;
  shortName: string;
  logoUrl?: string | null;
  accountName: string;
}

export interface AccountResolveResult {
  accountNumber: string;
  matches: BankAccountMatch[];
}

export interface TransferConfig {
  isEnabled: boolean;
  feeType: 'FIXED' | 'PERCENTAGE';
  feeValue: number;
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
}

export interface ServiceAvailabilityItem {
  enabled: boolean;
  available: boolean;
}

export type ServiceAvailabilityMap = Record<string, ServiceAvailabilityItem>;

// ============ Error class ============
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============ Helpers ============
export function formatCurrency(koboOrFormatted: string | number): string {
  if (typeof koboOrFormatted === 'string' && koboOrFormatted.includes('.')) {
    return '₦' + parseFloat(koboOrFormatted).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const raw = typeof koboOrFormatted === 'string' ? parseInt(koboOrFormatted, 10) : koboOrFormatted;
  const value = isNaN(raw) ? 0 : raw / 100;
  return '₦' + value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const MASKED_BALANCE = '₦ ••••••';
export const MASKED_AMOUNT = '₦ ••••';

export function formatCurrencyVisible(
  koboOrFormatted: string | number,
  visible: boolean,
  sign?: '+' | '-'
): string {
  if (!visible) return MASKED_AMOUNT;
  const formatted = formatCurrency(koboOrFormatted);
  if (sign === '+') return `+${formatted}`;
  if (sign === '-') return `-${formatted}`;
  return formatted;
}

export function getCurrentMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isResponseSuccess(response: any): boolean {
  if (response?.status === 'success' || response?.success === true) return true;
  // Some Fastify response schemas strip `status`; treat 200 + payload as success.
  return Boolean(response?.data != null && response?.error == null);
}

export function parseWalletBalanceKobo(data?: { balance?: string; formattedBalance?: string } | null): string {
  if (!data) return '0';

  const raw = String(data.balance ?? '').trim();
  if (raw && /^\d+$/.test(raw)) return raw;

  const formatted = String(data.formattedBalance ?? '').trim();
  if (formatted) {
    const naira = parseFloat(formatted.replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(naira)) return String(Math.round(naira * 100));
  }

  return '0';
}

export function getErrorMessage(err: any): string {
  return (
    err?.response?.data?.message ||
    err?.data?.message ||
    err?.message ||
    'An error occurred. Please try again.'
  );
}

export function isSessionExpiredError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.statusCode === 401 &&
    (/session expired|please sign in|signed in on another device/i.test(err.message))
  );
}

// ============ API Client ============
class ApiClient {
  private baseUrl: string;
  private static isRefreshing = false;
  private static refreshPromise: Promise<TokenRefreshOutcome> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private canRequestWithoutSession(endpoint: string): boolean {
    return (
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/2fa/login') ||
      endpoint.includes('/auth/2fa/login/context') ||
      endpoint.includes('/auth/2fa/send-code') ||
      endpoint.includes('/auth/register/') ||
      endpoint.includes('/auth/forgot-password') ||
      endpoint.includes('/auth/reset-password') ||
      endpoint.includes('/auth/biometric/login')
    );
  }

  private isAuthEndpoint(endpoint: string): boolean {
    return this.canRequestWithoutSession(endpoint);
  }

  private isPreAuthFlow(endpoint: string): boolean {
    return (
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/2fa/login') ||
      endpoint.includes('/auth/2fa/login/context') ||
      endpoint.includes('/auth/2fa/send-code') ||
      endpoint.includes('/auth/register/') ||
      endpoint.includes('/auth/forgot-password') ||
      endpoint.includes('/auth/reset-password') ||
      endpoint.includes('/auth/biometric/login')
    );
  }

  async initTokens() {
    try {
      const SecureStore = require('expo-secure-store');
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      return { accessToken, refreshToken };
    } catch {
      return { accessToken: null, refreshToken: null };
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      // Sync with auth store
      const { useAuthStore } = require('../stores/auth-store');
      useAuthStore.getState().setTokens(accessToken, refreshToken);
    } catch {}
  }

  async persistLoginSession(data?: LoginResponse | null): Promise<User | null> {
    if (!data) return null;

    if (data.accessToken && data.refreshToken) {
      await this.setTokens(data.accessToken, data.refreshToken);
    }

    const { useAuthStore } = require('../stores/auth-store');

    if (data.user) {
      useAuthStore.getState().setUser(data.user);
      return data.user;
    }

    if (!data.accessToken) {
      return useAuthStore.getState().user;
    }

    try {
      const profile = await this.getProfile();
      if (isResponseSuccess(profile) && profile.data) {
        useAuthStore.getState().setUser(profile.data);
        return profile.data;
      }
    } catch {
      // Profile fetch is a fallback when login payload omits user.
    }

    return useAuthStore.getState().user;
  }

  async clearTokens() {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      const { useAuthStore } = require('../stores/auth-store');
      await useAuthStore.getState().clearTokens();
    } catch {}
  }

  private async expireSession(data?: unknown): Promise<void> {
    const { useAuthStore } = require('../stores/auth-store');
    const wasAuthenticated = useAuthStore.getState().isAuthenticated;
    await this.clearTokens();
    if (wasAuthenticated) {
      await notifySessionExpired(resolveSessionLogoutReason(data));
    }
  }

  async getValidToken(options: { logoutOnAuthFailure?: boolean } = {}): Promise<string | null> {
    const logoutOnAuthFailure = options.logoutOnAuthFailure ?? true;
    try {
      const SecureStore = require('expo-secure-store');
      let accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const needsRefresh =
        !accessToken || (accessToken && isAccessTokenExpired(accessToken));

      if (!needsRefresh) {
        return accessToken;
      }

      if (!refreshToken) {
        return accessToken;
      }

      const outcome = await this.refreshTokens();
      if (outcome === 'success') {
        accessToken = await SecureStore.getItemAsync('accessToken');
        return accessToken;
      }
      if (outcome === 'network_failed') {
        return accessToken;
      }

      if (logoutOnAuthFailure) {
        await this.expireSession({ error: { code: 'SESSION_REVOKED' } });
      }
      return null;
    } catch {
      try {
        const SecureStore = require('expo-secure-store');
        return await SecureStore.getItemAsync('accessToken');
      } catch {
        return null;
      }
    }
  }

  private async refreshTokens(): Promise<TokenRefreshOutcome> {
    if (ApiClient.isRefreshing && ApiClient.refreshPromise) {
      return ApiClient.refreshPromise;
    }

    ApiClient.isRefreshing = true;
    ApiClient.refreshPromise = this.performTokenRefresh();
    try {
      return await ApiClient.refreshPromise;
    } finally {
      ApiClient.isRefreshing = false;
      ApiClient.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<TokenRefreshOutcome> {
    try {
      const SecureStore = require('expo-secure-store');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return 'auth_failed';

      let res: Response;
      try {
        res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        return 'network_failed';
      }

      let data: ApiResponse<{ accessToken?: string; refreshToken?: string }> | null = null;
      try {
        data = await res.json();
      } catch {
        return isNetworkFailureStatus(res.status) ? 'network_failed' : 'auth_failed';
      }

      if (res.ok && data?.data?.accessToken && data?.data?.refreshToken) {
        await this.setTokens(data.data.accessToken, data.data.refreshToken);
        return 'success';
      }

      if (isSessionRevoked(res.status, data) || res.status === 401 || res.status === 403) {
        return 'auth_failed';
      }
      if (isNetworkFailureStatus(res.status)) return 'network_failed';
      if (data?.status === 'error' && shouldLogoutFromAuthFailure(res.status, data)) {
        return 'auth_failed';
      }
      return 'network_failed';
    } catch {
      return 'network_failed';
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {},
    retry = true
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'X-Channel': 'app',
        ...(options.headers as Record<string, string>),
      };

      const accessToken = await this.getValidToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      } else if (!this.canRequestWithoutSession(endpoint)) {
        throw new ApiError('Session expired. Please sign in again.', 401, null);
      }

      const { timeoutMs = 30000, ...fetchOptions } = options;
      const method = (fetchOptions.method || 'GET').toUpperCase();
      let body = fetchOptions.body;

      if (body === undefined || body === null || body === '') {
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          body = JSON.stringify({});
        }
      }

      if (body !== undefined && body !== null && body !== '') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        method,
        body,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      // Normalize success field (wallet routes may strip `status` via Fastify response schema)
      if (data && typeof data === 'object') {
        const body = data as ApiResponse<unknown>;
        if (body.status === 'success' || body.status === 'error') {
          body.success = body.status === 'success';
        } else if (body.success === undefined && res.ok && body.error == null) {
          body.success = true;
        }
      }

      if (res.status === 401 && this.isAuthEndpoint(endpoint)) {
        if (!this.isPreAuthFlow(endpoint)) {
          await this.expireSession(data);
        }
        throw new ApiError(data?.message || 'Unauthorized', 401, data);
      }

      if (res.status === 401 && retry && shouldRefreshSession(res.status, data)) {
        const outcome = await this.refreshTokens();
        if (outcome === 'success') {
          return this.request<T>(endpoint, options, false);
        }
        if (outcome === 'network_failed') {
          throw new ApiError(
            'Unable to reach server. Check your connection and try again.',
            0,
            data,
          );
        }
        if (shouldLogoutFromAuthFailure(res.status, data) || isSessionRevoked(res.status, data)) {
          await this.expireSession(data);
        }
        throw new ApiError(
          getApiErrorMessage(data) || 'Session expired. Please sign in again.',
          401,
          data,
        );
      }

      if (res.status === 401 && !retry && shouldRefreshSession(res.status, data)) {
        if (shouldLogoutFromAuthFailure(res.status, data) || isSessionRevoked(res.status, data)) {
          await this.expireSession(data);
        }
        throw new ApiError(
          getApiErrorMessage(data) || 'Session expired. Please sign in again.',
          401,
          data,
        );
      }

      if (!res.ok) {
        throw new ApiError(
          data?.message || data?.error?.details || 'Request failed',
          res.status,
          data
        );
      }

      return data as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request timeout. Please check your connection and try again.', 408, null);
      }
      throw err;
    }
  }

  // ============ AUTH ============

  async initiateRegistration(data: RegisterData): Promise<ApiResponse<{ email: string }>> {
    return this.request('/auth/register/initiate', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        ...(data.phone ? { phone: tryNormalizePhone(data.phone) } : {}),
      }),
    });
  }

  async completeRegistration(email: string, otp: string): Promise<ApiResponse<LoginResponse>> {
    const res = await this.request<ApiResponse<LoginResponse>>('/auth/register/complete', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    if (res.success && res.data) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  }

  async resendRegistrationOtp(email: string): Promise<ApiResponse> {
    return this.request('/auth/register/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(data: { phone?: string; email?: string; password?: string; pin?: string; deviceId?: string }): Promise<ApiResponse<LoginResponse>> {
    const res = await this.request<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        ...(data.phone ? { phone: tryNormalizePhone(data.phone) } : {}),
      }),
    });
    if (res.success && res.data) {
      if (res.data.requiresTwoFactor) {
        await this.clearTokens();
      } else {
        await this.setTokens(res.data.accessToken, res.data.refreshToken);
      }
    }
    return res;
  }

  async verify2FALogin(userId: string, otp: string, deviceId?: string): Promise<ApiResponse<LoginResponse>> {
    const res = await this.request<ApiResponse<LoginResponse>>('/auth/2fa/login', {
      method: 'POST',
      body: JSON.stringify({ userId, otp, ...(deviceId ? { deviceId } : {}) }),
    });
    if (isResponseSuccess(res) && res.data?.accessToken && res.data?.refreshToken) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  }

  async forgotPassword(identifier: string): Promise<ApiResponse<{ email?: string }>> {
    const normalizedIdentifier = identifier.includes('@')
      ? identifier.trim().toLowerCase()
      : tryNormalizePhone(identifier);
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier: normalizedIdentifier }),
    });
  }

  async resetPassword(otp: string, newPassword: string, phone?: string, email?: string): Promise<ApiResponse> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        otp,
        newPassword,
        email,
        ...(phone ? { phone: tryNormalizePhone(phone) } : {}),
      }),
    });
  }

  async logout(): Promise<void> {
    try {
      const SecureStore = require('expo-secure-store');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      await this.clearTokens();
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request('/users/me');
  }

  async validateReferralCode(code: string): Promise<ApiResponse<{ valid: boolean; referrerFirstName?: string }>> {
    const encoded = encodeURIComponent(code.trim());
    return this.request(`/referrals/validate/${encoded}`);
  }

  async getMyReferralSummary(): Promise<ApiResponse<ReferralSummary>> {
    return this.request('/referrals/me');
  }

  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    return this.request('/users/me/notification-settings');
  }

  async updateNotificationSettings(data: {
    masterEnabled?: boolean;
    transactionEmailNotificationsEnabled?: boolean;
    pushNotificationsEnabled?: boolean;
    marketingPushNotificationsEnabled?: boolean;
    transactionSmsNotificationsEnabled?: boolean;
  }): Promise<ApiResponse<NotificationSettings>> {
    return this.request('/users/me/notification-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getNotifications(params?: {
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
    excludeLoginDeviceId?: string;
  }): Promise<ApiResponse<NotificationsListResponse>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    if (params?.excludeLoginDeviceId) query.set('excludeLoginDeviceId', params.excludeLoginDeviceId);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/users/me/notifications${suffix}`);
  }

  async getNotificationUnreadCount(excludeLoginDeviceId?: string): Promise<ApiResponse<{ unreadCount: number }>> {
    const suffix = excludeLoginDeviceId
      ? `?excludeLoginDeviceId=${encodeURIComponent(excludeLoginDeviceId)}`
      : '';
    return this.request(`/users/me/notifications/unread-count${suffix}`);
  }

  async getNotificationById(
    notificationId: string,
    excludeLoginDeviceId?: string,
  ): Promise<ApiResponse<AppNotification>> {
    const suffix = excludeLoginDeviceId
      ? `?excludeLoginDeviceId=${encodeURIComponent(excludeLoginDeviceId)}`
      : '';
    return this.request(`/users/me/notifications/${notificationId}${suffix}`);
  }

  async markNotificationRead(notificationId: string): Promise<ApiResponse<AppNotification>> {
    return this.request(`/users/me/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markNotificationUnread(notificationId: string): Promise<ApiResponse<AppNotification>> {
    return this.request(`/users/me/notifications/${notificationId}/unread`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.request('/users/me/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async markAllNotificationsUnread(): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.request('/users/me/notifications/unread-all', {
      method: 'PATCH',
    });
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/users/me/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async bulkNotificationAction(
    notificationIds: string[],
    action: 'read' | 'unread' | 'delete',
  ): Promise<ApiResponse<{ affected: number }>> {
    return this.request('/users/me/notifications/bulk', {
      method: 'POST',
      body: JSON.stringify({ notificationIds, action }),
    });
  }

  async registerDevice(data: {
    deviceId: string;
    pushToken?: string | null;
    platform: string;
    deviceName?: string;
    appVersion?: string;
  }): Promise<ApiResponse> {
    return this.request('/users/me/device', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async setPin(pin: string, confirmPin?: string): Promise<ApiResponse> {
    return this.request('/auth/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, confirmPin: confirmPin || pin }),
    });
  }

  async changePin(currentPin: string, newPin: string, confirmPin: string): Promise<ApiResponse> {
    return this.request('/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin, confirmPin }),
    });
  }

  async requestPinReset(): Promise<ApiResponse<{ message?: string }>> {
    return this.request('/auth/reset-pin/request', { method: 'POST', body: JSON.stringify({}) });
  }

  async resetPin(otp: string, newPin: string, confirmPin: string): Promise<ApiResponse> {
    return this.request('/auth/reset-pin', {
      method: 'POST',
      body: JSON.stringify({ otp, newPin, confirmPin }),
    });
  }

  async verifyPin(pin: string): Promise<ApiResponse<{ verified: boolean }>> {
    return this.request('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  async enableBiometric(deviceId: string): Promise<ApiResponse<{ biometricToken: string }>> {
    return this.request('/auth/biometric/enable', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    });
  }

  async disableBiometric(): Promise<ApiResponse> {
    return this.request('/auth/biometric/disable', { method: 'POST', body: JSON.stringify({}) });
  }

  async biometricLogin(data: {
    userId: string;
    deviceId: string;
    biometricToken: string;
  }): Promise<ApiResponse<LoginResponse>> {
    const res = await this.request<ApiResponse<LoginResponse>>('/auth/biometric/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (isResponseSuccess(res) && res.data) {
      if (res.data.requiresTwoFactor) {
        await this.clearTokens();
        return res;
      }
      const sessionUser = await this.persistLoginSession(res.data);
      if (sessionUser) {
        res.data.user = sessionUser;
      }
    }
    return res;
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword?: string,
  ): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword: confirmPassword ?? newPassword,
      }),
    });
  }

  async get2FAMethods(): Promise<ApiResponse<{ methods: TwoFactorMethodOption[] }>> {
    return this.request('/auth/2fa/methods');
  }

  async enable2FA(method: TwoFactorMethodType): Promise<ApiResponse<Enable2FAResponse>> {
    return this.request('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
  }

  async verify2FA(otp: string, method: TwoFactorMethodType): Promise<ApiResponse> {
    return this.request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ otp, method }),
    });
  }

  async disable2FA(otp: string): Promise<ApiResponse> {
    return this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
  }

  async send2FACode(
    action: 'enable' | 'disable' | 'login',
    options?: { method?: TwoFactorMethodType; userId?: string },
  ): Promise<ApiResponse<{ message: string; destination?: string; method?: TwoFactorMethodType }>> {
    return this.request('/auth/2fa/send-code', {
      method: 'POST',
      body: JSON.stringify({ action, ...options }),
    });
  }

  async getLoginTwoFactorContext(userId: string): Promise<ApiResponse<{
    userId: string;
    twoFactorMethod: TwoFactorMethodType;
    destination?: string;
  }>> {
    return this.request('/auth/2fa/login/context', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async uploadAvatar(image: string, oldPublicId?: string): Promise<ApiResponse<{ url: string; publicId: string }>> {
    return this.request('/upload/avatar', {
      method: 'POST',
      body: JSON.stringify({ image, oldPublicId }),
    });
  }

  async getContentPage(slug: string): Promise<ApiResponse<{ slug: string; title: string; body: string; updatedAt?: string }>> {
    return this.request(`/content/pages/${slug}`);
  }

  async getSupportConfig(): Promise<ApiResponse<import('./support').SupportConfig>> {
    return this.request('/support/config');
  }

  async getFaq(): Promise<ApiResponse<{ categories: import('./support').FaqCategory[] }>> {
    return this.request('/support/faq');
  }

  async getDisputes(params?: { page?: number; pageSize?: number; status?: string }): Promise<ApiResponse<{
    disputes: import('./support').DisputeRecord[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/disputes${suffix}`);
  }

  async getDispute(disputeId: string): Promise<ApiResponse<import('./support').DisputeRecord>> {
    return this.request(`/disputes/${disputeId}`);
  }

  async getDisputeEligibility(transactionId: string): Promise<ApiResponse<{
    allowed: boolean;
    reason?: string;
    existingDisputeId?: string;
    existingDisputeReference?: string;
  }>> {
    return this.request(`/disputes/eligibility/${transactionId}`);
  }

  async createDispute(data: {
    transactionId?: string;
    reason: string;
    description: string;
  }): Promise<ApiResponse<import('./support').DisputeRecord>> {
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addDisputeMessage(disputeId: string, body: string): Promise<ApiResponse<{ id: string; body: string }>> {
    return this.request(`/disputes/${disputeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async getActiveAds(params: { screen?: string; channel?: 'mobile' | 'web' }): Promise<ApiResponse<{
    ads: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      imageUrl?: string | null;
      linkUrl?: string | null;
      ctaLabel?: string | null;
      adType?: string;
      placement: 'BANNER' | 'CARD' | 'MODAL' | 'TOP_BANNER';
      targetScreen: string;
      channel: string;
      actionType?: 'NONE' | 'URL' | 'SCREEN';
      actionRoute?: string | null;
      frequency?: 'UNLIMITED' | 'ONCE' | 'ONCE_PER_DAY' | 'ONCE_PER_SESSION';
      maxImpressions?: number | null;
    }>;
  }>> {
    const query = new URLSearchParams();
    if (params.screen) query.set('screen', params.screen);
    query.set('channel', params.channel || 'mobile');
    return this.request(`/content/ads?${query.toString()}`);
  }

  async trackAdImpression(adId: string): Promise<void> {
    try {
      await this.request(`/content/ads/${adId}/impression`, { method: 'POST' });
    } catch {
      // Analytics are best-effort.
    }
  }

  async trackAdClick(adId: string): Promise<void> {
    try {
      await this.request(`/content/ads/${adId}/click`, { method: 'POST' });
    } catch {
      // Analytics are best-effort.
    }
  }

  async getActiveBroadcasts(params?: { screen?: string }): Promise<ApiResponse<{
    broadcasts: Array<{
      id: string;
      title: string;
      body: string;
      imageUrl?: string | null;
      displayType: 'IN_APP_MODAL' | 'PUSH' | 'ON_PAGE_BANNER' | 'ON_PAGE_NOTIFICATION';
      targetScreens: string[];
      actionRoute?: string | null;
      actionLabel?: string | null;
      category: string;
      audience: string;
      sentAt?: string | null;
    }>;
  }>> {
    const query = new URLSearchParams();
    if (params?.screen) query.set('screen', params.screen);
    return this.request(`/content/broadcasts?${query.toString()}`);
  }

  // ============ WALLET ============

  async getWalletBalance(): Promise<ApiResponse<{ balance: string; formattedBalance?: string }>> {
    return this.request('/wallet');
  }

  async getWalletMonthSummary(): Promise<ApiResponse<{
    moneyIn: string;
    moneyOut: string;
    inCount: number;
    outCount: number;
  }>> {
    return this.request('/wallet/ledger/summary');
  }

  async getWalletLedger(page = 1, pageSize = 20): Promise<ApiResponse<{
    entries: LedgerEntry[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }>> {
    return this.request(`/wallet/ledger?page=${page}&pageSize=${pageSize}`);
  }

  /** Paginate ledger until all entries for the current calendar month are loaded. */
  async fetchCurrentMonthLedger(options?: { maxPages?: number }): Promise<LedgerEntry[]> {
    const monthStart = getCurrentMonthStart();
    const collected: LedgerEntry[] = [];
    let page = 1;
    const pageSize = 50;
    const maxPages = options?.maxPages ?? 5;

    while (page <= maxPages) {
      const res = await this.getWalletLedger(page, pageSize);
      if (!isResponseSuccess(res)) break;

      const entries = res.data?.entries ?? [];
      if (entries.length === 0) break;

      for (const entry of entries) {
        if (new Date(entry.createdAt) >= monthStart) collected.push(entry);
      }

      const oldest = entries[entries.length - 1];
      if (oldest && new Date(oldest.createdAt) < monthStart) break;

      const totalPages = res.data?.pagination?.totalPages ?? 1;
      if (page >= totalPages) break;
      page += 1;
    }

    return collected;
  }

  async fundWallet(amount: number, callbackUrl?: string): Promise<ApiResponse<{
    authorizationUrl: string;
    reference: string;
    accessCode: string;
  }>> {
    // Backend expects kobo
    return this.request('/wallet/fund', {
      method: 'POST',
      body: JSON.stringify({ amount: Math.round(amount * 100), callbackUrl }),
    });
  }

  async verifyFunding(reference: string): Promise<ApiResponse<{ amount: string }>> {
    return this.request(`/wallet/verify/${reference}`);
  }

  async getFundingMethods(): Promise<ApiResponse<{
    paystackCheckout: boolean;
    payvesselCheckout: boolean;
    permanentVirtualAccount: boolean;
    dynamicVirtualAccount: boolean;
  }>> {
    return this.request('/wallet/funding-methods');
  }

  // ============ PAYVESSEL WALLET FUNDING ============

  async getVirtualAccounts(): Promise<ApiResponse<VirtualAccount[]>> {
    return this.request('/payvessel/accounts');
  }

  async getVirtualAccountBanks(type?: 'STATIC' | 'DYNAMIC'): Promise<ApiResponse<FundingBank[]>> {
    const query = type ? `?type=${type}` : '';
    return this.request(`/payvessel/banks${query}`);
  }

  async createDynamicVirtualAccount(
    amount?: number,
    forceCreate?: boolean,
    bankCode?: string
  ): Promise<ApiResponse<VirtualAccountResponse>> {
    return this.request('/payvessel/create-dynamic-account', {
      method: 'POST',
      body: JSON.stringify({ amount, forceCreate, bankCode }),
    });
  }

  async discardDynamicVirtualAccount(
    accountId?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request('/payvessel/discard-dynamic-account', {
      method: 'POST',
      body: JSON.stringify({ accountId }),
    });
  }

  async createStaticVirtualAccount(
    bankCodes?: string[]
  ): Promise<ApiResponse<VirtualAccountResponse>> {
    return this.request('/payvessel/create-static-account', {
      method: 'POST',
      body: JSON.stringify({ bankCodes }),
    });
  }

  async createPayvesselCheckout(
    amount: number,
    options?: { callbackUrl?: string; sdk?: boolean }
  ): Promise<ApiResponse<PayvesselCheckoutSession>> {
    return this.request('/payvessel/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        callbackUrl: options?.callbackUrl,
        sdk: options?.sdk === true,
      }),
    });
  }

  async syncPayvesselCheckoutReference(
    reference: string,
    checkoutReference: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/payvessel/sync-checkout-reference', {
      method: 'POST',
      body: JSON.stringify({ reference, checkoutReference }),
    });
  }

  async verifyPayvesselCheckout(reference: string): Promise<ApiResponse<{
    success?: boolean;
    amount?: string;
    status?: string;
    message?: string;
  }>> {
    return this.request(`/payvessel/verify-checkout?reference=${encodeURIComponent(reference)}`);
  }

  // ============ TRANSACTIONS ============

  async getTransactions(page = 1, pageSize = 20, filters?: {
    type?: string;
    status?: string;
    category?: 'services' | 'wallet_funding' | 'transfer';
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    transactions: Transaction[];
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    pagination?: { total: number; page: number; pageSize: number; totalPages: number };
  }>> {
    let url = `/transactions?page=${page}&pageSize=${pageSize}`;
    if (filters?.type) url += `&type=${filters.type}`;
    if (filters?.category) url += `&category=${filters.category}`;
    if (filters?.status) url += `&status=${filters.status}`;
    if (filters?.startDate) url += `&startDate=${filters.startDate}`;
    if (filters?.endDate) url += `&endDate=${filters.endDate}`;
    return this.request(url);
  }

  async getRecentTransactions(limit = 10): Promise<ApiResponse<{
    transactions: Transaction[];
  }>> {
    return this.request(`/transactions?page=1&pageSize=${limit}`);
  }

  async getTransactionsByStatus(status: string, page = 1, pageSize = 20): Promise<ApiResponse<{
    transactions: Transaction[];
    pagination?: { total: number; page: number; pageSize: number; totalPages: number };
  }>> {
    return this.request(`/transactions?page=${page}&pageSize=${pageSize}&status=${status}`);
  }

  async getTransactionDetail(id: string): Promise<ApiResponse<Transaction>> {
    return this.request(`/transactions/${id}`);
  }

  // ============ AIRTIME ============

  async getAirtimeProviders(): Promise<ApiResponse<AirtimeProvider[]>> {
    return this.request('/vtu/airtime/providers');
  }

  async getNumberPrefixes(): Promise<ApiResponse<Array<{
    prefix: string;
    networkCode: string;
    networkName: string;
  }>>> {
    return this.request('/vtu/number-prefixes');
  }

  async validateNetwork(phone: string): Promise<ApiResponse<{
    network: string;
    networkName: string;
    isValid: boolean;
    message: string;
  }>> {
    return this.request('/vtu/validate-network', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async purchaseAirtime(data: {
    network: string;
    phone: string;
    amount: number; // in Naira, will convert to kobo
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
    bypassValidation?: boolean;
  }): Promise<ApiResponse<{
    transactionId: string;
    status: string;
    amount: number;
    network: string;
    phone: string;
    cashback: number;
  }>> {
    return this.request('/vtu/airtime', {
      method: 'POST',
      body: JSON.stringify({
        network: data.network,
        phone: data.phone,
        amount: Math.round(data.amount * 100),
        pin: data.pin,
        biometricToken: data.biometricToken,
        deviceId: data.deviceId,
        bypassValidation: data.bypassValidation,
      }),
    });
  }

  // ============ DATA ============

  async getDataProviders(): Promise<ApiResponse<AirtimeProvider[]>> {
    return this.request('/vtu/data/providers');
  }

  async getDataCategories(network: string): Promise<ApiResponse<DataCategory[]>> {
    return this.request(`/vtu/data/categories?network=${network}`);
  }

  async getDataPlans(network?: string): Promise<ApiResponse<DataPlan[]>> {
    const qs = network ? `?network=${network}` : '';
    return this.request(`/vtu/data/plans${qs}`);
  }

  async purchaseData(data: {
    provider: string;
    phone: string;
    bundleId: string;
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
    bypassValidation?: boolean;
  }): Promise<ApiResponse<{
    transactionId: string;
    status: string;
    amount: number;
    plan: string;
    phone: string;
    cashback: number;
    dataBonus: number;
  }>> {
    return this.request('/vtu/data', {
      method: 'POST',
      body: JSON.stringify({
        planId: data.bundleId,
        phone: data.phone,
        network: data.provider,
        pin: data.pin,
        biometricToken: data.biometricToken,
        deviceId: data.deviceId,
        bypassValidation: data.bypassValidation,
      }),
    });
  }

  // ============ ELECTRICITY ============

  async getElectricityProviders(): Promise<ApiResponse<ElectricityProvider[]>> {
    return this.request('/vtu/electricity/discos');
  }

  async verifyElectricityMeter(data: {
    disco: string;
    meterNumber: string;
    meterType: 'prepaid' | 'postpaid';
  }): Promise<ApiResponse<{
    isValid?: boolean;
    customerName: string;
    address?: string;
    meterType: string;
    disco?: string;
  }>> {
    return this.request('/vtu/electricity/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async purchaseElectricity(data: {
    disco: string;
    meterNumber: string;
    meterType: 'prepaid' | 'postpaid';
    amount: number; // in Naira
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
    phone?: string;
  }): Promise<ApiResponse<{
    transactionId: string;
    status: string;
    amount: number;
    token?: string;
    purchasedToken?: string;
    units?: number;
    cashback?: number;
    disco?: string;
  }>> {
    return this.request('/vtu/electricity', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        amount: Math.round(data.amount * 100),
      }),
    });
  }

  // ============ CABLE TV ============

  async getCableProviders(): Promise<ApiResponse<CableProvider[]>> {
    return this.request('/cable/providers');
  }

  async getCablePlans(provider?: string): Promise<ApiResponse<CablePlan[]>> {
    const qs = provider ? `?provider=${provider}` : '';
    return this.request(`/vtu/cable/plans${qs}`);
  }

  async verifyCableSmartCard(data: {
    provider: string;
    smartCardNumber: string;
  }): Promise<ApiResponse<{ customerName: string; customerNumber: string }>> {
    return this.request('/vtu/cable/validate', {
      method: 'POST',
      body: JSON.stringify({
        provider: data.provider,
        smartcardNumber: data.smartCardNumber,
      }),
    });
  }

  async purchaseCable(data: {
    provider: string;
    smartCardNumber: string;
    planId: string;
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
  }): Promise<ApiResponse<{
    transactionId: string;
    status: string;
    amount: number;
    plan: string;
    smartcard: string;
    cashback: number;
    expiresAt: string;
  }>> {
    return this.request('/vtu/cable', {
      method: 'POST',
      body: JSON.stringify({
        provider: data.provider,
        smartcardNumber: data.smartCardNumber,
        planId: data.planId,
        pin: data.pin,
        biometricToken: data.biometricToken,
        deviceId: data.deviceId,
      }),
    });
  }

  // ============ EDUCATION ============

  async getEducationProviders(): Promise<ApiResponse<EducationProvider[]>> {
    return this.request('/education/providers');
  }

  async getEducationPlans(provider?: string): Promise<ApiResponse<EducationPlan[]>> {
    const qs = provider ? `?provider=${encodeURIComponent(provider)}` : '';
    return this.request(`/vtu/education/plans${qs}`);
  }

  async verifyJambProfile(data: {
    provider: string;
    profileId: string;
    profileType?: string;
  }): Promise<ApiResponse<{ customerName: string; profileId: string; profileType?: string }>> {
    return this.request('/vtu/education/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async purchaseEducation(data: {
    provider: string;
    planId: string;
    phone: string;
    profileId?: string;
    profileType?: string;
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
  }): Promise<ApiResponse<{
    transactionId: string;
    status: string;
    message?: string;
  }>> {
    return this.request('/vtu/education', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ BETTING ============

  async getBettingPlatforms(): Promise<ApiResponse<BettingPlatform[]>> {
    return this.request('/vtu/betting/platforms');
  }

  async verifyBettingAccount(data: {
    platform: string;
    accountNumber: string;
  }): Promise<ApiResponse<{ accountNumber: string; platform: string; platformName: string; message: string }>> {
    return this.request('/vtu/betting/validate', {
      method: 'POST',
      body: JSON.stringify({
        platform: data.platform,
        accountNumber: data.accountNumber,
      }),
    });
  }

  async fundBettingAccount(data: {
    platform: string;
    accountNumber: string;
    amount: number;
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
  }): Promise<ApiResponse<{ transactionId: string; reference: string; status: string; message: string }>> {
    return this.request('/vtu/betting', {
      method: 'POST',
      body: JSON.stringify({
        platform: data.platform,
        accountNumber: data.accountNumber,
        amount: Math.round(data.amount * 100),
        pin: data.pin,
        biometricToken: data.biometricToken,
        deviceId: data.deviceId,
      }),
    });
  }

  // ============ SERVICE AVAILABILITY ============

  async getServiceAvailability(): Promise<ApiResponse<ServiceAvailabilityMap>> {
    return this.request('/services/availability');
  }

  async getCatalogRevision(): Promise<ApiResponse<{ revision: number; updatedAt: string }>> {
    return this.request('/services/catalog-revision');
  }

  // ============ BANK TRANSFERS ============

  async getTransferConfig(): Promise<ApiResponse<TransferConfig>> {
    return this.request('/transfers/config');
  }

  async getBanks(): Promise<ApiResponse<Bank[]>> {
    return this.request('/transfers/banks');
  }

  async verifyBankAccount(bankCode: string, accountNumber: string): Promise<ApiResponse<{
    accountName: string;
    accountNumber: string;
    bankCode: string;
  }>> {
    return this.request('/transfers/verify-account', {
      method: 'POST',
      body: JSON.stringify({ bankCode, accountNumber }),
    });
  }

  async resolveBankAccount(
    accountNumber: string,
    bankCode?: string,
  ): Promise<ApiResponse<AccountResolveResult>> {
    return this.request('/transfers/resolve-account', {
      method: 'POST',
      body: JSON.stringify({
        accountNumber,
        ...(bankCode ? { bankCode } : {}),
      }),
    });
  }

  async initiateTransfer(data: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number; // in Naira (will NOT convert, backend expects Naira for transfers)
    narration?: string;
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
    idempotencyKey?: string;
  }): Promise<ApiResponse<{
    reference: string;
    status: string;
    sessionId?: string;
    amount?: number;
  }>> {
    return this.request('/transfers/initiate', {
      method: 'POST',
      body: JSON.stringify(data),
      timeoutMs: 90000,
    });
  }

  async checkTransferStatus(reference: string, sessionId?: string): Promise<ApiResponse<{
    reference: string;
    status: string;
    amount: number;
    completedAt?: string;
  }>> {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    return this.request(`/transfers/status/${encodeURIComponent(reference)}${query}`);
  }

  async getRecentTransferRecipients(limit = 20): Promise<ApiResponse<Array<{
    accountNumber: string;
    accountName: string;
    bankCode: string;
    lastTransferAt: string;
  }>>> {
    return this.request(`/transfers/recent-recipients?limit=${limit}`);
  }

  async removeRecentTransferRecipients(
    recipients: Array<{ bankCode: string; accountNumber: string }>,
  ): Promise<ApiResponse<{ removed: number }>> {
    return this.request('/transfers/recent-recipients', {
      method: 'DELETE',
      body: JSON.stringify({ recipients }),
    });
  }

  async getTransferHistory(page = 1, pageSize = 20): Promise<ApiResponse> {
    return this.request(`/transfers/history?page=${page}&pageSize=${pageSize}`);
  }

  // ============ KYC ============

  async getKycStatus(): Promise<ApiResponse<KycStatusData>> {
    return this.request('/kyc/status');
  }

  async initiateKycTier1(): Promise<ApiResponse> {
    return this.request('/kyc/tier1', { method: 'POST' });
  }

  async verifyBvn(bvn: string, dateOfBirth: string): Promise<ApiResponse> {
    return this.request('/kyc/verify-bvn', {
      method: 'POST',
      body: JSON.stringify({ bvn, dateOfBirth }),
    });
  }

  async updateKycAddress(data: {
    address: string;
    city: string;
    state: string;
    country?: string;
  }): Promise<ApiResponse> {
    return this.request('/kyc/address', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitKycDocument(data: {
    documentType: string;
    documentUrl: string;
    documentNumber?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse> {
    return this.request('/kyc/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createLivenessSession(): Promise<ApiResponse<{
    sessionId: string;
    spokenPhrase: string;
    flowType: 'spoken_v6';
    expiresAt: string;
    expiresInSeconds: number;
  }>> {
    return this.request('/kyc/liveness/session', { method: 'POST' });
  }

  async submitLivenessStep(
    sessionId: string,
    stepKey: string,
    frames: Array<{
      phase: string;
      capturedAt: string;
      metadata: Record<string, unknown>;
      imageBase64?: string;
    }>,
  ): Promise<ApiResponse> {
    return this.request(`/kyc/liveness/session/${sessionId}/steps`, {
      method: 'POST',
      body: JSON.stringify({ stepKey, frames }),
    });
  }

  async completeLivenessSession(
    sessionId: string,
    recordingUrl?: string,
  ): Promise<ApiResponse<{
    sessionId: string;
    decision: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
    reasons: string[];
    passed: boolean;
    spokenPhrase?: string;
    recordingUrl?: string;
  }>> {
    return this.request(`/kyc/liveness/session/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(recordingUrl ? { recordingUrl } : {}),
    });
  }

  async uploadLivenessRecording(
    video: string,
    sessionId?: string,
  ): Promise<ApiResponse<{ url: string; publicId: string }>> {
    return this.request('/upload/liveness-recording', {
      method: 'POST',
      body: JSON.stringify({ video, sessionId }),
      timeoutMs: 120000,
    });
  }

  async uploadLivenessRecordingFile(
    fileUri: string,
    sessionId?: string,
  ): Promise<ApiResponse<{ url: string; publicId: string }>> {
    const uri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
    const accessToken = await this.getValidToken();
    if (!accessToken) {
      throw new ApiError('Session expired. Please sign in again.', 401, null);
    }

    try {
      return await this.uploadLivenessRecordingMultipart(uri, sessionId, accessToken);
    } catch {
      const videoDataUri = await videoToDataUri(uri);
      return this.uploadLivenessRecording(videoDataUri, sessionId);
    }
  }

  private async uploadLivenessRecordingMultipart(
    uri: string,
    sessionId: string | undefined,
    accessToken: string,
  ): Promise<ApiResponse<{ url: string; publicId: string }>> {
    const lowerUri = uri.toLowerCase();
    const isMov = lowerUri.endsWith('.mov') || lowerUri.includes('.mov?');
    const form = new FormData();
    form.append('video', {
      uri,
      name: isMov ? 'liveness.mov' : 'liveness.mp4',
      type: isMov ? 'video/quicktime' : 'video/mp4',
    } as unknown as Blob);
    if (sessionId) {
      form.append('sessionId', sessionId);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch(`${this.baseUrl}/upload/liveness-recording-file`, {
        method: 'POST',
        headers: {
          'X-Channel': 'app',
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
        signal: controller.signal,
      });

      const data = await res.json() as ApiResponse<{ url: string; publicId: string }>;
      if (!res.ok) {
        throw new ApiError(
          getApiErrorMessage(data) || 'Could not upload video recording',
          res.status,
          data,
        );
      }
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async uploadDocument(
    image: string,
    folder?: string,
  ): Promise<ApiResponse<{ url: string; publicId: string }>> {
    return this.request('/upload/document', {
      method: 'POST',
      body: JSON.stringify({ image, folder }),
    });
  }

  async initiatePhoneVerification(): Promise<ApiResponse> {
    return this.request('/kyc/phone/verify', { method: 'POST' });
  }

  async verifyPhoneOtp(otp: string): Promise<ApiResponse> {
    return this.request('/kyc/phone/confirm', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
  }

  async resendPhoneVerificationOtp(): Promise<ApiResponse> {
    return this.request('/kyc/phone/resend', { method: 'POST' });
  }

  async getMyUserType(): Promise<ApiResponse<UserTypeSnapshot>> {
    return this.request('/user-type/me');
  }

  async getUpgradePrograms(): Promise<ApiResponse<UpgradeProgram[]>> {
    return this.request('/user-type/programs');
  }

  async getUserTypeUpgrades(): Promise<ApiResponse<UserTypeUpgradeRecord[]>> {
    return this.request('/user-type/upgrades');
  }

  async purchaseUserTypeUpgrade(data: {
    pathId: string;
    pin?: string;
    biometricToken?: string;
    deviceId?: string;
  }): Promise<ApiResponse<{ message: string; upgradeId: string }>> {
    return this.request('/user-type/upgrade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyApiAccess(): Promise<ApiResponse<ApiAccessSnapshot>> {
    return this.request('/api-access/me');
  }

  async submitApiAccessRequest(data: {
    clientName: string;
    requestedResponseFormat?: 'PLATFORM' | 'MSORG';
    requestedAllowedServices?: string[];
    requestedWebhookUrl?: string;
    userNote?: string;
  }): Promise<ApiResponse<ApiAccessRequestRecord>> {
    return this.request('/api-access/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelApiAccessRequest(requestId: string): Promise<ApiResponse<ApiAccessRequestRecord>> {
    return this.request(`/api-access/request/${requestId}/cancel`, { method: 'POST' });
  }

  async updateMyApiAccessSettings(data: {
    clientName?: string;
    responseFormat?: 'PLATFORM' | 'MSORG';
    allowedServices?: string[];
    webhookUrl?: string | null;
    allowedIps?: string[];
  }): Promise<ApiResponse<ApiClientSnapshot>> {
    return this.request('/api-access/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getDeveloperPortal(): Promise<ApiResponse<DeveloperPortalSnapshot>> {
    return this.request('/developer/portal');
  }

  async getExtendableServices(): Promise<ApiResponse<ExtendableServiceType[]>> {
    return this.request('/developer/extendable-services');
  }

  async getDeveloperDocumentation(): Promise<ApiResponse<DeveloperDocumentation>> {
    return this.request('/developer/docs');
  }

  async getDeveloperCatalog(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request('/developer/catalog');
  }

  async rotateApiKeys(environment: 'TEST' | 'LIVE' = 'TEST'): Promise<ApiResponse<{
    client: ApiClientSnapshot;
    credentials: { environment: string; publicKey: string; secretKey: string };
  }>> {
    return this.request('/api-access/rotate-keys', {
      method: 'POST',
      body: JSON.stringify({ environment }),
    });
  }

  async updateApiIpWhitelist(allowedIps: string[]): Promise<ApiResponse<ApiClientSnapshot>> {
    return this.request('/api-access/ip-whitelist', {
      method: 'PATCH',
      body: JSON.stringify({ allowedIps }),
    });
  }

  async updateApiAccessRequest(
    requestId: string,
    data: {
      clientName?: string;
      requestedResponseFormat?: 'PLATFORM' | 'MSORG';
      requestedAllowedServices?: string[];
      requestedWebhookUrl?: string;
      userNote?: string;
    },
  ): Promise<ApiResponse<ApiAccessRequestRecord>> {
    return this.request(`/api-access/request/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_URL);
