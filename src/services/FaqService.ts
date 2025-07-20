import FAQModel, { IFAQ } from '../models/FaqModel';
import { CreateFaqDto } from '../types/faq.types';
class FaqService {
  async getAllFaqs() {
    try {
      const faqs = await FAQModel.find({ is_active: true }).sort({ updated_at: -1 }).exec();
      return faqs;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error fetching FAQs: ${error.message}`);
      } else {
        throw new Error('Error fetching FAQs: Unknown error');
      }
    }
  }
  async findByQuestion(question: string) {
    return await FAQModel.findOne({
      normalized_question: question.toLowerCase(),
      is_active: true,
    });
  }

  async createFaq(data: CreateFaqDto): Promise<IFAQ> {
    const normalizedQuestion = data.question.trim().toLowerCase();

    const exists = await FAQModel.findOne({
      normalized_question: normalizedQuestion,
    });

    if (exists) {
      throw new Error('Câu hỏi này đã tồn tại.');
    }

    const faq = new FAQModel({
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category?.trim() || '',
      is_active: true,
      normalized_question: normalizedQuestion,
    });

    return await faq.save();
  }
  async getFaqById(id: string) {
    return await FAQModel.findById(id);
  }
  async updateFaq(id: string, data: Partial<CreateFaqDto> & { is_active?: boolean }) {
    const faq = await FAQModel.findById(id);
    if (!faq) {
      throw new Error('FAQ not found');
    }

    if (data.question) {
      faq.question = data.question.trim();
      faq.normalized_question = faq.question.toLowerCase();
    }
    if (data.answer) {
      faq.answer = data.answer.trim();
    }
    if (data.category !== undefined) {
      faq.category = data.category?.trim() || '';
    }
    if (data.is_active !== undefined) {
      faq.is_active = data.is_active;
    }

    faq.updated_at = new Date();

    return await faq.save();
  }
  async deleteFaq(id: string) {
    return await FAQModel.findByIdAndDelete(id);
  }
}
export default new FaqService();
