import multer, { FileFilterCallback, Options } from "multer";
import { v4 as uuidv4 } from "uuid";
import { ensureFilePathExists } from "~/utils/file";

interface FileUploadOptions {
  path: string;
  regex?: RegExp;
  error?: string;
  sizeKB?: number;
}

export const configureMulterOption = ({
  path,
  regex = /^image\/(jpeg|png|jpg)$/,
  error = "Only JPEG and PNG files are allowed",
  sizeKB = 1024 * 2,
}: FileUploadOptions): Options => ({
  storage: multer.diskStorage({
    destination: (
      _req: Express.Request,
      _file: Express.Multer.File,
      callback: (error: Error | null, destination: string) => void
    ) => {
      callback(null, ensureFilePathExists(path));
    },

    filename: (
      _req: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void
    ) => {
      callback(null, `${uuidv4()}.${file.originalname.split(".").pop()}`);
    },
  }),

  fileFilter: (_req: Express.Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (regex.test(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(error));
    }
  },

  limits: { fieldNameSize: 255, fileSize: sizeKB * 1024 },
});
