// PrivateVTU Mobile API Client
// Matches exactly the web frontend's client.ts endpoints

import {
  isAccessTokenExpired,
  notifySessionExpired,
  shouldRefreshSession,
} from './session';

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
}

export interface RegisterData {
  phone: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referralCode?: string;
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
}

export interface CableProvider {
  id: string;
  name: string;
  code: string;
  displayName?: string;
  isActive?: boolean;
}

export interface CablePlan {
  id: string;
  name: string;
  validity: string;
  price: number;
  platformPrice?: number;
  validityDays?: number;
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
    /session expired|please sign in/i.test(err.message)
  );
}

// ============ API Client ============
class ApiClient {
  private baseUrl: string;
  private static isRefreshing = false;
  private static refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private isAuthEndpoint(endpoint: string): boolean {
    return (
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/login')
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

  async clearTokens() {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      const { useAuthStore } = require('../stores/auth-store');
      await useAuthStore.getState().clearTokens();
    } catch {}
  }

  private async expireSession(): Promise<void> {
    const { useAuthStore } = require('../stores/auth-store');
    const wasAuthenticated = useAuthStore.getState().isAuthenticated;
    await this.clearTokens();
    if (wasAuthenticated) {
      void notifySessionExpired();
    }
  }

  async getValidToken(): Promise<string | null> {
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
        await this.clearTokens();
        return null;
      }

      const refreshed = await this.refreshTokens();
      if (!refreshed) {
        await this.expireSession();
        return null;
      }

      accessToken = await SecureStore.getItemAsync('accessToken');
      return accessToken;
    } catch {
      return null;
    }
  }

  private async refreshTokens(): Promise<boolean> {
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

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const SecureStore = require('expo-secure-store');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return false;

      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      const tokens = data?.data;
      if (tokens?.accessToken && tokens?.refreshToken) {
        await this.setTokens(tokens.accessToken, tokens.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {},
    retry = true
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Channel': 'mobile',
        ...(options.headers as Record<string, string>),
      };

      const accessToken = await this.getValidToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      } else if (!this.isAuthEndpoint(endpoint)) {
        throw new ApiError('Session expired. Please sign in again.', 401, null);
      }

      const { timeoutMs = 30000, ...fetchOptions } = options;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
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
        if (!endpoint.includes('/auth/login')) {
          await this.expireSession();
        }
        throw new ApiError(data?.message || 'Unauthorized', 401, data);
      }

      if (res.status === 401 && retry && shouldRefreshSession(res.status, data)) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          return this.request<T>(endpoint, options, false);
        }
        await this.expireSession();
        throw new ApiError('Session expired. Please sign in again.', 401, data);
      }

      if (res.status === 401 && !retry && shouldRefreshSession(res.status, data)) {
        await this.expireSession();
        throw new ApiError('Session expired. Please sign in again.', 401, data);
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
      body: JSON.stringify(data),
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

  async login(data: { phone?: string; email?: string; password?: string; pin?: string }): Promise<ApiResponse<LoginResponse>> {
    const res = await this.request<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success && res.data && !res.data.requiresTwoFactor) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  }

  async verify2FALogin(userId: string, otp: string): Promise<ApiResponse<LoginResponse>> {
    const res = await this.request<ApiResponse<LoginResponse>>('/auth/2fa/login', {
      method: 'POST',
      body: JSON.stringify({ userId, otp }),
    });
    if (res.success && res.data) {
      await this.setTokens(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  }

  async forgotPassword(identifier: string): Promise<ApiResponse<{ email?: string }>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  async resetPassword(otp: string, newPassword: string, phone?: string, email?: string): Promise<ApiResponse> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ otp, newPassword, phone, email }),
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

  async getNotificationSettings(): Promise<ApiResponse<{
    transactionEmailNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
  }>> {
    return this.request('/users/me/notification-settings');
  }

  async updateNotificationSettings(data: {
    transactionEmailNotificationsEnabled?: boolean;
    pushNotificationsEnabled?: boolean;
  }): Promise<ApiResponse<{
    transactionEmailNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
  }>> {
    return this.request('/users/me/notification-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
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

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async enable2FA(): Promise<ApiResponse<{ secret: string; qrCode: string }>> {
    return this.request('/auth/2fa/enable', { method: 'POST' });
  }

  async verify2FA(otp: string): Promise<ApiResponse> {
    return this.request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ otp }) });
  }

  async disable2FA(otp: string): Promise<ApiResponse> {
    return this.request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ otp }) });
  }

  // ============ WALLET ============

  async getWalletBalance(): Promise<ApiResponse<{ balance: string; formattedBalance?: string }>> {
    return this.request('/wallet');
  }

  async getWalletLedger(page = 1, pageSize = 20): Promise<ApiResponse<{
    entries: LedgerEntry[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }>> {
    return this.request(`/wallet/ledger?page=${page}&pageSize=${pageSize}`);
  }

  /** Paginate ledger until all entries for the current calendar month are loaded. */
  async fetchCurrentMonthLedger(): Promise<LedgerEntry[]> {
    const monthStart = getCurrentMonthStart();
    const collected: LedgerEntry[] = [];
    let page = 1;
    const pageSize = 50;

    while (page <= 50) {
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
    pin: string;
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
    pin: string;
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
    pin: string;
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
    pin: string;
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
      }),
    });
  }

  // ============ SERVICE AVAILABILITY ============

  async getServiceAvailability(): Promise<ApiResponse<ServiceAvailabilityMap>> {
    return this.request('/services/availability');
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
    pin: string;
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

  async getRecentTransferRecipients(limit = 8): Promise<ApiResponse<Array<{
    accountNumber: string;
    accountName: string;
    bankCode: string;
    lastTransferAt: string;
  }>>> {
    return this.request(`/transfers/recent-recipients?limit=${limit}`);
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
}

export const api = new ApiClient(API_URL);
