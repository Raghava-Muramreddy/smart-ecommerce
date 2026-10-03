import api from "./client";

export interface Order {
  id: string;
  order_number: string;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  discount: number;
  total: number;
  payment_status: string;
  order_status: string;
  shipping_address?: string;
  notes?: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name_snapshot: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }>;
}

export interface CheckoutData {
  shipping_address?: string;
  notes?: string;
  success_url: string;
  cancel_url: string;
  payment_method?: string;
}

const ordersApi = {
  list: async (params?: { status?: string; page?: number; page_size?: number }) => {
    const response = await api.get("/orders", { params });
    return response.data.data;
  },

  get: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  checkout: async (data: CheckoutData) => {
    const response = await api.post("/checkout", data);
    return response.data.data as { order_id: string; checkout_url: string; session_id: string; total: number };
  },
};

export default ordersApi;
