FROM node:20 AS builder

# Set thư mục làm việc
WORKDIR /app

COPY package*.json ./

# Cài dependencies
RUN npm install

# Copy toàn bộ code project vào
COPY . .


RUN npm run build


# --- GIAI ĐOẠN 2: "PRODUCTION" (Sản phẩm cuối) ---
# Dùng image Nginx siêu nhẹ
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy file cấu hình Nginx (ở Bước 1) vào vị trí của Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Mở cổng 80
EXPOSE 80

# Lệnh để khởi động Nginx
CMD ["nginx", "-g", "daemon off;"]