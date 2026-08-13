import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type FeedbackType = 'bug' | 'suggestion' | 'experience' | 'other';
export type FeedbackStatus = 'pending' | 'processed';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  contact: string;
  pagePath: string;
  reporterName: string;
  createdAt: string;
  status: FeedbackStatus;
  attachments: FeedbackAttachment[];
  handledAt?: string;
  handlerName?: string;
  handleNote?: string;
}

export interface FeedbackAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface SubmitFeedbackInput {
  type: FeedbackType;
  content: string;
  contact?: string;
  pagePath: string;
  attachments?: File[];
}

interface FeedbackContextValue {
  feedbackItems: FeedbackItem[];
  submitFeedback: (input: SubmitFeedbackInput) => Promise<void>;
  markFeedbackProcessed: (id: string, handleNote: string) => void;
}

const STORAGE_KEY = 'hubx-feedback-items';
const ATTACHMENT_DATABASE_NAME = 'hubx-feedback-attachments';
const ATTACHMENT_STORE_NAME = 'attachments';
const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function openAttachmentDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(ATTACHMENT_DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ATTACHMENT_STORE_NAME)) {
        database.createObjectStore(ATTACHMENT_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAttachment(attachment: FeedbackAttachment, file: File): Promise<void> {
  const database = await openAttachmentDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENT_STORE_NAME, 'readwrite');
      transaction.objectStore(ATTACHMENT_STORE_NAME).put({ id: attachment.id, file });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function getFeedbackAttachmentFile(attachmentId: string): Promise<File | null> {
  const database = await openAttachmentDatabase();

  try {
    return await new Promise<File | null>((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENT_STORE_NAME, 'readonly');
      const request = transaction.objectStore(ATTACHMENT_STORE_NAME).get(attachmentId);
      request.onsuccess = () => resolve(request.result?.file || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

function loadFeedbackItems(): FeedbackItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>(loadFeedbackItems);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbackItems));
  }, [feedbackItems]);

  const submitFeedback = useCallback(async (input: SubmitFeedbackInput) => {
    const attachments = await Promise.all((input.attachments || []).map(async (file, index) => {
      const attachment: FeedbackAttachment = {
        id: `feedback-file-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      await saveAttachment(attachment, file);
      return attachment;
    }));

    const feedbackItem: FeedbackItem = {
      id: `FB${Date.now().toString().slice(-8)}`,
      type: input.type,
      content: input.content.trim(),
      contact: input.contact?.trim() || '',
      pagePath: input.pagePath,
      reporterName: '张三',
      createdAt: new Date().toISOString(),
      status: 'pending',
      attachments,
    };

    setFeedbackItems((current) => [feedbackItem, ...current]);
  }, []);

  const markFeedbackProcessed = useCallback((id: string, handleNote: string) => {
    setFeedbackItems((current) => current.map((item) => (
      item.id === id
        ? {
            ...item,
            status: 'processed',
            handledAt: new Date().toISOString(),
            handlerName: '系统管理员',
            handleNote: handleNote.trim(),
          }
        : item
    )));
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({
    feedbackItems,
    submitFeedback,
    markFeedbackProcessed,
  }), [feedbackItems, markFeedbackProcessed, submitFeedback]);

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }

  return context;
}

export const feedbackTypeLabels: Record<FeedbackType, string> = {
  bug: '问题反馈',
  suggestion: '功能建议',
  experience: '使用体验',
  other: '其他',
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processed: '已处理',
};

export function formatFeedbackAttachmentSize(size: number): string {
  if (!size) return '0B';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}
