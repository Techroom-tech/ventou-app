export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      campaign_clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          country: string | null
          device: string | null
          fbclid: string | null
          id: string
          ip_address: string | null
          link_id: string
          shop_id: string
          ttclid: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device?: string | null
          fbclid?: string | null
          id?: string
          ip_address?: string | null
          link_id: string
          shop_id: string
          ttclid?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device?: string | null
          fbclid?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string
          shop_id?: string
          ttclid?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_clicks_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          click_id: string | null
          created_at: string
          event_type: string
          id: string
          link_id: string
          order_id: string | null
          product_id: string | null
          revenue: number | null
          shop_id: string
          visitor_id: string
        }
        Insert: {
          click_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          link_id: string
          order_id?: string | null
          product_id?: string | null
          revenue?: number | null
          shop_id: string
          visitor_id: string
        }
        Update: {
          click_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          link_id?: string
          order_id?: string | null
          product_id?: string | null
          revenue?: number | null
          shop_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "campaign_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "tracked_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          shop_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shop_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shop_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_settings: {
        Row: {
          allow_cod: boolean
          allow_whatsapp: boolean
          created_at: string
          delivery_fee: number
          has_delivery_fee: boolean
          id: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          allow_cod?: boolean
          allow_whatsapp?: boolean
          created_at?: string
          delivery_fee?: number
          has_delivery_fee?: boolean
          id?: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          allow_cod?: boolean
          allow_whatsapp?: boolean
          created_at?: string
          delivery_fee?: number
          has_delivery_fee?: boolean
          id?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          shop_id: string | null
          type: string
          usage_limit: number | null
          used_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          shop_id?: string | null
          type?: string
          usage_limit?: number | null
          used_count?: number | null
          value?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          shop_id?: string | null
          type?: string
          usage_limit?: number | null
          used_count?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          provider: string | null
          recipient: string
          status: string
          template_slug: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          provider?: string | null
          recipient: string
          status?: string
          template_slug?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          provider?: string | null
          recipient?: string
          status?: string
          template_slug?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_providers: {
        Row: {
          config: Json
          created_at: string | null
          driver: string
          email_notification_enabled: boolean | null
          email_verification_enabled: boolean | null
          encrypted_config: Json | null
          id: string
          is_active: boolean | null
          mail_host: string | null
          mail_password: string | null
          mail_port: number | null
          mail_username: string | null
          name: string
          sender_email: string | null
          sender_name: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          driver: string
          email_notification_enabled?: boolean | null
          email_verification_enabled?: boolean | null
          encrypted_config?: Json | null
          id?: string
          is_active?: boolean | null
          mail_host?: string | null
          mail_password?: string | null
          mail_port?: number | null
          mail_username?: string | null
          name: string
          sender_email?: string | null
          sender_name?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          driver?: string
          email_notification_enabled?: boolean | null
          email_verification_enabled?: boolean | null
          encrypted_config?: Json | null
          id?: string
          is_active?: boolean | null
          mail_host?: string | null
          mail_password?: string | null
          mail_port?: number | null
          mail_username?: string | null
          name?: string
          sender_email?: string | null
          sender_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_rate_limits: {
        Row: {
          count: number | null
          id: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          count?: number | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          count?: number | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          id: string
          message: string
          page_url: string | null
          screenshot_url: string | null
          status: string
          store_id: string | null
          title: string
          type: string
          user_id: string
          votes_count: number
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          message: string
          page_url?: string | null
          screenshot_url?: string | null
          status?: string
          store_id?: string | null
          title: string
          type?: string
          user_id: string
          votes_count?: number
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          message?: string
          page_url?: string | null
          screenshot_url?: string | null
          status?: string
          store_id?: string | null
          title?: string
          type?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_promotions: {
        Row: {
          created_at: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          featured: boolean | null
          id: string
          is_active: boolean | null
          product_id: string
          shop_id: string
          show_badge: boolean | null
          show_countdown: boolean | null
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          ends_at: string
          featured?: boolean | null
          id?: string
          is_active?: boolean | null
          product_id: string
          shop_id: string
          show_badge?: boolean | null
          show_countdown?: boolean | null
          starts_at: string
        }
        Update: {
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string
          featured?: boolean | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          shop_id?: string
          show_badge?: boolean | null
          show_countdown?: boolean | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_promotions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_cancel: boolean | null
          email_orders: boolean | null
          id: string
          shop_id: string | null
          telegram_bot: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_cancel?: boolean | null
          email_orders?: boolean | null
          id?: string
          shop_id?: string | null
          telegram_bot?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_cancel?: boolean | null
          email_orders?: boolean | null
          id?: string
          shop_id?: string | null
          telegram_bot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status: string
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          city: string
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          delivery_fee: number | null
          id: string
          is_archived: boolean
          items: Json
          location_url: string | null
          notes: string | null
          payment_method: string
          phone: string
          quartier: string | null
          seller_note: string | null
          shop_id: string
          status: string
          subtotal: number | null
          total: number
        }
        Insert: {
          city: string
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string
          is_archived?: boolean
          items: Json
          location_url?: string | null
          notes?: string | null
          payment_method: string
          phone: string
          quartier?: string | null
          seller_note?: string | null
          shop_id: string
          status?: string
          subtotal?: number | null
          total: number
        }
        Update: {
          city?: string
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string
          is_archived?: boolean
          items?: Json
          location_url?: string | null
          notes?: string | null
          payment_method?: string
          phone?: string
          quartier?: string | null
          seller_note?: string | null
          shop_id?: string
          status?: string
          subtotal?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          cod_enabled: boolean | null
          created_at: string | null
          id: string
          shop_id: string | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          cod_enabled?: boolean | null
          created_at?: string | null
          id?: string
          shop_id?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          cod_enabled?: boolean | null
          created_at?: string | null
          id?: string
          shop_id?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          position: number | null
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          position?: number | null
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          position?: number | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          country: string | null
          created_at: string | null
          full_name: string
          id: string
          is_approved: boolean | null
          phone: string | null
          product_id: string
          rating: number
          review_text: string | null
          shop_id: string
          vendor_reply: string | null
          vendor_reply_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          product_id: string
          rating: number
          review_text?: string | null
          shop_id: string
          vendor_reply?: string | null
          vendor_reply_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean | null
          phone?: string | null
          product_id?: string
          rating?: number
          review_text?: string | null
          shop_id?: string
          vendor_reply?: string | null
          vendor_reply_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price: number | null
          product_id: string | null
          stock: number | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          product_id?: string | null
          stock?: number | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          product_id?: string | null
          stock?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: Json | null
          description_json: Json | null
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          product_type: string | null
          shop_id: string | null
          slug: string | null
          status: string | null
          stock_quantity: number | null
          tags: string[] | null
          track_stock: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: Json | null
          description_json?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price: number
          product_type?: string | null
          shop_id?: string | null
          slug?: string | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          track_stock?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: Json | null
          description_json?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          product_type?: string | null
          shop_id?: string | null
          slug?: string | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          track_stock?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          phone: string | null
          role: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          shop_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shop_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shop_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          background_color: string | null
          badge_color: string | null
          banner_size: string | null
          banner_url: string | null
          body_font: string | null
          body_size_px: number | null
          button_animation: string | null
          button_color: string | null
          button_radius: string | null
          button_shadow: string | null
          button_text_color: string | null
          button_width: string | null
          card_bg_color: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string | null
          cta_label: string | null
          currency: string | null
          dark_mode_enabled: boolean | null
          deleted_at: string | null
          description: string | null
          enable_cod: boolean | null
          enable_whatsapp_order: boolean | null
          favicon_url: string | null
          footer_color: string | null
          global_radius: string | null
          header_color: string | null
          heading_font: string | null
          id: string
          identity_display_mode: string | null
          is_active: boolean | null
          is_suspended: boolean
          is_verified: boolean | null
          letter_spacing_px: number | null
          line_height_pct: number | null
          logo_url: string | null
          name: string
          owner_id: string
          primary_color: string | null
          product_card_style: string | null
          products_per_row: string | null
          products_sort_order: string | null
          secondary_color: string | null
          slug: string
          spacing: string | null
          spacing_density: string | null
          suspended_reason: string | null
          theme_color: string | null
          title_size: string | null
          title_size_px: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          background_color?: string | null
          badge_color?: string | null
          banner_size?: string | null
          banner_url?: string | null
          body_font?: string | null
          body_size_px?: number | null
          button_animation?: string | null
          button_color?: string | null
          button_radius?: string | null
          button_shadow?: string | null
          button_text_color?: string | null
          button_width?: string | null
          card_bg_color?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cta_label?: string | null
          currency?: string | null
          dark_mode_enabled?: boolean | null
          deleted_at?: string | null
          description?: string | null
          enable_cod?: boolean | null
          enable_whatsapp_order?: boolean | null
          favicon_url?: string | null
          footer_color?: string | null
          global_radius?: string | null
          header_color?: string | null
          heading_font?: string | null
          id?: string
          identity_display_mode?: string | null
          is_active?: boolean | null
          is_suspended?: boolean
          is_verified?: boolean | null
          letter_spacing_px?: number | null
          line_height_pct?: number | null
          logo_url?: string | null
          name: string
          owner_id: string
          primary_color?: string | null
          product_card_style?: string | null
          products_per_row?: string | null
          products_sort_order?: string | null
          secondary_color?: string | null
          slug: string
          spacing?: string | null
          spacing_density?: string | null
          suspended_reason?: string | null
          theme_color?: string | null
          title_size?: string | null
          title_size_px?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          background_color?: string | null
          badge_color?: string | null
          banner_size?: string | null
          banner_url?: string | null
          body_font?: string | null
          body_size_px?: number | null
          button_animation?: string | null
          button_color?: string | null
          button_radius?: string | null
          button_shadow?: string | null
          button_text_color?: string | null
          button_width?: string | null
          card_bg_color?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          cta_label?: string | null
          currency?: string | null
          dark_mode_enabled?: boolean | null
          deleted_at?: string | null
          description?: string | null
          enable_cod?: boolean | null
          enable_whatsapp_order?: boolean | null
          favicon_url?: string | null
          footer_color?: string | null
          global_radius?: string | null
          header_color?: string | null
          heading_font?: string | null
          id?: string
          identity_display_mode?: string | null
          is_active?: boolean | null
          is_suspended?: boolean
          is_verified?: boolean | null
          letter_spacing_px?: number | null
          line_height_pct?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          primary_color?: string | null
          product_card_style?: string | null
          products_per_row?: string | null
          products_sort_order?: string | null
          secondary_color?: string | null
          slug?: string
          spacing?: string | null
          spacing_density?: string | null
          suspended_reason?: string | null
          theme_color?: string | null
          title_size?: string | null
          title_size_px?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      store_pages: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          icon: string
          id: string
          page_type: string
          shop_id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          page_type?: string
          shop_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          page_type?: string
          shop_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          banner_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          slogan: string | null
          slug: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slogan?: string | null
          slug: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slogan?: string | null
          slug?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          max_products: number
          max_stores: number
          name: string
          price_monthly: number
          requires_approval: boolean | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id: string
          max_products?: number
          max_stores?: number
          name: string
          price_monthly?: number
          requires_approval?: boolean | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          max_products?: number
          max_stores?: number
          name?: string
          price_monthly?: number
          requires_approval?: boolean | null
        }
        Relationships: []
      }
      tracked_links: {
        Row: {
          clicks: number | null
          created_at: string | null
          id: string
          last_clicked_at: string | null
          name: string
          ref_code: string
          shop_id: string
          source: string
          target_url: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          id?: string
          last_clicked_at?: string | null
          name: string
          ref_code: string
          shop_id: string
          source?: string
          target_url: string
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          id?: string
          last_clicked_at?: string | null
          name?: string
          ref_code?: string
          shop_id?: string
          source?: string
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_links_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_settings: {
        Row: {
          created_at: string | null
          custom_scripts: string | null
          facebook_capi_token: string | null
          facebook_pixel: string | null
          gtm_id: string | null
          id: string
          shop_id: string | null
          tiktok_pixel: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_scripts?: string | null
          facebook_capi_token?: string | null
          facebook_pixel?: string | null
          gtm_id?: string | null
          id?: string
          shop_id?: string | null
          tiktok_pixel?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_scripts?: string | null
          facebook_capi_token?: string | null
          facebook_pixel?: string | null
          gtm_id?: string | null
          id?: string
          shop_id?: string | null
          tiktok_pixel?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_shop_with_validation: {
        Args: {
          _category?: string
          _city?: string
          _country?: string
          _description?: string
          _name: string
          _primary_color?: string
          _slug: string
          _whatsapp?: string
        }
        Returns: {
          domain: string
          error_code: string
          normalized_slug: string
          shop_id: string
          store_limit: number
          stores_count: number
          success: boolean
        }[]
      }
      get_customer_stats: {
        Args: {
          _page_offset?: number
          _page_size?: number
          _search?: string
          _shop_id: string
        }
        Returns: {
          cancelled: number
          city: string
          delivered: number
          first_order_date: string
          name: string
          phone: string
          quartier: string
          total_amount: number
          total_count: number
          total_orders: number
        }[]
      }
      get_repeat_customer_count: { Args: { _shop_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_tracked_link_click: {
        Args: { _ref_code: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "support" | "vendor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "manager", "support", "vendor"],
    },
  },
} as const
