import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';
import type Quill from 'quill';
import 'quill/dist/quill.snow.css';
import 'quill/dist/quill.bubble.css';

export interface RichTextEditorHandle {
  getEditor: () => Quill | null;
}

export interface RichTextEditorProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  modules?: Record<string, unknown>;
  theme?: 'snow' | 'bubble';
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * Quill 2 adapter kept deliberately small so form fields and image insertion do
 * not depend on the unmaintained ReactQuill wrapper (which embeds Quill 1).
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor({
  value,
  defaultValue,
  onChange,
  className,
  style,
  modules,
  theme = 'snow',
  placeholder,
  readOnly = false,
}, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const contentRef = useRef(value ?? defaultValue ?? '');
  const initialOptionsRef = useRef({ modules, theme, placeholder, readOnly });

  contentRef.current = value ?? defaultValue ?? '';

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
  }), []);

  useEffect(() => {
    let disposed = false;
    let editor: Quill | null = null;

    void import('quill').then(({ default: QuillConstructor }) => {
      if (disposed || !hostRef.current) return;
      const options = initialOptionsRef.current;
      editor = new QuillConstructor(hostRef.current, {
        theme: options.theme,
        modules: options.modules,
        placeholder: options.placeholder,
        readOnly: options.readOnly,
      } as ConstructorParameters<typeof QuillConstructor>[1]);
      editorRef.current = editor;
      const initialValue = contentRef.current;
      if (initialValue) editor.clipboard.dangerouslyPasteHTML(initialValue, 'silent');
      editor.on('text-change', () => {
        onChangeRef.current?.(editor?.root.innerHTML ?? '');
      });
    });

    return () => {
      disposed = true;
      if (editor) editor.off('text-change');
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === undefined || editor.root.innerHTML === value) return;
    editor.clipboard.dangerouslyPasteHTML(value, 'silent');
  }, [value]);

  useEffect(() => {
    editorRef.current?.enable(!readOnly);
  }, [readOnly]);

  return <div className={className} style={style}><div ref={hostRef} /></div>;
});
