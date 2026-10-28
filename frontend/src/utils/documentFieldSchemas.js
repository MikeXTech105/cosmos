import { z } from "zod";
import { documentIdText, documentQuantityText, optionalDocumentIdText } from "./documentPrecision";

const preserve = (convert, label) => (value, context) => {
  try { return convert(value); } catch (error) {
    context.addIssue({ code: "custom", message: `${label}: ${error.message}` });
    return z.NEVER;
  }
};
export const documentQuantitySchema = z.union([z.string(), z.number()]).transform(preserve(documentQuantityText, "Quantity"));
export const documentIdSchema = (label = "Record") => z.union([z.string(), z.number()]).transform(preserve(documentIdText, label));
export const optionalDocumentIdSchema = z.union([z.string(), z.number(), z.null()]).transform(preserve(optionalDocumentIdText, "Record")).optional();
