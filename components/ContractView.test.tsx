import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/documents", () => ({
  saveDocument: vi.fn(),
  saveContractDates: vi.fn(),
}));

// Tiptap doesn't run in jsdom; the editor is a textarea here. The real one is
// exercised end-to-end in e2e/contract-and-vision.spec.ts (CV-02, CV-10).
vi.mock("./RichTextEditor", () => ({
  default: ({
    initialHtml,
    onChange,
  }: {
    initialHtml: string;
    onChange: (html: string) => void;
  }) => (
    <textarea
      aria-label="Editor"
      defaultValue={initialHtml}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const { default: ContractView } = await import("./ContractView");
const { saveDocument, saveContractDates } =
  await import("@/lib/actions/documents");

const emptyDoc = (key: "vision" | "contract") => ({
  key,
  bodyHtml: "",
  updatedAt: null,
  updatedByName: null,
});

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    role: "owner" as const,
    contract: { contractStart: "2026-09-19", contractEnd: "2026-12-18" },
    documents: {
      vision: {
        key: "vision" as const,
        bodyHtml: "<p>Become <strong>disciplined</strong>.</p>",
        updatedAt: "2026-09-19T03:30:00Z",
        updatedByName: "Nigel Smith",
      },
      contract: emptyDoc("contract"),
    },
    partners: ["Alice", "Bob"],
    ...overrides,
  };
}

const contractSection = () =>
  screen.getByRole("region", { name: "Accountability contract" });
const visionSection = () =>
  screen.getByRole("region", { name: "Who I want to become" });

beforeEach(() => {
  vi.mocked(saveDocument).mockReset();
  vi.mocked(saveContractDates).mockReset();
  vi.spyOn(window, "prompt").mockReturnValue(null);
});

test("CV-01 the page shows the dates, both documents, and the partners", () => {
  render(<ContractView {...baseProps()} />);
  expect(screen.getByText("Sep 19 – Dec 18, 2026")).toBeInTheDocument();
  expect(visionSection()).toHaveTextContent("Become disciplined.");
  expect(contractSection()).toBeInTheDocument();
  expect(
    screen.getByText("Accountability partners: Alice, Bob"),
  ).toBeInTheDocument();
});

test("CV-02 Edit opens the editor with Save / Cancel; Save shows the new content", async () => {
  vi.mocked(saveDocument).mockResolvedValue({
    ok: true,
    document: {
      key: "contract",
      bodyHtml: "<p>Five failures = <strong>consequence</strong></p>",
      updatedAt: "2026-09-19T03:30:00Z",
      updatedByName: "Nigel Smith",
    },
  });
  render(<ContractView {...baseProps()} />);

  fireEvent.click(
    within(contractSection()).getByRole("button", { name: "Edit" }),
  );
  const editor = within(contractSection()).getByLabelText("Editor");
  expect(
    within(contractSection()).getByRole("button", { name: "Save" }),
  ).toBeInTheDocument();
  expect(
    within(contractSection()).getByRole("button", { name: "Cancel" }),
  ).toBeInTheDocument();

  fireEvent.change(editor, {
    target: { value: "<p>Five failures = <strong>consequence</strong></p>" },
  });
  fireEvent.click(
    within(contractSection()).getByRole("button", { name: "Save" }),
  );

  await waitFor(() =>
    expect(saveDocument).toHaveBeenCalledWith(
      "contract",
      "<p>Five failures = <strong>consequence</strong></p>",
    ),
  );
  await waitFor(() =>
    expect(contractSection()).toHaveTextContent("Five failures = consequence"),
  );
  expect(contractSection().querySelector("strong")).toHaveTextContent(
    "consequence",
  );
  expect(
    within(contractSection()).queryByLabelText("Editor"),
  ).not.toBeInTheDocument();
  expect(contractSection()).toHaveTextContent("Last updated Sep 18 by Nigel");
});

test("CV-04 the action's size error is shown and the editor stays open", async () => {
  vi.mocked(saveDocument).mockResolvedValue({
    ok: false,
    error: "This is too long — keep it under 20,000 characters",
  });
  render(<ContractView {...baseProps()} />);
  fireEvent.click(
    within(contractSection()).getByRole("button", { name: "Edit" }),
  );
  fireEvent.click(
    within(contractSection()).getByRole("button", { name: "Save" }),
  );
  expect(
    await screen.findByText(
      "This is too long — keep it under 20,000 characters",
    ),
  ).toBeInTheDocument();
  expect(
    within(contractSection()).getByLabelText("Editor"),
  ).toBeInTheDocument();
});

test("CV-05 a saved document shows who updated it and when", () => {
  render(<ContractView {...baseProps()} />);
  expect(visionSection()).toHaveTextContent("Last updated Sep 18 by Nigel");
  expect(contractSection()).not.toHaveTextContent("Last updated");
});

test("CV-06 empty documents: owner sees the placeholder and Edit; others see 'Not written yet.'", () => {
  const { unmount } = render(<ContractView {...baseProps()} />);
  expect(contractSection()).toHaveTextContent(
    "Write your accountability contract…",
  );
  expect(
    within(contractSection()).getByRole("button", { name: "Edit" }),
  ).toBeInTheDocument();
  unmount();

  render(
    <ContractView
      {...baseProps({
        role: "viewer",
        documents: {
          vision: emptyDoc("vision"),
          contract: emptyDoc("contract"),
        },
      })}
    />,
  );
  expect(visionSection()).toHaveTextContent("Not written yet.");
  expect(contractSection()).toHaveTextContent("Not written yet.");
});

test("CV-07 the owner edits the dates; the header updates", async () => {
  vi.mocked(saveContractDates).mockResolvedValue({
    ok: true,
    contract: { contractStart: "2026-09-19", contractEnd: "2026-12-18" },
  });
  render(
    <ContractView
      {...baseProps({ contract: { contractStart: null, contractEnd: null } })}
    />,
  );
  expect(screen.getByText("No contract dates yet")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Edit dates" }));
  fireEvent.change(screen.getByLabelText("Start date"), {
    target: { value: "2026-09-19" },
  });
  fireEvent.change(screen.getByLabelText("End date"), {
    target: { value: "2026-12-18" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save dates" }));

  await waitFor(() =>
    expect(saveContractDates).toHaveBeenCalledWith("2026-09-19", "2026-12-18"),
  );
  await waitFor(() =>
    expect(screen.getByText("Sep 19 – Dec 18, 2026")).toBeInTheDocument(),
  );
});

test("CV-07 end before start shows the error and saves nothing", async () => {
  render(<ContractView {...baseProps()} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit dates" }));
  fireEvent.change(screen.getByLabelText("End date"), {
    target: { value: "2026-09-18" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save dates" }));
  expect(
    await screen.findByText("End date can't be before start date"),
  ).toBeInTheDocument();
  expect(saveContractDates).not.toHaveBeenCalled();
});

test("CV-08 Cancel discards unsaved changes", () => {
  render(<ContractView {...baseProps()} />);
  fireEvent.click(
    within(visionSection()).getByRole("button", { name: "Edit" }),
  );
  fireEvent.change(within(visionSection()).getByLabelText("Editor"), {
    target: { value: "<p>Something else</p>" },
  });
  fireEvent.click(
    within(visionSection()).getByRole("button", { name: "Cancel" }),
  );
  expect(visionSection()).toHaveTextContent("Become disciplined.");
  expect(visionSection()).not.toHaveTextContent("Something else");
  expect(saveDocument).not.toHaveBeenCalled();
});

test("CV-09 partners and viewers get no Edit or Edit dates controls", () => {
  for (const role of ["partner", "viewer"] as const) {
    const { unmount } = render(<ContractView {...baseProps({ role })} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    unmount();
  }
});

test("CV-10 headings, lists and links render as a document; links open in a new tab", () => {
  render(
    <ContractView
      {...baseProps({
        documents: {
          vision: emptyDoc("vision"),
          contract: {
            key: "contract",
            bodyHtml:
              '<h2>Rules</h2><ul><li><p>Read</p></li></ul><p><a href="https://ok.example" rel="noopener noreferrer" target="_blank">syllabus</a></p>',
            updatedAt: "2026-09-19T03:30:00Z",
            updatedByName: "Nigel Smith",
          },
        },
      })}
    />,
  );
  expect(
    within(contractSection()).getByRole("heading", { name: "Rules", level: 2 }),
  ).toBeInTheDocument();
  expect(within(contractSection()).getByRole("listitem")).toHaveTextContent(
    "Read",
  );
  const link = within(contractSection()).getByRole("link", {
    name: "syllabus",
  });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("href", "https://ok.example");
});
