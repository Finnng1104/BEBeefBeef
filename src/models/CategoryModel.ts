import mongoose from 'mongoose';

export interface ICategory extends mongoose.Document {
  Cate_name: string;
  Cate_slug: string;
  Cate_img: string | null;
  Cate_type: 'dish' | 'drink';
  parentCate: string | null;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    Cate_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Cate_slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Cate_img: {
      type: String,
      default: null,
    },
    Cate_type: {
      type: String,
      required: true,
      enum: ['dish', 'drink'],
    },
    parentCate: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Category = mongoose.model<ICategory>('categories', categorySchema);
export default Category;
