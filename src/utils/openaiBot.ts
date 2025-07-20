import axios from 'axios';
import dotenv from 'dotenv';
import BotService from '../services/BotService';
dotenv.config();

export const getBotReply = async (
  userMessage: string,
): Promise<{ content: string; attachments: string[] }> => {
  try {
    // Kiểm tra xem có phải câu hỏi về món ăn không
    const dishKeywords = [
      'món ăn',
      'thực đơn',
      'menu',
      'thịt bò',
      'steak',
      'wagyu',
      'angus',
      'ribeye',
      'tenderloin',
      'món ngon',
      'đặc sản',
      'signature',
      'nổi bật',
      'món mới',
      'khuyến nghị',
      'giá bao nhiêu',
      'bao nhiêu tiền',
    ];

    const isDishQuestion = dishKeywords.some((keyword) =>
      userMessage.toLowerCase().includes(keyword),
    );

    // Nếu là câu hỏi về món ăn, tìm và trả về thông tin món ăn
    if (isDishQuestion) {
      const dishes = await BotService.findDishesByKeyword(userMessage);

      if (dishes.length > 0) {
        // Nếu tìm thấy món ăn cụ thể
        if (dishes.length === 1) {
          return BotService.createDishMessage(dishes[0]);
        } else {
          // Nếu tìm thấy nhiều món ăn
          return BotService.createDishesListMessage(dishes, 'Các món ăn phù hợp');
        }
      }

      // Nếu không tìm thấy món ăn cụ thể, thử lấy món nổi bật
      const featuredDishes = await BotService.getFeaturedDishes();
      if (featuredDishes.length > 0) {
        const result = BotService.createDishesListMessage(
          featuredDishes,
          'Món ăn nổi bật của nhà hàng',
        );
        result.content += '\n\n💡 *Bạn có thể hỏi cụ thể hơn về món ăn bạn quan tâm!*';
        return result;
      }
    }

    // Kiểm tra câu hỏi về danh mục món ăn
    const categoryKeywords = {
      'thịt bò': ['thịt bò', 'beef', 'steak', 'bít tết'],
      'đồ uống': ['đồ uống', 'nước', 'rượu', 'cocktail', 'mocktail'],
      'món chay': ['chay', 'vegetarian', 'vegan'],
      'tráng miệng': ['tráng miệng', 'dessert', 'bánh', 'kem'],
      'khai vị': ['khai vị', 'appetizer', 'starter'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => userMessage.toLowerCase().includes(keyword))) {
        const categoryDishes = await BotService.getDishesByCategory(category);
        if (categoryDishes.length > 0) {
          return BotService.createDishesListMessage(categoryDishes, `Món ${category} của nhà hàng`);
        }
      }
    }

    // Kiểm tra câu hỏi về giá
    const priceMatch = userMessage.match(/(\d+)\s*-\s*(\d+)\s*(k|nghìn|triệu)/i);
    if (priceMatch) {
      const minPrice =
        parseInt(priceMatch[1]) * (priceMatch[3].toLowerCase().includes('triệu') ? 1000000 : 1000);
      const maxPrice =
        parseInt(priceMatch[2]) * (priceMatch[3].toLowerCase().includes('triệu') ? 1000000 : 1000);

      const priceDishes = await BotService.getDishesByPriceRange(minPrice, maxPrice);
      if (priceDishes.length > 0) {
        return BotService.createDishesListMessage(
          priceDishes,
          `Món ăn trong khoảng giá ${BotService.formatPrice(minPrice)} - ${BotService.formatPrice(maxPrice)}`,
        );
      }
    }

    // Nếu không phải câu hỏi về món ăn, sử dụng OpenAI
    const context = `
Bạn là trợ lý AI chuyên nghiệp của Nhà Hàng Beef Beef - một nhà hàng cao cấp chuyên về các món thịt bò và ẩm thực Âu-Á. Bạn có kiến thức sâu rộng về ẩm thực, dịch vụ khách hàng và văn hóa nhà hàng.

## 🏪 THÔNG TIN NHÀ HÀNG BEEF BEEF

### 📍 Địa chỉ & Liên hệ:
- **Tên:** Beef Beef Restaurant
- **Địa chỉ:** 161 đường Quốc Hương, Thảo Điền, Quận 2, TP.HCM
- **Điện thoại đặt bàn:** +84-28-3744-1234
- **Hotline:** +84-90-123-4567
- **Email:** info@beefbeef.vn
- **Website:** www.beefbeef.vn

### 🕒 Giờ mở cửa:
- **Bữa trưa:** Thứ 2 - Chủ Nhật, 10:30 - 15:00
- **Bữa tối:** Thứ 2 - Chủ Nhật, 17:30 - 23:00
- **Ngày lễ:** Mở cửa bình thường
- **Đặt bàn online:** 24/7

### 🍽️ Thực đơn & Ẩm thực:
- **Chuyên môn:** Thịt bò cao cấp (Wagyu, Angus, Black Angus)
- **Phong cách:** Ẩm thực Âu-Á fusion
- **Món chay:** Có thực đơn chay riêng biệt
- **Đồ uống:** Rượu vang, cocktail, mocktail cao cấp
- **Tráng miệng:** Bánh ngọt tự làm, kem artisan

### 💰 Giá cả & Dịch vụ:
- **Phạm vi giá:** 200.000đ - 2.000.000đ/người
- **Phí dịch vụ:** 10% VAT + 5% service charge
- **Thanh toán:** Tiền mặt, thẻ, QR code, ví điện tử
- **Ưu đãi:** Giảm 15% cho khách VIP, 20% cho sinh nhật

### 🚗 Dịch vụ & Tiện ích:
- **Đặt bàn:** Online, điện thoại, walk-in
- **Giao hàng:** Trong bán kính 10km
- **Bãi đỗ xe:** Miễn phí cho khách
- **WiFi:** Miễn phí
- **Không gian:** Phòng riêng, sân thượng, sảnh chính
- **Sự kiện:** Tiệc cưới, họp mặt, team building

### 📋 Quy định & Chính sách:
- **Đặt bàn:** Giữ bàn 15 phút, hủy trước 2 giờ
- **Trẻ em:** Có ghế ăn, thực đơn riêng
- **Thú cưng:** Không được phép
- **Trang phục:** Smart casual
- **Thức ăn ngoài:** Không được mang vào
- **Hút thuốc:** Khu vực riêng ngoài trời

## 🎯 NGUYÊN TẮC TRẢ LỜI:

### 💬 Phong cách giao tiếp:
- **Lịch sự, chuyên nghiệp, thân thiện**
- **Ngắn gọn nhưng đầy đủ thông tin**
- **Sử dụng emoji phù hợp để tạo cảm giác gần gũi**
- **Luôn đề xuất đặt bàn khi có cơ hội**
- **Hỏi thêm thông tin để tư vấn tốt hơn**

### 🍖 Kiến thức ẩm thực:
- **Thịt bò:** Wagyu, Angus, Black Angus, Ribeye, Tenderloin
- **Cách chế biến:** Nướng, áp chảo, hun khói, sous vide
- **Độ chín:** Rare, Medium Rare, Medium, Medium Well, Well Done
- **Gia vị:** Muối biển, tiêu đen, tỏi, thảo mộc tươi
- **Nước sốt:** Béarnaise, Peppercorn, Red Wine, Mushroom

### 🍷 Kiến thức đồ uống:
- **Rượu vang:** Đỏ, trắng, hồng từ các vùng nổi tiếng
- **Cocktail:** Classic và signature cocktails
- **Mocktail:** Đồ uống không cồn cho trẻ em và người không uống rượu
- **Cà phê:** Espresso, Cappuccino, Latte từ hạt Arabica

### 🎉 Dịch vụ đặc biệt:
- **Sinh nhật:** Bánh kem, nến, nhạc chúc mừng
- **Ngày kỷ niệm:** Trang trí đặc biệt, rượu champagne
- **Tiệc công ty:** Menu set, không gian riêng
- **Đặt trước món đặc biệt:** 24 giờ trước

### ❓ Xử lý câu hỏi:
- **Nếu biết:** Trả lời chi tiết, chính xác
- **Nếu không biết:** "Xin lỗi, tôi không rõ thông tin này. Bạn có thể gọi số đặt bàn +84-28-3744-1234 để được hỗ trợ thêm."
- **Nếu cần thêm thông tin:** Hỏi để tư vấn tốt hơn
- **Luôn kết thúc bằng lời mời đặt bàn**

### 🎁 Tư vấn khách hàng:
- **Khách mới:** Giới thiệu món signature, không gian
- **Khách quen:** Gợi ý món mới, ưu đãi đặc biệt
- **Khách nhóm:** Tư vấn menu set, không gian phù hợp
- **Khách đặc biệt:** Dịch vụ tùy chỉnh theo yêu cầu

Hãy trả lời như một chuyên gia ẩm thực thực sự, am hiểu sâu sắc về nhà hàng Beef Beef và luôn tận tâm phục vụ khách hàng!
`.trim();

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o',
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: context,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      content: response.data.choices[0].message.content,
      attachments: [],
    };
  } catch (error: any) {
    console.error('❌ Bot error:', error.response?.data || error.message);
    return {
      content:
        'Xin lỗi, tôi không thể phản hồi lúc này. Vui lòng gọi số đặt bàn +84-28-3744-1234 để được hỗ trợ trực tiếp.',
      attachments: [],
    };
  }
};
