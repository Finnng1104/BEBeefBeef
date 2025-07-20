# Sử dụng image Node.js Alpine để giảm kích thước
FROM node:20.14.0-alpine

# Tạo user không phải root để tăng security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files trước để tận dụng Docker cache
COPY package*.json ./

# Cài đặt dependencies production
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Thay đổi quyền sở hữu cho thư mục app
RUN chown -R appuser:appgroup /app

# Chuyển sang user không phải root
USER appuser

# Expose port
EXPOSE 3000

# Môi trường production
ENV NODE_ENV=production
ENV PORT=3000

# Command chạy ứng dụng
CMD ["npm", "start"]