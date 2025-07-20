import FaqService from '../services/FaqService';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { createFaqSchema, updateFaqSchema } from '../validators/faqValidator';

class FaqController {
  async getAllFaqs(req: Request, res: Response): Promise<void> {
    try {
      const { question } = req.query;

      if (typeof question === 'string' && question.trim()) {
        const faq = await FaqService.findByQuestion(question.trim());
        if (!faq) {
          res.status(404).json({ message: 'Không tìm thấy câu trả lời phù hợp' });
          return;
        }
        res.status(200).json(faq);
        return;
      }
      const faqs = await FaqService.getAllFaqs();
      res.status(200).json(faqs);
    } catch (error) {
      console.error('Lỗi khi xử lý FAQ:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy FAQ' });
    }
  }

  async createFaq(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createFaqSchema.parse(req.body);

      const newFaq = await FaqService.createFaq({
        question: parsed.question,
        answer: parsed.answer,
        category: parsed.category,
      });

      res.status(201).json({
        message: 'FAQ đã được tạo thành công.',
        data: newFaq,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Dữ liệu không hợp lệ',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      const errMsg = (error as Error).message;
      if (errMsg.includes('tồn tại')) {
        res.status(409).json({ message: errMsg });
      } else {
        console.error('Error creating FAQ:', error);
        res.status(500).json({ message: 'Lỗi hệ thống khi tạo FAQ.' });
      }
    }
  }
  async getFaqById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const faq = await FaqService.getFaqById(id);

      if (!faq) {
        res.status(404).json({ message: 'Không tìm thấy FAQ' });
        return;
      }

      res.status(200).json(faq);
    } catch (error) {
      console.error('Lỗi khi lấy FAQ:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy FAQ' });
    }
  }
  async updateFaq(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateFaqSchema.parse(req.body);

      const updatedFaq = await FaqService.updateFaq(id, parsed);

      if (!updatedFaq) {
        res.status(404).json({ message: 'Không tìm thấy FAQ để cập nhật' });
        return;
      }

      res.status(200).json({
        message: 'FAQ đã được cập nhật thành công.',
        data: updatedFaq,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Dữ liệu không hợp lệ',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      console.error('Lỗi khi cập nhật FAQ:', error);
      res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật FAQ.' });
    }
  }
  async deleteFaq(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await FaqService.deleteFaq(id);

      if (!deleted) {
        res.status(404).json({ message: 'Không tìm thấy FAQ để xóa' });
        return;
      }

      res.status(200).json({
        message: 'FAQ đã được xóa thành công.',
        data: deleted,
      });
    } catch (error) {
      console.error('Lỗi khi xóa FAQ:', error);
      res.status(500).json({ message: 'Lỗi hệ thống khi xóa FAQ' });
    }
  }
}
export default new FaqController();
