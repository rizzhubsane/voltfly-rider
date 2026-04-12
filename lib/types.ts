export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hubs: {
        Row: {
          id: string
          name: string
          address: string | null
          created_at: string | null
          // Note: no 'zone' column in DB
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          hub_id: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          role: string
          hub_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          hub_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_hub_id_fkey"
            columns: ["hub_id"]
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          }
        ]
      }
      riders: {
        Row: {
          id: string
          name: string
          phone_1: string
          phone_2: string | null
          status: string
          hub_id: string | null
          auth_user_id: string | null
          expo_push_token: string | null
          payment_status: string | null
          next_payment_date: string | null
          push_notifications_enabled: boolean | null
          valid_until: string | null
          outstanding_balance: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone_1: string
          phone_2?: string | null
          status?: string
          hub_id?: string | null
          auth_user_id?: string | null
          expo_push_token?: string | null
          payment_status?: string | null
          next_payment_date?: string | null
          push_notifications_enabled?: boolean | null
          valid_until?: string | null
          outstanding_balance?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone_1?: string
          phone_2?: string | null
          status?: string
          hub_id?: string | null
          auth_user_id?: string | null
          expo_push_token?: string | null
          payment_status?: string | null
          next_payment_date?: string | null
          push_notifications_enabled?: boolean | null
          valid_until?: string | null
          outstanding_balance?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_hub_id_fkey"
            columns: ["hub_id"]
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          }
        ]
      }
      kyc: {
        Row: {
          id: string
          rider_id: string
          aadhaar_number: string | null
          pan_number: string | null
          address_local: string | null
          address_village: string | null
          photo_url: string | null
          pcc_url: string | null
          aadhaar_front_url: string | null
          aadhaar_back_url: string | null
          pan_url: string | null
          ref1_name: string | null
          ref1_phone: string | null
          ref2_name: string | null
          ref2_phone: string | null
          ref3_name: string | null
          ref3_phone: string | null
          kyc_status: string
          rejection_reason: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rider_id: string
          aadhaar_number?: string | null
          pan_number?: string | null
          address_local?: string | null
          address_village?: string | null
          photo_url?: string | null
          pcc_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_back_url?: string | null
          pan_url?: string | null
          ref1_name?: string | null
          ref1_phone?: string | null
          ref2_name?: string | null
          ref2_phone?: string | null
          ref3_name?: string | null
          ref3_phone?: string | null
          kyc_status?: string
          rejection_reason?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          aadhaar_number?: string | null
          pan_number?: string | null
          address_local?: string | null
          address_village?: string | null
          photo_url?: string | null
          pcc_url?: string | null
          aadhaar_front_url?: string | null
          aadhaar_back_url?: string | null
          pan_url?: string | null
          ref1_name?: string | null
          ref1_phone?: string | null
          ref2_name?: string | null
          ref2_phone?: string | null
          ref3_name?: string | null
          ref3_phone?: string | null
          kyc_status?: string
          rejection_reason?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }
      vehicles: {
        Row: {
          id: string
          make_model: string | null     // nullable — admin may omit
          speed_type: string | null     // nullable — admin may omit
          chassis_number: string
          old_vehicle_id: string | null
          new_vehicle_id: string | null
          vehicle_id: string | null     // consolidated ID e.g. "VFEL0001"
          hub_id: string | null
          zone_id: string | null
          usc_id: string | null
          id_status: string | null
          assigned_rider_id: string | null
          assigned_at: string | null
          status: string | null
          created_at: string | null
          // Note: no driver_id, battery_id, deployment_date, battery_status columns
        }
        Insert: {
          id?: string
          make_model?: string | null
          speed_type?: string | null
          chassis_number: string
          old_vehicle_id?: string | null
          new_vehicle_id?: string | null
          vehicle_id?: string | null
          hub_id?: string | null
          zone_id?: string | null
          usc_id?: string | null
          id_status?: string | null
          assigned_rider_id?: string | null
          assigned_at?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          make_model?: string | null
          speed_type?: string | null
          chassis_number?: string
          old_vehicle_id?: string | null
          new_vehicle_id?: string | null
          vehicle_id?: string | null
          hub_id?: string | null
          zone_id?: string | null
          usc_id?: string | null
          id_status?: string | null
          assigned_rider_id?: string | null
          assigned_at?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_hub_id_fkey"
            columns: ["hub_id"]
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_assigned_rider_id_fkey"
            columns: ["assigned_rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }

      // ─────────────────────────────────────────────────────────────────────
      // Voltfly operational tables
      // ─────────────────────────────────────────────────────────────────────

      payments: {
        Row: {
          id: string
          rider_id: string
          amount: number
          plan_type: string | null
          method: string | null           // "razorpay" | "cash" | etc. (was payment_method)
          status: string
          razorpay_payment_id: string | null
          paid_at: string | null          // timestamp when paid (was payment_date)
          due_date: string | null
          recorded_by: string | null
          notes: string | null
          created_at: string | null
          // Note: no payment_method, no payment_date columns
        }
        Insert: {
          id?: string
          rider_id: string
          amount: number
          plan_type?: string | null
          method?: string | null
          status?: string
          razorpay_payment_id?: string | null
          paid_at?: string | null
          due_date?: string | null
          recorded_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          amount?: number
          plan_type?: string | null
          method?: string | null
          status?: string
          razorpay_payment_id?: string | null
          paid_at?: string | null
          due_date?: string | null
          recorded_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }

      security_deposits: {
        Row: {
          id: string
          rider_id: string
          amount_paid: number | null
          razorpay_payment_id: string | null
          status: string
          deductions: Json | null
          refund_amount: number | null
          refunded_at: string | null
          refund_razorpay_id: string | null
          processed_at: string | null
          processed_by: string | null
          created_at: string | null
          // Note: no 'amount' column — it's amount_paid
        }
        Insert: {
          id?: string
          rider_id: string
          amount_paid?: number | null
          razorpay_payment_id?: string | null
          status?: string
          deductions?: Json | null
          refund_amount?: number | null
          refunded_at?: string | null
          refund_razorpay_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          amount_paid?: number | null
          razorpay_payment_id?: string | null
          status?: string
          deductions?: Json | null
          refund_amount?: number | null
          refunded_at?: string | null
          refund_razorpay_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_deposits_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }

      batteries: {
        Row: {
          id: string
          battery_id: string | null
          driver_id: string | null           // FK to riders (may be null)
          current_rider_id: string | null    // FK to riders (current assignment)  
          deployment_date: string | null
          retrofitment_location: string | null
          status: string | null
          last_action_at: string | null
          created_at: string | null
          // Note: no rider_id column — uses driver_id and current_rider_id
        }
        Insert: {
          id?: string
          battery_id?: string | null
          driver_id?: string | null
          current_rider_id?: string | null
          deployment_date?: string | null
          retrofitment_location?: string | null
          status?: string | null
          last_action_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          battery_id?: string | null
          driver_id?: string | null
          current_rider_id?: string | null
          deployment_date?: string | null
          retrofitment_location?: string | null
          status?: string | null
          last_action_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }

      battery_events_log: {
        Row: {
          id: string
          rider_id: string
          action: string
          trigger_type: string | null
          triggered_by: string | null
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rider_id: string
          action: string
          trigger_type?: string | null
          triggered_by?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          action?: string
          trigger_type?: string | null
          triggered_by?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battery_events_log_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }

      service_requests: {
        Row: {
          id: string
          rider_id: string
          vehicle_id: string | null
          issue_description: string | null   // primary description field (was 'description')
          photo_url: string | null
          status: string
          resolution_notes: string | null
          charges: number | null
          resolved_at: string | null
          created_at: string | null
          parts_selected: Json | null
          payment_status: string | null
          total_parts_cost: number | null
          razorpay_payment_id: string | null
          // Note: no 'type' or 'description' column — use issue_description
        }
        Insert: {
          id?: string
          rider_id: string
          vehicle_id?: string | null
          issue_description?: string | null
          photo_url?: string | null
          status?: string
          resolution_notes?: string | null
          charges?: number | null
          resolved_at?: string | null
          created_at?: string | null
          parts_selected?: Json | null
          payment_status?: string | null
          total_parts_cost?: number | null
          razorpay_payment_id?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          vehicle_id?: string | null
          issue_description?: string | null
          photo_url?: string | null
          status?: string
          resolution_notes?: string | null
          charges?: number | null
          resolved_at?: string | null
          created_at?: string | null
          parts_selected?: Json | null
          payment_status?: string | null
          total_parts_cost?: number | null
          razorpay_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }

      notifications: {
        Row: {
          id: string
          rider_id: string
          type: string | null
          title: string
          message: string
          channel: string | null
          status: string | null
          error: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rider_id: string
          type?: string | null
          title: string
          message: string
          channel?: string | null
          status?: string | null
          error?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          type?: string | null
          title?: string
          message?: string
          channel?: string | null
          status?: string | null
          error?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }

      swap_history: {
        Row: {
          id: string
          rider_id: string
          hub_id: string | null
          battery_in: string | null
          battery_out: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          rider_id: string
          hub_id?: string | null
          battery_in?: string | null
          battery_out?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          hub_id?: string | null
          battery_in?: string | null
          battery_out?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swap_history_rider_id_fkey"
            columns: ["rider_id"]
            referencedRelation: "riders"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Hub = Database['public']['Tables']['hubs']['Row'];
export type AdminUser = Database['public']['Tables']['admin_users']['Row'];
export type Rider = Database['public']['Tables']['riders']['Row'];
export type KycRecord = Database['public']['Tables']['kyc']['Row'];
export type KycWithRider = KycRecord & { riders: Rider };
export type RiderWithHub = Rider & { hub: Pick<Hub, 'name' | 'address'> | null };
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleWithDetails = Vehicle & {
  hub: Pick<Hub, 'name' | 'address'> | null;
  riders: Pick<Rider, 'name'> | null;
};
export type Battery = Database['public']['Tables']['batteries']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type ServiceRequest = Database['public']['Tables']['service_requests']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type SecurityDeposit = Database['public']['Tables']['security_deposits']['Row'];

// ─── Rider Detail (get_rider_full response) ─────────────────────────────────

export interface VehicleInfo {
  id: string;
  make_model: string | null;
  vehicle_id: string | null;
  chassis_number: string | null;
  old_vehicle_id: string | null;
  new_vehicle_id: string | null;
  usc_id: string | null;
  status: string | null;
  assigned_at: string | null;
}

export interface BatteryInfo {
  id: string;
  battery_id: string | null;
  driver_id: string | null;
  current_rider_id: string | null;
  deployment_date: string | null;
  status: string | null;
}

export interface PaymentRecord {
  id: string;
  rider_id: string;
  amount: number;
  plan_type: string | null;
  method: string | null;
  paid_at: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string | null;
}

export interface ServiceRequestRecord {
  id: string;
  rider_id: string;
  vehicle_id: string | null;
  issue_description: string | null;
  status: string;
  charges: number | null;
  resolution_notes: string | null;
  created_at: string | null;
  resolved_at: string | null;
}

export interface BatteryEvent {
  id: string;
  rider_id: string;
  action: string;
  trigger_type: string | null;
  triggered_by: string | null;
  reason: string | null;
  created_at: string | null;
}

export interface RiderFullData {
  rider: Rider & { hub: Pick<Hub, 'name' | 'address'> | null };
  kyc: KycRecord | null;
  vehicle: VehicleInfo | null;
  payments: PaymentRecord[];
  service_requests: ServiceRequestRecord[];
}
