export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name; // Đảm bảo tên lỗi chính xác
    Error.captureStackTrace(this, this.constructor); // Lưu trữ stack trace
  }
}
