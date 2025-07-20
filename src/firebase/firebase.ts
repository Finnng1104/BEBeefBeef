import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export default admin;

/*


Đây là **trái tim** của việc cấu hình Firebase cho backend.

Giải thích:

| Thành phần | Ý nghĩa |
|------------|--------|
| `admin.initializeApp(...)` | Khởi tạo ứng dụng Firebase phía server |
| `credential:` | Chỉ định thông tin xác thực để kết nối Firebase |
| `admin.credential.cert(...)` | Tạo credentials từ private key `.json` |
| `serviceAccount as admin.ServiceAccount` | Ép kiểu dữ liệu `.json` để TypeScript hiểu đúng |

Sau khi khởi tạo xong, bạn có thể dùng `admin.messaging()`, `admin.firestore()`, `admin.auth()`...

---

### ```ts
export default admin;

*/
