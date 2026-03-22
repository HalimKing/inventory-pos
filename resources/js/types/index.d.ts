import { Company } from './index.d';
import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

// flash messages
export interface FlashMessages {
    success?: string;
    error?: string;
    data?: any;
}

// types/index.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  category: string;
  has_expiry?: boolean;
  track_batch?: boolean;
  track_serial?: boolean;
  expiry_date?: string | null;
  inventory_type?: 'perishable' | 'non-perishable';
}

export interface Batch {
  id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  manufacturer: string;
  date_received: string;
}

export interface ProductWithBatches extends Product {
  batches: Batch[];
  totalStock: number;
}

export interface Company {
  logo?: string;
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  return_policy?: string;
  thank_you_message?: string;
}