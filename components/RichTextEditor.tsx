"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * CV-02 — Tiptap with the six-item toolbar (docs/ARCHITECTURE.md § Rich
 * text). Emits HTML; the Server Action sanitizes it. Rendered only in edit
 * mode so readers never download ProseMirror.
 */
export default function RichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
      }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "doc min-h-40 px-3 py-2 outline-none",
        "aria-label": "Document",
      },
    },
  });

  return (
    <div className="rounded-xl border border-border">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="h-10 border-b border-border" />;

  function setLink() {
    const previous = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  const items: { name: string; active: boolean; run: () => void }[] = [
    {
      name: "Bold",
      active: editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      name: "Italic",
      active: editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      name: "Heading",
      active: editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      name: "Bullet list",
      active: editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      name: "Numbered list",
      active: editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    { name: "Link", active: editor.isActive("link"), run: setLink },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap gap-1 border-b border-border p-1"
    >
      {items.map((item) => (
        <button
          key={item.name}
          type="button"
          // Keep the selection in the editor: a focused button would swallow
          // the next keystrokes and lose the mark that was just toggled.
          onMouseDown={(event) => event.preventDefault()}
          onClick={item.run}
          aria-pressed={item.active}
          className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${
            item.active ? "bg-accent text-white" : "text-foreground/80"
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
