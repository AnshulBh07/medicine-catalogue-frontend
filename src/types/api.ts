import type {
  PublicBatch,
  PublicCommercialDetails,
  PublicComposition,
  PublicCompositionSalt,
  PublicManufacturer,
  PublicMedicine,
  PublicMr,
  PublicSalt,
  PublicUser,
} from './models';

export interface ApiErrorDetail {
  code?: string;
  message?: string;
  path?: (string | number)[];
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  user: PublicUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  user: PublicUser;
}

export interface HealthResponse {
  status: string;
  api: string;
  database: string;
}

export interface UserResponse {
  user: PublicUser;
}

export interface SaltsResponse {
  salts: PublicSalt[];
}

export interface SaltResponse {
  salt: PublicSalt;
}

export interface CompositionSaltsResponse {
  compositionSalts: PublicCompositionSalt[];
}

export interface CompositionSaltResponse {
  compositionSalt: PublicCompositionSalt;
}

export interface CompositionsResponse {
  compositions: PublicComposition[];
}

export interface CompositionResponse {
  composition: PublicComposition;
}

export interface ManufacturersResponse {
  manufacturers: PublicManufacturer[];
}

export interface ManufacturerResponse {
  manufacturer: PublicManufacturer;
}

export interface MrsResponse {
  mrs: PublicMr[];
}

export interface MrResponse {
  mr: PublicMr;
}

export interface MedicinesResponse {
  medicines: PublicMedicine[];
}

export interface MedicineResponse {
  medicine: PublicMedicine;
}

export interface BatchesResponse {
  batches: PublicBatch[];
}

export interface BatchResponse {
  batch: PublicBatch;
}

export interface CommercialDetailsResponse {
  commercialDetails: PublicCommercialDetails;
}
