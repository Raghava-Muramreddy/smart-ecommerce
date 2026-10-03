import api from "./client";

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image?: string;
  quantity: number;
  line_total: number;
  stock_available: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

const cartApi = {
  get: async (): Promise<Cart> => {
    const response = await api.get("/cart");
    return response.data.data;
  },

  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const response = await api.post("/cart/items", { product_id: productId, quantity });
    return response.data.data;
  },

  updateItem: async (itemId: string, quantity: number): Promise<Cart> => {
    const response = await api.patch(`/cart/items/${itemId}`, { quantity });
    return response.data.data;
  },

  removeItem: async (itemId: string): Promise<Cart> => {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data.data;
  },

  clear: async (): Promise<void> => {
    await api.delete("/cart");
  },
};

export default cartApi;
