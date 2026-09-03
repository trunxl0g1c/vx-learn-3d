import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Eraser,
} from "lucide-react";
import Button, { cn } from "./button";
import { Input } from "./input";
import { buildDescriptionEditorExtensions } from "../../tiptap/descriptionEditorExtensions";
import { toEditableHtml } from "../../utils/descriptionHtml";

const URL_PATTERN = /^(https?:|mailto:)/i;

function ToolbarButton({ active, onClick, disabled, title, children }) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "cyanSolid" : "ghost"}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      className="shrink-0"
    >
      {children}
    </Button>
  );
}

function LinkPopover({ editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const containerRef = useRef(null);

  const openPopover = () => {
    setUrl(editor.getAttributes("link").href || "");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const applyLink = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else if (URL_PATTERN.test(trimmed)) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: trimmed })
        .run();
    } else {
      return;
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={() => (open ? setOpen(false) : openPopover())}
        title="Insert / edit link"
      >
        <LinkIcon size={15} />
      </ToolbarButton>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-secondary-default bg-[#101717] p-2 shadow-xl">
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="https://..."
            className="h-9 px-3"
            inputClassName="text-xs"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="button" size="xs" onClick={applyLink}>
              Terapkan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ForceEnglishButton({ editor }) {
  const active = editor.isActive("forceEnglish");
  return (
    <Button
      type="button"
      size="xs"
      variant={active ? "cyanSolid" : "ghost"}
      onClick={() => editor.chain().focus().toggleForceEnglish().run()}
      onMouseDown={(e) => e.preventDefault()}
      title="Tandai teks agar tetap dibaca dalam Bahasa Inggris saat Play Voice"
      className="shrink-0 font-semibold tracking-wide"
    >
      EN
    </Button>
  );
}

function EditorToolbar({ editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-secondary-default/40 p-1.5">
      <span className="mr-1 shrink-0 rounded-md px-2 py-1 text-xs text-contrast-grayout">
        Paragraph
      </span>

      <div className="mx-1 h-5 w-px shrink-0 bg-white/10" />

      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <UnderlineIcon size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Code"
      >
        <Code size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        title="Clear text formatting"
      >
        <RemoveFormatting size={15} />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px shrink-0 bg-white/10" />

      <ToolbarButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
      >
        <AlignLeft size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align center"
      >
        <AlignCenter size={15} />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
      >
        <AlignRight size={15} />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px shrink-0 bg-white/10" />

      <LinkPopover editor={editor} />

      <div className="mx-1 h-5 w-px shrink-0 bg-white/10" />

      <ToolbarButton
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
      >
        <Undo2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
      >
        <Redo2 size={15} />
      </ToolbarButton>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <ForceEnglishButton editor={editor} />
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
          onMouseDown={(e) => e.preventDefault()}
          title="Clear all formatting"
          className="shrink-0"
        >
          <Eraser size={13} />
          Clear formatting
        </Button>
      </div>
    </div>
  );
}

export default function RichDescriptionEditor({
  value,
  onChange,
  maxLength = 850,
  placeholder = "Isi deskripsi materi...",
  className = "",
}) {
  const editor = useEditor({
    extensions: buildDescriptionEditorExtensions({ maxLength, placeholder }),
    content: toEditableHtml(value),
    editorProps: {
      attributes: { class: "vx-description-editor" },
    },
    onUpdate: ({ editor: instance }) =>
      onChange(instance.isEmpty ? "" : instance.getHTML()),
  });

  if (!editor) return null;

  const characters = editor.storage.characterCount.characters();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-secondary-default bg-transparent focus-within:ring-1 focus-within:ring-secondary-default",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <EditorToolbar editor={editor} />

      <div className="relative">
        <EditorContent
          editor={editor}
          className="min-h-24 px-3 py-3 pr-14 text-sm text-white"
        />
        <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
          {characters}/{maxLength}
        </span>
      </div>
    </div>
  );
}
