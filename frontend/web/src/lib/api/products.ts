import api from "./client";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  sku: string;
  category_id?: string;
  is_active: boolean;
  view_count: number;
  category?: { id: string; name: string; slug: string } | null;
  images: Array<{ id: string; url: string; is_primary: boolean; sort_order: number }>;
}

export interface ProductListParams {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const productsApi = {
  list: async (params: ProductListParams = {}): Promise<PaginatedProducts> => {
    const response = await api.get("/products", { params });
    return response.data.data;
  },

  get: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data.data;
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await api.post("/products", data);
    return response.data.data;
  },

  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await api.patch(`/products/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  uploadImage: async (productId: string, file: File, isPrimary = false): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_primary", String(isPrimary));
    await api.post(`/products/${productId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default productsApi;
